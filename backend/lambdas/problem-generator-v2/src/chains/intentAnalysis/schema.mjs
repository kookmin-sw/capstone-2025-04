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
    input_schema_description: z
      .string()
      .describe("Clear description of the expected input object/structure and the types of its components (e.g., 'Input is an object with keys: nodes (int), edges (list of lists [u, v, w]), source (int)')."),
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