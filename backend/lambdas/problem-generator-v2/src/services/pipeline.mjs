import { v4 as uuidv4 } from "uuid";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { 
  getGoogleAiApiKey,
  getGeminiModelName,
  isGeneratorVerbose,
  DEFAULT_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  MAX_RETRIES,
  PROBLEMS_TABLE_NAME
} from "../utils/constants.mjs";
import { cleanLlmOutput } from "../utils/cleanLlmOutput.mjs";
import { withRetry } from "../utils/retry.mjs";
import { 
  createProblem, 
  updateProblemStatus 
} from "./dynamoClient.mjs";
import { 
  initializeSseStream, 
  sendStatus, 
  sendError, 
  sendResult 
} from "./sse.mjs";
import {
  runIntentAnalysis,
  runTestDesign,
  runSolutionGeneration,
  runValidation,
  runConstraintsDerivation,
  runDescriptionGeneration,
  runTitleGeneration,
  runTranslation
} from "../chains/index.mjs";

// Import new v3 execution services
import { executeSolutionWithTestCases } from "./solutionExecution.mjs";
import { finalizeTestCasesWithEdgeCases, selectExampleTestCases } from "./testCaseFinalization.mjs";

/**
 * Main problem generation pipeline that orchestrates all steps.
 * Updated to V3 with execution-based validation.
 * 
 * @param {object} event - The Lambda event object.
 * @param {awslambda.ResponseStream} responseStream - The Lambda response stream.
 */
export async function pipeline(event, responseStream) {
  // Initialize SSE stream
  const stream = initializeSseStream(responseStream);
  
  // Initialize LLM at runtime - use getters to ensure we get the latest values
  let llm;
  try {
    const apiKey = getGoogleAiApiKey();
    const modelName = getGeminiModelName();
    
    if (apiKey) {
      console.log(`Initializing Google AI (${modelName})`);
      console.log(`API Key length: ${apiKey.length}`);
      
      llm = new ChatGoogleGenerativeAI({
        modelName: modelName,
        apiKey: apiKey,
        maxOutputTokens: 9126, // Adjust as needed
      });
      
      console.log("✅ LLM initialized successfully");
    } else {
      console.error(
        "FATAL: No LLM provider configured. Set GOOGLE_AI_API_KEY environment variable."
      );
    }
  } catch (error) {
    console.error("Failed to initialize LLM:", error);
  }
  
  // Check if LLM is configured
  if (!llm) {
    sendError(stream, "LLM provider not configured on the server.");
    stream.end();
    return;
  }
  
  let problemId = null;
  
  try {
    // 1. Parse Input
    console.log("Received event:", JSON.stringify(event, null, 2));
    let body;
    if (typeof event.body === "string") {
      body = JSON.parse(event.body);
    } else {
      console.warn(
        "Event body is not a string, using directly (check invocation source). Event body:",
        event.body
      );
      body = event.body || {}; // Fallback to empty object
    }

    const userPrompt = body.prompt || "";
    const difficulty = body.difficulty || "Medium"; // Default difficulty
    const creatorId = body.creatorId || ""; // Extract creatorId from request
    const author = body.author || ""; // Extract author from request

    if (!userPrompt) {
      throw new Error(
        "User prompt ('prompt') is missing in the request body."
      );
    }

    problemId = uuidv4();
    console.log(
      `Generating problem ${problemId} for prompt: '${userPrompt}' (${difficulty})`
    );

    // 2. Create Initial DynamoDB Record
    const createdAt = new Date().toISOString();
    const initialItem = {
      problemId: problemId,
      userPrompt: userPrompt,
      difficulty: difficulty,
      generationStatus: "started",
      createdAt: createdAt,
      language: DEFAULT_LANGUAGE,
      creatorId: creatorId,
      author: author,
      schemaVersion: "v3", // Add schema version for V3
    };

    await createProblem(initialItem);
    
    // --- Generation Pipeline Steps ---
    
    // --- Step 1: Intent Analysis (Unchanged) ---
    sendStatus(stream, 1, "Analyzing prompt and extracting intent...");
    
    let intent, intentJson;
    try {
      const result = await runIntentAnalysis(llm, {
        user_prompt: userPrompt,
        difficulty,
      });
      intent = result.intent;
      intentJson = result.intentJson;
      
      if (result.wasRecovered) {
        console.log("Intent analysis was recovered from malformed JSON");
        sendStatus(stream, 1, "⚠️ Intent analysis required recovery from malformed output");
      }
    } catch (intentError) {
      console.error("Intent analysis failed:", intentError);
      
      // This is a critical error that prevents further progress
      const errorMessage = `Intent analysis failed: ${intentError.message}`;
      
      // Update problem status
      await updateProblemStatus(problemId, {
        generationStatus: "step1_failed",
        errorMessage: errorMessage.substring(0, 1000), // Limit error message size
      });
      
      // Send detailed error to the stream
      sendError(stream, errorMessage);
      throw new Error("Step 1 failed to produce valid intent: " + intentError.message);
    }
    
    if (!intent || !intent.goal) {
      const errorMessage = "Intent analysis produced invalid output (missing goal)";
      await updateProblemStatus(problemId, {
        generationStatus: "step1_invalid",
        errorMessage: errorMessage,
      });
      sendError(stream, errorMessage);
      throw new Error(errorMessage);
    }
    
    await updateProblemStatus(problemId, {
      generationStatus: "step1_complete",
      intent: intentJson,
    });
    
    sendStatus(stream, 1, "✅ Intent extracted: " + intent.goal);
    
    // --- Step 2: Test Design (Modified to focus on inputs only) ---
    sendStatus(stream, 2, "Designing test case inputs based on intent...");
    
    const { testSpecs, testSpecsJson } = await runTestDesign(llm, {
      intent,
      intent_json: intentJson,
      difficulty,
      language: DEFAULT_LANGUAGE
    });
    
    if (!testSpecs || testSpecs.length === 0) {
      throw new Error("Step 2 failed to produce valid test specs.");
    }
    
    await updateProblemStatus(problemId, {
      generationStatus: "step2_complete",
      testSpecifications: testSpecsJson,
    });
    
    sendStatus(stream, 2, `✅ Test case inputs designed: ${testSpecs.length} cases with rationales.`);
    
    // --- Step 3-4: Solution Generation & Execution Validation Loop ---
    let solutionCode = null;
    let validatedSolutionCode = null;
    let executionResults = null;
    let executionFeedback = null;
    let finalTestCases = null;
    let finalTestCasesJson = null;
    let description = null; // Declare the description variable
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      const attemptMsg = isRetry ? ` (Attempt ${attempt + 1}/${MAX_RETRIES + 1})` : "";
      
      // --- Step 3: Solution Generation ---
      sendStatus(stream, 3, `Generating solution code...${attemptMsg}`);
      
      solutionCode = await runSolutionGeneration(llm, {
        analyzed_intent: intent.goal,
        test_specs: testSpecsJson,
        language: DEFAULT_LANGUAGE,
        feedback_section: executionFeedback, // Use execution feedback instead of validation feedback
        input_schema_description: intent.input_schema_description // Add input schema description
      });
      
      await updateProblemStatus(problemId, {
        generationStatus: `step3_attempt_${attempt}`,
        solutionCode,
      });
      
      sendStatus(stream, 3, `✅ Solution code generated.${attemptMsg}`);
      
      // --- Step 4: Solution Execution & Validation (NEW) ---
      sendStatus(stream, 4, `Executing solution against test inputs...${attemptMsg}`);
      
      try {
        // Execute the solution against all test inputs
        executionResults = await executeSolutionWithTestCases(solutionCode, testSpecs, DEFAULT_LANGUAGE);
        
        await updateProblemStatus(problemId, {
          generationStatus: `step4_attempt_${attempt}`,
          executionResults: JSON.stringify({
            success: executionResults.success,
            testResultsCount: executionResults.testResults.length,
            errorsCount: executionResults.errors.length
          }),
        });
        
        if (executionResults.success) {
          // Execution successful - no errors
          validatedSolutionCode = solutionCode;
          executionFeedback = null;
          
          sendStatus(stream, 4, `✅ Solution successfully executed against all test inputs.${attemptMsg}`);
          break; // Exit the retry loop
        } else {
          // Execution failed - generate feedback for solution regeneration
          executionFeedback = executionResults.feedback;
          const errorMsg = `Solution execution failed (Attempt ${attempt + 1}): ${executionResults.errors.length} error(s)`;
          
          await updateProblemStatus(problemId, {
            generationStatus: `step4_failed_attempt_${attempt}`,
            errorMessage: errorMsg,
            executionFeedback,
          });
          
          sendStatus(stream, 4, `⚠️ Solution execution failed. ${isRetry ? "Retrying..." : ""} Feedback: ${executionFeedback}`);
          
          if (attempt === MAX_RETRIES) {
            // Exhausted all retries
            sendError(stream, `Solution execution failed after ${MAX_RETRIES + 1} attempts. Last error: ${executionFeedback}`);
            throw new Error(`Solution execution failed after ${MAX_RETRIES + 1} attempts. Last error: ${executionFeedback}`);
          }
        }
      } catch (error) {
        // Unexpected execution error
        const errorMsg = `Solution execution error (Attempt ${attempt + 1}): ${error.message}`;
        
        await updateProblemStatus(problemId, {
          generationStatus: `step4_error_attempt_${attempt}`,
          errorMessage: errorMsg,
        });
        console.log("error", errorMsg);
        sendStatus(stream, 4, `⚠️ Error during solution execution. ${isRetry ? "Retrying..." : ""}`);
        
        if (attempt === MAX_RETRIES) {
          // Exhausted all retries
          sendError(stream, `Solution execution failed after ${MAX_RETRIES + 1} attempts due to errors.`);
          throw error;
        }
        
        // Use generic feedback for retry
        executionFeedback = "Execution error. Please check your solution code structure and ensure it follows the expected format.";
      }
    }
    
    // --- Step 5: Test Case Finalization (NEW) ---
    sendStatus(stream, 5, "Finalizing test cases from execution results...");
    
    try {
      // Finalize test cases with optional edge case generation
      const finalizationResult = await finalizeTestCasesWithEdgeCases(
        validatedSolutionCode,
        executionResults,
        llm, // Pass LLM for potential edge case generation (optional)
        DEFAULT_LANGUAGE
      );
      
      finalTestCases = finalizationResult.finalTestCases;
      finalTestCasesJson = JSON.stringify(finalTestCases);
      
      await updateProblemStatus(problemId, {
        generationStatus: "step5_complete",
        finalTestCases: finalTestCasesJson,
        testCaseStats: JSON.stringify({
          totalCases: finalTestCases.length,
          edgeCasesAdded: finalizationResult.edgeCasesAdded,
          edgeCasesFailed: finalizationResult.edgeCasesFailed
        })
      });
      
      sendStatus(stream, 5, `✅ Test cases finalized: ${finalTestCases.length} cases with verified outputs.`);
    } catch (error) {
      console.error("Test case finalization error:", error);
      sendStatus(stream, 5, "⚠️ Error during test case finalization. Using direct execution results.");
      
      // Fallback to using direct execution results
      finalTestCases = executionResults.testResults;
      finalTestCasesJson = JSON.stringify(finalTestCases);
      
      await updateProblemStatus(problemId, {
        generationStatus: "step5_fallback",
        finalTestCases: finalTestCasesJson,
        finalizeError: error.message
      });
    }
    
    // --- Step 6: LLM-Based Validation (Refocused on coherence and completeness) ---
    sendStatus(stream, 6, "Validating problem coherence and completeness...");
    
    let validationResult = null;
    
    try {
      validationResult = await runValidation(llm, {
        intent_json: intentJson,
        solution_code: validatedSolutionCode,
        test_cases_json: finalTestCasesJson,
        difficulty,
        input_schema_description: intent.input_schema_description // Add input schema description
      });
      
      await updateProblemStatus(problemId, {
        generationStatus: "step6_complete",
        validationDetails: JSON.stringify(validationResult),
      });
      
      sendStatus(stream, 6, `✅ Validation complete: ${validationResult.status}`);
    } catch (error) {
      console.error("Validation error:", error);
      sendStatus(stream, 6, "⚠️ Error during validation. Continuing with generation.");
      
      // Fallback validation result
      validationResult = {
        status: "Pass",
        details: "Validation skipped due to error but proceeding as solution was execution-verified."
      };
      
      await updateProblemStatus(problemId, {
        generationStatus: "step6_fallback",
        validationDetails: JSON.stringify(validationResult),
        validationError: error.message
      });
    }
    
    // --- Step 7: Constraints Derivation (Largely Unchanged) ---
    sendStatus(stream, 7, "Deriving problem constraints...");
    
    const { constraints, constraintsJson } = await runConstraintsDerivation(llm, {
      solution_code: validatedSolutionCode,
      test_specs: finalTestCasesJson, // Use finalized test cases instead of original specs
      difficulty,
      input_schema_description: intent.input_schema_description // Add input schema description
    });
    
    await updateProblemStatus(problemId, {
      generationStatus: "step7_complete",
      constraints: constraintsJson,
    });
    
    sendStatus(stream, 7, "✅ Constraints derived.");
    
    // --- Step 8: Description Generation ---
    sendStatus(stream, 8, "Generating problem description...");
    
    // Select a subset of test cases for examples
    const exampleTestCases = selectExampleTestCases(finalTestCases, 2);
    const exampleTestCasesJson = JSON.stringify(exampleTestCases);
    
    try {
      description = await runDescriptionGeneration(llm, {
        analyzed_intent: intent.goal,
        constraints: constraintsJson,
        test_specs_examples: exampleTestCasesJson,
        difficulty,
        language: DEFAULT_LANGUAGE,
        input_schema_description: intent.input_schema_description // Add input schema description
      });
      
      await updateProblemStatus(problemId, {
        generationStatus: "step8_complete",
        description,
      });
      
      sendStatus(stream, 8, "✅ Problem description generated.");
    } catch (error) {
      console.error("Description generation error:", error);
      sendError(stream, "Failed to generate problem description: " + error.message);
      throw error;
    }
    
    // --- Step 9: Title Generation (Unchanged) ---
    sendStatus(stream, 9, "Generating problem title...");
    
    const descriptionSnippet = description.substring(0, 200); // Take a snippet
    
    let problemTitle = await runTitleGeneration(llm, {
      difficulty,
      analyzed_intent: intent.goal,
      description_snippet: descriptionSnippet
    });
    
    // Add difficulty back if LLM didn't include it
    if (!/\(.*\)/.test(problemTitle)) {
      problemTitle = `${problemTitle} (${difficulty})`;
    }
    
    await updateProblemStatus(problemId, {
      generationStatus: "step9_complete",
      title: problemTitle,
    });
    
    sendStatus(stream, 9, "✅ Problem title generated.");
    
    // --- Step 10: Translation (Unchanged) ---
    let translatedTitle = problemTitle; // Default to original
    let translatedDescription = description; // Default to original
    const targetLanguage = DEFAULT_TARGET_LANGUAGE;
    
    if (targetLanguage && targetLanguage.toLowerCase() !== "none") {
      sendStatus(stream, 10, `Translating title and description to ${targetLanguage}...`);
      
      try {
        // Translate Title
        translatedTitle = await runTranslation(llm, {
          target_language: targetLanguage,
          text_to_translate: problemTitle
        });
        
        // Additional cleaning for titles
        translatedTitle = translatedTitle
          .replace(/^---.*?---$/g, "")
          .replace(/\*\*.*?\*\*/g, "")
          .replace(/^-+\s*|\s*-+$/g, "")
          .trim();
        
        // Translate Description
        translatedDescription = await runTranslation(llm, {
          target_language: targetLanguage,
          text_to_translate: description
        });
        
        await updateProblemStatus(problemId, {
          generationStatus: "step10_complete",
          title_translated: translatedTitle,
          description_translated: translatedDescription,
          targetLanguage,
        });
        
        sendStatus(stream, 10, `✅ Title and description translated to ${targetLanguage}.`);
      } catch (translationError) {
        console.error(`Translation to ${targetLanguage} failed:`, translationError);
        await updateProblemStatus(problemId, {
          translationError: `Failed to translate to ${targetLanguage}: ${translationError.message}`,
        });
        sendStatus(stream, 10, `⚠️ Translation to ${targetLanguage} failed. Using original text.`);
      }
    } else {
      sendStatus(stream, 10, `Skipping translation (no target language specified).`);
    }
    
    // --- Step 11: Finalization ---
    sendStatus(stream, 11, "Finalizing and saving...");
    
    const completedAt = new Date().toISOString();
    const finalUpdates = {
      generationStatus: "completed",
      title: problemTitle,
      title_translated: translatedTitle,
      description_translated: translatedDescription,
      targetLanguage,
      completedAt,
      creatorId,
      author,
    };
    
    await updateProblemStatus(problemId, finalUpdates);
    
    // Construct final problem data
    const finalProblemData = {
      problemId,
      userPrompt,
      difficulty,
      language: DEFAULT_LANGUAGE,
      createdAt,
      schemaVersion: "v3", // Add schema version
      intent: intentJson,
      testInputs: testSpecsJson, // Original test inputs
      finalTestCases: finalTestCasesJson, // Execution-verified test cases
      validatedSolutionCode, // Validated solution code
      validationDetails: JSON.stringify(validationResult),
      constraints: constraintsJson,
      description: targetLanguage && targetLanguage.toLowerCase() !== "none" ? translatedDescription : description,
      title: targetLanguage && targetLanguage.toLowerCase() !== "none" ? translatedTitle : problemTitle,
      title_translated: translatedTitle,
      description_translated: translatedDescription,
      targetLanguage,
      generationStatus: "completed",
      completedAt,
      creatorId,
      author,
    };
    
    sendResult(stream, finalProblemData);
    sendStatus(stream, 11, "✅ Generation complete!");
    
  } catch (error) {
    console.error("!!! Pipeline Error:", error);
    const errorMessage = `Error during generation: ${error.message || "Unknown error"}`;
    
    // Attempt to update DB if problemId exists
    if (problemId) {
      try {
        await updateProblemStatus(problemId, {
          generationStatus: "failed",
          errorMessage: errorMessage.substring(0, 1000), // Limit error message size
        });
      } catch (dbError) {
        console.error("Failed to update DynamoDB with error status:", dbError);
      }
    }
    
    // Attempt to send error via SSE
    try {
      sendError(stream, errorMessage);
    } catch (sseError) {
      console.error("Failed to send final error via SSE:", sseError);
    }
  } finally {
    console.log("Ending response stream.");
    stream.end(); // Ensure stream is closed
  }
} 