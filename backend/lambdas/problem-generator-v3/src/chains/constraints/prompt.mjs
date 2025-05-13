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
3.  **Input Constraints:** Specify clear constraints on input values (e.g., range of numbers, length of arrays/strings, character sets) consistent with the solution logic, test cases, Input Schema, and difficulty level. **Ensure these derived input constraints DO NOT CONTRADICT the actual values or ranges observed in the \`Test Specifications\` provided. For instance, if test cases show a maximum string length of 1000, your constraint should reflect that or be compatible.** Be sure to reference the specific field names and structure from the Input Schema above.
4.  **Judge Type:** Based on the "Output Format Description from Intent Analysis" (especially any tie-breaking rules mentioned) and the nature of the problem, choose the most appropriate judge_type. **CRITICAL: You MUST choose ONLY from the following list: {allowed_judge_types_string}.**
    - If the output is a single, uniquely determined value OR if multiple outputs are possible but a **clear, deterministic tie-breaking rule is specified** in the "Output Format Description from Intent Analysis", use "equal".
    - If the output is a collection of items where order does NOT matter but exact values do (e.g., a set of numbers), use "unordered_equal".
    - If the output involves floating-point numbers that may have precision issues, use "float_eps".
    - **If the "Output Format Description" suggests multiple valid outputs could exist but DOES NOT provide a clear tie-breaking rule, DO NOT select 'equal'. Consider if 'unordered_equal' is appropriate, or flag this as an issue to be resolved by refining the problem intent.**
5.  **Epsilon (if applicable):** If you selected "float_eps" for Judge Type, specify a small positive number for epsilon (e.g., 1e-6, 1e-9) representing the acceptable error margin. Otherwise, omit this field or set it to null.

{format_instructions}

Valid JSON Output:
`
);