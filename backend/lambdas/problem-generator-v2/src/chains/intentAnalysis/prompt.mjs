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
- "input_schema_description": A clear textual description of the expected input object/structure and the types of its components. Be specific about property names, data types, ranges, and meanings.
- "input_schema_details": An object containing specific boolean flags about the input structure.
    - "allows_duplicates_in_collections": (boolean, optional) Set to true if collections like arrays or lists in the input can contain duplicate elements. Otherwise, set to false or omit.
    - "can_revisit_nodes_in_paths": (boolean, optional) Set to true if graph-like structures (if applicable) in the input can have paths that revisit nodes or edges (i.e., cycles are relevant or paths can be non-simple). Otherwise, set to false or omit if not applicable.

Consider if the problem implies or requires handling of duplicate values in inputs (e.g., an array \`[1,2,2,3]\`) or outputs (e.g., a path \`[A, B, A, C]\`). If so, reflect this in \`key_constraints\`, \`input_schema_description\`, and most importantly, by setting the flags in \`input_schema_details\` correctly.

CRITICAL INSTRUCTIONS:
1. ONLY return valid JSON format. No markdown code blocks or other text.
2. Each array element must be a properly quoted string.
3. Every string MUST be surrounded by double quotes.
4. Array elements MUST be separated by commas.
5. Do NOT insert any unquoted text between array elements.

For example:
{{
  "goal": "Find the shortest path in a graph, allowing cycles",
  "key_constraints": ["Graph edges have positive weights", "Output the path as a list of node names"],
  "concepts": ["Graph", "Shortest Path", "Dijkstra", "BFS"],
  "input_schema_description": "Input is an object with 'nodes' (list of strings representing node names), 'edges' (list of lists, where each inner list is [source_node_str, target_node_str, weight_int]), 'start_node' (string), and 'end_node' (string).",
  "input_schema_details": {{
    "allows_duplicates_in_collections": false,
    "can_revisit_nodes_in_paths": true
  }}
}}

{format_instructions}

Important: Array elements must be properly quoted and separated by commas with no additional text.
Array elements must follow the pattern: ["element1", "element2", "element3"]
ONLY return valid parseable JSON.`
); 