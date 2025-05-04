import { StringOutputParser } from "@langchain/core/output_parsers";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { solutionGenerationPromptTemplate } from "../prompts/solutionGen.mjs";
import { cleanLlmOutput } from "../utils/cleanLlmOutput.mjs";
import { SolutionOutputSchema } from "../schemas/solution.mjs";

/**
 * Creates a Solution Generation chain.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The solution generation chain.
 */
export function createSolutionGenerationChain(llm) {
  const parser = new StringOutputParser();
  return solutionGenerationPromptTemplate.pipe(llm).pipe(parser);
}

/**
 * Creates a Solution Generation chain with structured output.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The solution generation chain with structured output.
 */
export function createStructuredSolutionGenerationChain(llm) {
  return solutionGenerationPromptTemplate.pipe(
    llm.withStructuredOutput(SolutionOutputSchema)
  );
}

/**
 * Runs the solution generation step.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.analyzed_intent - The analyzed intent from the previous step.
 * @param {string} params.test_specs - The test specifications from the previous step.
 * @param {string} params.language - The target programming language.
 * @param {string} [params.feedback_section=""] - Optional feedback from previous validation failures.
 * @returns {Promise<string>} The generated solution code.
 */
export async function runSolutionGeneration(llm, { analyzed_intent, test_specs, language, feedback_section = "" }) {
  const chain = createSolutionGenerationChain(llm);
  
  const input = {
    analyzed_intent,
    test_specs,
    language,
    feedback_section: feedback_section ? `\n\n**Previous Attempt Feedback:**\n${feedback_section}\nPlease address this feedback in the new solution.` : ""
  };
  
  const output = await chain.invoke(input);
  return cleanLlmOutput(output, "code");
}

/**
 * Runs the solution generation step with structured output.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.analyzed_intent - The analyzed intent from the previous step.
 * @param {string} params.test_specs - The test specifications from the previous step.
 * @param {string} params.language - The target programming language.
 * @param {string} [params.feedback_section=""] - Optional feedback from previous validation failures.
 * @returns {Promise<string>} The generated solution code.
 */
export async function runStructuredSolutionGeneration(llm, { analyzed_intent, test_specs, language, feedback_section = "" }) {
  const chain = createStructuredSolutionGenerationChain(llm);
  
  const input = {
    analyzed_intent,
    test_specs,
    language,
    feedback_section: feedback_section ? `\n\n**Previous Attempt Feedback:**\n${feedback_section}\nPlease address this feedback in the new solution.` : ""
  };
  
  // No need for manual cleaning with structured output
  return await chain.invoke(input);
} 