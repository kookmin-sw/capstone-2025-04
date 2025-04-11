import { fetchAuthSession } from "aws-amplify/auth";

// Base URL for your API Gateway stage
// TODO: Replace with your actual API Gateway Invoke URL (ideally from environment variables)
const API_BASE_URL = "http://localhost:3001"; // Point to mock server for local testing
// process.env.NEXT_PUBLIC_API_BASE_URL || "YOUR_API_GATEWAY_INVOKE_URL"; // Original line

// --- Type Definitions ---

// For GET /community (List)
export interface PostSummary {
  postId: string;
  title: string;
  author: string;
  createdAt: string;
  likesCount: number;
  commentCount: number;
  problemId?: string | null; // Changed from job_id
}

// For GET /community/{postId} (Detail)
export interface PostDetail {
  postId: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt?: string | null;
  likesCount: number;
  likedUsers: string[];
  problemId?: string | null; // Changed from job_id
  // commentCount is not directly on the post detail in the spec, fetched separately
}

// For GET /community/{postId}/comment (List)
export interface Comment {
  commentId: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface GetCommentsResponse {
  comments: Comment[];
  commentCount: number;
}

// For POST /community
export interface CreatePostPayload {
  title: string;
  content: string;
  problemId?: string; // Changed from job_id
}

// For POST /community response
export interface CreatePostResponse {
  message: string;
  postId: string;
  author: string;
  title: string;
  content: string;
  createdAt: string;
  problemId?: string; // Changed from job_id
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
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    let errorData;
    try {
      errorData = await response.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message; // Use backend error message if available
      }
    } catch (e) {
      // Log the error if JSON parsing fails, but continue
      console.warn("Could not parse error response body as JSON:", e);
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
  return response.json();
};

// --- API Functions ---

/**
 * Fetches the list of all posts.
 * GET /community
 */
export const getPosts = async (): Promise<PostSummary[]> => {
  const response = await fetch(`${API_BASE_URL}/community`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return handleApiResponse(response);
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
 * Fetches the comments for a specific post.
 * GET /community/{postId}/comment
 */
export const getComments = async (
  postId: string
): Promise<GetCommentsResponse> => {
  if (!postId) throw new Error("postId is required.");
  const response = await fetch(`${API_BASE_URL}/community/${postId}/comment`, {
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
  // Use specific response type
  // Use unknown
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
): Promise<unknown> => {
  // Use unknown
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
export const deletePost = async (postId: string): Promise<unknown> => {
  // Use unknown
  if (!postId) throw new Error("postId is required.");
  const headers = await getAuthHeaders();
  // DELETE requests might not need Content-Type if no body is sent
  delete headers["Content-Type"];
  const response = await fetch(`${API_BASE_URL}/community/${postId}`, {
    method: "DELETE",
    headers: headers,
  });
  return handleApiResponse(response); // Expects 200 OK with body or potentially 204 No Content
};

/**
 * Toggles the like status for a post.
 * POST /community/{postId}/like
 * Requires Authentication.
 */
export const likePost = async (postId: string): Promise<LikeResponse> => {
  if (!postId) throw new Error("postId is required.");
  const headers = await getAuthHeaders();
  // Like toggle might not send a body, adjust Content-Type if needed by backend
  // If the backend expects an empty body, keep Content-Type. If not, remove it.
  // Assuming it might not need a body:
  // delete headers['Content-Type'];
  const response = await fetch(`${API_BASE_URL}/community/${postId}/like`, {
    method: "POST",
    headers: headers,
    // body: JSON.stringify({}) // Send empty body if required by backend
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
): Promise<unknown> => {
  // Use unknown
  if (!postId) throw new Error("postId is required.");
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/community/${postId}/comment`, {
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
): Promise<unknown> => {
  // Use unknown
  if (!postId) throw new Error("postId is required.");
  if (!commentId) throw new Error("commentId is required.");
  const headers = await getAuthHeaders();
  delete headers["Content-Type"]; // DELETE requests typically don't have a body
  const response = await fetch(
    `${API_BASE_URL}/community/${postId}/comment/${commentId}`,
    {
      method: "DELETE",
      headers: headers,
    }
  );
  return handleApiResponse(response); // Expects 200 OK with body or potentially 204 No Content
};
