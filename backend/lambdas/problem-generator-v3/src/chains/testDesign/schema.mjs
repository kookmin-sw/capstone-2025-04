import { z } from "zod";

/**
 * Zod schema for a single test case.
 */
export const TestCaseSchema = z
  .object({
    input: z.any().describe("input value"),
    expected_output: z.any().optional().describe("execution result"),
    rationale: z.string().describe("why this case is needed (edge case, performance, special condition, etc.)")
  })
  .describe("Individual test case with rationale");

/**
 * Zod schema for Test Specs output - array of test cases.
 */
export const TestSpecsOutputSchema = z
  .array(TestCaseSchema)
  .describe("Structured output for Step 2: Test Case Design");

/**
 * Zod schema for finalized test cases (with validated outputs)
 */
export const FinalizedTestCaseSchema = z
  .object({
    input: z.any().describe("input value"),
    expected_output: z.any().describe("execution result"),
    rationale: z.string().describe("why this case is needed (edge case, performance, special condition, etc.)"),
    execution_time_ms: z.number().optional().describe("execution time (milliseconds)")
  })
  .describe("Finalized test case with execution-verified output");

/**
 * Zod schema for finalized test cases output
 */
export const FinalizedTestCasesOutputSchema = z
  .array(FinalizedTestCaseSchema)
  .describe("Structured output for Step 5: Test Case Finalization"); 