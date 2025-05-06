import { z } from "zod";
import { ALLOWED_JUDGE_TYPES } from "../../utils/constants.mjs"; // Import the constant

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
    judge_type: z // Added field
      .enum(ALLOWED_JUDGE_TYPES) // Use enum with allowed types
      .describe(`The judging method to be used. Must be one of: ${ALLOWED_JUDGE_TYPES.join(', ')}`),
    epsilon: z // Added/updated field
      .number()
      .optional()
      .describe("The tolerance for float comparisons (e.g., 1e-6 or 1e-9). Required if judge_type is 'float_eps'.")
  })
  .describe("Structured output for Step 5: Constraints Derivation."); 