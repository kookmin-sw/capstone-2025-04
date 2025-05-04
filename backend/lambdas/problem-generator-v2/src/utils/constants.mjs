// Environment Variables
export const PROBLEMS_TABLE_NAME =
  process.env.PROBLEMS_TABLE_NAME || "default-problems-table";
export const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
export const GENERATOR_VERBOSE =
  process.env.GENERATOR_VERBOSE?.toLowerCase() === "true";
export const GEMINI_MODEL_NAME =
  process.env.GEMINI_MODEL_NAME || "gemini-2.5-pro-exp-03-25"; // Or "gemini-pro" etc.
export const DEFAULT_LANGUAGE = "python3.12"; // Or make configurable
export const DEFAULT_TARGET_LANGUAGE = "Korean"; // Target language for translation
export const MAX_RETRIES = 2; // Max number of retries on validation failure 