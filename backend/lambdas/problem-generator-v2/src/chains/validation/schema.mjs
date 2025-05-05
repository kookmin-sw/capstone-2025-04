import { z } from "zod";

/**
 * Zod schema for Validation output.
 */
export const ValidationOutputSchema = z
  .object({
    status: z.enum(["Pass", "Fail"]).describe('"Pass" or "Fail"'),
    details: z
      .string()
      .describe("Brief explanation of findings, especially on failure."),
  })
  .describe("Structured output for Step 4: LLM-Based Validation."); 