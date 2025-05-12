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
  algorithmType?: string;
  createdAt: string;
  creatorId?: string;
  author?: string;
  language?: string;
  generationStatus?: string; // Added as it's in projection expression
}

/**
 * GET /problems/{problemId} API 응답 타입 (문제 상세)
 */
export interface ProblemDetail {
  problemId: string;
  userPrompt?: string;
  difficulty: string;
  language: string;
  targetLanguage?: string;
  createdAt: string;
  completedAt?: string;
  generationStatus: string;
  errorMessage?: string;

  title: string;
  title_translated?: string;
  description: string;
  description_translated?: string;

  intent?: string;
  finalTestCases: string;

  validatedSolutionCode?: string;
  startCode?: string;

  constraints: string;
  judgeType?: string;
  epsilon?: number;

  testGeneratorCode?: string;
  analyzedIntent?: string;
  validationDetails?: string;

  creatorId?: string;
  author?: string;

  schemaVersion?: string;
  executionResults?: string;
  testCaseStats?: string;
}

// New Params and Response types for getProblems
export interface GetProblemsParams {
  creatorId?: string;
  pageSize?: number;
  lastEvaluatedKey?: string;
  sortOrder?: "ASC" | "DESC"; // For sorting by createdAt
}

export interface GetProblemsResponse {
  items: ProblemSummary[];
  lastEvaluatedKey: string | null;
  count: number;
  scannedCount?: number;
}

// --- API Error Handling ---
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
      errorData || response.statusText,
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
            textBody,
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

export const getProblems = async (
  params: GetProblemsParams = {},
): Promise<GetProblemsResponse> => {
  const queryParams = new URLSearchParams();
  if (params.creatorId) queryParams.append("creatorId", params.creatorId);
  if (params.pageSize) queryParams.append("pageSize", String(params.pageSize));
  if (params.lastEvaluatedKey)
    queryParams.append("lastEvaluatedKey", params.lastEvaluatedKey);
  if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const url = `${API_BASE_URL}/problems?${queryParams.toString()}`;
  console.log("Fetching problems from URL:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return handleApiResponse(response) as Promise<GetProblemsResponse>;
};

export const getProblemById = async (
  problemId: string,
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
        404,
      );
    }
  }
  const response = await fetch(`${API_BASE_URL}/problems/${problemId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return handleApiResponse(response) as Promise<ProblemDetail>;
};

// API function to call the code-grader Lambda
const CODE_GRADER_API_URL = process.env.NEXT_PUBLIC_CODE_GRADER_BASE_URL;

export interface RunCodePayload {
  executionMode: "RUN_CUSTOM_TESTS";
  userCode: string;
  language: string;
  customTestCases: Array<Record<string, unknown> | string | number[]>;
  problemId?: string;
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

export const runCustomTests = async (
  payload: RunCodePayload,
  idToken: string,
): Promise<RunCodeResponse> => {
  if (!CODE_GRADER_API_URL) {
    throw new Error("Code Grader API URL is not configured.");
  }
  const response = await fetch(`${CODE_GRADER_API_URL}/grade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });
  return handleApiResponse(response) as Promise<RunCodeResponse>;
};

export interface SubmitSolutionPayload {
  problemId: string;
  userCode: string;
  language: string;
}

export interface TestCaseResultDetail {
  caseNumber: number;
  status:
    | "ACCEPTED"
    | "WRONG_ANSWER"
    | "TIME_LIMIT_EXCEEDED"
    | "RUNTIME_ERROR"
    | "INTERNAL_ERROR";
  executionTime: number;
  stdout?: string | null;
  stderr?: string | null;
}

export interface SubmissionResponse {
  submissionId: string;
  status:
    | "ACCEPTED"
    | "WRONG_ANSWER"
    | "TIME_LIMIT_EXCEEDED"
    | "RUNTIME_ERROR"
    | "INTERNAL_ERROR";
  executionTime: number;
  results: TestCaseResultDetail[];
  errorMessage?: string | null;
  executionMode: "GRADE_SUBMISSION_RESULTS";
  problemTitle?: string;
  problemTitleTranslated?: string;
  score?: number;
  passedCaseCount?: number;
  totalCaseCount?: number;
}

export const submitSolution = async (
  payload: SubmitSolutionPayload,
  idToken: string,
): Promise<SubmissionResponse> => {
  if (!CODE_GRADER_API_URL) {
    throw new Error("Code Grader API URL is not configured.");
  }
  const submissionPayload = { ...payload, executionMode: "GRADE_SUBMISSION" };
  const response = await fetch(`${CODE_GRADER_API_URL}/grade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(submissionPayload),
  });
  return handleApiResponse(response) as Promise<SubmissionResponse>;
};
