/**
 * codeExecutor.mjs
 *
 * Provides utilities for executing code snippets.
 * For Python, it now invokes a dedicated AWS Lambda function.
 */

// Removed: spawn, promises as fs, randomUUID, join, dirname, os
// These are no longer needed for Python execution via Lambda.

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { TextDecoder } from "util"; // Node.js built-in
import { CODE_EXECUTOR_LAMBDA_ARN, DEFAULT_LANGUAGE } from "./constants.mjs"; // Ensure DEFAULT_LANGUAGE is here if needed

// Constants
const DEFAULT_TIMEOUT_MS = 5000; // 5 seconds - this will be passed to the executor lambda

// Initialize Lambda Client
// Consider making the region configurable if it can change
const lambdaClient = new LambdaClient({ region: "ap-northeast-2" });


/**
 * Execution result class - should remain compatible with the Python Lambda's output structure.
 */
export class ExecutionResult {
  constructor({
    stdout = "",
    stderr = "",
    exitCode = null,
    executionTimeMs = 0,
    timedOut = false,
    error = null, // This 'error' field is for errors in THIS (JS) orchestration,
                  // or unhandled errors from the invoked Lambda itself.
                  // User code errors will be in stderr.
    isSuccessful = false // Added this field explicitly based on Python lambda output
  }) {
    this.stdout = stdout;
    this.stderr = stderr;
    this.exitCode = exitCode;
    this.executionTimeMs = executionTimeMs;
    this.timedOut = timedOut;
    this.error = error;
    // isSuccessful is determined by the Python lambda and passed back.
    // However, we can also calculate it as a getter for consistency if not provided.
    // For now, we'll assume the Python lambda's 'isSuccessful' is the source of truth.
    this.isSuccessful = isSuccessful;
  }

  /**
   * Returns true if the execution was successful (no errors, timeout, or non-zero exit code)
   * This getter can be a fallback or primary way to determine success.
   */
  get wasSuccessful() {
    // Prioritize the 'isSuccessful' field from the Python Lambda if available
    // Otherwise, fallback to the original logic.
    if (typeof this.isSuccessful === 'boolean') {
        return this.isSuccessful;
    }
    // Fallback logic if isSuccessful is not explicitly provided by the executor
    return !this.error && !this.timedOut && this.exitCode === 0 && !this.stderr;
  }


  /**
   * Returns a structured result object
   */
  toJSON() {
    return {
      stdout: this.stdout,
      stderr: this.stderr,
      exitCode: this.exitCode,
      executionTimeMs: this.executionTimeMs,
      timedOut: this.timedOut,
      error: this.error ? (this.error.message || String(this.error)) : null,
      isSuccessful: this.wasSuccessful, // Use the getter
    };
  }

  /**
   * Returns a classification of the error, if any
   */
  getErrorType() {
    if (this.wasSuccessful) return null; // Use the getter
    if (this.timedOut) return "TIMEOUT";
    if (this.error) return "LAMBDA_INVOCATION_ERROR"; // Error invoking/within the executor lambda itself

    // Errors from the user's code (via stderr from executor lambda)
    if (this.stderr) {
      if (this.stderr.includes("SyntaxError")) return "SYNTAX_ERROR";
      if (this.stderr.includes("MemoryError")) return "MEMORY_ERROR"; // Assuming Python lambda reports this
      if (this.stderr.includes("SolutionFunctionNotFoundError")) return "FUNCTION_NOT_FOUND_ERROR";
      if (this.stderr.includes("ImportError")) return "IMPORT_ERROR";
      // Add more specific error types based on Python lambda's stderr patterns
      return "RUNTIME_ERROR";
    }

    return "UNKNOWN_ERROR";
  }
}

// createTempFile and cleanupTempFiles are no longer needed for Python execution
// as file management is handled within the Python executor Lambda.
// They can be removed or kept if you plan to add other local executors.
// For now, let's comment them out to signify they are not used for Python.
/*
async function createTempFile(code, extension = ".py") { ... }
async function cleanupTempFiles(filePaths) { ... }
*/

/**
 * Execute Python code by invoking the dedicated AWS Lambda function.
 * @param {string} code - Python code to execute
 * @param {any} inputData - Input to pass to the code (will be part of JSON payload)
 * @param {object} options - Execution options
 * @param {number} [options.timeoutMs=DEFAULT_TIMEOUT_MS] - Timeout for the execution.
 * @returns {Promise<ExecutionResult>} Execution result
 */
export async function executePythonViaLambda(code, inputData, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const payload = {
    code_to_execute: code,
    input_data: inputData,
    timeout_ms: timeoutMs,
  };

  const command = new InvokeCommand({
    FunctionName: CODE_EXECUTOR_LAMBDA_ARN,
    Payload: JSON.stringify(payload),
    LogType: 'None',
  });

  const startTime = Date.now();
  try {
    const response = await lambdaClient.send(command);
    const jsSideExecutionTimeMs = Date.now() - startTime; // JS-side measured time

    if (response.FunctionError) {
        let errorDetails = "No additional details in payload.";
        if (response.Payload && response.Payload.length > 0) {
            try {
                const errorPayloadString = new TextDecoder().decode(response.Payload);
                try {
                    const parsedError = JSON.parse(errorPayloadString);
                    errorDetails = parsedError.errorMessage || parsedError.message || JSON.stringify(parsedError);
                } catch (e) {
                    errorDetails = errorPayloadString;
                }
            } catch (decodeError) {
                errorDetails = "Error payload present but could not be decoded.";
            }
        }
        console.error(`Code Executor Lambda FunctionError: ${response.FunctionError}. Details: ${errorDetails}`);
        return new ExecutionResult({
            stderr: `Executor Lambda Error: ${response.FunctionError}. Details: ${errorDetails.substring(0, 1000)}`,
            exitCode: -1,
            executionTimeMs: jsSideExecutionTimeMs,
            error: new Error(`Executor Lambda Error: ${response.FunctionError}`),
            isSuccessful: false
        });
    }

    if (response.StatusCode !== 200) {
      console.error(`Code executor Lambda invocation failed with status code: ${response.StatusCode}`);
      return new ExecutionResult({
        error: new Error(`Code executor Lambda invocation failed with status code: ${response.StatusCode}`),
        executionTimeMs: jsSideExecutionTimeMs,
        isSuccessful: false
      });
    }

    if (!response.Payload || response.Payload.length === 0) {
      console.error("Code Executor Lambda returned 200/OK and no FunctionError, but payload was missing or empty.");
      return new ExecutionResult({
        error: new Error("Code executor Lambda returned 200/OK but no/empty payload."),
        executionTimeMs: jsSideExecutionTimeMs,
        isSuccessful: false
      });
    }

    const outerResponsePayloadString = new TextDecoder().decode(response.Payload);
    let outerResponseObject;
    try {
      outerResponseObject = JSON.parse(outerResponsePayloadString);
    } catch (parseError) {
      console.error("Failed to parse outer response payload from executor lambda:", parseError);
      console.error("Offending outer payload string:", outerResponsePayloadString.substring(0, 1000));
      return new ExecutionResult({
        error: new Error(`Failed to parse outer response payload from executor lambda: ${parseError.message}`),
        stderr: `Invalid JSON outer response from executor. Raw response (partial): ${outerResponsePayloadString.substring(0, 500)}`,
        executionTimeMs: jsSideExecutionTimeMs,
        isSuccessful: false
      });
    }

    // The actual execution result is in the 'body' of the outerResponseObject,
    // and that 'body' itself is a JSON string.
    if (typeof outerResponseObject.body !== 'string') {
        console.error("Executor lambda's response 'body' is not a string or is missing.");
        console.error("Outer response object:", JSON.stringify(outerResponseObject).substring(0,1000));
        return new ExecutionResult({
            error: new Error("Executor lambda's response 'body' is not a string or is missing."),
            executionTimeMs: jsSideExecutionTimeMs,
            isSuccessful: false
        });
    }

    let actualExecutionResult; // This will hold the fields like stdout, stderr, isSuccessful
    try {
        actualExecutionResult = JSON.parse(outerResponseObject.body);
    } catch (bodyParseError) {
        console.error("Failed to parse 'body' of the executor lambda's response:", bodyParseError);
        console.error("Offending 'body' string:", outerResponseObject.body.substring(0, 1000));
        return new ExecutionResult({
            error: new Error(`Failed to parse 'body' of executor response: ${bodyParseError.message}`),
            stderr: `Invalid JSON in executor 'body'. Raw body (partial): ${outerResponseObject.body.substring(0,500)}`,
            executionTimeMs: jsSideExecutionTimeMs,
            isSuccessful: false
        });
    }
    
    // Construct ExecutionResult using fields from actualExecutionResult
    return new ExecutionResult({
      stdout: actualExecutionResult.stdout,
      stderr: actualExecutionResult.stderr,
      exitCode: actualExecutionResult.exitCode,
      executionTimeMs: actualExecutionResult.executionTimeMs || jsSideExecutionTimeMs, // Prefer lambda's time
      timedOut: actualExecutionResult.timedOut,
      error: actualExecutionResult.error ? new Error(actualExecutionResult.error) : null,
      isSuccessful: actualExecutionResult.isSuccessful
    });

  } catch (error) {
    console.error("Error invoking Code Executor Lambda or processing its response:", error);
    return new ExecutionResult({
      error: error,
      executionTimeMs: Date.now() - startTime,
      isSuccessful: false
    });
  }
}

/**
 * Parse execution result stdout to extract the result object
 * @param {ExecutionResult} executionResult - Execution result to parse
 * @returns {any} Parsed result or null if parsing fails or stdout is not JSON from user code
 */
export function parseExecutionResult(executionResult) {
  // Use the getter for success check
  if (!executionResult.wasSuccessful || !executionResult.stdout) {
    // If not successful, or no stdout, there's no user code result to parse from stdout.
    // Errors would be in stderr or the error field.
    return null;
  }

  try {
    // The Python executor lambda's stdout for successful user code execution
    // should be a JSON string like: {"result": <actual_user_code_output>}
    const parsedStdout = JSON.parse(executionResult.stdout.trim());

    if (parsedStdout && typeof parsedStdout === 'object' && 'result' in parsedStdout) {
      return parsedStdout.result;
    } else if (parsedStdout && typeof parsedStdout === 'object' && 'error' in parsedStdout) {
      // This case should ideally be caught by the Python Lambda and put into stderr.
      // But if it slips through to stdout:
      console.warn("User code printed an error structure to stdout:", parsedStdout.error);
      // executionResult.stderr = executionResult.stderr ? `${executionResult.stderr}\n${JSON.stringify(parsedStdout)}` : JSON.stringify(parsedStdout);
      // executionResult.isSuccessful = false; // Correct the success status
      return null; // No valid 'result'
    } else {
        // This means stdout was valid JSON, but not the expected {"result": ...} structure.
        // This could happen if the user's code prints arbitrary JSON not wrapped in "result".
        // For strictness, we expect the {"result": ...} wrapper.
        console.warn(
            `Parsed stdout JSON does not have the expected 'result' key: "${executionResult.stdout.trim()}"`
        );
        return null;
    }
  } catch (error) {
    // This means stdout was not valid JSON at all.
    // Could be due to user code printing non-JSON text to stdout.
    console.warn(
      `Failed to parse execution result from stdout as JSON: "${executionResult.stdout.trim()}"`,
      error,
    );
    // executionResult.stderr = executionResult.stderr ? `${executionResult.stderr}\nStdout: ${executionResult.stdout}` : `Stdout: ${executionResult.stdout}`;
    // executionResult.isSuccessful = false; // Correct the success status
    return null; // Return null if JSON parsing fails
  }
}

/**
 * Language executor mapping.
 * Only Python is currently updated to use Lambda.
 */
export const languageExecutors = {
  "python3.12": executePythonViaLambda,
  // If you had other local executors (e.g., for JavaScript), they would remain or be updated.
};

/**
 * Execute code in the appropriate language
 * @param {string} code - Code to execute
 * @param {any} input - Input to pass to the code
 * @param {string} language - Programming language (defaults to DEFAULT_LANGUAGE if undefined)
 * @param {object} options - Execution options
 * @returns {Promise<ExecutionResult>} Execution result
 */
export async function executeCode(
  code,
  input,
  language, // Can be undefined
  options = {},
) {
  const langToUse = language || DEFAULT_LANGUAGE; // Use default if language is not provided
  const executor = languageExecutors[langToUse];

  if (!executor) {
    // This should ideally not happen if langToUse is controlled
    console.error(`Unsupported language: ${langToUse}`);
    return new ExecutionResult({
        error: new Error(`Unsupported language: ${langToUse}`),
        isSuccessful: false
    });
  }

  return executor(code, input, options);
}
