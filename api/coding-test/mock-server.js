const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3002; // Use port 3002 for coding test mock

app.use(cors());
app.use(express.json());

// --- Mock Problem Data ---
const mockProblems = {
  1: {
    id: "1",
    title: "두 수의 합",
    description:
      "주어진 정수 배열 `nums`와 정수 `target`이 있을 때, 배열에서 두 수를 더해 `target`이 되는 두 수의 인덱스를 반환하는 함수를 작성하세요.\n\n각 입력에는 정확히 하나의 해답만 있다고 가정하며, 동일한 요소를 두 번 사용할 수 없습니다.",
    constraints:
      "- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- -10^9 <= target <= 10^9",
    input_format:
      "첫 번째 줄에는 정수 배열 `nums`가 공백으로 구분되어 주어집니다.\n두 번째 줄에는 정수 `target`이 주어집니다.",
    output_format:
      "두 수의 인덱스를 담은 배열 `[index1, index2]`를 반환합니다.",
    examples: [
      { input: "nums = [2, 7, 11, 15], target = 9", output: "[0, 1]" },
      { input: "nums = [3, 2, 4], target = 6", output: "[1, 2]" },
      { input: "nums = [3, 3], target = 6", output: "[0, 1]" },
    ],
    test_cases: [
      { input: "2 7 11 15\n9", output: "[0, 1]" },
      { input: "3 2 4\n6", output: "[1, 2]" },
    ],
    algorithm_type: "배열, 해시 테이블",
    difficulty: "Easy",
  },
  2: {
    id: "2",
    title: "배열에서 가장 큰 수 찾기",
    description:
      "정수 배열이 주어졌을 때, 그 배열에서 가장 큰 수를 찾아 반환하는 함수를 작성하세요.",
    constraints:
      "- 배열의 길이는 1 이상입니다.\n- 배열의 각 요소는 정수입니다.",
    input_format:
      "첫 번째 줄에는 배열의 크기 N이 주어집니다.\n두 번째 줄에는 N개의 정수가 공백으로 구분되어 주어집니다.",
    output_format: "배열에서 가장 큰 수를 출력합니다.",
    examples: [
      { input: "5\n1 3 5 2 4", output: "5" },
      { input: "3\n7 2 9", output: "9" },
      { input: "4\n-10 -20 -5 -15", output: "-5" },
    ],
    test_cases: [
      { input: "5\n1 3 5 2 4", output: "5" },
      { input: "3\n7 2 9", output: "9" },
    ],
    algorithm_type: "배열, 기본",
    difficulty: "Easy",
  },
  3: {
    id: "3",
    title: "피보나치 수열 (DP)",
    description:
      "N번째 피보나치 수를 계산하는 함수를 작성하세요. 피보나치 수열은 F(0) = 0, F(1) = 1이며, N > 1일 때 F(N) = F(N-1) + F(N-2) 입니다.",
    constraints: "- 0 <= N <= 45",
    input_format: "정수 N이 주어집니다.",
    output_format: "N번째 피보나치 수를 출력합니다.",
    examples: [
      { input: "2", output: "1" },
      { input: "3", output: "2" },
      { input: "10", output: "55" },
    ],
    test_cases: [
      { input: "10", output: "55" },
      { input: "30", output: "832040" },
    ],
    algorithm_type: "다이나믹 프로그래밍",
    difficulty: "Medium",
  },
  4: {
    id: "4",
    title: "문자열 뒤집기",
    description: "주어진 문자열을 뒤집는 함수를 작성하세요.",
    constraints: "- 문자열의 길이는 1 이상 1000 이하입니다.",
    input_format: "뒤집을 문자열이 한 줄로 주어집니다.",
    output_format: "뒤집힌 문자열을 출력합니다.",
    examples: [
      { input: "hello", output: "olleh" },
      { input: "world", output: "dlrow" },
    ],
    test_cases: [
      { input: "hello", output: "olleh" },
      { input: "programming", output: "gnimmargorp" },
    ],
    algorithm_type: "문자열, 기본",
    difficulty: "Easy",
  },
  5: {
    id: "5",
    title: "이진 탐색",
    description:
      "정렬된 정수 배열 `nums`와 정수 `target`이 주어졌을 때, `target`이 배열 안에 있으면 그 인덱스를, 없으면 -1을 반환하는 함수를 작성하세요. 시간 복잡도는 O(log n)이어야 합니다.",
    constraints:
      "- 1 <= nums.length <= 10^4\n- -10^4 < nums[i], target < 10^4\n- `nums`는 오름차순으로 정렬되어 있습니다.\n- `nums`의 모든 정수는 고유합니다.",
    input_format:
      "첫 번째 줄에는 정렬된 배열 `nums`가 공백으로 구분되어 주어집니다.\n두 번째 줄에는 정수 `target`이 주어집니다.",
    output_format: "`target`의 인덱스 또는 -1을 출력합니다.",
    examples: [
      { input: "-1 0 3 5 9 12\n9", output: "4" },
      { input: "-1 0 3 5 9 12\n2", output: "-1" },
    ],
    test_cases: [
      { input: "-1 0 3 5 9 12\n9", output: "4" },
      { input: "-1 0 3 5 9 12\n2", output: "-1" },
      { input: "5\n5", output: "0" },
    ],
    algorithm_type: "이진 탐색",
    difficulty: "Medium",
  },
  6: {
    id: "6",
    title: "최단 경로 (Dijkstra)",
    description:
      "가중치가 있는 방향 그래프에서 주어진 시작 노드로부터 다른 모든 노드까지의 최단 경로 비용을 계산하는 함수를 작성하세요. (Dijkstra 알고리즘 사용)",
    constraints:
      "- 노드의 개수 V는 1 이상 20,000 이하입니다.\n- 간선의 개수 E는 1 이상 300,000 이하입니다.\n- 각 간선의 가중치는 1 이상 10 이하의 자연수입니다.",
    input_format:
      "첫 번째 줄에 노드의 개수 V와 간선의 개수 E가 주어집니다.\n두 번째 줄에 시작 노드의 번호 K가 주어집니다.\n세 번째 줄부터 E개의 줄에 걸쳐 각 간선을 나타내는 세 개의 정수 (u, v, w)가 주어집니다. 이는 u에서 v로 가는 가중치 w인 간선이 존재한다는 의미입니다.",
    output_format:
      "시작 노드로부터 각 노드까지의 최단 경로 비용을 노드 번호 순서대로 출력합니다. 경로가 존재하지 않는 경우 INF를 출력합니다.",
    examples: [
      {
        input: "5 6\n1\n5 1 1\n1 2 2\n1 3 3\n2 3 4\n2 4 5\n3 4 6",
        output: "0\n2\n3\n7\nINF",
      },
    ],
    test_cases: [
      {
        input: "5 6\n1\n5 1 1\n1 2 2\n1 3 3\n2 3 4\n2 4 5\n3 4 6",
        output: "0\n2\n3\n7\nINF",
      },
    ],
    algorithm_type: "그래프, 최단 경로, Dijkstra",
    difficulty: "Hard",
  },
};

// --- API Endpoint Implementations ---

// GET /coding-test/problem/:id
app.get("/coding-test/problem/:id", (req, res) => {
  const { id } = req.params;
  const problem = mockProblems[id];

  if (problem) {
    console.log(`[CodingTest Mock API] Fetched problem detail: ${id}`);
    // Simulate API response - potentially exclude test_cases unless needed
    const { test_cases, ...problemDetails } = problem;
    res.status(200).json(problemDetails);
  } else {
    console.log(`[CodingTest Mock API] Problem not found: ${id}`);
    res.status(404).json({ message: "문제를 찾을 수 없습니다." });
  }
});

// Add other endpoints later (e.g., POST /coding-test/submit)

// --- Start Server ---
app.listen(PORT, () => {
  console.log(
    `Mock Coding Test API server running on http://localhost:${PORT}`
  );
});
