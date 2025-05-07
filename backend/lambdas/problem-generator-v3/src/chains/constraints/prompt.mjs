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

Output Format Description from Intent Analysis: 
{output_format_description}

Test Specifications:
{test_specs}

Derive the following constraints, considering the {difficulty} level:
1.  **Time Limit:** Estimate a reasonable time limit (e.g., 1 or 2 seconds) based on typical competitive programming platform standards and the code's complexity.
2.  **Memory Limit:** Estimate a reasonable memory limit (e.g., 256 or 512 MB).
3.  **Input Constraints:** Specify clear constraints on input values (e.g., range of numbers, length of arrays/strings, character sets) consistent with the solution logic, test cases, Input Schema, and difficulty level. **If the Input Schema indicates that collections can contain duplicates, ensure your constraints do not contradict this (e.g., do not state 'all elements in the array must be unique' if duplicates are allowed).** Be sure to reference the specific field names and structure from the Input Schema above.
4.  **Judge Type:** Based on the "Output Format Description from Intent Analysis" and the nature of the problem, choose the most appropriate judge_type. **CRITICAL: You MUST choose ONLY from the following list: {allowed_judge_types_string}.**
    - If the output is a single value or a sequence where order and exact values matter, use "equal".
    - If the output is a collection of items where order does NOT matter but exact values do (e.g., a set of numbers), use "unordered_equal".
    - If the output involves floating-point numbers that may have precision issues, use "float_eps".
5.  **Epsilon (if applicable):** If you selected "float_eps" for Judge Type, specify a small positive number for epsilon (e.g., 1e-6, 1e-9) representing the acceptable error margin. Otherwise, omit this field or set it to null.

{format_instructions}

Valid JSON Output:`
); 