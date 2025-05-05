import { StringOutputParser } from "@langchain/core/output_parsers";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { solutionGenerationPromptTemplate } from "./prompt.mjs";
import { cleanLlmOutput } from "../../utils/cleanLlmOutput.mjs";
import { SolutionOutputSchema } from "./schema.mjs";

/**
 * Creates a Solution Generation chain.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The solution generation chain.
 */
export function createSolutionGenerationChain(llm) {
  const parser = new StringOutputParser();
  return solutionGenerationPromptTemplate.pipe(llm).pipe(parser);
}

/**
 * Creates a Solution Generation chain with structured output.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The solution generation chain with structured output.
 */
export function createStructuredSolutionGenerationChain(llm) {
  return solutionGenerationPromptTemplate.pipe(
    llm.withStructuredOutput(SolutionOutputSchema)
  );
}

/**
 * Runs the solution generation step.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.analyzed_intent - The analyzed intent from the previous step.
 * @param {string} params.test_specs - The test specifications from the previous step.
 * @param {string} params.language - The target programming language.
 * @param {string} [params.feedback_section=""] - Optional feedback from previous validation failures.
 * @param {string} [params.input_schema_description=""] - Description of input structure
 * @returns {Promise<string>} The generated solution code.
 */
export async function runSolutionGeneration(llm, { 
  analyzed_intent, 
  test_specs, 
  language, 
  feedback_section = "",
  input_schema_description = "" 
}) {
  const chain = createSolutionGenerationChain(llm);
  
  // Extract input schema from test specs if not provided
  let inputSchema = input_schema_description;
  if (!inputSchema) {
    try {
      // Try to extract input schema from test specs
      const parsedSpecs = typeof test_specs === 'string' ? JSON.parse(test_specs) : test_specs;
      if (parsedSpecs && parsedSpecs.length > 0 && parsedSpecs[0].input) {
        const example = parsedSpecs[0].input;
        inputSchema = `Input appears to be an object with structure similar to: ${JSON.stringify(example)}`;
      } else {
        inputSchema = "Input format not explicitly defined, derive from test cases.";
      }
    } catch (e) {
      inputSchema = "Input format not explicitly defined, derive from test cases.";
    }
  }
  
  const input = {
    analyzed_intent,
    test_specs,
    language,
    input_schema_description: inputSchema,
    feedback_section: feedback_section ? `\n\n**Previous Attempt Feedback:**\n${feedback_section}\nPlease address this feedback in the new solution.` : ""
  };
  
  const output = await chain.invoke(input);
  return cleanLlmOutput(output, "code");
}

/**
 * Runs the solution generation step with structured output.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.analyzed_intent - The analyzed intent from the previous step.
 * @param {string} params.test_specs - The test specifications from the previous step.
 * @param {string} params.language - The target programming language.
 * @param {string} [params.feedback_section=""] - Optional feedback from previous validation failures.
 * @param {string} [params.input_schema_description=""] - Description of input structure
 * @returns {Promise<string>} The generated solution code.
 */
export async function runStructuredSolutionGeneration(llm, { 
  analyzed_intent, 
  test_specs, 
  language, 
  feedback_section = "",
  input_schema_description = "" 
}) {
  const chain = createStructuredSolutionGenerationChain(llm);
  
  // Extract input schema from test specs if not provided
  let inputSchema = input_schema_description;
  if (!inputSchema) {
    try {
      // Try to extract input schema from test specs
      const parsedSpecs = typeof test_specs === 'string' ? JSON.parse(test_specs) : test_specs;
      if (parsedSpecs && parsedSpecs.length > 0 && parsedSpecs[0].input) {
        const example = parsedSpecs[0].input;
        inputSchema = `Input appears to be an object with structure similar to: ${JSON.stringify(example)}`;
      } else {
        inputSchema = "Input format not explicitly defined, derive from test cases.";
      }
    } catch (e) {
      inputSchema = "Input format not explicitly defined, derive from test cases.";
    }
  }
  
  const input = {
    analyzed_intent,
    test_specs,
    language,
    input_schema_description: inputSchema,
    feedback_section: feedback_section ? `\n\n**Previous Attempt Feedback:**\n${feedback_section}\nPlease address this feedback in the new solution.` : ""
  };
  
  // No need for manual cleaning with structured output
  return await chain.invoke(input);
} 