import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Description Generation step.
 */
export const descriptionGenerationPromptTemplate = PromptTemplate.fromTemplate(
  `
Generate a user-facing problem description for a coding challenge based on the provided details. The tone and complexity should match the **{difficulty}** level.

Problem Intent: {analyzed_intent}
Input Schema: {input_schema_description}
Creative Context: {creative_context}
Constraints Details (JSON):
{constraints}
Test Specification Examples (use for Examples section, format appropriately):
{test_specs_examples}
Tie-Breaking Rule (if applicable): {tie_breaking_rule_from_intent}


Instructions:
- Write a clear and engaging **Problem Narrative** based on the intent. **DO NOT include a main title heading (like '### Problem Title') at the beginning of the narrative.**
- **CREATIVE INTEGRATION**: If Creative Context is provided and should_integrate_theme is true, creatively weave the theme elements into the problem narrative. Make the story engaging while keeping the core algorithmic challenge clear. For example:
  - If theme_elements includes "strawberries": Create a scenario involving counting, collecting, or organizing strawberries
  - If theme_elements includes "space": Create a space exploration or planetary scenario
  - If theme_elements includes "game": Frame it as a game mechanic or scoring system
  - Ensure the narrative style matches the specified narrative_style (e.g., "story-based", "real-world scenario")
- Clearly define the **Input Format** section based on the Input Schema provided. **If inputs can contain duplicate values (e.g., in lists/arrays) or repeated structures (e.g., paths in graphs), explicitly state this.**
- Clearly define the **Output Format** section based PRECISELY on the examples provided and the "judge_type" from the Constraints Details. Describe the output format EXACTLY as demonstrated in the Examples section. Pay close attention to:
  - Data types (numbers, strings, objects, arrays)
  - Structure (dictionaries, lists, nested structures)
  - Special values (for unreachable nodes, infinity values, etc.)
  - **If outputs can contain duplicate values or repeated structures, ensure this is clear from your description and the examples.**
  - If examples use string keys like "0", "1", etc., explicitly mention that keys are strings
  - If examples use string values like "Infinity" for special cases, explicitly mention this format
  - DO NOT add any formatting rules not directly supported by the examples
  - **If a tie-breaking rule was defined (provided as {tie_breaking_rule_from_intent}), you MUST explicitly state this rule in the Output Format section.** For example: "If multiple longest palindromic substrings of the same length exist, output the one that starts at the earliest index in the original string."
  - **Consider the "judge_type" (from Constraints Details) AND THE TIE-BREAKING RULE when describing the output. For example:**
    - If "judge_type" is "equal" AND a tie-breaking rule exists: "The output must be exactly X, determined by the rule: [tie-breaking rule]."
    - If "judge_type" is "unordered_equal": "The output is a collection of items. The order of items does not matter."
    - If "judge_type" is "float_eps": "The output is a floating-point number. Your answer will be considered correct if its absolute or relative error does not exceed {epsilon_value_from_constraints}." (Make sure to phrase this naturally based on the epsilon value.)
- Create a **Constraints** section using the information from the "Constraints Details (JSON)". Format it clearly (e.g., using bullet points). **Explicitly list the judge_type and epsilon (if applicable) in this section.**
- Create an **Examples** section with 1-2 simple examples derived from the "Test Specification Examples". Show the input and corresponding output clearly for each example, using markdown code blocks. **If relevant, choose examples that illustrate the handling of duplicate elements or repeated structures.**
- Ensure the overall tone, narrative complexity, and example difficulty match the specified **{difficulty}** level.

**CRITICAL:** Output **ONLY** the final problem description content as a single block of plain text, starting directly with the narrative or relevant sections. Use markdown for formatting (like \`### Section Title\` for subsections like Input/Output/Constraints/Examples, \`\`\`code\`\`\`, or bullet points \`-\`). The entire output should be the description text ready for display, **WITHOUT a main title heading**.
Problem Description:`
);