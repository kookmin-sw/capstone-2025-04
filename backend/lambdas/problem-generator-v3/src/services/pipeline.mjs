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
  runStartCodeGeneration,
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
      schemaVersion: "v3.2_start_code", // Updated schema version
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
        
        // Validate intent quality
        const intentValidation = validateIntentQuality(intent);
        if (!intentValidation.isValid) {
          throw new Error(`Intent quality issues: ${intentValidation.issues.join(', ')}`);
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
        // Prepare feedback from previous failed attempts
        let feedback = "";
        if (attempt > 0) {
          feedback = `Previous test design attempts failed. Please improve the test case design by:
- Ensuring better coverage of edge cases
- Including more diverse input scenarios
- Following the input schema more precisely
- Adding test cases that better match the difficulty level
- Ensuring all test inputs are valid JSON literals`;
        }
        
        const result = await runTestDesign(llm, {
          intent,
          intent_json: intentJson,
          difficulty,
          language: DEFAULT_LANGUAGE,
          feedback_section: feedback
        });
        
        testSpecs = result.testSpecs;
        testSpecsJson = result.testSpecsJson;
        
        if (!testSpecs || testSpecs.length === 0) {
          throw new Error("Test design produced empty or invalid test specifications");
        }
        
        // Validate test specs quality
        const testValidation = validateTestSpecsQuality(testSpecs, difficulty);
        if (!testValidation.isValid) {
          throw new Error(`Test specs quality issues: ${testValidation.issues.join(', ')}`);
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
    
    // --- Step 3: Solution Generation (With Retry) ---
    let solutionCode;
    let solutionGenerationSuccess = false;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      const attemptMsg = isRetry ? ` (Attempt ${attempt + 1}/${MAX_RETRIES + 1})` : "";
      
      sendStatus(stream, 3, `Generating solution code based on intent and test designs...${attemptMsg}`);
      
      try {
        // Prepare feedback from previous failed attempts
        let feedback = "";
        if (attempt > 0) {
          feedback = `Previous solution generation attempts failed. Please try a different approach or algorithm. Consider:
- Different data structures or algorithms
- Better handling of edge cases
- More efficient implementation
- Clearer variable naming and logic structure`;
        }
        
        // Get tie-breaking rule from intent if it exists
        const tieBreakingRule = intent.tie_breaking_rule || "";
        
        solutionCode = await runSolutionGeneration(llm, {
          analyzed_intent: intent.goal,
          test_specs: testSpecsJson,
          language: DEFAULT_LANGUAGE,
          feedback_section: feedback,
          input_schema_description: intent.input_schema_description,
          tie_breaking_rule: tieBreakingRule // Pass tie-breaking rule
        });
        
        if (!solutionCode || solutionCode.trim() === '') {
          throw new Error("Generated solution code is empty or invalid");
        }
        
        // Validate solution code quality
        const solutionValidation = validateSolutionCodeQuality(solutionCode, DEFAULT_LANGUAGE);
        if (!solutionValidation.isValid) {
          throw new Error(`Solution code quality issues: ${solutionValidation.issues.join(', ')}`);
        }
        
        await updateProblemStatus(problemId, {
          generationStatus: `step3_complete_attempt_${attempt}`,
          solutionCode,
        });
        
        sendStatus(stream, 3, `✅ Solution code generated.${attemptMsg}`);
        solutionGenerationSuccess = true;
        break; // Exit retry loop on success
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
    }
    
    if (!solutionGenerationSuccess) {
      throw new Error("Solution generation failed after all retry attempts");
    }
    
    // --- Step 4: Solution Execution & Validation Loop ---
    let executionResults = null;
    let executionFeedback = null;
    let validatedSolutionCode = null;
    let finalTestCases = null;
    let finalTestCasesJson = null;
    let description = null; // Declare the description variable
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      const attemptMsg = isRetry ? ` (Attempt ${attempt + 1}/${MAX_RETRIES + 1})` : "";
      
      // --- Step 4.a: Solution Execution ---
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
          
          sendStatus(stream, 4, `⚠️ Solution execution failed: ${executionResults.errors.length} error(s). Feedback: ${executionFeedback.substring(0, 150)}...`);
          
          if (attempt === MAX_RETRIES) {
            // Exhausted all retries
            sendError(stream, `Solution execution failed after ${MAX_RETRIES + 1} attempts. Last error: ${executionFeedback}`);
            throw new Error(`Solution execution failed after ${MAX_RETRIES + 1} attempts. Last error: ${executionFeedback}`);
          }
          
          // --- Step 4.b: Regenerate Solution with Execution Feedback ---
          sendStatus(stream, 4, `Regenerating solution using execution feedback... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
          
          try {
            // Get tie-breaking rule from intent if it exists
            const tieBreakingRule = intent.tie_breaking_rule || "";
            
            // Detailed feedback for solution regeneration
            const detailedFeedback = `
Execution failed with the following errors:
${executionFeedback}

Last solution that failed:
\`\`\`
${solutionCode}
\`\`\`

Please fix the issues and ensure the solution handles all edge cases in the test specifications.`;
            
            // Generate new solution with execution feedback
            solutionCode = await runSolutionGeneration(llm, {
              analyzed_intent: intent.goal,
              test_specs: testSpecsJson,
              language: DEFAULT_LANGUAGE,
              feedback_section: detailedFeedback,
              input_schema_description: intent.input_schema_description,
              tie_breaking_rule: tieBreakingRule
            });
            
            if (!solutionCode || solutionCode.trim() === '') {
              throw new Error("Regenerated solution code is empty or invalid");
            }
            
            await updateProblemStatus(problemId, {
              generationStatus: `step4_regenerate_attempt_${attempt}`,
              solutionCode,
            });
            
            sendStatus(stream, 4, `✅ Solution regenerated with execution feedback. Executing again...`);
            
            // Continue to next iteration to execute the regenerated solution
          } catch (solutionError) {
            console.error(`Solution regeneration failed (Attempt ${attempt + 1}/${MAX_RETRIES}):`, solutionError);
            
            await updateProblemStatus(problemId, {
              generationStatus: `step4_regenerate_failed_attempt_${attempt}`,
              errorMessage: solutionError.message.substring(0, 1000),
            });
            
            if (attempt === MAX_RETRIES - 1) {
              // Failed on the last attempt
              const errorMessage = `Solution regeneration failed on final attempt: ${solutionError.message}`;
              sendError(stream, errorMessage);
              throw new Error(errorMessage);
            }
            
            sendStatus(stream, 4, `⚠️ Solution regeneration failed: ${solutionError.message.substring(0, 100)}... Will retry execution loop...`);
            
            // Continue to next attempt of outer loop with the original solution
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
        
        // Use generic feedback for retry with regeneration
        executionFeedback = `Execution error. Please check your solution code structure and ensure it follows the expected format. Error message: ${error.message}`;
        
        // --- Step 4.b: Regenerate Solution with Execution Error ---
        sendStatus(stream, 4, `Regenerating solution due to execution error... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
        
        try {
          // Get tie-breaking rule from intent if it exists
          const tieBreakingRule = intent.tie_breaking_rule || "";
          
          // Detailed feedback for solution regeneration
          const detailedFeedback = `
Execution encountered an error:
${executionFeedback}

Last solution that failed:
\`\`\`
${solutionCode}
\`\`\`

Please fix the issues and ensure the solution handles all edge cases in the test specifications.`;
          
          // Generate new solution with execution feedback
          solutionCode = await runSolutionGeneration(llm, {
            analyzed_intent: intent.goal,
            test_specs: testSpecsJson,
            language: DEFAULT_LANGUAGE,
            feedback_section: detailedFeedback,
            input_schema_description: intent.input_schema_description,
            tie_breaking_rule: tieBreakingRule
          });
          
          if (!solutionCode || solutionCode.trim() === '') {
            throw new Error("Regenerated solution code is empty or invalid");
          }
          
          await updateProblemStatus(problemId, {
            generationStatus: `step4_regenerate_error_attempt_${attempt}`,
            solutionCode,
          });
          
          sendStatus(stream, 4, `✅ Solution regenerated after execution error. Executing again...`);
          
          // Continue to next iteration to execute the regenerated solution
        } catch (solutionError) {
          console.error(`Solution regeneration failed (Attempt ${attempt + 1}/${MAX_RETRIES}):`, solutionError);
          
          await updateProblemStatus(problemId, {
            generationStatus: `step4_regenerate_error_failed_attempt_${attempt}`,
            errorMessage: solutionError.message.substring(0, 1000),
          });
          
          if (attempt === MAX_RETRIES - 1) {
            // Failed on the last attempt
            const errorMessage = `Solution regeneration failed on final attempt: ${solutionError.message}`;
            sendError(stream, errorMessage);
            throw new Error(errorMessage);
          }
          
          sendStatus(stream, 4, `⚠️ Solution regeneration failed: ${solutionError.message.substring(0, 100)}... Will retry execution loop...`);
          
          // Continue to next attempt of outer loop with the original solution
        }
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
        // Prepare feedback from previous failed attempts
        let feedback = "";
        if (attempt > 0) {
          feedback = `Previous constraints derivation attempts failed. Please improve by:
- Ensuring the judge_type is appropriate for the problem output format
- Setting realistic time and memory limits for the difficulty level
- Deriving input constraints that match the test cases
- Providing proper epsilon value if using float_eps judge type
- Ensuring all constraints are consistent with the solution and tests`;
        }
        
        const result = await runConstraintsDerivation(llm, {
          solution_code: validatedSolutionCode,
          test_specs: finalTestCasesJson, // Use finalized test cases instead of original specs
          difficulty,
          input_schema_description: intent.input_schema_description, // Add input schema description
          output_format_description: intent.output_format_description, // Pass the description
          feedback_section: feedback
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
    
    // --- Step 6.5: Start Code Generation (With Retry) ---
    let startCode;
    let startCodeGenerationSuccess = false;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      const attemptMsg = isRetry ? ` (Attempt ${attempt + 1}/${MAX_RETRIES + 1})` : "";

      sendStatus(stream, 6.5, `Generating start code template...${attemptMsg}`);

      try {
        startCode = await runStartCodeGeneration(llm, {
          language: DEFAULT_LANGUAGE,
          input_schema_description: intent.input_schema_description,
          output_format_description: intent.output_format_description,
          constraints_json: constraintsJson,
          solution_code: validatedSolutionCode, 
        });

        if (!startCode || startCode.trim() === '') {
          throw new Error("Generated start code is empty or invalid");
        }

        await updateProblemStatus(problemId, {
          generationStatus: `step6_5_complete_attempt_${attempt}`,
          startCode, // Save to DynamoDB
        });

        sendStatus(stream, 6.5, `✅ Start code template generated.${attemptMsg}`);
        startCodeGenerationSuccess = true;
        break; // Exit retry loop on success

      } catch (error) {
        console.error(`Start code generation error (Attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error);

        await updateProblemStatus(problemId, {
          generationStatus: `step6_5_failed_attempt_${attempt}`,
          startCodeError: error.message
        });

        if (attempt === MAX_RETRIES) {
          const errorMessage = `Start code generation failed after ${MAX_RETRIES + 1} attempts. Last error: ${error.message}`;
          // Decide if this is fatal. For now, making it fatal.
          // Could potentially proceed with a default/empty start code or warning.
          sendError(stream, errorMessage);
          throw new Error(errorMessage);
        }

        sendStatus(stream, 6.5, `⚠️ Start code generation failed: ${error.message.substring(0, 100)}... Retrying (${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
      }
    }

    if (!startCodeGenerationSuccess) {
      throw new Error("Start code generation failed after all retry attempts");
    }
    
    // --- Step 7: LLM-Based Validation (with Retry) ---
    let validationResult = null;
    let validationSuccess = false;
    let validationFeedback = null;
    
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
          input_schema_description: intent.input_schema_description, // Add input schema description
          validation_feedback: validationFeedback // Include previous validation feedback
        });
        
        if (!validationResult || !validationResult.status) {
          throw new Error("Validation returned invalid or incomplete result");
        }

        // Check if validation failed
        if (validationResult.status === "Fail") {
          validationFeedback = validationResult.details;
          const failureMessage = `Validation failed: ${validationResult.details}`;
          
          await updateProblemStatus(problemId, {
            generationStatus: `step7_failed_attempt_${attempt}`,
            validationDetails: JSON.stringify(validationResult),
            validationError: failureMessage
          });
          
          if (attempt === MAX_RETRIES) {
            // Exhausted all retries for validation
            const errorMessage = `Problem validation failed after ${MAX_RETRIES + 1} attempts. Final validation error: ${validationResult.details}`;
            sendError(stream, errorMessage);
            throw new Error(errorMessage);
          }
          
          sendStatus(stream, 7, `⚠️ Validation failed: ${validationResult.details.substring(0, 100)}... Regenerating components (${attempt + 1}/${MAX_RETRIES})...`);
          
          // Regenerate based on validation feedback
          const regenerationResult = await regenerateBasedOnValidationFeedback(
            stream, llm, problemId, validationFeedback, 
            intent, testSpecs, testSpecsJson, validatedSolutionCode,
            DEFAULT_LANGUAGE, attempt
          );
          
          // Update current variables with regenerated components
          if (regenerationResult.newSolutionCode) {
            validatedSolutionCode = regenerationResult.newSolutionCode;
          }
          if (regenerationResult.newTestSpecs) {
            testSpecs = regenerationResult.newTestSpecs;
            testSpecsJson = regenerationResult.newTestSpecsJson;
          }
          if (regenerationResult.newFinalTestCases) {
            finalTestCases = regenerationResult.newFinalTestCases;
            finalTestCasesJson = regenerationResult.newFinalTestCasesJson;
          }
          if (regenerationResult.newConstraints) {
            constraints = regenerationResult.newConstraints;
            constraintsJson = regenerationResult.newConstraintsJson;
          }
          
          // Continue to next validation attempt
          continue;
        }
        
        await updateProblemStatus(problemId, {
          generationStatus: `step7_complete_attempt_${attempt}`,
          validationDetails: JSON.stringify(validationResult),
        });
        
        sendStatus(stream, 7, `✅ Validation passed: ${validationResult.status}${attemptMsg}`);
        validationSuccess = true;
        validationFeedback = null; // Clear feedback on success
        break; // Exit retry loop on success
        
      } catch (error) {
        console.error(`Validation error (Attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error);
        
        await updateProblemStatus(problemId, {
          generationStatus: `step7_failed_attempt_${attempt}`,
          validationError: error.message
        });
        
        if (attempt === MAX_RETRIES) {
          // Exhausted all retries - validation is critical, don't fallback
          const errorMessage = `Validation system failed after ${MAX_RETRIES + 1} attempts. Last error: ${error.message}`;
          sendError(stream, errorMessage);
          throw new Error(errorMessage);
        }
        
        sendStatus(stream, 7, `⚠️ Validation system error: ${error.message.substring(0, 100)}... Retrying (${attempt + 1}/${MAX_RETRIES})...`);
        
        // Small delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!validationSuccess) {
      throw new Error("Validation failed after all retry attempts");
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
      
      // Get tie-breaking rule from intent if it exists
      const tieBreakingRule = intent.tie_breaking_rule || "";
      
      sendStatus(stream, 8, `Generating problem description...${attemptMsg}`);
      
      try {
        description = await runDescriptionGeneration(llm, {
          analyzed_intent: intent.goal,
          constraints: constraintsJson,
          test_specs_examples: exampleTestCasesJson,
          difficulty,
          language: DEFAULT_LANGUAGE,
          input_schema_description: intent.input_schema_description, // Add input schema description
          epsilon_value_from_constraints: epsilonValue, // Pass epsilon value
          tie_breaking_rule_from_intent: tieBreakingRule, // Pass tie-breaking rule
          creative_context: intent.creative_context // Pass creative context from intent analysis
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
      description: description, // Save original description
      description_translated: translatedDescription,
      targetLanguage,
      startCode, // Save start code
      completedAt,
      creatorId,
      author,
      judgeType: constraints.judge_type, 
      epsilon: constraints.judge_type === 'float_eps' ? constraints.epsilon : undefined, 
    };
    
    await updateProblemStatus(problemId, finalUpdates);
    
    // Construct final problem data
    const finalProblemData = {
      problemId,
      userPrompt,
      difficulty,
      language: DEFAULT_LANGUAGE,
      createdAt,
      schemaVersion: "v3.2_start_code", 
      intent: intentJson,
      testInputs: testSpecsJson, 
      finalTestCases: finalTestCasesJson, 
      validatedSolutionCode, 
      startCode, // Include startCode in final data
      validationDetails: JSON.stringify(validationResult),
      constraints: constraintsJson, 
      judgeType: constraints.judge_type, 
      epsilon: constraints.judge_type === 'float_eps' ? constraints.epsilon : undefined, 
      description: targetLanguage && targetLanguage.toLowerCase() !== "none" ? translatedDescription : description,
      title: targetLanguage && targetLanguage.toLowerCase() !== "none" ? translatedTitle : problemTitle,
      title_translated: translatedTitle, // Keep for direct access
      description_translated: translatedDescription, // Keep for direct access
      targetLanguage,
      generationStatus: "completed",
      completedAt,
      creatorId,
      author,
    };
    
    sendResult(stream, finalProblemData);
    sendStatus(stream, 11, "✅ Generation complete!");
    
  } catch (error) {
    console.error("Pipeline error:", error);
    
    if (problemId) {
      await updateProblemStatus(problemId, {
        generationStatus: "error",
        errorMessage: error.message,
      });
    }
    
    sendError(stream, error.message);
  } finally {
    // Ensure the stream is closed
    stream.end();
  }
}

/**
 * Regenerates components based on validation feedback
 * 
 * @param {Object} stream - SSE stream
 * @param {ChatGoogleGenerativeAI} llm - Language model
 * @param {string} problemId - Problem ID
 * @param {string} validationFeedback - Validation feedback
 * @param {Object} intent - Current intent object
 * @param {Array} testSpecs - Current test specs
 * @param {string} testSpecsJson - Test specs as JSON string
 * @param {string} currentSolutionCode - Current solution code
 * @param {string} language - Programming language
 * @param {number} attempt - Current attempt number
 * @returns {Promise<Object>} Regeneration results
 */
async function regenerateBasedOnValidationFeedback(
  stream, llm, problemId, validationFeedback, 
  intent, testSpecs, testSpecsJson, currentSolutionCode,
  language, attempt
) {
  const result = {};
  
  try {
    // Analyze validation feedback to determine what needs to be regenerated
    const feedbackAnalysis = analyzeFeedbackAndDetermineActions(validationFeedback);
    
    // Regenerate solution if needed
    if (feedbackAnalysis.regenerateSolution) {
      sendStatus(stream, 7, `Regenerating solution based on validation feedback...`);
      
      const detailedFeedback = `
Validation failed with the following issues:
${validationFeedback}

Current solution that failed validation:
\`\`\`
${currentSolutionCode}
\`\`\`

Please address the validation issues and ensure the solution properly implements the requirements.`;

      const newSolutionCode = await runSolutionGeneration(llm, {
        analyzed_intent: intent.goal,
        test_specs: testSpecsJson,
        language: language,
        feedback_section: detailedFeedback,
        input_schema_description: intent.input_schema_description,
        tie_breaking_rule: intent.tie_breaking_rule || ""
      });

      // Re-execute the new solution
      const newExecutionResults = await executeSolutionWithTestCases(newSolutionCode, testSpecs, language);
      
      if (newExecutionResults.success) {
        result.newSolutionCode = newSolutionCode;
        
        // Regenerate test cases with the new solution
        const newFinalTestCases = await finalizeTestCasesWithEdgeCases(
          newSolutionCode, newExecutionResults, llm, language
        );
        result.newFinalTestCases = newFinalTestCases;
        result.newFinalTestCasesJson = JSON.stringify(newFinalTestCases);
        
        await updateProblemStatus(problemId, {
          generationStatus: `step7_solution_regenerated_attempt_${attempt}`,
          solutionCode: newSolutionCode,
          finalTestCases: JSON.stringify(newFinalTestCases)
        });
        
        sendStatus(stream, 7, `✅ Solution regenerated and validated through execution.`);
      } else {
        throw new Error(`Regenerated solution failed execution: ${newExecutionResults.feedback}`);
      }
    }
    
    // Regenerate test design if needed
    if (feedbackAnalysis.regenerateTests) {
      sendStatus(stream, 7, `Regenerating test design based on validation feedback...`);
      
      const testFeedback = `
Validation indicated issues with test coverage or design:
${validationFeedback}

Please design better test cases that address these validation concerns.`;

      const newTestResult = await runTestDesign(llm, {
        intent,
        intent_json: JSON.stringify(intent),
        difficulty: intent.difficulty || "Medium",
        language: language,
        feedback_section: testFeedback
      });
      
      result.newTestSpecs = newTestResult.testSpecs;
      result.newTestSpecsJson = newTestResult.testSpecsJson;
      
      await updateProblemStatus(problemId, {
        generationStatus: `step7_tests_regenerated_attempt_${attempt}`,
        testSpecs: newTestResult.testSpecsJson
      });
      
      sendStatus(stream, 7, `✅ Test design regenerated based on validation feedback.`);
    }
    
    // Regenerate constraints if needed
    if (feedbackAnalysis.regenerateConstraints) {
      sendStatus(stream, 7, `Regenerating constraints based on validation feedback...`);
      
      const constraintsFeedback = `
Validation indicated issues with constraints:
${validationFeedback}

Please derive more appropriate constraints that address these concerns.`;

      const newConstraints = await runConstraintsDerivation(llm, {
        solution_code: result.newSolutionCode || currentSolutionCode,
        test_cases_json: result.newFinalTestCasesJson || testSpecsJson,
        difficulty: intent.difficulty || "Medium",
        input_schema_description: intent.input_schema_description,
        output_format_description: intent.output_format_description,
        feedback_section: constraintsFeedback
      });
      
      result.newConstraints = newConstraints.constraints;
      result.newConstraintsJson = newConstraints.constraintsJson;
      
      await updateProblemStatus(problemId, {
        generationStatus: `step7_constraints_regenerated_attempt_${attempt}`,
        constraints: newConstraints.constraintsJson
      });
      
      sendStatus(stream, 7, `✅ Constraints regenerated based on validation feedback.`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`Error during component regeneration:`, error);
    sendStatus(stream, 7, `⚠️ Error during regeneration: ${error.message.substring(0, 100)}...`);
    throw error;
  }
}

/**
 * Analyzes validation feedback to determine what components need regeneration
 * 
 * @param {string} feedback - Validation feedback
 * @returns {Object} Analysis result with regeneration flags
 */
function analyzeFeedbackAndDetermineActions(feedback) {
  const lowerFeedback = feedback.toLowerCase();
  
  return {
    regenerateSolution: lowerFeedback.includes('solution') || 
                       lowerFeedback.includes('code') || 
                       lowerFeedback.includes('implementation') ||
                       lowerFeedback.includes('algorithm'),
    regenerateTests: lowerFeedback.includes('test') || 
                     lowerFeedback.includes('coverage') || 
                     lowerFeedback.includes('edge case') ||
                     lowerFeedback.includes('example'),
    regenerateConstraints: lowerFeedback.includes('constraint') || 
                          lowerFeedback.includes('time complexity') || 
                          lowerFeedback.includes('space complexity') ||
                          lowerFeedback.includes('judge') ||
                          lowerFeedback.includes('epsilon')
  };
}

/**
 * Validates the quality of generated intent
 * 
 * @param {Object} intent - Generated intent object
 * @returns {Object} Validation result with isValid flag and issues array
 */
function validateIntentQuality(intent) {
  const issues = [];
  
  if (!intent.goal || intent.goal.trim().length < 10) {
    issues.push("Goal is too short or missing");
  }
  
  if (!intent.input_schema_description || intent.input_schema_description.trim().length < 5) {
    issues.push("Input schema description is too short or missing");
  }
  
  if (!intent.output_format_description || intent.output_format_description.trim().length < 5) {
    issues.push("Output format description is too short or missing");
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Validates the quality of generated test specifications
 * 
 * @param {Array} testSpecs - Generated test specifications
 * @param {string} difficulty - Problem difficulty
 * @returns {Object} Validation result with isValid flag and issues array
 */
function validateTestSpecsQuality(testSpecs, difficulty) {
  const issues = [];
  
  if (!Array.isArray(testSpecs) || testSpecs.length === 0) {
    issues.push("Test specs is not an array or is empty");
    return { isValid: false, issues };
  }
  
  const minTestCases = difficulty === "Easy" ? 5 : difficulty === "Medium" ? 7 : 9;
  if (testSpecs.length < minTestCases) {
    issues.push(`Insufficient test cases for ${difficulty} difficulty (${testSpecs.length} < ${minTestCases})`);
  }
  
  let hasEdgeCase = false;
  let hasTypicalCase = false;
  
  for (const [index, testCase] of testSpecs.entries()) {
    if (!testCase.input && testCase.input !== 0 && testCase.input !== "" && testCase.input !== false) {
      issues.push(`Test case ${index + 1} missing input`);
    }
    
    if (!testCase.rationale || testCase.rationale.trim().length < 5) {
      issues.push(`Test case ${index + 1} missing or insufficient rationale`);
    }
    
    const rationale = testCase.rationale?.toLowerCase() || "";
    if (rationale.includes("edge") || rationale.includes("empty") || rationale.includes("boundary")) {
      hasEdgeCase = true;
    }
    if (rationale.includes("typical") || rationale.includes("normal") || rationale.includes("standard")) {
      hasTypicalCase = true;
    }
  }
  
  if (!hasEdgeCase) {
    issues.push("No edge cases detected in test specifications");
  }
  
  if (!hasTypicalCase) {
    issues.push("No typical cases detected in test specifications");
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Validates the quality of generated solution code
 * 
 * @param {string} solutionCode - Generated solution code
 * @param {string} language - Programming language
 * @returns {Object} Validation result with isValid flag and issues array
 */
function validateSolutionCodeQuality(solutionCode, language) {
  const issues = [];
  
  if (!solutionCode || solutionCode.trim().length === 0) {
    issues.push("Solution code is empty");
    return { isValid: false, issues };
  }
  
  // Check for function definition
  if (language.toLowerCase().includes('python')) {
    if (!solutionCode.includes('def solution(')) {
      issues.push("Solution code missing 'def solution(' function definition");
    }
    
    if (!solutionCode.includes('return')) {
      issues.push("Solution code missing return statement");
    }
  }
  
  // Check for basic structure
  if (solutionCode.length < 50) {
    issues.push("Solution code seems too short to be a complete solution");
  }
  
  // Check for common issues
  if (solutionCode.includes('TODO') || solutionCode.includes('FIXME')) {
    issues.push("Solution code contains TODO or FIXME comments");
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
} 