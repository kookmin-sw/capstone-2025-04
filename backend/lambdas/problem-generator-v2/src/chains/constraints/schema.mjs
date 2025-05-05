import { z } from "zod";

/**
 * Zod schema for Constraints output.
 */
export const ConstraintsOutputSchema = z
  .object({
    time_limit_seconds: z
      .number()
      .describe("Estimated reasonable time limit in seconds."),
    memory_limit_mb: z
      .number()
      .int()
      .describe("Estimated reasonable memory limit in MB."),
    input_constraints: z
      .string()
      .describe("Clear constraints on input values (range, length, format)."),
  })
  .describe("Structured output for Step 5: Constraints Derivation."); 