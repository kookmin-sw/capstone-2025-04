import { z } from "zod";

/**
 * Zod schema for Problem Title output.
 */
export const TitleOutputSchema = z
  .string()
  .describe("Generated problem title"); 