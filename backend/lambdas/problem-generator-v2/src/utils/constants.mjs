// Environment Variables

// Helper function to get environment variables at runtime
function getEnv(key, defaultValue = null) {
  const value = process.env[key];
  return value !== undefined ? value : defaultValue;
}

// Basic configuration
export function getProblemsTableName() {
  return getEnv('PROBLEMS_TABLE_NAME', 'alpaco-Problems-production');
}

export function getGoogleAiApiKey() {
  return getEnv('GOOGLE_AI_API_KEY');
}

export function isGeneratorVerbose() {
  return getEnv('GENERATOR_VERBOSE', 'false').toLowerCase() === 'true';
}

export function getGeminiModelName() {
  return getEnv('GEMINI_MODEL_NAME', 'gemini-2.5-pro-exp-03-25');
}

// Add this for the Code Executor Lambda
export function getCodeExecutorLambdaArn() {
  return getEnv('CODE_EXECUTOR_LAMBDA_ARN', 'arn:aws:lambda:ap-northeast-2:897722694537:function:alpaco-code-executor-production');
}

// Constants with default values
export const DEFAULT_LANGUAGE = "python3.12"; // Or make configurable
export const DEFAULT_TARGET_LANGUAGE = "Korean"; // Target language for translation
export const MAX_RETRIES = 5; // Max number of retries on validation failure 

// Allowed judge types for simple scoring
export const ALLOWED_JUDGE_TYPES = ["equal", "unordered_equal", "float_eps"];

// For backward compatibility
export const PROBLEMS_TABLE_NAME = getProblemsTableName();
export const GOOGLE_AI_API_KEY = getGoogleAiApiKey();
export const GENERATOR_VERBOSE = isGeneratorVerbose();
export const GEMINI_MODEL_NAME = getGeminiModelName();
export const CODE_EXECUTOR_LAMBDA_ARN = getCodeExecutorLambdaArn(); 