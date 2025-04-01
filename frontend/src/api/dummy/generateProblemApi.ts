// Define the structure for the expected input (payload)
export interface GenerateProblemParams {
  prompt: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

// Define the structure for the expected output (response body)
export interface GeneratedProblem {
  id: number;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

// Helper function for simulating delay (remains client-side)
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Simulates calling a backend API to generate coding problems.
 * This function is purely client-side and uses delays to mimic network latency
 * and processing time. It returns data in the expected format for the real API.
 *
 * @param params - The parameters for problem generation (prompt, difficulty).
 * @returns A Promise that resolves with an array of generated problems.
 */
export const generateProblemsDummyAPI = async (
  params: GenerateProblemParams,
): Promise<GeneratedProblem[]> => {
  console.log("Dummy API called with params:", params);

  // Simulate network latency and backend processing time
  await delay(1500 + Math.random() * 1000); // Simulate initial processing

  // --- Dummy Problem Generation Logic ---
  const dummyProblems: GeneratedProblem[] = [
    {
      id: Math.floor(1000 + Math.random() * 9000),
      title: `${params.difficulty} 난이도 문제: ${params.prompt.substring(
        0,
        15,
      )}...`,
      description: `요청하신 '${params.prompt}'와 관련된 문제입니다. 최적의 해결책을 찾아보세요. 시간 복잡도는 O(N)입니다. (ID: ${Math.random().toString(36).substring(7)})`,
      difficulty: params.difficulty,
    },
  ];

  // Randomly add a second problem
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
      description: `두 번째 생성된 문제입니다. '${params.prompt}'에서 파생된 개념을 사용하여 해결해 보세요. 공간 복잡도 최적화가 중요합니다. (ID: ${Math.random().toString(36).substring(7)})`,
      difficulty: secondDifficulty,
    });
  }
  // --- End Dummy Logic ---

  console.log("Dummy API returning:", dummyProblems);
  return dummyProblems;
};

/**
 * Optional: Function to simulate streaming messages (if needed later,
 * but less common for simple Lambda request/response).
 * For now, we'll keep the main component handling UI feedback.
 */
// export async function* streamGenerationStatusDummyAPI(params: GenerateProblemParams): AsyncGenerator<string> {
//   yield `요청하신 '${params.prompt}' (난이도: ${params.difficulty}) 에 대한 문제를 생성 중입니다...\n`;
//   await delay(500 + Math.random() * 500);
//   yield "유사 문제 검색 중...\n";
//   await delay(500 + Math.random() * 500);
//   yield "문제 테마 분석 중...\n";
//   await delay(500 + Math.random() * 500);
//   yield "테스트 케이스 생성 준비 중...\n";
//   await delay(500 + Math.random() * 500);
//   yield "문제 생성 완료:\n\n";
// }
