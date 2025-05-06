import { v4 as uuidv4 } from "uuid";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { 
  getGoogleAiApiKey,
  getGeminiModelName,
  isGeneratorVerbose,
  DEFAULT_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  MAX_RETRIES,
  PROBLEMS_TABLE_NAME,
  ALLOWED_JUDGE_TYPES
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
        maxOutputTokens: 16384, // Adjust as needed
        temperature: 0.2,
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
      schemaVersion: "v3.1_judge_type_enforced", // Updated schema version
    };

    await createProblem(initialItem);
    
    // --- Generation Pipeline Steps ---
    
    // --- Step 1: Intent Analysis (With Retry) ---
    let intent, intentJson;
    let intentAnalysisSuccess = false;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      const attemptMsg = isRetry ? ` (Attempt ${attempt + 1}/${MAX_RETRIES + 1})` : "";
      
      sendStatus(stream, 1, `Analyzing prompt and extracting intent...${attemptMsg}`);
      
      try {
        const result = await runIntentAnalysis(llm, {
          user_prompt: userPrompt,
          difficulty,
        });
        
        intent = result.intent;
        intentJson = result.intentJson;
        
        if (result.wasRecovered) {
          console.log("Intent analysis was recovered from malformed JSON");
          sendStatus(stream, 1, `⚠️ Intent analysis required recovery from malformed output${attemptMsg}`);
        }
        
        if (!intent || !intent.goal) {
          throw new Error("Intent analysis produced invalid output (missing goal)");
        }
        
        await updateProblemStatus(problemId, {
          generationStatus: `step1_complete_attempt_${attempt}`,
          intent: intentJson,
        });
        
        sendStatus(stream, 1, `✅ Intent extracted: ${intent.goal}${attemptMsg}`);
        intentAnalysisSuccess = true;
        break; // Exit retry loop on success
        
      } catch (intentError) {
        console.error(`Intent analysis failed (Attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, intentError);
        
        await updateProblemStatus(problemId, {
          generationStatus: `step1_failed_attempt_${attempt}`,
          errorMessage: intentError.message.substring(0, 1000),
        });
        
        if (attempt === MAX_RETRIES) {
          // Exhausted all retries
          const errorMessage = `Intent analysis failed after ${MAX_RETRIES + 1} attempts. Last error: ${intentError.message}`;
          sendError(stream, errorMessage);
          throw new Error(errorMessage);
        }
        
        sendStatus(stream, 1, `⚠️ Intent analysis failed: ${intentError.message.substring(0, 100)}... Retrying (${attempt + 1}/${MAX_RETRIES})...`);
        
        // Small delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!intentAnalysisSuccess) {
      throw new Error("Intent analysis failed after all retry attempts");
    }
    
    // --- Step 2: Test Design (With Retry) ---
    let testSpecs, testSpecsJson;
    let testDesignSuccess = false;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      const attemptMsg = isRetry ? ` (Attempt ${attempt + 1}/${MAX_RETRIES + 1})` : "";
      
      sendStatus(stream, 2, `Designing test case inputs based on intent...${attemptMsg}`);
      
      try {
        const result = await runTestDesign(llm, {
          intent,
          intent_json: intentJson,
          difficulty,
          language: DEFAULT_LANGUAGE
        });
        
        testSpecs = result.testSpecs;
        testSpecsJson = result.testSpecsJson;
        
        if (!testSpecs || testSpecs.length === 0) {
          throw new Error("Test design produced empty or invalid test specifications");
        }
        
        await updateProblemStatus(problemId, {
          generationStatus: `step2_complete_attempt_${attempt}`,
          testSpecifications: testSpecsJson,
        });
        
        sendStatus(stream, 2, `✅ Test case inputs designed: ${testSpecs.length} cases with rationales.${attemptMsg}`);
        testDesignSuccess = true;
        break; // Exit retry loop on success
        
      } catch (testDesignError) {
        console.error(`Test design failed (Attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, testDesignError);
        
        await updateProblemStatus(problemId, {
          generationStatus: `step2_failed_attempt_${attempt}`,
          errorMessage: testDesignError.message.substring(0, 1000),
        });
        
        if (attempt === MAX_RETRIES) {
          // Exhausted all retries
          const errorMessage = `Test design failed after ${MAX_RETRIES + 1} attempts. Last error: ${testDesignError.message}`;
          sendError(stream, errorMessage);
          throw new Error(errorMessage);
        }
        
        sendStatus(stream, 2, `⚠️ Test design failed: ${testDesignError.message.substring(0, 100)}... Retrying (${attempt + 1}/${MAX_RETRIES})...`);
        
        // Small delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!testDesignSuccess) {
      throw new Error("Test design failed after all retry attempts");
    }
    
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
      
      try {
        solutionCode = await runSolutionGeneration(llm, {
          analyzed_intent: `${intent.goal} (Output format: ${intent.output_format_description})`,
          test_specs: testSpecsJson,
          language: DEFAULT_LANGUAGE,
          feedback_section: executionFeedback,
          input_schema_description: intent.input_schema_description
        });
        
        await updateProblemStatus(problemId, {
          generationStatus: `step3_attempt_${attempt}`,
          solutionCode,
        });
        
        sendStatus(stream, 3, `✅ Solution code generated.${attemptMsg}`);
      } catch (solutionError) {
        console.error(`Solution generation failed (Attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, solutionError);
        
        await updateProblemStatus(problemId, {
          generationStatus: `step3_failed_attempt_${attempt}`,
          errorMessage: solutionError.message.substring(0, 1000),
        });
        
        if (attempt === MAX_RETRIES) {
          // Exhausted all retries
          const errorMessage = `Solution generation failed after ${MAX_RETRIES + 1} attempts. Last error: ${solutionError.message}`;
          sendError(stream, errorMessage);
          throw new Error(errorMessage);
        }
        
        sendStatus(stream, 3, `⚠️ Solution generation failed: ${solutionError.message.substring(0, 100)}... Retrying (${attempt + 1}/${MAX_RETRIES})...`);
        
        // Continue to next attempt
        continue;
      }
      
      // --- Step 4: Solution Execution & Validation ---
      sendStatus(stream, 4, `Executing solution against test inputs...${attemptMsg}`);
      
      try {
        // Debug logs
        console.log("DEBUG - solutionCode:", solutionCode ? solutionCode.substring(0, 100) + "..." : null);
        console.log("DEBUG - testSpecs:", JSON.stringify({
          isArray: Array.isArray(testSpecs),
          length: testSpecs ? testSpecs.length : 0,
          firstTestCase: testSpecs && testSpecs.length > 0 ? testSpecs[0] : null
        }));
        
        // Ensure testSpecs is an array before passing to executeSolutionWithTestCases
        let testSpecsToUse = testSpecs;
        
        // If we don't have valid testSpecs, try to parse from testSpecsJson
        if (!Array.isArray(testSpecs) || testSpecs.length === 0) {
          console.log("DEBUG - Attempting to parse testSpecsJson");
          try {
            testSpecsToUse = JSON.parse(testSpecsJson);
            console.log("DEBUG - Successfully parsed testSpecsJson to array, length:", testSpecsToUse.length);
          } catch (parseError) {
            console.error("DEBUG - Failed to parse testSpecsJson:", parseError.message);
            throw new Error("Invalid test specs: could not parse as JSON array");
          }
        }
        
        // Execute the solution against all test inputs
        executionResults = await executeSolutionWithTestCases(solutionCode, testSpecsToUse, DEFAULT_LANGUAGE);
        
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
          
          sendStatus(stream, 4, `⚠️ Solution execution failed: ${executionResults.errors.length} error(s). ${isRetry ? "Retrying..." : ""} Feedback: ${executionFeedback.substring(0, 150)}...`);
          
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
        sendStatus(stream, 4, `⚠️ Error during solution execution: ${error.message.substring(0, 100)}... ${isRetry ? "Retrying..." : ""}`);
        
        if (attempt === MAX_RETRIES) {
          // Exhausted all retries
          sendError(stream, `Solution execution failed after ${MAX_RETRIES + 1} attempts due to errors.`);
          throw error;
        }
        
        // Use generic feedback for retry
        executionFeedback = "Execution error. Please check your solution code structure and ensure it follows the expected format.";
      }
    }
    
    // --- Step 5: Test Case Finalization (With Retry) ---
    let testCaseFinalizationSuccess = false;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      const attemptMsg = isRetry ? ` (Attempt ${attempt + 1}/${MAX_RETRIES + 1})` : "";
      
      sendStatus(stream, 5, `Finalizing test cases from execution results...${attemptMsg}`);
      
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
          generationStatus: `step5_complete_attempt_${attempt}`,
          finalTestCases: finalTestCasesJson,
          testCaseStats: JSON.stringify({
            totalCases: finalTestCases.length,
            edgeCasesAdded: finalizationResult.edgeCasesAdded,
            edgeCasesFailed: finalizationResult.edgeCasesFailed
          })
        });
        
        sendStatus(stream, 5, `✅ Test cases finalized: ${finalTestCases.length} cases with verified outputs.${attemptMsg}`);
        testCaseFinalizationSuccess = true;
        break; // Exit retry loop on success
        
      } catch (error) {
        console.error(`Test case finalization error (Attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error);
        
        await updateProblemStatus(problemId, {
          generationStatus: `step5_failed_attempt_${attempt}`,
          finalizeError: error.message
        });
        
        if (attempt === MAX_RETRIES) {
          // Exhausted all retries but we can fallback in this step
          sendStatus(stream, 5, `⚠️ Test case finalization failed after ${MAX_RETRIES + 1} attempts. Using direct execution results as fallback.`);
          
          // Fallback to using direct execution results
          finalTestCases = executionResults.testResults;
          finalTestCasesJson = JSON.stringify(finalTestCases);
          
          await updateProblemStatus(problemId, {
            generationStatus: "step5_fallback",
            finalTestCases: finalTestCasesJson,
            finalizeError: error.message
          });
          break; // Exit retry loop with fallback
        }
        
        sendStatus(stream, 5, `⚠️ Test case finalization failed: ${error.message.substring(0, 100)}... Retrying (${attempt + 1}/${MAX_RETRIES})...`);
        
        // Small delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!testCaseFinalizationSuccess && !finalTestCases) {
      throw new Error("Test case finalization failed and no fallback was available");
    }
    
    // --- Step 6: Constraints Derivation (With Retry) ---
    let constraints, constraintsJson;
    let constraintsDerivationSuccess = false;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      const attemptMsg = isRetry ? ` (Attempt ${attempt + 1}/${MAX_RETRIES + 1})` : "";
      
      sendStatus(stream, 6, `Deriving problem constraints (including judge_type)...${attemptMsg}`);
      
      try {
        const result = await runConstraintsDerivation(llm, {
          solution_code: validatedSolutionCode,
          test_specs: finalTestCasesJson, // Use finalized test cases instead of original specs
          difficulty,
          input_schema_description: intent.input_schema_description, // Add input schema description
          output_format_description: intent.output_format_description // Pass the description
        });
        
        constraints = result.constraints;
        constraintsJson = result.constraintsJson;
        
        if (!constraints || !constraints.judge_type || !ALLOWED_JUDGE_TYPES.includes(constraints.judge_type)) {
          throw new Error(`Invalid constraints or judge_type (${constraints?.judge_type || 'missing'})`);
        }
        
        await updateProblemStatus(problemId, {
          generationStatus: `step6_complete_attempt_${attempt}`,
          constraints: constraintsJson,
        });
        
        sendStatus(stream, 6, `✅ Constraints derived. Judge Type: ${constraints.judge_type}${attemptMsg}`);
        constraintsDerivationSuccess = true;
        break; // Exit retry loop on success
        
      } catch (error) {
        console.error(`Constraints derivation error (Attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error);
        
        await updateProblemStatus(problemId, {
          generationStatus: `step6_failed_attempt_${attempt}`,
          constraintsError: error.message
        });
        
        if (attempt === MAX_RETRIES) {
          // Exhausted all retries
          const errorMessage = `Constraints derivation failed after ${MAX_RETRIES + 1} attempts. Last error: ${error.message}`;
          sendError(stream, errorMessage);
          throw new Error(errorMessage);
        }
        
        sendStatus(stream, 6, `⚠️ Constraints derivation failed: ${error.message.substring(0, 100)}... Retrying (${attempt + 1}/${MAX_RETRIES})...`);
        
        // Small delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!constraintsDerivationSuccess) {
      throw new Error("Constraints derivation failed after all retry attempts");
    }
    
    // --- Step 7: LLM-Based Validation (with Retry) ---
    let validationResult = null;
    let validationSuccess = false;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      const attemptMsg = isRetry ? ` (Attempt ${attempt + 1}/${MAX_RETRIES + 1})` : "";
      
      sendStatus(stream, 7, `Validating problem coherence and completeness...${attemptMsg}`);
      
      try {
        validationResult = await runValidation(llm, {
          intent_json: intentJson,
          solution_code: validatedSolutionCode,
          test_cases_json: finalTestCasesJson,
          constraints_json: constraintsJson, // Pass full constraints for judge_type check
          difficulty,
          input_schema_description: intent.input_schema_description // Add input schema description
        });
        
        if (!validationResult || !validationResult.status) {
          throw new Error("Validation returned invalid or incomplete result");
        }
        
        await updateProblemStatus(problemId, {
          generationStatus: `step7_complete_attempt_${attempt}`,
          validationDetails: JSON.stringify(validationResult),
        });
        
        sendStatus(stream, 7, `✅ Validation complete: ${validationResult.status}${attemptMsg}`);
        validationSuccess = true;
        break; // Exit retry loop on success
        
      } catch (error) {
        console.error(`Validation error (Attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error);
        
        await updateProblemStatus(problemId, {
          generationStatus: `step7_failed_attempt_${attempt}`,
          validationError: error.message
        });
        
        if (attempt === MAX_RETRIES) {
          // Exhausted all retries but we can fallback for validation
          console.warn("Validation failed after all attempts. Using fallback validation result.");
          sendStatus(stream, 7, `⚠️ Validation failed after ${MAX_RETRIES + 1} attempts. Continuing with fallback validation.`);
          
          // Fallback validation result
          validationResult = {
            status: "Pass",
            details: "Validation skipped due to errors but proceeding as solution was execution-verified."
          };
          
          await updateProblemStatus(problemId, {
            generationStatus: "step7_fallback",
            validationDetails: JSON.stringify(validationResult),
            validationError: error.message
          });
          break; // Exit retry loop with fallback
        }
        
        sendStatus(stream, 7, `⚠️ Validation failed: ${error.message.substring(0, 100)}... Retrying (${attempt + 1}/${MAX_RETRIES})...`);
        
        // Small delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // --- Step 8: Description Generation (With Retry) ---
    let descriptionSuccess = false;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      const attemptMsg = isRetry ? ` (Attempt ${attempt + 1}/${MAX_RETRIES + 1})` : "";
      
      // Select a subset of test cases for examples
      const exampleTestCases = selectExampleTestCases(finalTestCases, 2, intent.input_schema_details);
      const exampleTestCasesJson = JSON.stringify(exampleTestCases);
      
      // Extract epsilon value if applicable
      const epsilonValue = (constraints && constraints.judge_type === 'float_eps' && constraints.epsilon !== undefined) 
                         ? String(constraints.epsilon) 
                         : "not applicable";
      
      sendStatus(stream, 8, `Generating problem description...${attemptMsg}`);
      
      try {
        description = await runDescriptionGeneration(llm, {
          analyzed_intent: intent.goal,
          constraints: constraintsJson,
          test_specs_examples: exampleTestCasesJson,
          difficulty,
          language: DEFAULT_LANGUAGE,
          input_schema_description: intent.input_schema_description, // Add input schema description
          epsilon_value_from_constraints: epsilonValue // Pass epsilon value
        });
        
        if (!description || description.trim() === '') {
          throw new Error("Generated description is empty or invalid");
        }
        
        await updateProblemStatus(problemId, {
          generationStatus: `step8_complete_attempt_${attempt}`,
          description,
        });
        
        sendStatus(stream, 8, `✅ Problem description generated.${attemptMsg}`);
        descriptionSuccess = true;
        break; // Exit retry loop on success
        
      } catch (error) {
        console.error(`Description generation error (Attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error);
        
        await updateProblemStatus(problemId, {
          generationStatus: `step8_failed_attempt_${attempt}`,
          descriptionError: error.message
        });
        
        if (attempt === MAX_RETRIES) {
          // Exhausted all retries
          const errorMessage = `Description generation failed after ${MAX_RETRIES + 1} attempts. Last error: ${error.message}`;
          sendError(stream, errorMessage);
          throw new Error(errorMessage);
        }
        
        sendStatus(stream, 8, `⚠️ Description generation failed: ${error.message.substring(0, 100)}... Retrying (${attempt + 1}/${MAX_RETRIES})...`);
        
        // Small delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!descriptionSuccess) {
      throw new Error("Description generation failed after all retry attempts");
    }
    
    // --- Step 9: Title Generation (With Retry) ---
    let problemTitle;
    let titleSuccess = false;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      const attemptMsg = isRetry ? ` (Attempt ${attempt + 1}/${MAX_RETRIES + 1})` : "";
      
      sendStatus(stream, 9, `Generating problem title...${attemptMsg}`);
      
      try {
        const descriptionSnippet = description.substring(0, 200); // Take a snippet
        
        problemTitle = await runTitleGeneration(llm, {
          difficulty,
          analyzed_intent: intent.goal,
          description_snippet: descriptionSnippet
        });
        
        if (!problemTitle || problemTitle.trim() === '') {
          throw new Error("Generated title is empty or invalid");
        }
        
        // Add difficulty back if LLM didn't include it
        if (!/\(.*\)/.test(problemTitle)) {
          problemTitle = `${problemTitle} (${difficulty})`;
        }
        
        await updateProblemStatus(problemId, {
          generationStatus: `step9_complete_attempt_${attempt}`,
          title: problemTitle,
        });
        
        sendStatus(stream, 9, `✅ Problem title generated: "${problemTitle}"${attemptMsg}`);
        titleSuccess = true;
        break; // Exit retry loop on success
        
      } catch (error) {
        console.error(`Title generation error (Attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error);
        
        await updateProblemStatus(problemId, {
          generationStatus: `step9_failed_attempt_${attempt}`,
          titleError: error.message
        });
        
        if (attempt === MAX_RETRIES) {
          // Exhausted all retries - generate a generic fallback title
          console.warn("Title generation failed after all attempts. Using a generic title.");
          problemTitle = `Coding Problem: ${difficulty}`;
          sendStatus(stream, 9, `⚠️ Title generation failed. Using generic title.`);
          
          await updateProblemStatus(problemId, {
            generationStatus: "step9_fallback",
            title: problemTitle,
          });
          break; // Exit retry loop with fallback
        }
        
        sendStatus(stream, 9, `⚠️ Title generation failed: ${error.message.substring(0, 100)}... Retrying (${attempt + 1}/${MAX_RETRIES})...`);
        
        // Small delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // --- Step 10: Translation (With Retry) ---
    let translatedTitle = problemTitle; // Default to original
    let translatedDescription = description; // Default to original
    const targetLanguage = DEFAULT_TARGET_LANGUAGE;
    
    if (targetLanguage && targetLanguage.toLowerCase() !== "none") {
      let translationSuccess = false;
      
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const isRetry = attempt > 0;
        const attemptMsg = isRetry ? ` (Attempt ${attempt + 1}/${MAX_RETRIES + 1})` : "";
        
        sendStatus(stream, 10, `Translating title and description to ${targetLanguage}...${attemptMsg}`);
        
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
            generationStatus: `step10_complete_attempt_${attempt}`,
            title_translated: translatedTitle,
            description_translated: translatedDescription,
            targetLanguage,
          });
          
          sendStatus(stream, 10, `✅ Title and description translated to ${targetLanguage}.${attemptMsg}`);
          translationSuccess = true;
          break; // Exit retry loop on success
          
        } catch (translationError) {
          console.error(`Translation to ${targetLanguage} failed (Attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, translationError);
          
          await updateProblemStatus(problemId, {
            generationStatus: `step10_failed_attempt_${attempt}`,
            translationError: translationError.message
          });
          
          if (attempt === MAX_RETRIES) {
            // Exhausted all retries - fall back to original text
            sendStatus(stream, 10, `⚠️ Translation to ${targetLanguage} failed after ${MAX_RETRIES + 1} attempts. Using original text.`);
            
            // Reset to original values
            translatedTitle = problemTitle;
            translatedDescription = description;
            
            await updateProblemStatus(problemId, {
              translationError: `Failed to translate to ${targetLanguage}: ${translationError.message}`,
            });
            break; // Exit retry loop with fallback
          }
          
          sendStatus(stream, 10, `⚠️ Translation to ${targetLanguage} failed: ${translationError.message.substring(0, 100)}... Retrying (${attempt + 1}/${MAX_RETRIES})...`);
          
          // Small delay before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
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
      judgeType: constraints.judge_type, // Save to DB
      epsilon: constraints.judge_type === 'float_eps' ? constraints.epsilon : undefined, // Save to DB
    };
    
    await updateProblemStatus(problemId, finalUpdates);
    
    // Construct final problem data
    const finalProblemData = {
      problemId,
      userPrompt,
      difficulty,
      language: DEFAULT_LANGUAGE,
      createdAt,
      schemaVersion: "v3.1_judge_type_enforced", // Updated schema version
      intent: intentJson,
      testInputs: testSpecsJson, // Original test inputs
      finalTestCases: finalTestCasesJson, // Execution-verified test cases
      validatedSolutionCode, // Validated solution code
      validationDetails: JSON.stringify(validationResult),
      constraints: constraintsJson, // Contains judge_type and epsilon
      judgeType: constraints.judge_type, // Explicit top-level field
      epsilon: constraints.judge_type === 'float_eps' ? constraints.epsilon : undefined, // Explicit top-level field
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