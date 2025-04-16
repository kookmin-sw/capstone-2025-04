import type { ProblemDetailAPI } from "./generateProblemApi";

const staticProblemsData: Record<string, ProblemDetailAPI> = {
  "1": {
    problemId: "1",
    title: "두 수의 합",
    description:
      "주어진 정수 배열 `nums`와 정수 `target`이 있을 때, 배열에서 두 수를 더해 `target`이 되는 두 수의 인덱스를 반환하는 함수를 작성하세요.\n\n각 입력에는 정확히 하나의 해답만 있다고 가정하며, 동일한 요소를 두 번 사용할 수 없습니다.\n\n첫 번째 줄에는 정수 배열 `nums`가 공백으로 구분되어 주어집니다.\n두 번째 줄에는 정수 `target`이 주어집니다.\n\n두 수의 인덱스를 담은 배열 `[index1, index2]`를 반환합니다.",
    constraints:
      "- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- -10^9 <= target <= 10^9",
    difficulty: "쉬움",
    language: "python",
    solution_code: "",
    test_case_generation_code: "",
    analyzed_intent: "주어진 배열에서 두 수의 합이 target이 되는 경우 찾기",
    test_specifications: JSON.stringify([
      { input: { nums: [2, 7, 11, 15], target: 9 }, output: [0, 1] },
      { input: { nums: [3, 2, 4], target: 6 }, output: [1, 2] },
      { input: { nums: [3, 3], target: 6 }, output: [0, 1] },
    ]),
    generation_status: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
  },
  "2": {
    problemId: "2",
    title: "배열에서 가장 큰 수 찾기",
    description:
      "정수 배열이 주어졌을 때, 그 배열에서 가장 큰 수를 찾아 반환하는 함수를 작성하세요.\n\n첫 번째 줄에는 배열의 크기 N이 주어집니다.\n두 번째 줄에는 N개의 정수가 공백으로 구분되어 주어집니다.\n\n배열에서 가장 큰 수를 출력합니다.",
    constraints:
      "- 배열의 길이는 1 이상입니다.\n- 배열의 각 요소는 정수입니다.",
    difficulty: "쉬움",
    language: "python",
    solution_code: "",
    test_case_generation_code: "",
    analyzed_intent: "배열에서 최댓값 찾기",
    test_specifications: JSON.stringify([
      { input: { N: 5, arr: [1, 3, 5, 2, 4] }, output: 5 },
      { input: { N: 3, arr: [7, 2, 9] }, output: 9 },
      { input: { N: 4, arr: [-10, -20, -5, -15] }, output: -5 },
    ]),
    generation_status: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
  },
  "3": {
    problemId: "3",
    title: "피보나치 수열 (DP)",
    description:
      "N번째 피보나치 수를 계산하는 함수를 작성하세요. 피보나치 수열은 F(0) = 0, F(1) = 1이며, N > 1일 때 F(N) = F(N-1) + F(N-2) 입니다.\n\n정수 N이 주어집니다.\n\nN번째 피보나치 수를 출력합니다.",
    constraints: "- 0 <= N <= 45",
    difficulty: "보통",
    language: "python",
    solution_code: "",
    test_case_generation_code: "",
    analyzed_intent: "다이나믹 프로그래밍을 이용한 피보나치 수열 계산",
    test_specifications: JSON.stringify([
      { input: { N: 2 }, output: 1 },
      { input: { N: 3 }, output: 2 },
      { input: { N: 10 }, output: 55 },
    ]),
    generation_status: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
  },
  "4": {
    problemId: "4",
    title: "문자열 뒤집기",
    description:
      "주어진 문자열을 뒤집는 함수를 작성하세요.\n\n뒤집을 문자열이 한 줄로 주어집니다.\n\n뒤집힌 문자열을 출력합니다.",
    constraints: "- 문자열의 길이는 1 이상 1000 이하입니다.",
    difficulty: "쉬움",
    language: "python",
    solution_code: "",
    test_case_generation_code: "",
    analyzed_intent: "문자열을 뒤집는 간단한 문제",
    test_specifications: JSON.stringify([
      { input: { s: "hello" }, output: "olleh" },
      { input: { s: "world" }, output: "dlrow" },
    ]),
    generation_status: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
  },
  "5": {
    problemId: "5",
    title: "이진 탐색",
    description:
      "정렬된 정수 배열 `nums`와 정수 `target`이 주어졌을 때, `target`이 배열 안에 있으면 그 인덱스를, 없으면 -1을 반환하는 함수를 작성하세요. 시간 복잡도는 O(log n)이어야 합니다.\n\n첫 번째 줄에는 정렬된 배열 `nums`가 공백으로 구분되어 주어집니다.\n두 번째 줄에는 정수 `target`이 주어집니다.\n\n`target`의 인덱스 또는 -1을 출력합니다.",
    constraints:
      "- 1 <= nums.length <= 10^4\n- -10^4 < nums[i], target < 10^4\n- `nums`는 오름차순으로 정렬되어 있습니다.\n- `nums`의 모든 정수는 고유합니다.",
    difficulty: "보통",
    language: "python",
    solution_code: "",
    test_case_generation_code: "",
    analyzed_intent: "정렬된 배열에서 이진 탐색으로 원소 찾기",
    test_specifications: JSON.stringify([
      { input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 }, output: 4 },
      { input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 }, output: -1 },
    ]),
    generation_status: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
  },
  "6": {
    problemId: "6",
    title: "최단 경로 (Dijkstra)",
    description:
      "가중치가 있는 방향 그래프에서 주어진 시작 노드로부터 다른 모든 노드까지의 최단 경로 비용을 계산하는 함수를 작성하세요. (Dijkstra 알고리즘 사용)\n\n첫 번째 줄에 노드의 개수 V와 간선의 개수 E가 주어집니다.\n두 번째 줄에 시작 노드의 번호 K가 주어집니다.\n세 번째 줄부터 E개의 줄에 걸쳐 각 간선을 나타내는 세 개의 정수 (u, v, w)가 주어집니다. 이는 u에서 v로 가는 가중치 w인 간선이 존재한다는 의미입니다.\n\n시작 노드로부터 각 노드까지의 최단 경로 비용을 노드 번호 순서대로 출력합니다. 경로가 존재하지 않는 경우 INF를 출력합니다.",
    constraints:
      "- 노드의 개수 V는 1 이상 20,000 이하입니다.\n- 간선의 개수 E는 1 이상 300,000 이하입니다.\n- 각 간선의 가중치는 1 이상 10 이하의 자연수입니다.",
    difficulty: "어려움",
    language: "python",
    solution_code: "",
    test_case_generation_code: "",
    analyzed_intent: "다익스트라 알고리즘을 이용한 최단 경로 찾기",
    test_specifications: JSON.stringify([
      {
        input: {
          V: 5,
          E: 6,
          K: 1,
          edges: [
            [5, 1, 1],
            [1, 2, 2],
            [1, 3, 3],
            [2, 3, 4],
            [2, 4, 5],
            [3, 4, 6],
          ],
        },
        output: [0, 2, 3, 7, "INF"],
      },
    ]),
    generation_status: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
  },
};

export const getStaticProblem = (id: string): ProblemDetailAPI | undefined => {
  return staticProblemsData[id];
};

export const isStaticProblemId = (id: string): boolean => {
  const num = parseInt(id, 10);
  return !isNaN(num) && num >= 1 && num <= 6 && String(num) === id;
};
