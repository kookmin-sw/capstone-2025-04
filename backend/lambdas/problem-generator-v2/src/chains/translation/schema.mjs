import { z } from "zod";

/**
 * Zod schema for Translation output.
 */
export const TranslationOutputSchema = z
  .string()
  .describe("Translated text in the target language"); 