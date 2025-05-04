import { StringOutputParser } from "@langchain/core/output_parsers";
import { testGenPromptTemplate } from "../prompts/testGen.mjs";
import { cleanLlmOutput } from "../utils/cleanLlmOutput.mjs";
import { TestGenOutputSchema } from "../schemas/testGen.mjs";

/**
 * Creates a Test Generator chain.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The test generator chain.
 */
export function createTestGenChain(llm) {
  const parser = new StringOutputParser();
  return testGenPromptTemplate.pipe(llm).pipe(parser);
}

/**
 * Creates a Test Generator chain with structured output.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The test generator chain with structured output.
 */
export function createStructuredTestGenChain(llm) {
  return testGenPromptTemplate.pipe(
    llm.withStructuredOutput(TestGenOutputSchema)
  );
}

/**
 * Runs the test generation step.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.test_specs - The test specifications from the previous step.
 * @param {string} params.solution_code - The solution code from the previous step.
 * @param {string} params.language - The target programming language.
 * @param {string} [params.feedback_section=""] - Optional feedback from previous validation failures.
 * @returns {Promise<string>} The generated test code.
 */
export async function runTestGeneration(llm, { test_specs, solution_code, language, feedback_section = "" }) {
  const chain = createTestGenChain(llm);
  
  const input = {
    test_specs,
    solution_code,
    language,
    feedback_section: feedback_section ? `\n\n**Previous Attempt Feedback:**\n${feedback_section}\nPlease address this feedback in the new test generator.` : ""
  };
  
  const output = await chain.invoke(input);
  return cleanLlmOutput(output, "code");
}

/**
 * Runs the test generation step with structured output.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.test_specs - The test specifications from the previous step.
 * @param {string} params.solution_code - The solution code from the previous step.
 * @param {string} params.language - The target programming language.
 * @param {string} [params.feedback_section=""] - Optional feedback from previous validation failures.
 * @returns {Promise<string>} The generated test code.
 */
export async function runStructuredTestGeneration(llm, { test_specs, solution_code, language, feedback_section = "" }) {
  const chain = createStructuredTestGenChain(llm);
  
  const input = {
    test_specs,
    solution_code,
    language,
    feedback_section: feedback_section ? `\n\n**Previous Attempt Feedback:**\n${feedback_section}\nPlease address this feedback in the new test generator.` : ""
  };
  
  // No need for manual cleaning with structured output
  return await chain.invoke(input);
} 