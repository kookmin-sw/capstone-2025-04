import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Validation step.
 */
export const validationPromptTemplate = PromptTemplate.fromTemplate(
  `
Review the provided solution code and test case generator code for consistency and correctness based on the problem intent and test specifications.

Problem Intent:
{intent_json}

Test Specifications:
{test_specs}

Solution Code:
\`\`\`
{solution_code}
\`\`\`

Test Case Generator Code:
\`\`\`
{test_gen_code}
\`\`\`

Review Checklist:
1. **Goal Match:** Does the solution code correctly implement the core goal described in the intent?
2. **Solution Correctness:** Does the solution code seem logically correct for solving the problem?
3. **Test Generator Correctness:** Does the test generator code correctly produce inputs and expected outputs that match the test specifications? Does it calculate the correct expected outputs based on inputs?
4. **Consistency & Rationale:** 
   - Are the intent (goal), test inputs/outputs, and rationales logically consistent with each other?
   - Do the test cases with their rationales adequately cover the problem space?
5. **Errors:** Are there any obvious syntax errors or potential runtime errors in either piece of code?

{format_instructions}

Valid JSON Output:`
); 