import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ValidationOutputSchema } from "../schemas/validation.mjs";
import { validationPromptTemplate } from "../prompts/validation.mjs";

/**
 * Creates a Validation chain.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The validation chain.
 */
export function createValidationChain(llm) {
  const parser = StructuredOutputParser.fromZodSchema(ValidationOutputSchema);
  return validationPromptTemplate.pipe(llm).pipe(parser);
}

/**
 * Runs the validation step.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.intent_json - JSON string of the intent object.
 * @param {string} params.solution_code - The solution code to validate.
 * @param {string} params.test_gen_code - The test generator code to validate.
 * @param {string} params.test_specs - The test specifications.
 * @param {string} params.language - The target programming language.
 * @returns {Promise<Object>} The validation result with status and details.
 */
export async function runValidation(llm, { intent_json, solution_code, test_gen_code, test_specs, language }) {
  const chain = createValidationChain(llm);
  const parser = StructuredOutputParser.fromZodSchema(ValidationOutputSchema);
  
  const input = {
    intent_json,
    solution_code,
    test_gen_code,
    test_specs,
    language,
    format_instructions: parser.getFormatInstructions(),
  };
  
  return await chain.invoke(input);
} 