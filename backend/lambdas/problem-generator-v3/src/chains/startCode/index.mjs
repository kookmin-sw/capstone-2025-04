import { StringOutputParser } from "@langchain/core/output_parsers";
import { startCodeGenerationPromptTemplate } from "./prompt.mjs";
// import { StartCodeOutputSchema } from "./schema.mjs"; // Schema is z.string(), StringOutputParser is sufficient
import { cleanLlmOutput } from "../../utils/cleanLlmOutput.mjs";
import { getLanguageSpecificRequirements } from "../solutionGen/prompt.mjs";

/**
 * Creates a Start Code Generation chain.
 * Uses StringOutputParser as the output is expected to be a raw code string.
 *
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The start code generation chain.
 */
export function createStartCodeGenerationChain(llm) {
  const parser = new StringOutputParser();
  return startCodeGenerationPromptTemplate.pipe(llm).pipe(parser);
}

/**
 * Runs the start code generation step.
 *
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.language - The target programming language.
 * @param {string} params.input_schema_description - Description of the input structure from intent analysis.
 * @param {string} params.output_format_description - Description of the output format from intent analysis.
 * @param {string} params.constraints_json - JSON string of derived constraints.
 * @param {string} params.solution_code - The full validated solution code (used to create a snippet).
 * @returns {Promise<string>} The generated start code.
 */
export async function runStartCodeGeneration(llm, {
  language,
  input_schema_description,
  output_format_description,
  constraints_json,
  solution_code, // Full validated solution code
}) {
  const chain = createStartCodeGenerationChain(llm);

  // Provide a snippet of the solution code to guide I/O structure without giving away logic.
  let solution_code_snippet = "Validated solution code snippet not available.";
  if (solution_code) {
    const lines = solution_code.split('\n');
    if (lines.length <= 30) { // If short, show all
        solution_code_snippet = solution_code;
    } else { // If long, show beginning and try to find solution function signature
        let snippet = lines.slice(0, 15).join('\n'); // Initial part of the code
        const solutionFunctionRegex = new RegExp(`def\\s+solution\\s*\\(|function\\s+solution\\s*\\(`); // Python or JS
        const solutionFunctionMatch = solution_code.match(solutionFunctionRegex);
        
        if (solutionFunctionMatch && solutionFunctionMatch.index !== undefined) {
            const startIndex = solutionFunctionMatch.index;
            // Try to get a few lines around the function definition (e.g., 5 lines before, 10 lines after)
            const surroundingCode = solution_code.substring(
                Math.max(0, startIndex - (lines.slice(0, Math.max(0, lines.findIndex(line => line.includes(solutionFunctionMatch[0]))) - 5).join('\n').length)), // Approx 5 lines before
                Math.min(solution_code.length, startIndex + (lines.slice(lines.findIndex(line => line.includes(solutionFunctionMatch[0])), Math.min(lines.length, lines.findIndex(line => line.includes(solutionFunctionMatch[0])) + 10)).join('\n').length)) // Approx 10 lines after
            );
            // Add to snippet if not already largely covered
            if (!snippet.includes(solutionFunctionMatch[0])) {
                 snippet += "\n// ... (omitted part of solution) ...\n" + surroundingCode + "\n// ... (omitted part of solution) ...";
            }
        } else {
            snippet += "\n// ... (omitted rest of solution)";
        }
        solution_code_snippet = snippet.trim();
    }
  }


  const input = {
    language,
    input_schema_description,
    output_format_description,
    constraints_json,
    solution_code_snippet, // Pass the generated snippet
    language_specific_requirements: getLanguageSpecificRequirements(language)
  };

  const rawStartCode = await chain.invoke(input);
  // cleanLlmOutput is important here to remove potential markdown fences
  return cleanLlmOutput(rawStartCode, "code");
} 