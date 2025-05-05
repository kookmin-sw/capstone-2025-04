import { StructuredOutputParser } from "@langchain/core/output_parsers"; // <-- Re-add this import
import { TestSpecsOutputSchema } from "./schema.mjs";
import { testDesignPromptTemplate } from "./prompt.mjs";

/**
 * Creates a Test Design chain using StructuredOutputParser.
 *
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The test design chain.
 */
export function createTestDesignChain(llm) {
  // Instantiate the parser
  const parser = StructuredOutputParser.fromZodSchema(TestSpecsOutputSchema);
  // Pipe the prompt, LLM, and then the parser
  return testDesignPromptTemplate.pipe(llm).pipe(parser);
}

/**
 * Runs the test design step (Step 2).
 *
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {Object} params.intent - The intent object from step 1.
 * @param {string} params.intent_json - JSON string of the intent object.
 * @param {string} params.difficulty - The difficulty level for the problem.
 * @param {string} params.language - The target programming language.
 * @returns {Promise<Object>} The designed test specifications.
 */
export async function runTestDesign(
  llm,
  { intent, intent_json, difficulty, language },
) {
  // Create the chain
  const chain = createTestDesignChain(llm);
  // We still need a parser instance here to get the format instructions for the prompt
  const parser = StructuredOutputParser.fromZodSchema(TestSpecsOutputSchema);

  // Extract input_schema_description from intent
  const input_schema_description = intent.input_schema_description || 
      "Input format not explicitly defined, derive from problem intent.";

  // Re-add format_instructions to the input object
  const input = {
    intent_json,
    difficulty,
    language,
    input_schema_description,
    format_instructions: parser.getFormatInstructions(), // <-- Add this back
  };

  try {
    // Invoke the chain. The output should already be parsed by the chain's last step.
    const testSpecs = await chain.invoke(input);

    // Validate the output type (should be an array based on the schema)
    if (!Array.isArray(testSpecs)) {
      console.error("Test Design Output is not an array:", testSpecs);
      // Attempt to log raw output if parsing failed within the chain/parser
      if (typeof testSpecs === "string") {
        console.log("Raw LLM output (likely):", testSpecs);
      }
      throw new Error(
        "Test Design step did not return a valid array of test specifications.",
      );
    }

    return {
      testSpecs,
      testSpecsJson: JSON.stringify(testSpecs),
    };
  } catch (error) {
    console.error("Error in test design step (StructuredOutputParser):", error);
    // Attempt to log raw output if attached to the error
    if (error.llmOutput) {
      console.log("Raw LLM output on error:", error.llmOutput);
    } else if (error.cause?.llmOutput) {
      console.log(
        "Raw LLM output on error (from cause):",
        error.cause.llmOutput,
      );
    } else if (error.output) {
      // The parser might attach the failed output here
      console.log("Raw LLM output from parser error:", error.output);
    }
    throw error; // Re-throw the error to be handled by the pipeline
  }
}
