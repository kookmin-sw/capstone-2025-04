import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Intent Analysis step.
 */
export const intentAnalysisPromptTemplate = PromptTemplate.fromTemplate(
  `
You are "IntentExtractor", an expert at distilling programming-problem requirements.

USER_PROMPT: {user_prompt}
TARGET_LANGUAGE: {language}
DIFFICULTY: {difficulty}

Return a JSON with:
{
  "goal": string,   // 한 줄 요약: 문제에서 해결하려는 핵심 로직
  "key_constraints": string[], // 입력·출력 관련 핵심 제약 설명
  "concepts": string[] // Greedy, Sorting, Prefix Sum 등 필요한 알고리즘/자료구조 키워드
}

{format_instructions}

ONLY return valid JSON.`
); 