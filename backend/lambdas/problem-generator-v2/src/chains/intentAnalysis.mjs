import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { IntentOutputSchema } from "../schemas/intent.mjs";
import { intentAnalysisPromptTemplate } from "../prompts/intentAnalysis.mjs";

/**
 * Creates an Intent Extraction chain.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The intent extraction chain.
 */
export function createIntentAnalysisChain(llm) {
  const parser = StructuredOutputParser.fromZodSchema(IntentOutputSchema);
  return intentAnalysisPromptTemplate.pipe(llm).pipe(parser);
}

/**
 * Runs the intent analysis step (Step 1).
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.user_prompt - The user's original prompt.
 * @param {string} params.difficulty - The difficulty level for the problem.
 * @param {string} params.language - The target programming language.
 * @returns {Promise<Object>} The extracted intent.
 */
export async function runIntentAnalysis(llm, { user_prompt, difficulty, language }) {
  const chain = createIntentAnalysisChain(llm);
  const parser = StructuredOutputParser.fromZodSchema(IntentOutputSchema);
  
  const input = {
    user_prompt,
    difficulty,
    language,
    format_instructions: parser.getFormatInstructions(),
  };
  
  const intent = await chain.invoke(input);
  
  return {
    intent,
    intentJson: JSON.stringify(intent),
  };
} 