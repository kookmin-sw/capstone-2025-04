import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Validation step.
 * Updated in v3 to focus on coherence and completeness rather than solution correctness.
 */
export const validationPromptTemplate = PromptTemplate.fromTemplate(
  `
Review the problem components for coherence, consistency, and completeness. 
Note that the solution code has already been execution-verified against the test cases.

Problem Intent:
{intent_json}

Input Schema:
{input_schema_description}

Validated Solution Code:
\`\`\`
{solution_code}
\`\`\`

Final Test Cases (already verified by executing the solution):
{test_cases_json}

Constraints (including judge_type and epsilon if applicable):
{constraints_json}

Difficulty Level: {difficulty}
{validation_feedback}

Review Checklist:
1. **Consistency:** Does the \`validatedSolutionCode\` correctly implement the \`goal\` described in the \`intent_json\`? Does it seem appropriate for the \`difficulty\` level? Are edge cases (including those involving duplicates, if specified in Input Schema) handled properly?
   - **Tie-breaking Logic:** If the \`intent_json\` (via \`output_format_description\` or a specific \`tie_breaking_rule\` field) specifies a rule for ambiguous cases, does the \`validatedSolutionCode\` correctly implement it? Are the \`expected_output\` values in \`finalTestCases\` consistent with this rule?

2. **Test Coverage:** Do the \`finalTestCases\` (inputs and rationales) adequately cover the scenarios implied by the intent and {difficulty} level? 
   - Are there obvious gaps in test coverage?
   - Is the variety and complexity of test cases appropriate for the {difficulty} level?
   - Are edge cases well-represented (e.g., empty inputs, minimal inputs, boundary conditions)?
   - Do test rationales accurately describe why those cases are important?
   - **If the Input Schema allows for duplicates or repeated structures, are there test cases specifically addressing these scenarios?**
   - **Constraint Adherence in Tests:** Do ALL \`input\` values in \`finalTestCases\` strictly adhere to the \`input_constraints\` specified in \`constraints_json\` AND the original \`input_schema_description\` from \`intent_json\`? Note any violations.

3. **Solution Quality vs. Constraints:** 
   - Time Complexity: Does the \`validatedSolutionCode\` appear to have a time complexity appropriate for the problem constraints? For example, if inputs could be large, a naive O(n²) solution might be inappropriate.
   - Space Complexity: Similarly, does the memory usage seem appropriate for the constraints?
   - Any other potential performance issues?
   - Judge Type Appropriateness: Is the specified \`judge_type\` (from \`constraints_json\`) appropriate for this problem? For example, if the output could be a floating-point value, is "float_eps" specified?

4. **Clarity/Coherence:** Assuming a description will be generated from the intent, test cases, and constraints, is there enough clear information for generating a well-defined problem statement?
   - Are there any ambiguities or inconsistencies between the \`intent_json\`, the \`solution_code\`, and the \`finalTestCases\`?
   - If using "equal" judge_type, is there a clear tie-breaking rule for cases where multiple valid outputs could exist?
   - If using "float_eps" judge_type, is the epsilon value reasonable for the problem domain?

Provide a brief but comprehensive assessment based on the checklist above.
Focus particularly on any issues mentioned in the previous validation feedback if provided.

{format_instructions}

Valid JSON Output:
`
); 