import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ConstraintsOutputSchema } from "../schemas/constraints.mjs";
import { constraintsDerivationPromptTemplate } from "../prompts/constraints.mjs";

/**
 * Creates a Constraints Derivation chain.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The constraints derivation chain.
 */
export function createConstraintsChain(llm) {
  const parser = StructuredOutputParser.fromZodSchema(ConstraintsOutputSchema);
  return constraintsDerivationPromptTemplate.pipe(llm).pipe(parser);
}

/**
 * Runs the constraints derivation step.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.solution_code - The validated solution code.
 * @param {string} params.test_specs - The test specifications.
 * @param {string} params.language - The target programming language.
 * @param {string} params.difficulty - The difficulty level for the problem.
 * @returns {Promise<Object>} The derived constraints.
 */
export async function runConstraintsDerivation(llm, { solution_code, test_specs, language, difficulty }) {
  const chain = createConstraintsChain(llm);
  const parser = StructuredOutputParser.fromZodSchema(ConstraintsOutputSchema);
  
  const input = {
    solution_code,
    test_specs,
    language,
    difficulty,
    format_instructions: parser.getFormatInstructions(),
  };
  
  const constraints = await chain.invoke(input);
  return {
    constraints,
    constraintsJson: JSON.stringify(constraints)
  };
} 