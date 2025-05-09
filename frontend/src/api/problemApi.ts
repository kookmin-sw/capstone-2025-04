import { getStaticProblem, isStaticProblemId } from "./staticProblems";

// Base URL for your API Gateway stage for Problems API
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
  title_translated?: string;
  difficulty: string;
  algorithmType?: string; // Usually part of intent, might not be directly in summary
  createdAt: string;
  creatorId?: string;
  author?: string;
  language?: string; // Add language to summary if available
}

/**
 * GET /problems/{problemId} API 응답 타입 (문제 상세)
 * problem-generator-v3가 DynamoDB에 저장하는 필드 및 getProblemById.mjs 반환값 기반
 */
export interface ProblemDetail {
  problemId: string;
  userPrompt?: string;
  difficulty: string;
  language: string; // e.g., "python3.12" - The primary language of the generated problem
  targetLanguage?: string;
  createdAt: string;
  completedAt?: string;
  generationStatus: string;
  errorMessage?: string;
  
  title: string;
  title_translated?: string;
  description: string; // Markdown format, potentially including constraints and examples
  description_translated?: string;
  
  intent?: string; // JSON string of the intent object
  // testSpecifications is now finalTestCases
  finalTestCases: string; // JSON string of test cases with input, expected_output, rationale
  
  validatedSolutionCode?: string; // The validated solution code
  startCode?: string;             // Starter code for the user
  
  constraints: string; // JSON string of derived constraints (time_limit, memory_limit, input_constraints, judge_type, epsilon)
  judgeType?: string;   // Directly from parsed constraints or top-level
  epsilon?: number;     // Directly from parsed constraints or top-level
  
  testGeneratorCode?: string; // May or may not be present in v3 output
  analyzedIntent?: string;    // May or may not be present in v3 output, prefer `intent`
  validationDetails?: string; // JSON string of LLM-based validation
  
  // User-related fields
  creatorId?: string;
  author?: string;
  
  // Schema version if needed
  schemaVersion?: string;

  // Other fields from DynamoDB if necessary
  // e.g. executionResults, testCaseStats from pipeline might be stored
  executionResults?: string; 
  testCaseStats?: string;
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

  if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    return undefined;
  }

  try {
    const successResponseClone = response.clone();
    return await successResponseClone.json();
  } catch (jsonError) {
    console.warn("Failed to parse response body as JSON.", jsonError);
    try {
      const textBody = await response.text();
      if (textBody) {
        try {
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
      return undefined;
    } catch (textError) {
      console.error("Failed to read response body as text:", textError);
      throw new ApiError("Failed to read API response body", response.status);
    }
  }
};

// --- API Functions ---

export const getProblems = async (creatorId?: string): Promise<ProblemSummary[]> => {
  const url = creatorId
    ? `${API_BASE_URL}/problems?creatorId=${encodeURIComponent(creatorId)}`
    : `${API_BASE_URL}/problems`;
    
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const result: unknown = await handleApiResponse(response);
  return Array.isArray(result) ? result : [];
};

export const getProblemById = async (
  problemId: string
): Promise<ProblemDetail> => {
  if (!problemId) {
    throw new Error("problemId is required to fetch problem details.");
  }
  if (isStaticProblemId(problemId)) {
    console.log(`[Problem API] Requested static problem: ${problemId}`);
    const staticProblem = getStaticProblem(problemId);
    if (staticProblem) {
      return Promise.resolve(staticProblem as ProblemDetail);
    } else {
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
    },
  });
  return handleApiResponse(response) as Promise<ProblemDetail>;
};

// API function to call the code-grader Lambda
const CODE_GRADER_API_URL = process.env.NEXT_PUBLIC_CODE_GRADER_BASE_URL;

export interface RunCodePayload {
  executionMode: "RUN_CUSTOM_TESTS";
  userCode: string;
  language: string;
  customTestCases: Array<Record<string, unknown> | string | number[]>; // Array of inputs
  problemId?: string; // Optional, but good for time limits
}

export interface RunCodeSingleResult {
  caseIdentifier: string;
  input: Record<string, unknown> | string | number[];
  runCodeOutput: {
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTimeMs: number;
    timedOut: boolean;
    error: string | null;
    isSuccessful: boolean;
    returnValue: unknown;
    runCodeLambdaError?: boolean; 
    errorMessage?: string; 
    trace?: string[]; 
  };
}
export interface RunCodeResponse {
  executionMode: "RUN_CUSTOM_TESTS_RESULTS";
  results: RunCodeSingleResult[];
}


export const runCustomTests = async (payload: RunCodePayload, idToken: string): Promise<RunCodeResponse> => {
  if (!CODE_GRADER_API_URL) {
    throw new Error("Code Grader API URL is not configured.");
  }

  const response = await fetch(`${CODE_GRADER_API_URL}/grade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  return handleApiResponse(response) as Promise<RunCodeResponse>;
};

// --- New types and function for solution submission ---
export interface SubmitSolutionPayload {
  problemId: string;
  userCode: string;
  language: string;
}

export interface TestCaseResultDetail {
  caseNumber: number;
  status: "ACCEPTED" | "WRONG_ANSWER" | "TIME_LIMIT_EXCEEDED" | "RUNTIME_ERROR" | "INTERNAL_ERROR";
  executionTime: number; // in seconds, as returned by backend
  stdout?: string | null;
  stderr?: string | null;
}

export interface SubmissionResponse {
  submissionId: string;
  status: "ACCEPTED" | "WRONG_ANSWER" | "TIME_LIMIT_EXCEEDED" | "RUNTIME_ERROR" | "INTERNAL_ERROR";
  executionTime: number; // Overall execution time (e.g., max time for a case) in seconds
  results: TestCaseResultDetail[];
  errorMessage?: string | null;
  executionMode: "GRADE_SUBMISSION_RESULTS"; 
  // Optional fields from backend
  score?: number; // 0-100
  passedCaseCount?: number;
  totalCaseCount?: number;
}

export const submitSolution = async (payload: SubmitSolutionPayload, idToken: string): Promise<SubmissionResponse> => {
  if (!CODE_GRADER_API_URL) {
    throw new Error("Code Grader API URL is not configured.");
  }

  const submissionPayload = {
    ...payload,
    executionMode: "GRADE_SUBMISSION", // Crucial for backend to know the mode
  };

  const response = await fetch(`${CODE_GRADER_API_URL}/grade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify(submissionPayload),
  });

  return handleApiResponse(response) as Promise<SubmissionResponse>;
};