import { z } from "zod";

/**
 * Zod schema for Problem Description output.
 */
export const DescriptionOutputSchema = z
  .string()
  .describe("Generated problem description formatted with markdown"); 