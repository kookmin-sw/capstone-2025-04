/**
 * codeExecutor.mjs
 *
 * Provides utilities for executing code snippets safely in a sandboxed environment.
 * Initially supporting Python 3.12, designed for future language extensibility.
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import { join, dirname } from "path";
import os from "os";

// Constants
const DEFAULT_TIMEOUT_MS = 5000; // 5 seconds
const MAX_MEMORY_MB = 512; // 512 MB
const TEMP_DIR = process.env.LAMBDA_TEMP_DIR || os.tmpdir();

/**
 * Execution result interface
 */
export class ExecutionResult {
  // ... (ExecutionResult class remains the same) ...
  constructor({
    stdout = "",
    stderr = "",
    exitCode = null,
    executionTimeMs = 0,
    timedOut = false,
    error = null,
  }) {
    this.stdout = stdout;
    this.stderr = stderr;
    this.exitCode = exitCode;
    this.executionTimeMs = executionTimeMs;
    this.timedOut = timedOut;
    this.error = error;
  }

  /**
   * Returns true if the execution was successful (no errors, timeout, or non-zero exit code)
   */
  get isSuccessful() {
    return !this.error && !this.timedOut && this.exitCode === 0;
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
      error: this.error ? this.error.message : null,
      isSuccessful: this.isSuccessful,
    };
  }

  /**
   * Returns a classification of the error, if any
   */
  getErrorType() {
    if (this.isSuccessful) return null;
    if (this.timedOut) return "TIMEOUT";

    if (this.stderr) {
      if (this.stderr.includes("SyntaxError")) return "SYNTAX_ERROR";
      if (this.stderr.includes("MemoryError")) return "MEMORY_ERROR";
      return "RUNTIME_ERROR";
    }

    return "UNKNOWN_ERROR";
  }
}

/**
 * Creates a temporary file with the given code
 * @param {string} code - Code content to write to file
 * @param {string} extension - File extension
 * @returns {Promise<string>} Path to created file
 */
async function createTempFile(code, extension = ".py") {
  // ... (createTempFile remains the same) ...
  const filename = `${randomUUID()}${extension}`;
  const filepath = join(TEMP_DIR, filename);
  await fs.writeFile(filepath, code, "utf8");
  return filepath;
}

/**
 * Cleans up temporary files created during execution
 * @param {Array<string>} filePaths - Paths to files that should be deleted
 */
async function cleanupTempFiles(filePaths) {
  // ... (cleanupTempFiles remains the same) ...
  for (const file of filePaths) {
    try {
      await fs.unlink(file);
    } catch (error) {
      console.warn(`Failed to delete temp file ${file}:`, error);
    }
  }
}

/**
 * Execute Python code with the given input
 * @param {string} code - Python code to execute
 * @param {any} input - Input to pass to the code (will be JSON stringified)
 * @param {object} options - Execution options
 * @returns {Promise<ExecutionResult>} Execution result
 */
export async function executePython(code, input, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, memoryLimitMb = MAX_MEMORY_MB } =
    options;

  // Files to cleanup at the end
  const tempFiles = [];

  try {
    // Create a Python file with the solution code
    const solutionFile = await createTempFile(code);
    tempFiles.push(solutionFile);

    // Create a runner file that imports the solution and executes it with the input
    // Added a helper function `convert_non_json_values`
    const runnerCode = `
import sys
import json
import traceback
import math # Import math for isnan

# Import solution (user code)
sys.path.append("${dirname(solutionFile)}")
solution_file = "${solutionFile.replace(/\\/g, "\\\\")}"

# Helper function to convert non-standard floats to JSON-compatible strings
def convert_non_json_values(obj):
    if isinstance(obj, float):
        if math.isinf(obj):
            return "Infinity" if obj > 0 else "-Infinity"
        elif math.isnan(obj):
            return "NaN"
        return obj
    elif isinstance(obj, dict):
        return {k: convert_non_json_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_non_json_values(elem) for elem in obj]
    else:
        return obj

# Input data
input_data = json.loads("""${JSON.stringify(input).replace(/"/g, '\\"')}""")

try:
    # Execute in a try-except block to catch errors
    with open(solution_file, 'r') as f:
        solution_code = f.read()
        # Using exec to execute the solution code in the current namespace
        exec(solution_code, globals())

    # Try to call solution function with input
    result = None
    if 'solution' in globals():
        result = solution(input_data)
    else:
        # Look for other common function names
        function_names = ['solve', 'answer', 'main']
        for func_name in function_names:
            if func_name in globals():
                result = globals()[func_name](input_data)
                break
        else:
            # If no known function found, set error result
            print(json.dumps({"error": "Could not find standard solution function (solution, solve, answer, main)"}), file=sys.stderr)
            sys.exit(1) # Exit with error code if function not found

    # Convert result to be JSON serializable BEFORE printing
    converted_result = convert_non_json_values(result)
    print(json.dumps({"result": converted_result}))

except Exception as e:
    error_type = type(e).__name__
    error_msg = str(e)
    traceback_str = traceback.format_exc()
    print(json.dumps({
        "error": f"{error_type}: {error_msg}",
        "traceback": traceback_str
    }), file=sys.stderr)
    sys.exit(1)
`;

    const runnerFile = await createTempFile(runnerCode);
    tempFiles.push(runnerFile);

    // Execute the Python code with timeout
    const startTime = Date.now();

    return new Promise((resolve) => {
      // ... (rest of the Promise logic remains the same) ...
      let stdout = "";
      let stderr = "";
      let killed = false;

      // Use spawn to execute the python process
      const pythonProcess = spawn("python3.12", [runnerFile], {
        timeout: timeoutMs,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
          // Limit memory using resource module in Python
          PYTHONPATH: process.env.PYTHONPATH || "",
        },
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        killed = true;
        pythonProcess.kill("SIGTERM");
      }, timeoutMs);

      // Capture stdout
      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      // Capture stderr
      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      pythonProcess.on("close", async (exitCode) => {
        clearTimeout(timeoutId);
        const executionTimeMs = Date.now() - startTime;

        // Clean up temp files
        await cleanupTempFiles(tempFiles);

        resolve(
          new ExecutionResult({
            stdout,
            stderr,
            exitCode,
            executionTimeMs,
            timedOut: killed,
            error: killed ? new Error("Execution timed out") : null,
          }),
        );
      });

      // Handle process errors
      pythonProcess.on("error", async (error) => {
        clearTimeout(timeoutId);

        // Clean up temp files
        await cleanupTempFiles(tempFiles);

        resolve(
          new ExecutionResult({
            error,
            executionTimeMs: Date.now() - startTime,
          }),
        );
      });
    });
  } catch (error) {
    // Clean up temp files on error
    await cleanupTempFiles(tempFiles);

    return new ExecutionResult({
      error,
      executionTimeMs: 0,
    });
  }
}

/**
 * Parse execution result stdout to extract the result object
 * @param {ExecutionResult} executionResult - Execution result to parse
 * @returns {any} Parsed result or null if parsing fails
 */
export function parseExecutionResult(executionResult) {
  // ... (parseExecutionResult remains the same, it should now receive valid JSON) ...
  if (!executionResult.isSuccessful || !executionResult.stdout) {
    return null;
  }

  try {
    // Try to parse the output as JSON
    const outputLines = executionResult.stdout.trim().split("\n");
    // Get the last line, as previous lines might be debug prints from user code
    const lastLine = outputLines[outputLines.length - 1];

    const parsedOutput = JSON.parse(lastLine);

    // Check if the parsed output itself indicates an error from the runner script
    if (parsedOutput && parsedOutput.error) {
      console.warn(
        "Execution resulted in an error reported by the runner:",
        parsedOutput.error,
      );
      // We might want to handle this differently, perhaps by adding it to stderr or a specific error field
      // For now, return null as it wasn't a successful result data structure
      return null;
    }

    return parsedOutput.result;
  } catch (error) {
    console.warn(
      `Failed to parse execution result from stdout: "${executionResult.stdout.trim()}"`,
      error,
    );
    return null; // Return null if JSON parsing fails
  }
}

/**
 * Language executor mapping for future extensibility
 */
export const languageExecutors = {
  "python3.12": executePython,
  // Add more language executors as needed
};

/**
 * Execute code in the appropriate language
 * @param {string} code - Code to execute
 * @param {any} input - Input to pass to the code
 * @param {string} language - Programming language
 * @param {object} options - Execution options
 * @returns {Promise<ExecutionResult>} Execution result
 */
export async function executeCode(
  code,
  input,
  language = "python3.12",
  options = {},
) {
  // ... (executeCode remains the same) ...
  const executor = languageExecutors[language];

  if (!executor) {
    throw new Error(`Unsupported language: ${language}`);
  }

  return executor(code, input, options);
}
