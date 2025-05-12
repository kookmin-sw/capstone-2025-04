import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ValidationOutputSchema } from "./schema.mjs";
import { validationPromptTemplate } from "./prompt.mjs";

/**
 * Creates a Validation chain.
 * Updated in v3 to focus on coherence and completeness rather than solution correctness.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The validation chain.
 */
export function createValidationChain(llm) {
  const parser = StructuredOutputParser.fromZodSchema(ValidationOutputSchema);
  return validationPromptTemplate.pipe(llm).pipe(parser);
}

/**
 * Runs the validation step with a focus on coherence and completeness.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.intent_json - JSON string of the intent object.
 * @param {string} params.solution_code - The validated solution code.
 * @param {string} params.test_cases_json - JSON string of the finalized test cases with verified outputs.
 * @param {string} params.constraints_json - JSON string of the derived constraints (including judge_type).
 * @param {string} params.difficulty - The difficulty level of the problem.
 * @param {string} params.language - The target programming language.
 * @param {string} [params.input_schema_description=""] - Description of input structure
 * @returns {Promise<Object>} The validation result with status and details.
 */
export async function runValidation(llm, { 
  intent_json, 
  solution_code, 
  test_cases_json, 
  constraints_json,
  difficulty, 
  language,
  input_schema_description = "" 
}) {
  const chain = createValidationChain(llm);
  const parser = StructuredOutputParser.fromZodSchema(ValidationOutputSchema);
  
  const input = {
    intent_json,
    solution_code,
    test_cases_json,
    constraints_json,
    difficulty,
    language,
    input_schema_description,
    format_instructions: parser.getFormatInstructions(),
  };
  
  return await chain.invoke(input);
} 