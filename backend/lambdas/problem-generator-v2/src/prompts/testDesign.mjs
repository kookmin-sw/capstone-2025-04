import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Test Design step.
 */
export const testDesignPromptTemplate = PromptTemplate.fromTemplate(
  `
You are "TestDesigner".  
Use the INTENT object below to draft test cases.

INTENT_JSON:
{intent_json}

Guidelines
1. Cover: empty, single element, typical, sorted ascending/descending, duplicates, max constraints.
2. Each test must include a short "rationale" explaining *why* it is included.

The solution will be written in {language}.
Target difficulty level: {difficulty}

Return JSON array:
[
  {
    "input": any,          // 입력 값
    "expected_output": any,
    "rationale": string    // 이 케이스가 필요한 이유 (엣지, 성능 등)
  },
  ...
]

{format_instructions}

ONLY return a valid JSON array.`
); 