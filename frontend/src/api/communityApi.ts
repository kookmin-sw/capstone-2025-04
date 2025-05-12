import { fetchAuthSession } from "aws-amplify/auth";

// Base URL for your API Gateway stage
// Use environment variable for the API base URL, with a fallback for local development
const API_BASE_URL =
  process.env.NEXT_PUBLIC_COMMUNITY_API_BASE_URL || "http://localhost:3001"; // Fallback to localhost if env var is not set

// --- Type Definitions ---

// For GET /community (List)
export interface PostSummary {
  postId: string;
  title: string;
  author: string;
  createdAt: string;
  likesCount: number;
  commentCount: number; // This is the total comment count from the post item
  problemId?: string | null;
}

// For GET /community/{postId} (Detail)
export interface PostDetail {
  postId: string;
  title: string;
  content: string;
  author: string;
  userId: string;
  createdAt: string;
  updatedAt?: string | null;
  likesCount: number;
  likedUsers: string[];
  commentCount: number; // <<< ADDED HERE: Total comment count for the post
  problemId?: string | null;
}

// For GET /community/{postId}/comment (List)
export interface Comment {
  commentId: string;
  content: string;
  author: string;
  userId: string;
  createdAt: string;
}

// Generic Paginated Response
export interface PaginatedResponse<T> {
  items: T[];
  lastEvaluatedKey: string | null;
  count: number; // Number of items on the current page
}

// Params and Response for Get Posts
export interface GetPostsParams {
  pageSize?: number;
  lastEvaluatedKey?: string | null;
}
export type GetPostsResponse = PaginatedResponse<PostSummary>;


// Params and Response for Get Comments
export interface GetCommentsParams {
  pageSize?: number;
  lastEvaluatedKey?: string | null;
}
export interface GetCommentsResponse { 
  comments: Comment[];
  commentCount: number; // Number of comments on the current page
  lastEvaluatedKey: string | null;
}


// For POST /community
export interface CreatePostPayload {
  title: string;
  content: string;
  author: string;
  problemId?: string;
}

// For POST /community response
export interface CreatePostResponse {
  message: string;
  postId: string;
  author: string;
  title: string;
  content: string;
  createdAt: string;
  problemId?: string;
}

// For PATCH /community/{postId}
export interface UpdatePostPayload {
  title: string;
  content: string;
}

// For POST /community/{postId}/like
export interface LikeResponse {
  message: string;
  likedUsers: string[];
  likesCount: number;
  isLiked: boolean;
}

// For POST /community/{postId}/comment
export interface CreateCommentPayload {
  content: string;
  author: string;
}
// For POST /community/{postId}/comment response
export interface CreateCommentResponse {
    message: string;
    postId: string;
    commentId: string;
    author: string;
    userId: string;
    content: string;
    createdAt: string;
}


// --- Authentication Helper ---

/**
 * Gets the Authorization header with the JWT ID token.
 * Throws an error if the user is not authenticated.
 */
// Return a mutable Record<string, string> for easier modification
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const session = await fetchAuthSession({ forceRefresh: false });
    const idToken = session.tokens?.idToken?.toString(); // Use toString() for the token

    if (!idToken) {
      throw new Error("User is not authenticated.");
    }

    return {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json", // Default content type for authenticated requests
    };
  } catch (error) {
    console.error("Error fetching auth session:", error);
    throw new Error("Failed to get authentication token.");
  }
};

// --- API Error Handling ---

class ApiError extends Error {
  status: number;
  data?: unknown; // Use unknown instead of any

  constructor(message: string, status: number, data?: unknown) {
    // Use unknown instead of any
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    // Use unknown instead of any
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    let errorData;
    try {
      // Clone before reading body in case we need it again
      const errorResponseClone = response.clone();
      errorData = await errorResponseClone.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message; // Use backend error message if available
      }
    } catch (e) {
      try {
        // If JSON parsing fails, try reading the original response body as text
        const errorText = await response.text();
        errorMessage = errorText || errorMessage; // Use text if available
        errorData = errorText; // Store the raw text as data
        console.warn(
          "Could not parse error response body as JSON, read as text:",
          e
        );
      } catch (textErr) {
        // If reading text also fails, just use the status text
        console.warn("Could not read error response body as text:", textErr);
      }
    }
    console.error(
      `API Error ${response.status}:`,
      errorData || response.statusText
    );
    throw new ApiError(errorMessage, response.status, errorData);
  }
  // Handle successful responses that might have no content (e.g., DELETE)
  if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    return undefined; // Or return a specific success indicator if needed
  }

  // Try parsing as JSON first (standard approach)
  try {
    // Clone the response because the body can only be consumed once.
    const successResponseClone = response.clone();
    return await successResponseClone.json();
  } catch (jsonError) {
    console.warn(
      "Failed to parse response body as JSON, attempting to read as text and parse manually.",
      jsonError
    );
    // If response.json() fails, try reading the original response body as text and parse manually.
    try {
      const textBody = await response.text(); // Use the original response
      if (textBody) {
        try {
          return JSON.parse(textBody); // Manually parse the string
        } catch (parseError) {
          console.error(
            "Failed to manually parse text body as JSON:",
            parseError
          );
          // Throw specific error if manual parsing fails after text read
          throw new ApiError(
            "Failed to parse API response text as JSON",
            response.status,
            textBody // Include the text body in error data
          );
        }
      } else {
        // Handle cases where the text body is empty but status is not 204 etc.
        console.warn("Response body is empty despite success status.");
        return undefined;
      }
    } catch (textError) {
      console.error("Failed to read response body as text:", textError);
      // If reading text fails, throw a more generic error
      throw new ApiError("Failed to read API response body", response.status);
    }
  }
};

// --- API Functions ---

/**
 * Fetches the list of all posts with pagination.
 * GET /community
 */
export const getPosts = async (params?: GetPostsParams): Promise<GetPostsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.pageSize) queryParams.append("pageSize", String(params.pageSize));
  if (params?.lastEvaluatedKey) queryParams.append("lastEvaluatedKey", params.lastEvaluatedKey);
  
  const url = `${API_BASE_URL}/community${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  // Ensure that handleApiResponse's result is correctly shaped or provide a default.
  const result = await handleApiResponse(response);

  // Check if the result matches the expected structure.
  // If 'result' is undefined (e.g. from a 204 or empty body after parsing attempts),
  // or if 'items' is not an array, return a default empty response.
  if (
    typeof result !== 'object' ||
    result === null ||
    !Array.isArray((result as GetPostsResponse).items) // Check if items is an array
  ) {
    console.warn(
      "getPosts received malformed or empty data from API, returning default empty response. Raw result:",
      result
    );
    return { items: [], lastEvaluatedKey: null, count: 0 };
  }
  
  // If it looks like GetPostsResponse, cast and return.
  return result as GetPostsResponse;
};

/**
 * Fetches the details of a specific post.
 * GET /community/{postId}
 */
export const getPostById = async (postId: string): Promise<PostDetail> => {
  if (!postId) throw new Error("postId is required.");
  const response = await fetch(`${API_BASE_URL}/community/${postId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return handleApiResponse(response);
};

/**
 * Fetches the comments for a specific post with pagination.
 * GET /community/{postId}/comments
 */
export const getComments = async (
  postId: string,
  params?: GetCommentsParams
): Promise<GetCommentsResponse> => {
  if (!postId) throw new Error("postId is required.");

  const queryParams = new URLSearchParams();
  if (params?.pageSize) queryParams.append("pageSize", String(params.pageSize));
  if (params?.lastEvaluatedKey) queryParams.append("lastEvaluatedKey", params.lastEvaluatedKey);

  const url = `${API_BASE_URL}/community/${postId}/comments${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return handleApiResponse(response);
};

/**
 * Creates a new post.
 * POST /community
 * Requires Authentication.
 */
export const createPost = async (
  payload: CreatePostPayload
): Promise<CreatePostResponse> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/community`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload),
  });
  return handleApiResponse(response);
};

/**
 * Updates an existing post.
 * PATCH /community/{postId}
 * Requires Authentication.
 */
export const updatePost = async (
  postId: string,
  payload: UpdatePostPayload
): Promise<PostDetail> => { // Assuming PATCH returns the updated post
  if (!postId) throw new Error("postId is required.");
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/community/${postId}`, {
    method: "PATCH",
    headers: headers,
    body: JSON.stringify(payload),
  });
  return handleApiResponse(response);
};

/**
 * Deletes a post and its comments.
 * DELETE /community/{postId}
 * Requires Authentication.
 */
export const deletePost = async (postId: string): Promise<{ message: string; deletedCommentsCount: number }> => {
  if (!postId) throw new Error("postId is required.");
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];
  const response = await fetch(`${API_BASE_URL}/community/${postId}`, {
    method: "DELETE",
    headers: headers,
  });
  return handleApiResponse(response);
};

/**
 * Toggles the like status for a post.
 * POST /community/{postId}/like
 * Requires Authentication.
 */
export const likePost = async (postId: string): Promise<LikeResponse> => {
  if (!postId) throw new Error("postId is required.");
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/community/${postId}/like`, {
    method: "POST",
    headers: headers,
  });
  return handleApiResponse(response);
};

/**
 * Creates a new comment on a post.
 * POST /community/{postId}/comment
 * Requires Authentication.
 */
export const createComment = async (
  postId: string,
  payload: CreateCommentPayload
): Promise<CreateCommentResponse> => {
  if (!postId) throw new Error("postId is required.");
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/community/${postId}/comments`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload),
  });
  return handleApiResponse(response);
};

/**
 * Deletes a comment.
 * DELETE /community/{postId}/comment/{commentId}
 * Requires Authentication.
 */
export const deleteComment = async (
  postId: string,
  commentId: string
): Promise<{message: string, postId: string, commentId: string}> => {
  if (!postId) throw new Error("postId is required.");
  if (!commentId) throw new Error("commentId is required.");
  const headers = await getAuthHeaders();
  delete headers["Content-Type"]; 
  const response = await fetch(
    `${API_BASE_URL}/community/${postId}/comments/${commentId}`,
    {
      method: "DELETE",
      headers: headers,
    }
  );
  return handleApiResponse(response);
};