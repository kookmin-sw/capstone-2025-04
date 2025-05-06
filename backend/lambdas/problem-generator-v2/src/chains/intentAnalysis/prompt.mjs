import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Intent Analysis step.
 */
export const intentAnalysisPromptTemplate = PromptTemplate.fromTemplate(
  `
You are "IntentExtractor", an expert at distilling programming-problem requirements.

USER_PROMPT: {user_prompt}
DIFFICULTY: {difficulty}

Return a JSON with the following structure:
- "goal": A one-line summary of the core logic that the problem is trying to solve.
- "key_constraints": Array of strings describing key input/output constraints.
- "concepts": Array of strings listing algorithms or data structures keywords (e.g., Greedy, Sorting, Prefix Sum).
- "input_schema_description": A clear description of the expected input object/structure and the types of its components. Be specific about property names, data types, ranges, and meanings. For example: "Input is an object with keys: nodes (int), edges (list of lists [u, v, w]), source (int)".

CRITICAL INSTRUCTIONS:
1. ONLY return valid JSON format. No markdown code blocks or other text.
2. Each array element must be a properly quoted string.
3. Every string MUST be surrounded by double quotes.
4. Array elements MUST be separated by commas.
5. Do NOT insert any unquoted text between array elements.

For example:
{{
  "goal": "Find the longest increasing subsequence in an array",
  "key_constraints": ["Input is an array of integers", "Output is a single integer"],
  "concepts": ["Dynamic Programming", "Array", "Subsequence"],
  "input_schema_description": "Input is an object with a single key 'nums' containing an array of integers."
}}

{format_instructions}

Important: Array elements must be properly quoted and separated by commas with no additional text.
Array elements must follow the pattern: ["element1", "element2", "element3"]
ONLY return valid parseable JSON.`
); 