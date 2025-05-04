import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Description Generation step.
 */
export const descriptionGenerationPromptTemplate = PromptTemplate.fromTemplate(
  `
Generate a user-facing problem description for a coding challenge based on the provided details. The tone and complexity should match the **{difficulty}** level.

Target Language: {language}
Problem Intent: {analyzed_intent}
Constraints Details (JSON):
{constraints}
Test Specification Examples (use for Examples section, format appropriately):
{test_specs_examples}


Instructions:
- Write a clear and engaging **Problem Narrative** based on the intent. **DO NOT include a main title heading (like '### Problem Title') at the beginning of the narrative.**
- Clearly define the **Input Format**.
- Clearly define the **Output Format**.
- Create a **Constraints** section using the information from the "Constraints Details (JSON)". Format it clearly (e.g., using bullet points).
- Create an **Examples** section with 1-2 simple examples derived from the "Test Specification Examples". Show the input and corresponding output clearly for each example, using markdown code blocks.
- Ensure the overall tone, narrative complexity, and example difficulty match the specified **{difficulty}** level.

**CRITICAL:** Output **ONLY** the final problem description content as a single block of plain text, starting directly with the narrative or relevant sections. Use markdown for formatting (like \`### Section Title\` for subsections like Input/Output/Constraints/Examples, \`\`\`code\`\`\`, or bullet points \`-\`). The entire output should be the description text ready for display, **WITHOUT a main title heading**.
Problem Description:`
); 