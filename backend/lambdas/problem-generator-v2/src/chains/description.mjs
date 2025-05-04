import { StringOutputParser } from "@langchain/core/output_parsers";
import { descriptionGenerationPromptTemplate } from "../prompts/description.mjs";
import { cleanLlmOutput } from "../utils/cleanLlmOutput.mjs";
import { DescriptionOutputSchema } from "../schemas/description.mjs";

/**
 * Creates a Description Generation chain.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The description generation chain.
 */
export function createDescriptionChain(llm) {
  const parser = new StringOutputParser();
  return descriptionGenerationPromptTemplate.pipe(llm).pipe(parser);
}

/**
 * Creates a Description Generation chain with structured output.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The description generation chain with structured output.
 */
export function createStructuredDescriptionChain(llm) {
  return descriptionGenerationPromptTemplate.pipe(
    llm.withStructuredOutput(DescriptionOutputSchema)
  );
}

/**
 * Runs the description generation step.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.analyzed_intent - The analyzed intent.
 * @param {string} params.constraints - Constraints as JSON string.
 * @param {string} params.test_specs_examples - Examples from test specs as JSON string.
 * @param {string} params.difficulty - The difficulty level for the problem.
 * @param {string} params.language - The target programming language.
 * @returns {Promise<string>} The generated problem description.
 */
export async function runDescriptionGeneration(llm, { analyzed_intent, constraints, test_specs_examples, difficulty, language }) {
  const chain = createDescriptionChain(llm);
  
  const input = {
    analyzed_intent,
    constraints,
    test_specs_examples,
    difficulty,
    language,
  };
  
  const output = await chain.invoke(input);
  return cleanLlmOutput(output, "text");
}

/**
 * Runs the description generation step with structured output.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.analyzed_intent - The analyzed intent.
 * @param {string} params.constraints - Constraints as JSON string.
 * @param {string} params.test_specs_examples - Examples from test specs as JSON string.
 * @param {string} params.difficulty - The difficulty level for the problem.
 * @param {string} params.language - The target programming language.
 * @returns {Promise<string>} The generated problem description.
 */
export async function runStructuredDescriptionGeneration(llm, { analyzed_intent, constraints, test_specs_examples, difficulty, language }) {
  const chain = createStructuredDescriptionChain(llm);
  
  const input = {
    analyzed_intent,
    constraints,
    test_specs_examples,
    difficulty,
    language,
  };
  
  // No need for manual cleaning with structured output
  return await chain.invoke(input);
} 