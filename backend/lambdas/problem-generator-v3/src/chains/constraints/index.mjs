import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ConstraintsOutputSchema } from "./schema.mjs";
import { constraintsDerivationPromptTemplate } from "./prompt.mjs";
import { ALLOWED_JUDGE_TYPES } from "../../utils/constants.mjs";

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
 * @param {string} [params.input_schema_description=""] - Description of input structure
 * @param {string} [params.output_format_description=""] - Description of output format from intent analysis
 * @returns {Promise<Object>} The derived constraints.
 */
export async function runConstraintsDerivation(llm, { 
  solution_code, 
  test_specs, 
  language, 
  difficulty,
  input_schema_description = "",
  output_format_description = "Not specified, determine from solution and tests."
}) {
  const chain = createConstraintsChain(llm);
  const parser = StructuredOutputParser.fromZodSchema(ConstraintsOutputSchema);
  
  const input = {
    solution_code,
    test_specs,
    language,
    difficulty,
    input_schema_description,
    output_format_description,
    allowed_judge_types_string: ALLOWED_JUDGE_TYPES.join(', '),
    format_instructions: parser.getFormatInstructions(),
  };
  
  let constraints = await chain.invoke(input);

  if (!ALLOWED_JUDGE_TYPES.includes(constraints.judge_type)) {
    console.warn(
      `Constraints Derivation: LLM proposed an invalid judge_type '${constraints.judge_type}'. ` +
      `Falling back to '${ALLOWED_JUDGE_TYPES[0]}'. Original: ${JSON.stringify(constraints)}`
    );
    constraints.judge_type = ALLOWED_JUDGE_TYPES[0];
  }

  if (constraints.judge_type === "float_eps") {
    if (constraints.epsilon === undefined || constraints.epsilon === null || constraints.epsilon <= 0) {
      console.warn(
        `Constraints Derivation: judge_type is 'float_eps' but epsilon is missing or invalid (${constraints.epsilon}). ` +
        `Setting default epsilon to 1e-6. Original: ${JSON.stringify(constraints)}`
      );
      constraints.epsilon = 1e-6;
    }
  } else {
    if (constraints.epsilon !== undefined && constraints.epsilon !== null) {
        console.warn(
            `Constraints Derivation: judge_type is '${constraints.judge_type}', not 'float_eps', but epsilon ('${constraints.epsilon}') was provided. Removing epsilon.`
        );
        delete constraints.epsilon;
    }
  }
  
  return {
    constraints,
    constraintsJson: JSON.stringify(constraints)
  };
} 