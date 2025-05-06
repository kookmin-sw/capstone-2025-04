import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Solution Generation step.
 */
export const solutionGenerationPromptTemplate = PromptTemplate.fromTemplate(
  `
Generate the solution code in {language} for the following problem intent and test specifications.

Problem Goal:
{analyzed_intent}

Input Schema:
{input_schema_description}

Test Specifications:
{test_specs}

Requirements:
- The code must be correct and aim to pass all the specified test cases.
{feedback_section}

- **CRITICAL:** The main logic must be encapsulated within a function named exactly *solution* that accepts a single argument representing the problem input.
- The solution function must accept input in the exact format specified in the Input Schema above, **paying close attention to whether duplicate elements or repeated structures are allowed and how they are represented.**
- The solution function must return output in a consistent, JSON-serializable format where:
  - Dictionary/Map keys should be strings (not numbers or other types)
  - For special values, use string representations: "Infinity" (not float('inf')), "-Infinity", "NaN"
- The code should be efficient and follow standard coding practices for {language}.
- Adhere strictly to {language} syntax and standard libraries.
{language_specific_requirements}

**CRITICAL:** Output **ONLY** the raw source code for the solution. Do not include explanations, comments about the code, markdown formatting (like \`\`\`python), or any other text.

{language} Solution Code:`
);

/**
 * Get language-specific requirements based on the programming language
 */
export function getLanguageSpecificRequirements(language) {
  if (language.toLowerCase().includes('python')) {
    return "- If using recursion, include \"import sys\" and \"sys.setrecursionlimit(300000)\" at the beginning of your solution to prevent stack overflow errors.";
  }
  return "";
} 