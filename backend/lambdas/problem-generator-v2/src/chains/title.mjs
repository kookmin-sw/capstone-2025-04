import { StringOutputParser } from "@langchain/core/output_parsers";
import { titleGenerationPromptTemplate } from "../prompts/title.mjs";
import { cleanLlmOutput } from "../utils/cleanLlmOutput.mjs";
import { TitleOutputSchema } from "../schemas/title.mjs";

/**
 * Creates a Title Generation chain.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The title generation chain.
 */
export function createTitleChain(llm) {
  const parser = new StringOutputParser();
  return titleGenerationPromptTemplate.pipe(llm).pipe(parser);
}

/**
 * Creates a Title Generation chain with structured output.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The title generation chain with structured output.
 */
export function createStructuredTitleChain(llm) {
  return titleGenerationPromptTemplate.pipe(
    llm.withStructuredOutput(TitleOutputSchema)
  );
}

/**
 * Runs the title generation step.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.difficulty - The difficulty level for the problem.
 * @param {string} params.analyzed_intent - The analyzed intent.
 * @param {string} params.description_snippet - A snippet of the problem description.
 * @returns {Promise<string>} The generated title.
 */
export async function runTitleGeneration(llm, { difficulty, analyzed_intent, description_snippet }) {
  const chain = createTitleChain(llm);
  
  const input = {
    difficulty,
    analyzed_intent,
    description_snippet,
  };
  
  const output = await chain.invoke(input);
  return cleanLlmOutput(output, "text").trim();
}

/**
 * Runs the title generation step with structured output.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.difficulty - The difficulty level for the problem.
 * @param {string} params.analyzed_intent - The analyzed intent.
 * @param {string} params.description_snippet - A snippet of the problem description.
 * @returns {Promise<string>} The generated title.
 */
export async function runStructuredTitleGeneration(llm, { difficulty, analyzed_intent, description_snippet }) {
  const chain = createStructuredTitleChain(llm);
  
  const input = {
    difficulty,
    analyzed_intent,
    description_snippet,
  };
  
  // No need for manual cleaning with structured output
  return await chain.invoke(input);
} 