import { z } from "zod";

/**
 * Zod schema for Test Generator code output.
 */
export const TestGenOutputSchema = z
  .string()
  .describe("Generated test case generator code in the target programming language"); 