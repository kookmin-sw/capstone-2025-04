import { StringOutputParser } from "@langchain/core/output_parsers";
import { descriptionGenerationPromptTemplate } from "./prompt.mjs";
import { cleanLlmOutput } from "../../utils/cleanLlmOutput.mjs";
import { DescriptionOutputSchema } from "./schema.mjs";

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
 * @param {string} params.constraints - Constraints as JSON string (should include judge_type and epsilon).
 * @param {string} params.test_specs_examples - Examples from test specs as JSON string.
 * @param {string} params.difficulty - The difficulty level for the problem.
 * @param {string} params.language - The target programming language.
 * @param {string} [params.input_schema_description=""] - Description of input structure
 * @param {string} [params.epsilon_value_from_constraints="not applicable"] - Epsilon value from constraints if applicable.
 * @param {string} [params.tie_breaking_rule_from_intent=""] - Tie-breaking rule from intent analysis, if defined.
 * @returns {Promise<string>} The generated problem description.
 */
export async function runDescriptionGeneration(llm, { 
  analyzed_intent, 
  constraints, // This is the JSON string of the constraints object
  test_specs_examples, 
  difficulty, 
  language,
  input_schema_description = "",
  epsilon_value_from_constraints = "not applicable", // 기본값 설정
  tie_breaking_rule_from_intent = "" // Add tie-breaking rule parameter
}) {
  const chain = createDescriptionChain(llm);
  
  // Derive input schema from examples if not provided
  let inputSchema = input_schema_description;
  if (!inputSchema) {
    try {
      // Try to extract input schema from examples
      const parsedExamples = typeof test_specs_examples === 'string' ? JSON.parse(test_specs_examples) : test_specs_examples;
      if (parsedExamples && parsedExamples.length > 0 && parsedExamples[0].input) {
        const example = parsedExamples[0].input;
        inputSchema = `Input is an object with structure: ${JSON.stringify(example, null, 2)}`;
      } else {
        inputSchema = "Input format derived from examples and intent.";
      }
    } catch (e) {
      inputSchema = "Input format derived from examples and intent.";
    }
  }
  
  const input = {
    analyzed_intent,
    constraints, // Pass the constraints JSON string directly
    test_specs_examples,
    difficulty,
    language,
    input_schema_description: inputSchema,
    epsilon_value_from_constraints, // 프롬프트에 epsilon 값 전달
    tie_breaking_rule_from_intent // Pass tie-breaking rule to prompt
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
 * @param {string} params.constraints - Constraints as JSON string (should include judge_type and epsilon).
 * @param {string} params.test_specs_examples - Examples from test specs as JSON string.
 * @param {string} params.difficulty - The difficulty level for the problem.
 * @param {string} params.language - The target programming language.
 * @param {string} [params.input_schema_description=""] - Description of input structure
 * @param {string} [params.epsilon_value_from_constraints="not applicable"] - Epsilon value from constraints if applicable.
 * @param {string} [params.tie_breaking_rule_from_intent=""] - Tie-breaking rule from intent analysis, if defined.
 * @returns {Promise<string>} The generated problem description.
 */
export async function runStructuredDescriptionGeneration(llm, { 
  analyzed_intent, 
  constraints, // This is the JSON string of the constraints object
  test_specs_examples, 
  difficulty, 
  language,
  input_schema_description = "",
  epsilon_value_from_constraints = "not applicable", // 기본값 설정
  tie_breaking_rule_from_intent = "" // Add tie-breaking rule parameter
}) {
  const chain = createStructuredDescriptionChain(llm);
  
  // Derive input schema from examples if not provided
  let inputSchema = input_schema_description;
  if (!inputSchema) {
    try {
      // Try to extract input schema from examples
      const parsedExamples = typeof test_specs_examples === 'string' ? JSON.parse(test_specs_examples) : test_specs_examples;
      if (parsedExamples && parsedExamples.length > 0 && parsedExamples[0].input) {
        const example = parsedExamples[0].input;
        inputSchema = `Input is an object with structure: ${JSON.stringify(example, null, 2)}`;
      } else {
        inputSchema = "Input format derived from examples and intent.";
      }
    } catch (e) {
      inputSchema = "Input format derived from examples and intent.";
    }
  }
  
  const input = {
    analyzed_intent,
    constraints, // Pass the constraints JSON string directly
    test_specs_examples,
    difficulty,
    language,
    input_schema_description: inputSchema,
    epsilon_value_from_constraints, // 프롬프트에 epsilon 값 전달
    tie_breaking_rule_from_intent // Pass tie-breaking rule to prompt
  };
  
  // No need for manual cleaning with structured output
  return await chain.invoke(input);
} 