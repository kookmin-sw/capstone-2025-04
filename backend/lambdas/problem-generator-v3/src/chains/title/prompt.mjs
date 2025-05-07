import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Title Generation step.
 */
export const titleGenerationPromptTemplate = PromptTemplate.fromTemplate(
  `
Generate a concise and relevant title (less than 70 characters) for a coding problem with the following details. The title should be suitable for a list or menu of problems.

Difficulty: {difficulty}
Problem Intent: {analyzed_intent}
Problem Description Snippet: {description_snippet}

Requirements:
- The title should capture the core concept of the problem.
- Avoid generic phrases like "Coding Problem" or "Challenge".
- Keep it concise and engaging.
- Append the difficulty in parentheses, e.g., "(Easy)", "(Medium)", "(Hard)".

**CRITICAL:** Output **ONLY** the final title string. Do not include explanations or any other text.

Title:`
); 