import { fetchAuthSession } from "aws-amplify/auth";

// Define the structure for the expected input (payload)
export interface GenerateProblemParams {
  prompt: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

// Define the structure for the expected output (response body)
export interface GeneratedProblem {
  id: string; // Use string for UUID
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

// Define the structure for the messages yielded by the stream
export interface StreamMessage {
  type: "status" | "token" | "result" | "error";
  payload: string | GeneratedProblem[]; // Payload type depends on 'type'
}

// ===================== 실제 Problem Generator API 연동 =====================

// Use the specific environment variable for the V2 generator endpoint
const PROBLEM_GENERATOR_API_ENDPOINT =
  process.env.NEXT_PUBLIC_PROBLEM_GENERATION_API_BASE_URL;

if (!PROBLEM_GENERATOR_API_ENDPOINT) {
  console.error(
    "Error: NEXT_PUBLIC_PROBLEM_GENERATION_API_BASE_URL environment variable is not set."
  );
  // Throw an error to prevent API calls without a configured endpoint
  throw new Error("Problem Generator API endpoint is not configured.");
}

// --- API 타입 정의 (명세 기반) ---
export type ProblemDifficulty = "튜토리얼" | "쉬움" | "보통" | "어려움";

export interface CreateProblemRequest {
  prompt: string;
  difficulty: ProblemDifficulty;
  creatorId?: string; // Add optional creatorId field
  author?: string; // Add optional author field
}

export interface CreateProblemResponse {
  problemId: string;
  message: string; // "Problem generation request accepted and is processing in the background."
}

export interface ProblemSummary {
  problemId: string;
  title: string;
  difficulty: ProblemDifficulty;
  algorithmType: string;
}

export interface GetProblemsResponse {
  problems: ProblemSummary[];
}

export interface ProblemExampleIO {
  input: string | Record<string, unknown>;
  output: string | Record<string, unknown>;
}

// Detailed Problem Structure - Align with Lambda Output
export interface ProblemDetailAPI {
  problemId: string;
  title: string; // Generated title
  title_translated?: string; // Translated title (if targetLanguage is specified)
  description: string; // Markdown description including constraints section
  description_translated?: string; // Translated description (if targetLanguage is specified)
  difficulty: string; // e.g., "Easy", "Medium", "Hard"
  constraints: string; // JSON *string* of constraint details (e.g., time/memory limits, input ranges)
  solutionCode?: string; // Optional as it might fail
  testGeneratorCode?: string; // Optional as it might fail
  analyzedIntent?: string; // Optional
  testSpecifications?: string; // JSON *string* of test cases (e.g., '[{input: ..., output: ...}]')
  generationStatus: string; // e.g., "started", "stepN_complete", "completed", "failed"
  language: string; // e.g., "python3.12"
  targetLanguage?: string; // Target language for translation (e.g., "ko")
  createdAt: string; // ISO Date string
  completedAt?: string; // ISO Date string (only when completed)
  userPrompt?: string; // The original prompt used for generation
  errorMessage?: string; // Error message if generation failed
  validationDetails?: string; // JSON string of validation result
}

// --- SSE Stream Types (Exported) ---
export interface ProblemStreamStatus {
  // Exported
  step: number;
  message: string;
}

export interface ProblemStreamError {
  // Exported
  payload: string; // Error message string
}

export interface ProblemStreamResult {
  // Exported
  payload: ProblemDetailAPI; // The final generated problem detail
}

// Define the callback function types for the streaming function (Exported)
export type OnStatusCallback = (status: ProblemStreamStatus) => void; // Exported
export type OnResultCallback = (result: ProblemStreamResult) => void; // Exported
export type OnErrorCallback = (error: ProblemStreamError) => void; // Exported
export type OnCompleteCallback = () => void; // Exported

// --- SHA256 Helper ---
/**
 * Calculates the SHA256 hash of a string.
 * @param text The string to hash.
 * @returns A promise that resolves to the hex-encoded SHA256 hash.
 */
async function calculateSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // convert bytes to hex string
  return hashHex;
}

// --- SSE Streaming Function ---
/**
 * Initiates problem generation and streams status/results via SSE.
 *
 * @param params The parameters for problem generation (prompt, difficulty).
 * @param callbacks Object containing onStatus, onResult, onError, onComplete callbacks.
 */
export const streamProblemGeneration = async (
  params: CreateProblemRequest,
  callbacks: {
    onStatus: OnStatusCallback;
    onResult: OnResultCallback;
    onError: OnErrorCallback;
    onComplete: OnCompleteCallback;
  }
): Promise<void> => {
  const { onStatus, onResult, onError, onComplete } = callbacks;

  try {
    // 1. Construct Payload & Calculate SHA256
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    if (!idToken) {
      throw new Error("User is not authenticated or ID token is missing.");
    }
    const payloadString = JSON.stringify(params);
    const sha256Hash = await calculateSHA256(payloadString);
    console.log("Problem Gen Payload SHA256:", sha256Hash);

    // 2. Use Fetch API for SSE Streaming
    console.log(
      "Connecting to Problem Gen SSE endpoint:",
      PROBLEM_GENERATOR_API_ENDPOINT
    );
    const response = await fetch(PROBLEM_GENERATOR_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // No Authorization header needed for this endpoint (IAM auth via CloudFront OAC)
        Authorization: `Bearer ${idToken}`, // Standard header (commented out)

        "x-amz-content-sha256": sha256Hash, // Required for SigV4 signing by CloudFront/Lambda URL
      },
      body: payloadString,
    });

    if (!response.ok) {
      // Handle non-2xx errors (e.g., 403 Forbidden, 500 Internal Server Error)
      const errorText = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`
      );
    }

    if (!response.body) {
      throw new Error("Response body is missing for streaming.");
    }

    // 3. Process SSE Stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = ""; // Buffer to handle partial messages

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("Problem Gen SSE stream finished.");
        break;
      }

      // Add debug logging for raw chunk data
      console.log(
        "Raw SSE chunk received:",
        decoder.decode(value.slice(0, 100)) + (value.length > 100 ? "..." : "")
      );

      buffer += decoder.decode(value, { stream: true });

      // Process buffer line by line for SSE messages (event: ...\ndata: ...\n\n)
      let eventStartIndex = 0;
      while (eventStartIndex < buffer.length) {
        const eventEndIndex = buffer.indexOf("\n\n", eventStartIndex);
        if (eventEndIndex === -1) break; // Wait for more data if no full event found

        const eventBlock = buffer.substring(eventStartIndex, eventEndIndex);
        // Add debug logging for event blocks
        console.log("Processing event block:", eventBlock);

        eventStartIndex = eventEndIndex + 2; // Move past the processed block

        let eventType = "message"; // Default event type
        let eventData = "";

        const lines = eventBlock.split("\n");
        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.substring(6).trim();
          } else if (line.startsWith("data:")) {
            eventData = line.substring(5).trim();
          }
        }

        if (eventData) {
          try {
            const parsedData = JSON.parse(eventData);
            console.log("Received SSE Event:", eventType, "Data:", parsedData); // Log received event

            switch (eventType) {
              case "status":
                onStatus(parsedData as ProblemStreamStatus);
                break;
              case "result":
                console.log("Received result event with data:", parsedData);
                if (parsedData && typeof parsedData === "object") {
                  // Some implementations might wrap in 'payload' property, others might not
                  const resultData = parsedData.payload
                    ? parsedData.payload
                    : parsedData;
                  onResult({ payload: resultData } as ProblemStreamResult);
                } else {
                  console.error(
                    "Received invalid result data format:",
                    parsedData
                  );
                  onError({
                    payload: "Invalid result data format received",
                  } as ProblemStreamError);
                }
                break;
              case "error":
                onError(parsedData as ProblemStreamError);
                break;
              default:
                console.warn("Received unknown SSE event type:", eventType);
            }
          } catch (e) {
            console.error(
              "Failed to parse SSE data content:",
              eventData,
              "Error:",
              e
            );
            onError({
              payload: `Failed to parse stream data: ${eventData.substring(
                0,
                100
              )}...`,
            });
          }
        }
      }
      // Keep the remaining partial message in the buffer
      buffer = buffer.substring(eventStartIndex);
    }
    // End of stream
    onComplete();
  } catch (error) {
    console.error("Error in streamProblemGeneration:", error);
    const err =
      error instanceof Error ? error : new Error("An unknown error occurred");
    onError({ payload: err.message });
    // Ensure completion is called even on error to stop loading states etc.
    onComplete();
  }
};

// --- Existing Non-Streaming API Functions (Keep as is, but ensure API_BASE_URL is correct) ---
