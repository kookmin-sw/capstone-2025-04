import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Constraints Derivation step.
 */
export const constraintsDerivationPromptTemplate = PromptTemplate.fromTemplate(
  `
Analyze the provided solution code and test specifications to derive appropriate constraints for a coding problem intended for **{difficulty}** difficulty.

Solution Code:
\`\`\`
{solution_code}
\`\`\`

Input Schema:
{input_schema_description}

Test Specifications:
{test_specs}

Derive the following constraints, considering the {difficulty} level:
1.  **Time Limit:** Estimate a reasonable time limit (e.g., 1 or 2 seconds) based on typical competitive programming platform standards and the code's complexity.
2.  **Memory Limit:** Estimate a reasonable memory limit (e.g., 256 or 512 MB).
3.  **Input Constraints:** Specify clear constraints on input values (e.g., range of numbers, length of arrays/strings, character sets) consistent with the solution logic, test cases, Input Schema, and difficulty level. **If the Input Schema indicates that collections can contain duplicates, ensure your constraints do not contradict this (e.g., do not state 'all elements in the array must be unique' if duplicates are allowed).** Be sure to reference the specific field names and structure from the Input Schema above.

{format_instructions}

Valid JSON Output:`
); 