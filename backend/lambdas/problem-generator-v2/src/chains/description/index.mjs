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
 * @param {string} params.constraints - Constraints as JSON string.
 * @param {string} params.test_specs_examples - Examples from test specs as JSON string.
 * @param {string} params.difficulty - The difficulty level for the problem.
 * @param {string} params.language - The target programming language.
 * @param {string} [params.input_schema_description=""] - Description of input structure
 * @returns {Promise<string>} The generated problem description.
 */
export async function runDescriptionGeneration(llm, { 
  analyzed_intent, 
  constraints, 
  test_specs_examples, 
  difficulty, 
  language,
  input_schema_description = ""
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
    constraints,
    test_specs_examples,
    difficulty,
    language,
    input_schema_description: inputSchema
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
 * @param {string} [params.input_schema_description=""] - Description of input structure
 * @returns {Promise<string>} The generated problem description.
 */
export async function runStructuredDescriptionGeneration(llm, { 
  analyzed_intent, 
  constraints, 
  test_specs_examples, 
  difficulty, 
  language,
  input_schema_description = ""
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
    constraints,
    test_specs_examples,
    difficulty,
    language,
    input_schema_description: inputSchema
  };
  
  // No need for manual cleaning with structured output
  return await chain.invoke(input);
} 