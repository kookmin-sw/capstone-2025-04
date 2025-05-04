import { z } from "zod";

/**
 * Zod schema for Solution output.
 */
export const SolutionOutputSchema = z
  .string()
  .describe("Generated solution code in the target programming language"); 