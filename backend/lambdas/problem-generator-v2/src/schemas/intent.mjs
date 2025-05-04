import { z } from "zod";

/**
 * Zod schema for Intent Analysis output.
 */
export const IntentOutputSchema = z
  .object({
    goal: z
      .string()
      .describe("한 줄 요약: 문제에서 해결하려는 핵심 로직"),
    key_constraints: z
      .array(z.string())
      .describe("입력·출력 관련 핵심 제약 설명"),
    concepts: z
      .array(z.string())
      .describe("Greedy, Sorting, Prefix Sum 등 필요한 알고리즘/자료구조 키워드")
  })
  .describe("Structured output for Step 1: Intent Analysis"); 