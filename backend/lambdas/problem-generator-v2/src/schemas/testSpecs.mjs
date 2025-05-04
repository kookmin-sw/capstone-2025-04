import { z } from "zod";

/**
 * Zod schema for a single test case.
 */
export const TestCaseSchema = z
  .object({
    input: z.any().describe("입력 값"),
    expected_output: z.any().describe("기대하는 출력 값"),
    rationale: z.string().describe("이 케이스가 필요한 이유 (엣지, 성능 등)")
  })
  .describe("Individual test case with rationale");

/**
 * Zod schema for Test Specs output - array of test cases.
 */
export const TestSpecsOutputSchema = z
  .array(TestCaseSchema)
  .describe("Structured output for Step 2: Test Case Design"); 