import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Solution Generation step.
 */
export const solutionGenerationPromptTemplate = PromptTemplate.fromTemplate(
  `
Generate the solution code in {language} for the following problem intent and test specifications.

Problem Goal:
{analyzed_intent}

Test Specifications:
{test_specs}

Requirements:
- The code must be correct and aim to pass all the specified test cases.
{feedback_section}

- The code should be efficient and follow standard coding practices for {language}.
- Adhere strictly to {language} syntax and standard libraries.

**CRITICAL:** Output **ONLY** the raw source code for the solution. Do not include explanations, comments about the code, markdown formatting (like \`\`\`python), or any other text.

{language} Solution Code:`
); 