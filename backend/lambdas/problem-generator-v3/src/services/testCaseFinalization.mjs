/**
 * testCaseFinalization.mjs
 * 
 * Service to finalize test cases using the validated solution and execution results.
 * This replaces the old test generation approach in the v3 implementation.
 */

import { finalizeTestCases, generateAdditionalEdgeCases } from './solutionExecution.mjs';
import { executeSolutionWithTestCases } from './solutionExecution.mjs';

/**
 * Standardizes the output format to ensure consistency across all test cases
 * - Converts all dictionary keys to strings
 * - Replaces float('inf') with "Infinity" string
 * - Ensures consistent representation of special values
 * 
 * @param {any} output - The output value to standardize
 * @returns {any} Standardized output that follows consistent formatting
 */
export function standardizeOutputFormat(output) {
  // Handle null or undefined
  if (output === null || output === undefined) {
    return null;
  }

  // Handle primitive types
  if (typeof output !== 'object') {
    return output;
  }

  // Handle arrays
  if (Array.isArray(output)) {
    return output.map(item => standardizeOutputFormat(item));
  }

  // Handle objects (dictionaries)
  const standardizedOutput = {};
  for (const [key, value] of Object.entries(output)) {
    // Ensure all keys are strings
    const stringKey = String(key);
    
    // Process the value recursively
    let processedValue = value;
    
    // Standardize special values like infinity and NaN
    if (value === Infinity || (typeof value === 'number' && !isFinite(value) && value > 0)) {
      processedValue = "Infinity";
    } else if (value === -Infinity || (typeof value === 'number' && !isFinite(value) && value < 0)) {
      processedValue = "-Infinity";
    } else if (typeof value === 'number' && isNaN(value)) {
      processedValue = "NaN";
    } else if (typeof value === 'object' && value !== null) {
      processedValue = standardizeOutputFormat(value);
    }
    
    standardizedOutput[stringKey] = processedValue;
  }
  
  return standardizedOutput;
}

/**
 * Finalizes test cases by executing additional edge cases and ensuring all test cases are properly formatted
 * 
 * @param {string} validatedSolutionCode - The validated solution code
 * @param {Array} executionResults - Results from running the solution on initial test inputs
 * @param {object} llm - LLM instance for generating additional edge cases (optional)
 * @param {string} language - Programming language of the solution
 * @returns {Promise<object>} Object containing finalized test cases and metadata
 */
export async function finalizeTestCasesWithEdgeCases(
  validatedSolutionCode, 
  executionResults, 
  llm = null,
  language = 'python3.12'
) {
  if (!validatedSolutionCode || !executionResults || !executionResults.testResults) {
    throw new Error('Invalid arguments: solution code or execution results missing');
  }

  // Start with the execution results we already have
  const initialTestCases = finalizeTestCases(executionResults);
  
  // Apply standardization to the expected_output of all test cases
  const standardizedTestCases = initialTestCases.map(testCase => ({
    ...testCase,
    expected_output: standardizeOutputFormat(testCase.expected_output)
  }));
  
  // Contains the final set of test cases and metadata
  const result = {
    finalTestCases: standardizedTestCases,
    edgeCasesAdded: 0,
    edgeCasesFailed: 0,
    success: true
  };

  // Skip edge case generation if no LLM is provided
  if (!llm) {
    return result;
  }

  try {
    // Optional: Generate additional edge cases (if LLM is provided)
    // This would normally use the LLM to suggest additional edge cases
    // For now, we're using a placeholder function that returns an empty array
    const additionalInputs = await generateAdditionalEdgeCases(
      validatedSolutionCode,
      standardizedTestCases,
      language
    );

    if (additionalInputs && additionalInputs.length > 0) {
      // Create test specs from the additional inputs
      const additionalTestSpecs = additionalInputs.map((input, index) => ({
        input,
        rationale: `Additional edge case ${index + 1}`
      }));

      // Execute the solution with the additional edge cases
      const additionalResults = await executeSolutionWithTestCases(
        validatedSolutionCode,
        additionalTestSpecs,
        language
      );

      // Record metadata about edge cases
      result.edgeCasesAdded = additionalResults.testResults.length;
      result.edgeCasesFailed = additionalResults.errors.length;

      // Add successful edge cases to the final test cases
      if (additionalResults.testResults.length > 0) {
        const additionalFinalCases = finalizeTestCases({
          testResults: additionalResults.testResults
        });
        
        // Apply standardization to additional edge cases
        const standardizedAdditionalCases = additionalFinalCases.map(testCase => ({
          ...testCase,
          expected_output: standardizeOutputFormat(testCase.expected_output)
        }));
        
        result.finalTestCases = [...result.finalTestCases, ...standardizedAdditionalCases];
      }

      // If any edge cases failed, make a note but don't fail the whole process
      if (additionalResults.errors.length > 0) {
        console.warn(`${additionalResults.errors.length} additional edge cases failed execution`);
      }
    }
  } catch (error) {
    console.error('Error generating additional edge cases:', error);
    // Non-critical error, don't fail the whole process
  }

  return result;
}

/**
 * Selects a subset of test cases to use as examples in the problem description
 * 
 * @param {Array} finalTestCases - Array of finalized test cases
 * @param {number} maxExamples - Maximum number of examples to select
 * @param {Object} inputSchemaDetails - Optional structured details about input schema, including duplicate handling
 * @returns {Array} Selected test cases for examples
 */
export function selectExampleTestCases(finalTestCases, maxExamples = 2, inputSchemaDetails = null) {
  if (!finalTestCases || !Array.isArray(finalTestCases) || finalTestCases.length === 0) {
    return [];
  }

  // If we have fewer test cases than the maximum, return all of them
  if (finalTestCases.length <= maxExamples) {
    return finalTestCases;
  }

  // Prefer simple examples for the problem description
  // We'll define "simple" as:
  // 1. Shorter inputs (when serialized as JSON)
  // 2. Non-edge cases (based on rationale)
  // 3. Examples that showcase special formats (like "Infinity" for unreachable nodes)
  // 4. If input schema allows duplicates, include examples with duplicates based on rationale

  // Check if any test case has "Infinity" in the expected output
  const hasInfinityValues = finalTestCases.some(testCase => 
    JSON.stringify(testCase.expected_output).includes("Infinity")
  );

  // Get flags from inputSchemaDetails with safe defaults
  const allowsDuplicates = inputSchemaDetails?.allows_duplicates_in_collections ?? false;
  const allowsRevisitingNodes = inputSchemaDetails?.can_revisit_nodes_in_paths ?? false;

  // Sort by simplicity
  const sortedBySimplicity = [...finalTestCases].sort((a, b) => {
    // First, if we have infinity values, prioritize at least one example showing it
    if (hasInfinityValues) {
      const aHasInfinity = JSON.stringify(a.expected_output).includes("Infinity");
      const bHasInfinity = JSON.stringify(b.expected_output).includes("Infinity");
      
      if (aHasInfinity && !bHasInfinity) return -1;
      if (!aHasInfinity && bHasInfinity) return 1;
    }
    
    // If duplicates are allowed, prioritize examples with duplicates mentioned in rationale
    if (allowsDuplicates) {
      const aDuplicateWords = ['duplicate', 'repeated', 'same element', 'duplicated'];
      const bDuplicateWords = ['duplicate', 'repeated', 'same element', 'duplicated'];
      
      const aShowsDuplicates = aDuplicateWords.some(word => a.rationale.toLowerCase().includes(word));
      const bShowsDuplicates = bDuplicateWords.some(word => b.rationale.toLowerCase().includes(word));
      
      if (aShowsDuplicates && !bShowsDuplicates) return -1;
      if (!aShowsDuplicates && bShowsDuplicates) return 1;
    }
    
    // If revisiting nodes in paths is allowed, prioritize examples that mention this
    if (allowsRevisitingNodes) {
      const aRevisitWords = ['cycle', 'revisit', 'repeated node', 'path with'];
      const bRevisitWords = ['cycle', 'revisit', 'repeated node', 'path with'];
      
      const aShowsRevisit = aRevisitWords.some(word => a.rationale.toLowerCase().includes(word));
      const bShowsRevisit = bRevisitWords.some(word => b.rationale.toLowerCase().includes(word));
      
      if (aShowsRevisit && !bShowsRevisit) return -1;
      if (!aShowsRevisit && bShowsRevisit) return 1;
    }
    
    // Prefer test cases without "edge" in the rationale
    const aIsEdge = a.rationale.toLowerCase().includes('edge');
    const bIsEdge = b.rationale.toLowerCase().includes('edge');
    
    if (aIsEdge !== bIsEdge) {
      return aIsEdge ? 1 : -1; // Non-edge cases first
    }
    
    // Then sort by input complexity (approximated by JSON length)
    const aComplexity = JSON.stringify(a.input).length;
    const bComplexity = JSON.stringify(b.input).length;
    
    return aComplexity - bComplexity; // Shorter JSON strings first
  });

  // Return the first N examples
  return sortedBySimplicity.slice(0, maxExamples);
} 