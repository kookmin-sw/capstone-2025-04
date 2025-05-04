import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { TestSpecsOutputSchema } from "../schemas/testSpecs.mjs";
import { testDesignPromptTemplate } from "../prompts/testDesign.mjs";

/**
 * Creates a Test Design chain.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The test design chain.
 */
export function createTestDesignChain(llm) {
  const parser = StructuredOutputParser.fromZodSchema(TestSpecsOutputSchema);
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
export async function runTestDesign(llm, { intent, intent_json, difficulty, language }) {
  const chain = createTestDesignChain(llm);
  const parser = StructuredOutputParser.fromZodSchema(TestSpecsOutputSchema);
  
  const input = {
    intent_json,
    difficulty,
    language,
    format_instructions: parser.getFormatInstructions(),
  };
  
  const testSpecs = await chain.invoke(input);
  
  return {
    testSpecs,
    testSpecsJson: JSON.stringify(testSpecs)
  };
} 