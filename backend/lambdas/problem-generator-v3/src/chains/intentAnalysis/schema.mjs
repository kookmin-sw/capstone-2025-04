import { z } from "zod";

/**
 * Zod schema for Intent Analysis output.
 */
export const IntentOutputSchema = z
  .object({
    goal: z
      .string()
      .describe("one-line summary: the core logic to solve the problem"),
    key_constraints: z
      .array(z.string())
      .describe("input/output related core constraints"),
    concepts: z
      .array(z.string())
      .describe("keywords for algorithms/data structures needed: Greedy, Sorting, Prefix Sum, etc."),
    creative_context: z
      .object({
        theme_elements: z
          .array(z.string())
          .optional()
          .describe("Creative elements mentioned by user (e.g., 'strawberries', 'game characters', 'space theme')"),
        narrative_style: z
          .string()
          .optional()
          .describe("Desired narrative style or context (e.g., 'fantasy story', 'real-world scenario', 'game mechanics')"),
        should_integrate_theme: z
          .boolean()
          .describe("Whether the theme elements should be integrated into the problem narrative")
      })
      .optional()
      .describe("Creative and thematic context extracted from user's request"),
    input_schema_description: z
      .string()
      .describe("Clear description of the expected input object/structure and the types of its components (e.g., 'Input is an object with keys: nodes (int), edges (list of lists [u, v, w]), source (int)')."),
    output_format_description: z
      .string()
      .describe("Clear description of the expected output format, emphasizing simple judgability (e.g., 'A single integer', 'An array of strings where order matters', 'A float accurate to 1e-5')."),
    tie_breaking_rule: z
      .string()
      .optional()
      .describe("A specific, deterministic rule to choose a single output if multiple valid outputs could exist. E.g., 'output the lexicographically smallest', 'output the one with the smallest starting index'. Crucial if judge_type is 'equal' and ambiguity exists."),
    input_schema_details: z
      .object({
        allows_duplicates_in_collections: z
          .boolean()
          .optional()
          .describe("Specifies if collections like arrays/lists can contain duplicate elements."),
        can_revisit_nodes_in_paths: z
          .boolean()
          .optional()
          .describe("Specifies if paths in graph-like structures can revisit nodes/edges.")
      })
      .optional()
      .describe("Detailed, structured information about the input schema.")
  })
  .describe("Structured output for Step 1: Intent Analysis"); 