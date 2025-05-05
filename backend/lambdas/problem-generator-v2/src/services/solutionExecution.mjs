/**
 * solutionExecution.mjs
 * 
 * Service to execute solution code against test inputs and generate verified outputs.
 * Part of the enhanced problem generation pipeline (v3).
 */

import { executeCode, parseExecutionResult } from '../utils/codeExecutor.mjs';

// Constants
const MAX_EXECUTION_RETRIES = 3;
const EXECUTION_TIMEOUT_MS = 5000; // 5 seconds timeout per test case

/**
 * Executes solution code against each test input and returns the results
 * 
 * @param {string} solutionCode - The solution code to execute
 * @param {Array} testSpecs - Array of test specifications with inputs
 * @param {string} language - Programming language of the solution code
 * @returns {Promise<object>} Execution results including validated test cases and any errors
 */
export async function executeSolutionWithTestCases(solutionCode, testSpecs, language = 'python3.12') {
  if (!solutionCode || !testSpecs || !Array.isArray(testSpecs) || testSpecs.length === 0) {
    throw new Error('Invalid arguments: solution code or test specs missing');
  }

  const executionResults = {
    success: true,
    validatedSolutionCode: solutionCode,
    testResults: [],
    errors: [],
    feedback: null
  };

  // Execute each test case
  for (const [index, testCase] of testSpecs.entries()) {
    const { input, rationale } = testCase;
    
    if (input === undefined) {
      executionResults.errors.push({
        type: 'INVALID_TEST_SPEC',
        message: `Test case at index ${index} is missing an input value`,
        testCaseIndex: index
      });
      continue;
    }

    try {
      // Execute the solution with the test case input
      const result = await executeCode(solutionCode, input, language, {
        timeoutMs: EXECUTION_TIMEOUT_MS
      });
      console.log("result", result);

      if (!result.isSuccessful) {
        // Record execution error
        const errorType = result.getErrorType();
        const errorMsg = result.stderr || result.error?.message || 'Unknown error';
        
        executionResults.errors.push({
          type: errorType,
          message: errorMsg,
          testCaseIndex: index,
          executionDetails: result.toJSON()
        });
        
        executionResults.success = false;
      } else {
        // Parse the execution result to get the actual output
        const output = parseExecutionResult(result);
        
        // Add the result to the test results
        executionResults.testResults.push({
          input,
          expected_output: output, // Rename to expected_output for final test cases
          rationale: rationale || `Test case ${index + 1}`,
          execution_time_ms: result.executionTimeMs
        });
      }
    } catch (error) {
      // Handle unexpected errors during execution
      executionResults.errors.push({
        type: 'EXECUTION_ERROR',
        message: error.message,
        testCaseIndex: index
      });
      
      executionResults.success = false;
    }
  }

  // Generate feedback for solution regeneration if there were errors
  if (!executionResults.success) {
    executionResults.feedback = generateFeedbackFromErrors(executionResults.errors);
  }

  return executionResults;
}

/**
 * Generates specific feedback for solution regeneration based on encountered errors
 * 
 * @param {Array} errors - Array of error objects from execution
 * @returns {string} Feedback for solution regeneration
 */
function generateFeedbackFromErrors(errors) {
  if (!errors || errors.length === 0) {
    return null;
  }

  // Group errors by type
  const errorsByType = errors.reduce((acc, error) => {
    const type = error.type || 'UNKNOWN_ERROR';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(error);
    return acc;
  }, {});

  const feedbackParts = [];

  // Generate feedback for syntax errors
  if (errorsByType.SYNTAX_ERROR) {
    const syntaxErrors = errorsByType.SYNTAX_ERROR;
    feedbackParts.push(`There ${syntaxErrors.length === 1 ? 'is a syntax error' : 'are syntax errors'} in the code:`);
    
    syntaxErrors.slice(0, 3).forEach(error => {
      feedbackParts.push(`- ${error.message.split('\n')[0]}`);
    });
    
    if (syntaxErrors.length > 3) {
      feedbackParts.push(`- ... and ${syntaxErrors.length - 3} more syntax errors.`);
    }
  }

  // Generate feedback for runtime errors
  if (errorsByType.RUNTIME_ERROR) {
    const runtimeErrors = errorsByType.RUNTIME_ERROR;
    feedbackParts.push(`There ${runtimeErrors.length === 1 ? 'is a runtime error' : 'are runtime errors'} when executing the code:`);
    
    runtimeErrors.slice(0, 3).forEach(error => {
      const testCaseIndex = error.testCaseIndex;
      feedbackParts.push(`- Test case ${testCaseIndex + 1}: ${error.message.split('\n')[0]}`);
    });
    
    if (runtimeErrors.length > 3) {
      feedbackParts.push(`- ... and ${runtimeErrors.length - 3} more runtime errors.`);
    }
  }

  // Generate feedback for timeouts
  if (errorsByType.TIMEOUT) {
    const timeoutErrors = errorsByType.TIMEOUT;
    feedbackParts.push(`The code execution ${timeoutErrors.length === 1 ? 'timed out for 1 test case' : `timed out for ${timeoutErrors.length} test cases`}. Please optimize your solution for better time complexity.`);
  }

  // Generate feedback for other errors
  if (errorsByType.MEMORY_ERROR) {
    feedbackParts.push('The code exceeded the memory limit. Please optimize your solution to use less memory.');
  }

  if (errorsByType.UNKNOWN_ERROR || errorsByType.EXECUTION_ERROR) {
    feedbackParts.push('There were unexpected errors during execution. Please check your solution code.');
  }

  return feedbackParts.join('\n\n');
}

/**
 * Generates additional edge case inputs based on the validated test cases and solution
 * This is an optional enhancement for test case finalization (Step 5)
 * 
 * @param {string} validatedSolutionCode - The validated solution code
 * @param {Array} validatedTestCases - Array of validated test cases
 * @param {string} language - Programming language of the solution
 * @returns {Promise<Array>} Additional edge case inputs for validation
 */
export async function generateAdditionalEdgeCases(validatedSolutionCode, validatedTestCases, language = 'python3.12') {
  // This would normally use LLM to generate additional edge cases
  // For now, returning an empty array as this is marked as optional in the plan
  return [];
}

/**
 * Finalizes test cases by ensuring all have proper inputs, outputs, and rationales
 * 
 * @param {Array} executionResults - Results from running the solution on test inputs
 * @returns {Array} Finalized test cases ready for problem description
 */
export function finalizeTestCases(executionResults) {
  if (!executionResults || !executionResults.testResults) {
    return [];
  }

  return executionResults.testResults.map((testCase, index) => {
    // Ensure all test cases have the required fields
    return {
      input: testCase.input,
      expected_output: testCase.expected_output,
      rationale: testCase.rationale || `Test case ${index + 1}`,
    };
  });
} 