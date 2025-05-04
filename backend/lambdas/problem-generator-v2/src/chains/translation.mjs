import { StringOutputParser } from "@langchain/core/output_parsers";
import { translationPromptTemplate } from "../prompts/translation.mjs";
import { cleanLlmOutput } from "../utils/cleanLlmOutput.mjs";
import { TranslationOutputSchema } from "../schemas/translation.mjs";

/**
 * Creates a Translation chain.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The translation chain.
 */
export function createTranslationChain(llm) {
  const parser = new StringOutputParser();
  return translationPromptTemplate.pipe(llm).pipe(parser);
}

/**
 * Creates a Translation chain with structured output.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The translation chain with structured output.
 */
export function createStructuredTranslationChain(llm) {
  return translationPromptTemplate.pipe(
    llm.withStructuredOutput(TranslationOutputSchema)
  );
}

/**
 * Runs the translation step.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.target_language - The target language for translation.
 * @param {string} params.text_to_translate - The text to translate.
 * @returns {Promise<string>} The translated text.
 */
export async function runTranslation(llm, { target_language, text_to_translate }) {
  const chain = createTranslationChain(llm);
  
  const input = {
    target_language,
    text_to_translate,
  };
  
  const output = await chain.invoke(input);
  return cleanLlmOutput(output, "text");
}

/**
 * Runs the translation step with structured output.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.target_language - The target language for translation.
 * @param {string} params.text_to_translate - The text to translate.
 * @returns {Promise<string>} The translated text.
 */
export async function runStructuredTranslation(llm, { target_language, text_to_translate }) {
  const chain = createStructuredTranslationChain(llm);
  
  const input = {
    target_language,
    text_to_translate,
  };
  
  // No need for manual cleaning with structured output
  return await chain.invoke(input);
} 