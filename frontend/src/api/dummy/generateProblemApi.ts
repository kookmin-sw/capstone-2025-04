// Define the structure for the expected input (payload)
export interface GenerateProblemParams {
  prompt: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

// Define the structure for the expected output (response body)
export interface GeneratedProblem {
  id: number; // Use number for consistency with potential DB IDs
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
  params: GenerateProblemParams,
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
        // Generate a somewhat stable ID based on input for potential session consistency
        id: Math.abs(hashCode(params.prompt + params.difficulty + "1") % 10000),
        title: `${params.difficulty} 난이도 생성 문제: ${params.prompt.substring(
          0,
          20,
        )}...`,
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
        id: Math.abs(hashCode(params.prompt + secondDifficulty + "2") % 10000),
        title: `${secondDifficulty} 난이도 관련 문제: ${params.prompt.substring(
          5,
          15,
        )} 응용`,
        description: `두 번째 생성된 더미 문제입니다. '${params.prompt}'에서 파생된 개념을 사용합니다. 난이도: ${secondDifficulty}\n\n${fullSimulatedResponse.substring(0, 100)}... (추가 내용)`,
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

// Simple hash function for dummy ID generation (optional)
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

// --- Keep the old non-streaming dummy API for potential comparison or fallback ---
/**
 * [DEPRECATED - Use streamGenerationStatusDummyAPI]
 * Simulates calling a backend API to generate coding problems (non-streaming).
 */
export const generateProblemsDummyAPI_NonStreaming = async (
  params: GenerateProblemParams,
): Promise<GeneratedProblem[]> => {
  console.log("Dummy Non-Streaming API called with params:", params);
  await delay(1500 + Math.random() * 1000);
  const dummyProblems: GeneratedProblem[] = [
    {
      id: Math.floor(1000 + Math.random() * 9000),
      title: `${params.difficulty} 난이도 문제: ${params.prompt.substring(
        0,
        15,
      )}...`,
      description: `요청하신 '${params.prompt}'와 관련된 문제입니다. 시간 복잡도는 O(N)입니다. (ID: ${Math.random().toString(36).substring(7)})`,
      difficulty: params.difficulty,
    },
  ];
  if (Math.random() > 0.4) {
    const secondDifficulty = ["Easy", "Medium", "Hard"][
      Math.floor(Math.random() * 3)
    ] as "Easy" | "Medium" | "Hard";
    dummyProblems.push({
      id: Math.floor(1000 + Math.random() * 9000),
      title: `${secondDifficulty} 난이도 관련 문제: ${params.prompt.substring(
        5,
        15,
      )} 응용`,
      description: `두 번째 생성된 문제입니다. 공간 복잡도 최적화가 중요합니다. (ID: ${Math.random().toString(36).substring(7)})`,
      difficulty: secondDifficulty,
    });
  }
  console.log("Dummy Non-Streaming API returning:", dummyProblems);
  return dummyProblems;
};
