import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Test Generator step.
 */
export const testGenPromptTemplate = PromptTemplate.fromTemplate(
  `
Generate runnable {language} code for a test case generator based on the provided specifications and solution code.

Test Specifications:
{test_specs}

Solution Code ({language}):
\`\`\`
{solution_code}
\`\`\`

Requirements:
- The generated code must define a function, e.g., \`generate_test_cases()\`, that returns a list of test cases.
{feedback_section}

- Each test case in the list must be a dictionary containing 'input' and 'expected_output' keys.
- The generator code might need to import and execute the provided solution code logic (or re-implement its logic) to determine the correct \`expected_output\` for the generated \`input\` based on the test specifications.
- Ensure the generated inputs cover the scenarios described in the specifications (typical, edge cases, etc.).
- The generated code must be runnable in a standard {language} environment.

**CRITICAL:** Output **ONLY** the raw source code for the test case generator function. Do not include example usage, explanations, markdown formatting (like \`\`\`python), or any other text.

{language} Test Case Generator Code:`
); 