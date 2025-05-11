// 필요한 타입 정의
export interface SubmissionSummary {
  submissionId: string;
  problemId: string;
  problemTitle?: string;
  problemTitleTranslated?: string;
  userId: string;
  author: string;
  status:
    | "ACCEPTED"
    | "WRONG_ANSWER"
    | "TIME_LIMIT_EXCEEDED"
    | "RUNTIME_ERROR"
    | "INTERNAL_ERROR";
  submissionTime: string; // ISO String or number, API 반환값에 따라 조정
  executionTime?: number; // 초 단위
  language?: string;
  errorMessage?: string | null;
}

export interface GetSubmissionsParams {
  userId?: string;
  problemId?: string;
  author?: string;
  problemTitle?: string;
  problemTitleTranslated?: string;
  pageSize?: number;
  lastEvaluatedKey?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface GetSubmissionsResponse {
  items: SubmissionSummary[];
  lastEvaluatedKey: string | null;
  count: number;
  scannedCount?: number;
}

// API Gateway 엔드포인트 URL (환경 변수에서 가져오기)
const SUBMISSIONS_API_BASE_URL =
  process.env.NEXT_PUBLIC_SUBMISSIONS_API_BASE_URL ||
  "YOUR_API_GATEWAY_SUBMISSIONS_ENDPOINT_HERE";

// API Error Handling (communityApi.ts 또는 problemApi.ts에서 가져오거나 공통 유틸로 분리)
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
      /* ignore */
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
    const textBody = await response.text(); // Use original response
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
  }
};

/**
 * Fetches a list of submissions based on the provided parameters.
 */
export const getSubmissions = async (
  params: GetSubmissionsParams = {},
): Promise<GetSubmissionsResponse> => {
  if (!SUBMISSIONS_API_BASE_URL) {
    console.error(
      "Submissions API URL is not configured. Please set NEXT_PUBLIC_SUBMISSIONS_API_BASE_URL.",
    );
    throw new Error("Submissions API URL is not configured.");
  }

  const queryParams = new URLSearchParams();
  if (params.userId) queryParams.append("userId", params.userId);
  if (params.problemId) queryParams.append("problemId", params.problemId);
  if (params.author) queryParams.append("author", params.author);
  if (params.problemTitle) queryParams.append("problemTitle", params.problemTitle);
  if (params.problemTitleTranslated) queryParams.append("problemTitleTranslated", params.problemTitleTranslated);
  if (params.pageSize) queryParams.append("pageSize", String(params.pageSize));
  if (params.lastEvaluatedKey)
    queryParams.append("lastEvaluatedKey", params.lastEvaluatedKey);
  if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const url = `${SUBMISSIONS_API_BASE_URL}/submissions?${queryParams.toString()}`;
  console.log("Fetching submissions from URL:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      // 필요시 Authorization 헤더 추가 (예: Cognito 인증 사용 시)
      // 'Authorization': `Bearer ${idToken}`
    },
  });
  return handleApiResponse(response) as Promise<GetSubmissionsResponse>;
};

/**
 * Fetches a specific submission by ID.
 */
export const getSubmissionById = async (
  submissionId: string
): Promise<SubmissionSummary> => {
  if (!SUBMISSIONS_API_BASE_URL) {
    console.error(
      "Submissions API URL is not configured. Please set NEXT_PUBLIC_SUBMISSIONS_API_BASE_URL.",
    );
    throw new Error("Submissions API URL is not configured.");
  }

  const queryParams = new URLSearchParams();
  queryParams.append("submissionId", submissionId);

  const url = `${SUBMISSIONS_API_BASE_URL}/submissions?${queryParams.toString()}`;
  console.log(`Fetching submission details for ID: ${submissionId}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      // 필요시 Authorization 헤더 추가 (예: Cognito 인증 사용 시)
      // 'Authorization': `Bearer ${idToken}`
    },
  });
  
  const submissionsResponse = await handleApiResponse(response) as GetSubmissionsResponse;
  
  // Since we're requesting by ID, we should get exactly one item
  if (submissionsResponse.items && submissionsResponse.items.length > 0) {
    return submissionsResponse.items[0];
  }
  
  throw new ApiError(`Submission with ID ${submissionId} not found`, 404);
};
