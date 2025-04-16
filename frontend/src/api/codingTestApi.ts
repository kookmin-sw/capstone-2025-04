// frontend/src/api/codingTestApi.ts

import { getStaticProblem, isStaticProblemId } from "./staticProblems";
import type { ProblemDetailAPI } from "./generateProblemApi";

// Base URL for the coding test mock API server
const API_BASE_URL = "http://localhost:3002"; // Point to mock server

// --- Type Definitions ---

// For GET /coding-test/problem/:id
export interface ProblemExample {
  input: string;
  output: string;
}

export interface ProblemDetail {
  id: string;
  title: string;
  description: string;
  constraints?: string | null;
  input_format?: string | null;
  output_format?: string | null;
  examples: ProblemExample[];
  algorithm_type?: string | null;
  difficulty: "Easy" | "Medium" | "Hard";
  // test_cases are usually hidden from the frontend
}

// --- API Error Handling ---
// Reusing the same error handling structure as communityApi

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

const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    let errorData;
    try {
      errorData = await response.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      console.warn("Could not parse error response body as JSON:", e);
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
  return response.json();
};

// --- API Functions ---

/**
 * Fetches the details of a specific coding problem.
 * Checks for static problems (ID 1-6) first, otherwise fetches from the API.
 * GET /coding-test/problem/{id} (for non-static IDs)
 */
export const getProblemById = async (id: string): Promise<ProblemDetailAPI> => {
  if (!id) throw new Error("Problem ID is required.");

  // 1. Check if it's a static problem ID (1-6)
  if (isStaticProblemId(id)) {
    console.log(`[CodingTest API] Requested static problem: ${id}`);
    const staticProblem = getStaticProblem(id);
    if (staticProblem) {
      // Return static data as ProblemDetailAPI
      return Promise.resolve(staticProblem);
    } else {
      // This shouldn't happen if isStaticProblemId is correct, but handle defensively
      console.error(`Static problem data not found for ID: ${id}`);
      throw new ApiError(`Static problem data missing for ID ${id}`, 404);
    }
  }

  // 2. If not static, assume it's a dynamic ID (UUID) and fetch from API
  console.log(
    `[CodingTest API] Requesting dynamic problem from API: ${id} at ${API_BASE_URL}`
  );
  const response = await fetch(`${API_BASE_URL}/coding-test/problem/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return handleApiResponse(response);
};

// TODO: Add functions for submitting code and getting results when endpoints exist
// export const submitCode = async (problemId: string, code: string, language: string): Promise<SubmissionResult> => { ... }
// export const getSubmissionResult = async (submissionId: string): Promise<SubmissionResult> => { ... }
