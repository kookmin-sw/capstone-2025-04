import { z } from "zod";

/**
 * Zod schema for Solution Generation.
 */
export const SolutionOutputSchema = z
  .object({
    code: z.string().describe("The solution code"),
    explanation: z.string().describe("Explanation of how the solution works")
  })
  .describe("Structured output for Step 4: Solution Generation"); 