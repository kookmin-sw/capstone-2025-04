import { v4 as uuidv4 } from "uuid";

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

// Helper function for simulating delay (remains client-side)
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Simulates calling a backend API to generate coding problems **with streaming feedback**.
 * This function mimics the Lambda Function URL streaming behavior.
 *
 * @param params - The parameters for problem generation (prompt, difficulty).
 * @returns An AsyncGenerator yielding StreamMessage objects.
 */
export async function* streamGenerationStatusDummyAPI(
  params: GenerateProblemParams
): AsyncGenerator<StreamMessage, void, undefined> {
  console.log("Dummy Streaming API called with params:", params);

  try {
    // --- Stage 1: Initial Status ---
    yield {
      type: "status",
      payload: `요청 분석 시작: '${params.prompt}' (${params.difficulty})`,
    };
    await delay(300 + Math.random() * 200);

    // --- Stage 2: Intermediate Status ---
    yield { type: "status", payload: "관련 문제 유형 식별 중..." };
    await delay(500 + Math.random() * 400);

    // --- Simulate Error Condition (e.g., 10% chance) ---
    if (Math.random() < 0.1) {
      throw new Error("더미 오류: 문제 유형 분석 중 예상치 못한 문제 발생.");
    }

    yield { type: "status", payload: "유사 코드 조각 검색 중..." };
    await delay(400 + Math.random() * 300);

    // --- Stage 3: Simulate LLM Streaming ---
    yield { type: "status", payload: "LLM 호출 및 문제 생성 스트리밍 시작..." };
    await delay(200); // Short delay before tokens start

    // Generate a plausible dummy description based on input
    const baseDescription = `## ${params.difficulty} 문제: ${
      params.prompt
    }\n\n**문제 설명:**\n주어진 '${
      params.prompt
    }' 개념을 활용하여 다음 요구사항을 만족하는 코드를 작성하세요. 입력 형식은 표준 입력을 따르며, ${
      params.difficulty === "Easy"
        ? "기본적인 테스트 케이스"
        : params.difficulty === "Medium"
        ? "다양한 엣지 케이스를 포함한"
        : "매우 복잡하고 큰 규모의"
    } 테스트 케이스를 통과해야 합니다.\n\n**제약 조건:**\n- 시간 복잡도: ${
      params.difficulty === "Easy"
        ? "O(N log N)"
        : params.difficulty === "Medium"
        ? "O(N)"
        : "O(log N) 또는 O(1)"
    }\n- 공간 복잡도: O(N)\n\n**입력 예시:**\n...\n\n**출력 예시:**\n...\n\n*이것은 더미 생성 문제입니다.*`;

    const words = baseDescription.split(/(\s+)/); // Split by space, keeping spaces
    let fullSimulatedResponse = "";

    for (const word of words) {
      if (word.trim()) {
        yield { type: "token", payload: word };
        fullSimulatedResponse += word;
        await delay(15 + Math.random() * 20); // Simulate token delay
      } else {
        // Yield spaces immediately or combined with the next word
        yield { type: "token", payload: word };
        fullSimulatedResponse += word;
      }
    }
    yield { type: "token", payload: "\n\n(생성 완료)" }; // Add a final token
    fullSimulatedResponse += "\n\n(생성 완료)";
    await delay(100);

    // --- Stage 4: Process Final Result ---
    yield { type: "status", payload: "LLM 응답 처리 및 결과 포맷팅 중..." };
    await delay(400 + Math.random() * 300);

    // --- Create Dummy Problem(s) ---
    const dummyProblems: GeneratedProblem[] = [
      {
        id: uuidv4(), // Generate a UUID for the first problem
        title: `${
          params.difficulty
        } 난이도 생성 문제: ${params.prompt.substring(0, 20)}...`,
        description: fullSimulatedResponse, // Use the streamed content
        difficulty: params.difficulty,
      },
    ];

    // Randomly add a second problem (similar to original dummy)
    if (Math.random() > 0.5) {
      const secondDifficulty = ["Easy", "Medium", "Hard"][
        Math.floor(Math.random() * 3)
      ] as "Easy" | "Medium" | "Hard";
      dummyProblems.push({
        id: uuidv4(), // Generate a UUID for the second problem
        title: `${secondDifficulty} 난이도 관련 문제: ${params.prompt.substring(
          5,
          15
        )} 응용`,
        description: `두 번째 생성된 더미 문제입니다. '${
          params.prompt
        }'에서 파생된 개념을 사용합니다. 난이도: ${secondDifficulty}\n\n${fullSimulatedResponse.substring(
          0,
          100
        )}... (추가 내용)`,
        difficulty: secondDifficulty,
      });
    }

    // --- Stage 5: Yield Final Result ---
    yield { type: "result", payload: dummyProblems };
    await delay(100);

    // --- Stage 6: Final Success Status ---
    yield { type: "status", payload: "✅ 생성 완료!" };
    console.log("Dummy Streaming API finished successfully.");
  } catch (error) {
    // --- Handle Errors ---
    console.error("Dummy Streaming API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 더미 오류 발생";
    yield { type: "error", payload: errorMessage };
    yield { type: "status", payload: "❌ 오류 발생" }; // Add a final status for clarity
  }
}

// hashCode function removed as it's no longer used.

// --- Keep the old non-streaming dummy API for potential comparison or fallback ---
/**
 * @deprecated Use streamProblemGeneration instead.
 * Simulates calling a backend API to generate coding problems (non-streaming).
 */
export const generateProblemsDummyAPI_NonStreaming = async (
  params: GenerateProblemParams
): Promise<GeneratedProblem[]> => {
  console.warn(
    "DEPRECATED: generateProblemsDummyAPI_NonStreaming is deprecated. Use streamProblemGeneration."
  );
  console.log("Dummy Non-Streaming API called with params:", params);
  await delay(1500 + Math.random() * 1000);
  const dummyProblems: GeneratedProblem[] = [
    {
      id: uuidv4(),
      title: `${params.difficulty} 난이도 문제: ${params.prompt.substring(
        0,
        15
      )}...`,
      description: `요청하신 '${
        params.prompt
      }'와 관련된 문제입니다. 시간 복잡도는 O(N)입니다. (ID: ${Math.random()
        .toString(36)
        .substring(7)})`,
      difficulty: params.difficulty,
    },
  ];
  if (Math.random() > 0.4) {
    const secondDifficulty = ["Easy", "Medium", "Hard"][
      Math.floor(Math.random() * 3)
    ] as "Easy" | "Medium" | "Hard";
    dummyProblems.push({
      id: uuidv4(),
      title: `${secondDifficulty} 난이도 관련 문제: ${params.prompt.substring(
        5,
        15
      )} 응용`,
      description: `두 번째 생성된 문제입니다. 공간 복잡도 최적화가 중요합니다. (ID: ${Math.random()
        .toString(36)
        .substring(7)})`,
      difficulty: secondDifficulty,
    });
  }
  console.log("Dummy Non-Streaming API returning:", dummyProblems);
  return dummyProblems;
};

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

export interface ProblemDetailAPI {
  problemId: string;
  title: string;
  description: string;
  difficulty: string;
  constraints: string;
  solution_code?: string;
  test_case_generation_code?: string;
  analyzed_intent?: string;
  test_specifications?: string;
  generation_status?: string;
  language?: string;
  createdAt?: string;
  completedAt?: string;
  // The following fields are not present in backend and are commented out:
  // input_format?: string;
  // output_format?: string;
  // example_input?: string | Record<string, unknown>;
  // example_output?: string | Record<string, unknown>;
  // testcases?: ProblemExampleIO[];
  // algorithmType?: string;
  // likesCount?: number;
  // creatorId?: string;
  // genStatus?: string;
  // updatedAt?: string;
  // template_source?: string;
  // algorithm_hint?: string;
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

      buffer += decoder.decode(value, { stream: true });

      // Process buffer line by line for SSE messages (event: ...\ndata: ...\n\n)
      let eventStartIndex = 0;
      while (eventStartIndex < buffer.length) {
        const eventEndIndex = buffer.indexOf("\n\n", eventStartIndex);
        if (eventEndIndex === -1) break; // Wait for more data if no full event found

        const eventBlock = buffer.substring(eventStartIndex, eventEndIndex);
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
                onResult(parsedData as ProblemStreamResult);
                break;
              case "error":
                onError(parsedData as ProblemStreamError);
                // Consider stopping further processing on backend error
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

/**
 * 문제 생성 요청 (POST /problems) - Non-streaming, returns initial ID
 */
export async function createProblemAPI(
  params: CreateProblemRequest
): Promise<CreateProblemResponse> {
  const res = await fetch(`${PROBLEM_GENERATOR_API_ENDPOINT}/problems`, {
    // Assuming the same base URL for now
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`문제 생성 실패: ${res.status} ${error}`);
  }
  return res.json();
}

/**
 * 문제 목록 조회 (GET /problems)
 */
export async function getProblemsAPI(): Promise<GetProblemsResponse> {
  const res = await fetch(`${PROBLEM_GENERATOR_API_ENDPOINT}/problems`, {
    // Assuming the same base URL for now
    method: "GET",
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`문제 목록 조회 실패: ${res.status} ${error}`);
  }
  return res.json();
}

/**
 * 문제 상세 조회 (GET /problems/{problemId})
 */
export async function getProblemDetailAPI(
  problemId: string
): Promise<ProblemDetailAPI> {
  const res = await fetch(
    `${PROBLEM_GENERATOR_API_ENDPOINT}/problems/${problemId}`,
    {
      // Assuming the same base URL for now
      method: "GET",
    }
  );
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`문제 상세 조회 실패: ${res.status} ${error}`);
  }
  return res.json();
}

// // ===================== 더미 함수 DEPRECATED 처리 =====================
// /**
//  * @deprecated Use streamProblemGeneration instead.
//  * Simulates calling a backend API to generate coding problems **with streaming feedback**.
//  */
// export async function* streamGenerationStatusDummyAPI(
//   params: GenerateProblemParams
// ): AsyncGenerator<StreamMessage, void, undefined> {
//   console.warn(
//     "DEPRECATED: streamGenerationStatusDummyAPI is deprecated. Use streamProblemGeneration."
//   );
//   // ... (keep dummy implementation for reference if needed, or remove)
//   yield { type: "status", payload: "Using DEPRECATED dummy stream!" };
//   await delay(500);
//   yield { type: "error", payload: "Dummy stream is deprecated." };
// }
// // ... existing code ...
