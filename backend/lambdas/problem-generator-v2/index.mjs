// capstone-2025-04/backend/lambdas/problem-generator-v2/index.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  StringOutputParser,
  StructuredOutputParser,
} from "@langchain/core/output_parsers";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Readable } from "stream"; // Node.js built-in stream

// Environment Variables
const PROBLEMS_TABLE_NAME =
  process.env.PROBLEMS_TABLE_NAME || "default-problems-table";
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GENERATOR_VERBOSE =
  process.env.GENERATOR_VERBOSE?.toLowerCase() === "true";
const GEMINI_MODEL_NAME =
  process.env.GEMINI_MODEL_NAME || "gemini-2.5-pro-exp-03-25"; // Or "gemini-pro" etc.
const DEFAULT_LANGUAGE = "python3.12"; // Or make configurable

// AWS SDK Clients (v3) - reuse client instances
const dynamoDBClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// LangChain LLM Initialization
let llm;
if (GOOGLE_AI_API_KEY) {
  console.log(`Using Google AI (${GEMINI_MODEL_NAME})`);
  llm = new ChatGoogleGenerativeAI({
    modelName: GEMINI_MODEL_NAME,
    apiKey: GOOGLE_AI_API_KEY,
    maxOutputTokens: 9126, // Adjust as needed
    // temperature: 0.7, // Optional
  });
} else {
  // If you were to add Bedrock support later:
  // import { ChatBedrock } from "@langchain/aws";
  // const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID;
  // llm = new ChatBedrock({ model: BEDROCK_MODEL_ID, streaming: false /* Important for structured output */ });
  console.error(
    "FATAL: No LLM provider configured. Set GOOGLE_AI_API_KEY environment variable."
  );
  // We can't easily throw here before the handler starts, so we'll check inside
}

// --- Zod Schemas for Structured Output (Equivalent to Pydantic) ---

const IntentAnalysisOutputSchema = z
  .object({
    analyzed_intent: z
      .string()
      .describe(
        "Concise description of the core algorithm, data structure, or concept."
      ),
    // Use z.any() for flexibility, validation can happen later if needed
    test_specs: z
      .any()
      .describe(
        "Diverse set of test cases (e.g., array of objects with 'input' and 'expected_output', or a descriptive string)"
      ),
  })
  .describe(
    "Structured output for Step 1: Intent Analysis & Test Case Design."
  );

const ValidationOutputSchema = z
  .object({
    status: z.enum(["Pass", "Fail"]).describe('"Pass" or "Fail"'),
    details: z
      .string()
      .describe("Brief explanation of findings, especially on failure."),
  })
  .describe("Structured output for Step 4: LLM-Based Validation.");

const ConstraintsOutputSchema = z
  .object({
    time_limit_seconds: z
      .number()
      .describe("Estimated reasonable time limit in seconds."),
    memory_limit_mb: z
      .number()
      .int()
      .describe("Estimated reasonable memory limit in MB."),
    input_constraints: z
      .string()
      .describe("Clear constraints on input values (range, length, format)."),
  })
  .describe("Structured output for Step 5: Constraints Derivation.");

// --- LangChain Parsers ---
const intentAnalysisParser = StructuredOutputParser.fromZodSchema(
  IntentAnalysisOutputSchema
);
const validationParser = StructuredOutputParser.fromZodSchema(
  ValidationOutputSchema
);
const constraintsParser = StructuredOutputParser.fromZodSchema(
  ConstraintsOutputSchema
);
const stringParser = new StringOutputParser();

// --- LangChain Prompts ---
// (Using the same templates as the Python version)

const intentAnalysisPromptTemplate = PromptTemplate.fromTemplate(
  `
Analyze the following user request for a coding problem and design test cases.

User Prompt: {user_prompt}
Difficulty: {difficulty}
Target Language: {language}

1.  **Intent Analysis:** Concisely describe the core algorithm, data structure, or concept. Identify key elements and constraints implied by the prompt and difficulty.
2.  **Test Case Design:** Design a diverse set of test cases (inputs and expected outputs or validation logic) appropriate for the **{difficulty}** level. Include typical cases, edge cases (empty inputs, single elements, large inputs if applicable, duplicates, specific value ranges), and potentially performance-related cases if relevant to the difficulty.

{format_instructions}

Valid JSON Output:`
);

const solutionGenerationPromptTemplate = PromptTemplate.fromTemplate(
  `
Generate the solution code in {language} for the following problem intent and test specifications.

Intent:
{analyzed_intent}

Test Specifications:
{test_specs}

Requirements:
- The code must be correct and aim to pass all the specified test cases.
- The code should be efficient and follow standard coding practices for {language}.
- Adhere strictly to {language} syntax and standard libraries.

**CRITICAL:** Output **ONLY** the raw source code for the solution. Do not include explanations, comments about the code, markdown formatting (like \`\`\`python), or any other text.

{language} Solution Code:`
);

const testGenPromptTemplate = PromptTemplate.fromTemplate(
  `
Generate runnable {language} code for a test case generator based on the provided specifications and solution code.

Test Specifications:
{test_specs}

Solution Code ({language}):
\`\`\`
{solution_code}
\`\`\`

Requirements:
- The generated code must define a function, e.g., \`generate_test_cases()\`, that returns a list of test cases.
- Each test case in the list must be a dictionary containing 'input' and 'expected_output' keys.
- The generator code might need to import and execute the provided solution code logic (or re-implement its logic) to determine the correct \`expected_output\` for the generated \`input\` based on the test specifications.
- Ensure the generated inputs cover the scenarios described in the specifications (typical, edge cases, etc.).
- The generated code must be runnable in a standard {language} environment.

**CRITICAL:** Output **ONLY** the raw source code for the test case generator function. Do not include example usage, explanations, markdown formatting (like \`\`\`python), or any other text.

{language} Test Case Generator Code:`
);

const validationPromptTemplate = PromptTemplate.fromTemplate(
  `
Review the provided solution code and test case generator code for consistency and correctness based on the test specifications.

Target Language: {language}
Test Specifications:
{test_specs}

Solution Code:
\`\`\`
{solution_code}
\`\`\`

Test Case Generator Code:
\`\`\`
{test_gen_code}
\`\`\`

Review Checklist:
1.  **Solution Correctness:** Does the solution code seem logically correct for implementing the described test specifications?
2.  **Test Generator Correctness:** Does the test generator code correctly produce inputs and expected outputs that match the test specifications? Does it seem like it would execute the solution logic correctly if needed?
3.  **Consistency:** Are there any obvious inconsistencies between the solution logic and the test generator's expectations?
4.  **Errors:** Are there any obvious syntax errors or potential runtime errors in either piece of code?

{format_instructions}

Valid JSON Output:`
);

const constraintsDerivationPromptTemplate = PromptTemplate.fromTemplate(
  `
Analyze the provided solution code and test specifications to derive appropriate constraints for a coding problem intended for **{difficulty}** difficulty.

Target Language: {language}

Solution Code:
\`\`\`
{solution_code}
\`\`\`

Test Specifications:
{test_specs}

Derive the following constraints, considering the {difficulty} level:
1.  **Time Limit:** Estimate a reasonable time limit (e.g., 1 or 2 seconds) based on typical competitive programming platform standards and the code's complexity.
2.  **Memory Limit:** Estimate a reasonable memory limit (e.g., 256 or 512 MB).
3.  **Input Constraints:** Specify clear constraints on input values (e.g., range of numbers, length of arrays/strings, character sets) consistent with the solution logic, test cases, and difficulty level.

{format_instructions}

Valid JSON Output:`
);

const descriptionGenerationPromptTemplate = PromptTemplate.fromTemplate(
  `
Generate a user-facing problem description for a coding challenge based on the provided details. The tone and complexity should match the **{difficulty}** level.

Target Language: {language}

Problem Intent:
{analyzed_intent}

Constraints JSON:
{constraints}

Test Specification Examples (use for examples section):
{test_specs}

Instructions:
- Write a clear and engaging problem narrative based on the intent.
- Define the **Input Format** section clearly.
- Define the **Output Format** section clearly.
- Create a **Constraints** section, listing the constraints from the JSON input.
- Create an **Examples** section with 1-2 simple examples derived from the Test Specification Examples. Show input and corresponding output for each example.
- Ensure the overall tone, narrative complexity, and example difficulty match the specified **{difficulty}** level.

**CRITICAL:** Output **ONLY** the final problem description as a single block of plain text. You may use markdown internally for headers (e.g., \`### Input Format\`) or code blocks within the description, but the overall output must be just the description text.

Problem Description:`
);

// --- LangChain Chains (using .pipe()) ---
const intentAnalysisChain = intentAnalysisPromptTemplate
  .pipe(llm)
  .pipe(intentAnalysisParser);
const solutionGenerationChain = solutionGenerationPromptTemplate
  .pipe(llm)
  .pipe(stringParser);
const testGenChain = testGenPromptTemplate.pipe(llm).pipe(stringParser);
const validationChain = validationPromptTemplate
  .pipe(llm)
  .pipe(validationParser);
const constraintsDerivationChain = constraintsDerivationPromptTemplate
  .pipe(llm)
  .pipe(constraintsParser);
const descriptionGenerationChain = descriptionGenerationPromptTemplate
  .pipe(llm)
  .pipe(stringParser);

// --- Helper Functions ---

/**
 * Sends an SSE message to the response stream.
 * @param {awslambda.HttpResponseStream} stream - The response stream.
 * @param {string} eventType - The event type (e.g., 'status', 'result', 'error').
 * @param {object} payload - The JSON payload for the event.
 */
function sendSse(stream, eventType, payload) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  stream.write(message);
  if (GENERATOR_VERBOSE) {
    console.log(`SSE Sent: ${eventType} - Payload:`, payload);
  }
}

/**
 * Updates the DynamoDB item with status and other attributes.
 * Uses AWS SDK v3 DynamoDBDocumentClient UpdateCommand.
 * @param {string} problemId - The ID of the problem item.
 * @param {object} updates - An object containing updates (e.g., { generationStatus: 'running', errorMessage: '...', analyzedIntent: '...' }).
 */
async function updateDynamoDbStatus(problemId, updates) {
  if (!problemId || Object.keys(updates).length === 0) {
    console.warn("Skipping DynamoDB update: Missing problemId or updates.");
    return;
  }

  const updateExpressionParts = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // Dynamically build the update expression parts
  for (const [key, value] of Object.entries(updates)) {
    const namePlaceholder = `#${key}`;
    const valuePlaceholder = `:${key}Val`;
    updateExpressionParts.push(`${namePlaceholder} = ${valuePlaceholder}`);
    expressionAttributeNames[namePlaceholder] = key;
    expressionAttributeValues[valuePlaceholder] = value;
  }

  const updateExpression = `SET ${updateExpressionParts.join(", ")}`;

  const command = new UpdateCommand({
    TableName: PROBLEMS_TABLE_NAME,
    Key: {
      problemId: problemId,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "NONE", // Or "UPDATED_NEW" if needed
  });

  try {
    await docClient.send(command);
    if (GENERATOR_VERBOSE) {
      console.log(
        `DynamoDB updated for ${problemId}: ${JSON.stringify(updates)}`
      );
    }
  } catch (error) {
    console.error(`Error updating DynamoDB for ${problemId}:`, error);
    // Decide if this should be fatal or just logged
  }
}

/**
 * Cleans LLM string output, removing markdown fences or extra text.
 * @param {string} outputString - The raw output from the LLM.
 * @param {'code' | 'json' | 'text'} expectedType - The expected type of content.
 * @returns {string} The cleaned string.
 */
function cleanLlMOutput(outputString, expectedType = "code") {
  let cleaned = outputString.trim();

  // Generic removal of ```<lang>\n ... ``` fences
  // Covers ```python, ```json, ``` etc.
  const fenceMatch = cleaned.match(/^```(?:\w*\n)?([\s\S]*?)```$/);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }

  // Additional cleanup specific to types if needed
  if (expectedType === "json") {
    // Ensure it looks like JSON, find first { and last }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }
    // Optionally try parsing and stringifying to ensure validity/formatting
    try {
      cleaned = JSON.stringify(JSON.parse(cleaned));
    } catch (e) {
      console.warn("Cleaned JSON output might still be invalid:", cleaned);
    }
  }

  return cleaned;
}

// --- Main Lambda Handler ---
export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    // Check if LLM is configured
    if (!llm) {
      const metadata = {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
        },
      };
      responseStream = awslambda.HttpResponseStream.from(
        responseStream,
        metadata
      );
      sendSse(responseStream, "error", {
        payload: "LLM provider not configured on the server.",
      });
      responseStream.end();
      return;
    }

    // --- Set SSE Headers FIRST ---
    const sseMetadata = {
      statusCode: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        // Add CORS headers if needed, although CloudFront might handle this
        // "Access-Control-Allow-Origin": "*"
      },
    };
    // Apply metadata - this returns the stream to use for writing
    const stream = awslambda.HttpResponseStream.from(
      responseStream,
      sseMetadata
    );

    let problemId = null; // Initialize problemId

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
        language: DEFAULT_LANGUAGE, // Use constant or make configurable
      };

      try {
        const putCommand = new PutCommand({
          TableName: PROBLEMS_TABLE_NAME,
          Item: initialItem,
          ConditionExpression: "attribute_not_exists(problemId)",
        });
        await docClient.send(putCommand);
        console.log(`Initial DynamoDB record created for ${problemId}`);
      } catch (error) {
        if (error.name === "ConditionalCheckFailedException") {
          console.warn(
            `Problem ID ${problemId} already exists. Restarting generation.`
          );
          await updateDynamoDbStatus(problemId, {
            generationStatus: "restarted",
          });
        } else {
          console.error("Error creating initial DynamoDB record:", error);
          throw new Error(
            `Failed to initialize problem state: ${error.message}`
          ); // Make it fatal
        }
      }

      // --- Generation Pipeline ---

      // Helper to run a chain step
      async function runChainStep(
        stepNum,
        chain,
        inputData,
        outputKey,
        parser
      ) {
        sendSse(stream, "status", {
          step: stepNum,
          message: `Step ${stepNum}: Running ${outputKey}...`,
        });
        try {
          // Inject format instructions if the parser requires them
          const fullInput =
            parser && parser.getFormatInstructions
              ? {
                  ...inputData,
                  format_instructions: parser.getFormatInstructions(),
                }
              : inputData;

          if (GENERATOR_VERBOSE)
            console.log(`Step ${stepNum} Input:`, fullInput);

          // Invoke the chain
          const output = await chain.invoke(fullInput);

          if (GENERATOR_VERBOSE)
            console.log(`Step ${stepNum} Raw Output:`, output);

          // Note: Cleaning happens *after* this function returns, before saving to DB
          return output;
        } catch (error) {
          console.error(`Error in Step ${stepNum} (${outputKey}):`, error);
          const errorMessage = `Step ${stepNum} (${outputKey}) failed: ${error.message}`;
          await updateDynamoDbStatus(problemId, {
            generationStatus: `step${stepNum}_failed`,
            errorMessage: errorMessage,
          });
          sendSse(stream, "error", {
            payload: errorMessage,
          });
          throw error; // Re-throw to stop the pipeline
        }
      }

      // == PIPELINE START ==
      sendSse(stream, "status", {
        step: 1,
        message: "Analyzing prompt and designing test cases...",
      });
      const step1Input = {
        user_prompt: userPrompt,
        difficulty: difficulty,
        language: DEFAULT_LANGUAGE,
      };
      const step1Output = await runChainStep(
        1,
        intentAnalysisChain,
        step1Input,
        "Intent/Tests",
        intentAnalysisParser // Pass parser for format instructions
      );
      const analyzedIntent = step1Output.analyzed_intent;
      const testSpecs = step1Output.test_specs; // Can be object/array/string
      if (!analyzedIntent || !testSpecs) {
        throw new Error(
          "Step 1 failed to produce valid intent and test specs."
        );
      }
      const testSpecsStr = JSON.stringify(testSpecs); // Store as JSON string
      await updateDynamoDbStatus(problemId, {
        generationStatus: "step1_complete",
        analyzedIntent: analyzedIntent,
        testSpecifications: testSpecsStr,
      });
      sendSse(stream, "status", {
        step: 1,
        message: "✅ Intent analyzed, test specs designed.",
      });

      sendSse(stream, "status", {
        step: 2,
        message: "Generating solution code...",
      });
      const step2Input = {
        analyzed_intent: analyzedIntent,
        test_specs: testSpecsStr, // Pass JSON string representation
        language: DEFAULT_LANGUAGE,
      };
      const solutionCodeRaw = await runChainStep(
        2,
        solutionGenerationChain,
        step2Input,
        "Solution Code"
      );
      const solutionCode = cleanLlMOutput(solutionCodeRaw, "code");
      await updateDynamoDbStatus(problemId, {
        generationStatus: "step2_complete",
        solutionCode: solutionCode,
      });
      sendSse(stream, "status", {
        step: 2,
        message: "✅ Solution code generated.",
      });

      sendSse(stream, "status", {
        step: 3,
        message: "Generating test case code...",
      });
      const step3Input = {
        test_specs: testSpecsStr,
        solution_code: solutionCode,
        language: DEFAULT_LANGUAGE,
      };
      const testGenCodeRaw = await runChainStep(
        3,
        testGenChain,
        step3Input,
        "Test Gen Code"
      );
      const testGenCode = cleanLlMOutput(testGenCodeRaw, "code");
      await updateDynamoDbStatus(problemId, {
        generationStatus: "step3_complete",
        testGeneratorCode: testGenCode,
      });
      sendSse(stream, "status", {
        step: 3,
        message: "✅ Test generator code generated.",
      });

      sendSse(stream, "status", {
        step: 4,
        message: "Validating generated code (LLM Review)...",
      });
      const step4Input = {
        solution_code: solutionCode,
        test_gen_code: testGenCode,
        test_specs: testSpecsStr,
        language: DEFAULT_LANGUAGE,
      };
      const validationResult = await runChainStep(
        4,
        validationChain,
        step4Input,
        "Validation",
        validationParser // Pass parser for format instructions
      );
      console.log("Step 4 Output (Validation):", validationResult);
      if (validationResult.status?.toLowerCase() !== "pass") {
        const errorMsg = `LLM Validation failed: ${validationResult.details}`;
        await updateDynamoDbStatus(problemId, {
          generationStatus: "step4_failed",
          errorMessage: errorMsg,
        });
        sendSse(stream, "error", {
          payload: errorMsg,
        });
        throw new Error(errorMsg);
      }
      await updateDynamoDbStatus(problemId, {
        generationStatus: "step4_complete",
        validationDetails: JSON.stringify(validationResult),
      });
      sendSse(stream, "status", {
        step: 4,
        message: "✅ Validation successful!",
      });

      sendSse(stream, "status", {
        step: 5,
        message: "Deriving problem constraints...",
      });
      const step5Input = {
        solution_code: solutionCode,
        test_specs: testSpecsStr,
        language: DEFAULT_LANGUAGE,
        difficulty: difficulty,
      };
      const constraints = await runChainStep(
        5,
        constraintsDerivationChain,
        step5Input,
        "Constraints",
        constraintsParser // Pass parser for format instructions
      );
      const constraintsJson = JSON.stringify(constraints);
      await updateDynamoDbStatus(problemId, {
        generationStatus: "step5_complete",
        constraints: constraintsJson,
      });
      sendSse(stream, "status", {
        step: 5,
        message: "✅ Constraints derived.",
      });

      sendSse(stream, "status", {
        step: 6,
        message: "Generating final problem description...",
      });
      let exampleSpecsStr = "[]"; // Default if testSpecs wasn't structured list/array
      try {
        const parsedSpecs = JSON.parse(testSpecsStr);
        if (Array.isArray(parsedSpecs)) {
          exampleSpecsStr = JSON.stringify(parsedSpecs.slice(0, 2)); // Take first 2 examples
        } else {
          exampleSpecsStr = testSpecsStr; // Use the original string if not an array
        }
      } catch (e) {
        console.warn(
          "Could not parse testSpecs for examples, using original string:",
          e
        );
        exampleSpecsStr = testSpecsStr;
      }

      const step6Input = {
        analyzed_intent: analyzedIntent,
        constraints: constraintsJson,
        test_specs: exampleSpecsStr, // Pass examples
        difficulty: difficulty,
        language: DEFAULT_LANGUAGE,
      };
      const problemDescriptionRaw = await runChainStep(
        6,
        descriptionGenerationChain,
        step6Input,
        "Description"
      );
      const problemDescription = cleanLlMOutput(problemDescriptionRaw, "text");
      await updateDynamoDbStatus(problemId, {
        generationStatus: "step6_complete",
        description: problemDescription,
      });
      sendSse(stream, "status", {
        step: 6,
        message: "✅ Problem description generated.",
      });

      sendSse(stream, "status", {
        step: 7,
        message: "Finalizing and saving...",
      });
      const problemTitle = `Generated: ${analyzedIntent.substring(
        0,
        60
      )}... (${difficulty})`;
      const completedAt = new Date().toISOString();
      await updateDynamoDbStatus(problemId, {
        generationStatus: "completed",
        title: problemTitle,
        completedAt: completedAt,
      });
      console.log(`Step 7: Final status updated for problem ${problemId}.`);

      // Construct final result object
      const finalProblem = {
        problemId: problemId,
        title: problemTitle,
        description: problemDescription,
        difficulty: difficulty,
        constraints: constraintsJson, // Keep as JSON string
        solutionCode: solutionCode,
        testGeneratorCode: testGenCode,
        analyzedIntent: analyzedIntent,
        testSpecifications: testSpecsStr, // Keep as JSON string
        generationStatus: "completed",
        language: DEFAULT_LANGUAGE,
        createdAt: createdAt, // From initial creation
        completedAt: completedAt,
      };

      sendSse(stream, "result", {
        payload: finalProblem,
      });
      sendSse(stream, "status", {
        step: 7,
        message: "✅ Generation complete!",
      });
      // == PIPELINE END ==
    } catch (error) {
      console.error("!!! Pipeline Error:", error);
      const errorMessage = `Error during generation: ${
        error.message || "Unknown error"
      }`;
      // Attempt to update DB if problemId exists
      if (problemId) {
        try {
          await updateDynamoDbStatus(problemId, {
            generationStatus: "failed",
            errorMessage: errorMessage.substring(0, 1000), // Limit error message size
          });
        } catch (dbError) {
          console.error(
            "Failed to update DynamoDB with error status:",
            dbError
          );
        }
      }
      // Attempt to send error via SSE, headers might already be sent
      try {
        sendSse(stream, "error", {
          payload: errorMessage,
        });
      } catch (sseError) {
        console.error("Failed to send final error via SSE:", sseError);
      }
    } finally {
      console.log("Ending response stream.");
      stream.end(); // Ensure stream is closed
    }
  }
);
