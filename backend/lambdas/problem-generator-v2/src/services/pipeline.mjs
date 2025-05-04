import { v4 as uuidv4 } from "uuid";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { 
  GOOGLE_AI_API_KEY, 
  GEMINI_MODEL_NAME, 
  GENERATOR_VERBOSE, 
  DEFAULT_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  MAX_RETRIES
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
  runTestGeneration,
  runValidation,
  runConstraintsDerivation,
  runDescriptionGeneration,
  runTitleGeneration,
  runTranslation
} from "../chains/index.mjs";

// LLM Initialization
let llm;
if (GOOGLE_AI_API_KEY) {
  console.log(`Using Google AI (${GEMINI_MODEL_NAME})`);
  llm = new ChatGoogleGenerativeAI({
    modelName: GEMINI_MODEL_NAME,
    apiKey: GOOGLE_AI_API_KEY,
    maxOutputTokens: 9126, // Adjust as needed
  });
} else {
  console.error(
    "FATAL: No LLM provider configured. Set GOOGLE_AI_API_KEY environment variable."
  );
}

/**
 * Main problem generation pipeline that orchestrates all steps.
 * 
 * @param {object} event - The Lambda event object.
 * @param {awslambda.ResponseStream} responseStream - The Lambda response stream.
 */
export async function pipeline(event, responseStream) {
  // Initialize SSE stream
  const stream = initializeSseStream(responseStream);
  
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
    };

    await createProblem(initialItem);
    
    // --- Generation Pipeline Steps ---
    
    // --- Step 1: Intent Analysis ---
    sendStatus(stream, 1, "Analyzing prompt and extracting intent...");
    
    const { intent, intentJson } = await runIntentAnalysis(llm, {
      user_prompt: userPrompt,
      difficulty,
      language: DEFAULT_LANGUAGE
    });
    
    if (!intent || !intent.goal) {
      throw new Error("Step 1 failed to produce valid intent.");
    }
    
    await updateProblemStatus(problemId, {
      generationStatus: "step1_complete",
      intent: intentJson,
    });
    
    sendStatus(stream, 1, "✅ Intent extracted: " + intent.goal);
    
    // --- Step 2: Test Design ---
    sendStatus(stream, 2, "Designing test cases based on intent...");
    
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
    
    sendStatus(stream, 2, `✅ Test cases designed: ${testSpecs.length} cases with rationales.`);
    
    // --- Steps 3, 4, 5: Generation & Validation Loop ---
    let solutionCode = null;
    let testGenCode = null;
    let validationResult = null;
    let validationFeedback = null; // Store feedback for retries
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      const attemptMsg = isRetry ? ` (Attempt ${attempt + 1}/${MAX_RETRIES + 1})` : "";
      
      // --- Step 3: Solution Generation ---
      sendStatus(stream, 3, `Generating solution code...${attemptMsg}`);
      
      solutionCode = await runSolutionGeneration(llm, {
        analyzed_intent: intent.goal,
        test_specs: testSpecsJson,
        language: DEFAULT_LANGUAGE,
        feedback_section: validationFeedback
      });
      
      await updateProblemStatus(problemId, {
        generationStatus: `step3_attempt_${attempt}`,
        solutionCode,
      });
      
      sendStatus(stream, 3, `✅ Solution code generated.${attemptMsg}`);
      
      // --- Step 4: Test Case Generation ---
      sendStatus(stream, 4, `Generating test case code...${attemptMsg}`);
      
      testGenCode = await runTestGeneration(llm, {
        test_specs: testSpecsJson,
        solution_code: solutionCode,
        language: DEFAULT_LANGUAGE,
        feedback_section: validationFeedback
      });
      
      await updateProblemStatus(problemId, {
        generationStatus: `step4_attempt_${attempt}`,
        testGeneratorCode: testGenCode,
      });
      
      sendStatus(stream, 4, `✅ Test generator code generated.${attemptMsg}`);
      
      // --- Step 5: Validation ---
      sendStatus(stream, 5, `Validating generated code (LLM Review)...${attemptMsg}`);
      
      validationResult = await runValidation(llm, {
        intent_json: intentJson,
        solution_code: solutionCode,
        test_gen_code: testGenCode,
        test_specs: testSpecsJson,
        language: DEFAULT_LANGUAGE
      });
      
      console.log(`Step 5 Output (Validation Attempt ${attempt + 1}):`, validationResult);
      
      if (validationResult.status?.toLowerCase() === "pass") {
        validationFeedback = null; // Clear feedback on success
        await updateProblemStatus(problemId, {
          generationStatus: "step5_complete",
          validationDetails: JSON.stringify(validationResult),
        });
        sendStatus(stream, 5, "✅ Validation successful!");
        break; // Exit the retry loop
      } else {
        // Validation failed
        validationFeedback = validationResult.details || "Validation failed without details.";
        const errorMsg = `LLM Validation failed (Attempt ${attempt + 1}): ${validationFeedback}`;
        
        await updateProblemStatus(problemId, {
          generationStatus: `step5_failed_attempt_${attempt}`,
          errorMessage: errorMsg,
          validationDetails: JSON.stringify(validationResult),
        });
        
        sendStatus(stream, 5, `⚠️ Validation failed. ${isRetry ? "Retrying..." : ""} Feedback: ${validationFeedback}`);
        
        if (attempt === MAX_RETRIES) {
          // Exhausted all retries
          sendError(stream, `Validation failed after ${MAX_RETRIES + 1} attempts. Last error: ${validationFeedback}`);
          throw new Error(`Validation failed after ${MAX_RETRIES + 1} attempts. Last error: ${validationFeedback}`);
        }
      }
    }
    
    // --- Step 6: Constraints Derivation ---
    sendStatus(stream, 6, "Deriving problem constraints...");
    
    const { constraints, constraintsJson } = await runConstraintsDerivation(llm, {
      solution_code: solutionCode,
      test_specs: testSpecsJson,
      language: DEFAULT_LANGUAGE,
      difficulty
    });
    
    await updateProblemStatus(problemId, {
      generationStatus: "step6_complete",
      constraints: constraintsJson,
    });
    
    sendStatus(stream, 6, "✅ Constraints derived.");
    
    // --- Step 7: Description Generation ---
    sendStatus(stream, 7, "Generating final problem description...");
    
    let exampleSpecsStr = "[]";
    try {
      if (testSpecs.length > 0) {
        exampleSpecsStr = JSON.stringify(testSpecs.slice(0, 2)); // Take first 2 examples
      }
    } catch (e) {
      console.warn("Could not prepare examples for description generation:", e);
    }
    
    const problemDescription = await runDescriptionGeneration(llm, {
      analyzed_intent: intent.goal,
      constraints: constraintsJson,
      test_specs_examples: exampleSpecsStr,
      difficulty,
      language: DEFAULT_LANGUAGE
    });
    
    await updateProblemStatus(problemId, {
      generationStatus: "step7_complete",
      description: problemDescription,
    });
    
    sendStatus(stream, 7, "✅ Problem description generated.");
    
    // --- Step 7.5: Title Generation ---
    sendStatus(stream, 7.5, "Generating problem title...");
    
    const descriptionSnippet = problemDescription.substring(0, 200); // Take a snippet
    
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
      generationStatus: "step7_5_complete",
      title: problemTitle,
    });
    
    sendStatus(stream, 7.5, "✅ Problem title generated.");
    
    // --- Step 8: Translation ---
    let translatedTitle = problemTitle; // Default to original
    let translatedDescription = problemDescription; // Default to original
    const targetLanguage = DEFAULT_TARGET_LANGUAGE;
    
    if (targetLanguage && targetLanguage.toLowerCase() !== "none") {
      sendStatus(stream, 8, `Translating title and description to ${targetLanguage}...`);
      
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
          text_to_translate: problemDescription
        });
        
        await updateProblemStatus(problemId, {
          generationStatus: "step8_complete",
          title_translated: translatedTitle,
          description_translated: translatedDescription,
          targetLanguage,
        });
        
        sendStatus(stream, 8, `✅ Title and description translated to ${targetLanguage}.`);
      } catch (translationError) {
        console.error(`Translation to ${targetLanguage} failed:`, translationError);
        await updateProblemStatus(problemId, {
          translationError: `Failed to translate to ${targetLanguage}: ${translationError.message}`,
        });
        sendStatus(stream, 8, `⚠️ Translation to ${targetLanguage} failed. Using original text.`);
      }
    } else {
      sendStatus(stream, 8, `Skipping translation (no target language specified).`);
    }
    
    // --- Step 9: Finalization ---
    sendStatus(stream, 9, "Finalizing and saving...");
    
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
      intent: intentJson,
      testSpecifications: testSpecsJson,
      solutionCode,
      testGeneratorCode: testGenCode,
      validationDetails: JSON.stringify(validationResult),
      constraints: constraintsJson,
      description: targetLanguage && targetLanguage.toLowerCase() !== "none" ? translatedDescription : problemDescription,
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
    sendStatus(stream, 9, "✅ Generation complete!");
    
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