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
  language?: string; // Ensure this is consistently populated for single submission
  errorMessage?: string | null;
  userCode?: string; // <<< ADDED: for sharing to community
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
  if (params.problemTitle)
    queryParams.append("problemTitle", params.problemTitle);
  if (params.problemTitleTranslated)
    queryParams.append("problemTitleTranslated", params.problemTitleTranslated);
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

// Simple in-memory cache for submission data to prevent duplicate requests
const submissionCache: Record<
  string,
  {
    data: SubmissionSummary;
    timestamp: number;
  }
> = {};

// Cache expiry in milliseconds (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

/**
 * Fetches a specific submission by ID.
 * Uses in-memory cache to prevent duplicate network requests.
 * This function should return userCode and language.
 */
export const getSubmissionById = async (
  submissionId: string,
): Promise<SubmissionSummary> => {
  // Returns SubmissionSummary which now includes userCode and language
  // Check if we have a valid cached entry
  const cachedEntry = submissionCache[submissionId];
  const now = Date.now();

  if (cachedEntry && now - cachedEntry.timestamp < CACHE_EXPIRY) {
    console.log(`Using cached submission data for ID: ${submissionId}`);
    return cachedEntry.data;
  }

  if (!SUBMISSIONS_API_BASE_URL) {
    console.error(
      "Submissions API URL is not configured. Please set NEXT_PUBLIC_SUBMISSIONS_API_BASE_URL.",
    );
    throw new Error("Submissions API URL is not configured.");
  }

  const queryParams = new URLSearchParams();
  queryParams.append("submissionId", submissionId);

  const url = `${SUBMISSIONS_API_BASE_URL}/submissions?${queryParams.toString()}`;
  console.log(
    `Fetching submission details for ID: ${submissionId} from URL: ${url}`,
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // The Lambda for submissionId query returns GetSubmissionsResponse structure
    const submissionsResponse = (await handleApiResponse(
      response,
    )) as GetSubmissionsResponse;

    if (submissionsResponse.items && submissionsResponse.items.length > 0) {
      const submissionDetail = submissionsResponse.items[0];
      // Ensure language is a lowercase string for Markdown compatibility, default if not present
      if (submissionDetail.language) {
        submissionDetail.language = submissionDetail.language.toLowerCase();
      } else {
        console.warn(
          `Submission ${submissionId} has no language specified. Defaulting to 'plaintext'.`,
        );
        submissionDetail.language = "plaintext"; // Default language for Markdown
      }

      // Cache the result
      submissionCache[submissionId] = {
        data: submissionDetail,
        timestamp: now,
      };
      return submissionDetail;
    }

    throw new ApiError(`Submission with ID ${submissionId} not found`, 404);
  } catch (error) {
    console.error(`Error fetching submission ${submissionId}:`, error);
    if (error instanceof ApiError && error.status === 404) {
      // Clear cache for this ID if it resulted in a 404
      delete submissionCache[submissionId];
    }
    throw error;
  }
};
