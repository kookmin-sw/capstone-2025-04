import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Translation step.
 */
export const translationPromptTemplate = PromptTemplate.fromTemplate(
  `
Translate the following text into {target_language}. Preserve the original meaning, tone, and any markdown formatting (like ### headers, \`code blocks\`, or bullet points).

Target Language: {target_language}

Original Text:
---
{text_to_translate}
---

Translate the above text into {target_language}. Output only the translated text with no additional comments, instructions, or explanations.
`
); 