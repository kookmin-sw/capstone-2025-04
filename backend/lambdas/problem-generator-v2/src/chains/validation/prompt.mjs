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

Difficulty Level: {difficulty}

Review Checklist:
1. **Consistency:** Does the \`validatedSolutionCode\` correctly implement the \`goal\` described in the \`intent_json\`? Does it seem appropriate for the \`difficulty\` level? Are edge cases (including those involving duplicates, if specified in Input Schema) handled properly?

2. **Test Coverage:** Do the \`finalTestCases\` (inputs and rationales) adequately cover the scenarios implied by the intent and {difficulty} level? 
   - Are there obvious gaps in test coverage?
   - Is the variety and complexity of test cases appropriate for the {difficulty} level?
   - Are edge cases well-represented (e.g., empty inputs, minimal inputs, boundary conditions)?
   - Do test rationales accurately describe why those cases are important?
   - **If the Input Schema allows for duplicates or repeated structures, are there test cases specifically addressing these scenarios?**

3. **Solution Quality vs. Constraints:** 
   - Time Complexity: Does the \`validatedSolutionCode\` have a time complexity appropriate for the problem type and difficulty level?
   - Space Complexity: Does the solution use memory efficiently?
   - Does the solution handle potential large inputs reasonably for typical competitive programming limits (e.g., 1-2s, 256-512MB)?

4. **Output Format Consistency:** 
   - Is the output format consistent across all test cases?
   - Are special values (like infinity) represented consistently?
   - Do the expected outputs match the likely expected format described by the problem intent?
   - Does the solution follow the input schema structure accurately, **especially regarding duplicate elements or repeated structures if applicable?**

5. **Self-Critique:** Propose one extreme input example that might not be covered by the existing test cases and explain why it would be valuable to include.

{format_instructions}

Valid JSON Output:`
); 