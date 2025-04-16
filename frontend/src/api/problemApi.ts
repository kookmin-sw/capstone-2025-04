// src/api/problemApi.ts
import { getStaticProblem, isStaticProblemId } from "./staticProblems";

// Base URL for your API Gateway stage for Problems API
// Use environment variable, fallback for local development
const API_BASE_URL =
  process.env.NEXT_PUBLIC_PROBLEM_API_BASE_URL || "http://localhost:3002"; // Example fallback, adjust if needed

// --- Type Definitions ---

/**
 * GET /problems API 응답 타입 (문제 목록)
 * getAllProblems.mjs의 ProjectionExpression 기반
 */
export interface ProblemSummary {
  problemId: string;
  title: string;
  difficulty: string; // 예: "Easy", "Medium", "Hard" 또는 생성된 값 그대로
  algorithmType?: string; // 선택적 필드
  createdAt: string;
}

/**
 * GET /problems/{problemId} API 응답 타입 (문제 상세)
 * problem-generator-v2가 DynamoDB에 저장하는 필드 및 getProblemById.mjs 반환값 기반
 */
export interface ProblemDetail {
  problemId: string;
  title: string;
  description: string;
  difficulty: string;
  constraints: string; // JSON 문자열 형태의 제약 조건
  solutionCode: string;
  testGeneratorCode: string;
  analyzedIntent: string;
  testSpecifications: string; // JSON 문자열 형태의 테스트 명세
  generationStatus: string;
  language: string;
  createdAt: string;
  completedAt?: string; // 완료 시 존재
  userPrompt?: string; // 생성 요청 시 사용된 프롬프트
  errorMessage?: string; // 생성 실패 시 오류 메시지
  // DynamoDB에 저장된 다른 필드가 있다면 추가 가능
}

// --- API Error Handling (Reusing from communityApi) ---

class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * API 응답을 처리하고 성공 시 데이터를 반환하거나 실패 시 ApiError를 throw합니다.
 * (communityApi.ts의 핸들러와 동일 로직)
 */
const handleApiResponse = async (response: Response): Promise<unknown> => {
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    let errorData;
    try {
      const errorResponseClone = response.clone();
      errorData = await errorResponseClone.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      try {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
        errorData = errorText;
      } catch {
        /* ignore */
      }
    }
    console.error(
      `API Error ${response.status}:`,
      errorData || response.statusText
    );
    throw new ApiError(errorMessage, response.status, errorData);
  }

  // Handle no content responses
  if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    return undefined;
  }

  // Try parsing JSON
  try {
    const successResponseClone = response.clone();
    return await successResponseClone.json();
  } catch (jsonError) {
    console.warn("Failed to parse response body as JSON.", jsonError);
    // Fallback: try reading as text if JSON parsing fails
    try {
      const textBody = await response.text();
      if (textBody) {
        try {
          // Attempt manual parsing if text body exists
          return JSON.parse(textBody);
        } catch (parseError) {
          console.error("Failed to manually parse text body:", parseError);
          throw new ApiError(
            "Failed to parse API response text",
            response.status,
            textBody
          );
        }
      }
      return undefined; // Return undefined if text body is also empty
    } catch (textError) {
      console.error("Failed to read response body as text:", textError);
      throw new ApiError("Failed to read API response body", response.status);
    }
  }
};

// --- API Functions ---

/**
 * 모든 문제의 요약 목록을 가져옵니다.
 * GET /problems
 * (인증 불필요)
 */
export const getProblems = async (): Promise<ProblemSummary[]> => {
  const response = await fetch(`${API_BASE_URL}/problems`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      // No Authorization header needed for public endpoints
    },
  });
  const result: unknown = await handleApiResponse(response);
  // API가 항상 배열을 반환한다고 가정, 아닐 경우 빈 배열 반환
  return Array.isArray(result) ? result : [];
};

/**
 * 특정 문제의 상세 정보를 가져옵니다.
 * GET /problems/{problemId}
 * (인증 불필요)
 */
export const getProblemById = async (
  problemId: string
): Promise<ProblemDetail> => {
  if (!problemId) {
    throw new Error("problemId is required to fetch problem details.");
  }
  // 1. Check if it's a static problem ID (1-6)
  if (isStaticProblemId(problemId)) {
    console.log(`[CodingTest API] Requested static problem: ${problemId}`);
    const staticProblem = getStaticProblem(problemId);
    if (staticProblem) {
      // Return static data as ProblemDetailAPI
      return Promise.resolve(staticProblem as ProblemDetail);
    } else {
      // This shouldn't happen if isStaticProblemId is correct, but handle defensively
      console.error(`Static problem data not found for ID: ${problemId}`);
      throw new ApiError(
        `Static problem data missing for ID ${problemId}`,
        404
      );
    }
  }
  const response = await fetch(`${API_BASE_URL}/problems/${problemId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      // No Authorization header needed
    },
  });
  // handleApiResponse는 파싱된 객체를 반환할 것으로 예상됨
  console.log(response);
  return handleApiResponse(response) as Promise<ProblemDetail>;
};

// TODO: Add functions for other problem-related endpoints if they are created later
// e.g., creating problems manually (POST /problems - requires auth)
// e.g., updating problems (PATCH /problems/{problemId} - requires auth)
// e.g., deleting problems (DELETE /problems/{problemId} - requires auth)
