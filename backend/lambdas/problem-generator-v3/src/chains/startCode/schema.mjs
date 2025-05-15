import { z } from "zod";

/**
 * Zod schema for Start Code Generation output.
 * The output is a string containing the start code.
 */
export const StartCodeOutputSchema = z
  .string()
  .describe("Generated start code template for the user, including the main solution function signature and basic I/O structure."); 