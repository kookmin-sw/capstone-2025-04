// Import the correct type definition
import type { ProblemDetail } from "./problemApi"; // Use ProblemDetail which aliases ProblemDetailAPI

// Define TestCase structure matching the backend intent
interface StaticTestCase {
  input: Record<string, unknown> | string; // Allow string or object input
  output: unknown; // Allow various output types
}

// Helper to stringify test cases
const stringifyTestCases = (cases: StaticTestCase[]): string => {
  return JSON.stringify(cases, null, 2);
};

// Update static data to match the ProblemDetail structure
const staticProblemsData: Record<string, ProblemDetail> = {
  "1": {
    problemId: "1",
    title: "두 수의 합 (쉬움)",
    description: `
### 문제 설명
주어진 정수 배열 \`nums\`와 정수 \`target\`이 있을 때, 배열에서 두 수를 더해 \`target\`이 되는 두 수의 인덱스를 반환하는 함수를 작성하세요.

각 입력에는 정확히 하나의 해답만 있다고 가정하며, 동일한 요소를 두 번 사용할 수 없습니다.

### 입력 형식
- 함수 인자로 정수 배열 \`nums\`와 정수 \`target\`이 주어집니다.

### 출력 형식
- 두 수의 인덱스를 담은 배열 \`[index1, index2]\`를 반환합니다.

### 제약 조건
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- 각 입력에는 정확히 하나의 해답만 존재합니다.

### 예제 1
\`\`\`
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
\`\`\`
설명: nums[0] + nums[1] == 9 이므로 [0, 1]을 반환합니다.

### 예제 2
\`\`\`
Input: nums = [3, 2, 4], target = 6
Output: [1, 2]
\`\`\`
    `.trim(), // Markdown description including constraints and examples
    constraints: JSON.stringify({
      // Store the raw constraints data as JSON string
      time_limit_seconds: 1,
      memory_limit_mb: 256,
      input_constraints:
        "nums: 2 <= length <= 10^4, -10^9 <= elements <= 10^9. target: -10^9 <= target <= 10^9.",
    }),
    difficulty: "쉬움", // Keep Korean if preferred for display, but backend uses English
    language: "python", // Default/Example language
    solutionCode: `
def twoSum(nums, target):
    numMap = {}
    n = len(nums)
    for i in range(n):
        complement = target - nums[i]
        if complement in numMap:
            return [numMap[complement], i]
        numMap[nums[i]] = i
    return [] # No solution found
    `.trim(), // Add example solution if desired
    testGeneratorCode: "", // Add example generator if desired
    analyzedIntent: "주어진 배열에서 두 수의 합이 target이 되는 경우 찾기",
    testSpecifications: stringifyTestCases([
      // Store test specs as JSON string
      { input: { nums: [2, 7, 11, 15], target: 9 }, output: [0, 1] },
      { input: { nums: [3, 2, 4], target: 6 }, output: [1, 2] },
      { input: { nums: [3, 3], target: 6 }, output: [0, 1] },
    ]),
    generationStatus: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
  },
  "2": {
    problemId: "2",
    title: "배열 최대값 찾기 (쉬움)",
    description: `
### 문제 설명
정수 배열이 주어졌을 때, 그 배열에서 가장 큰 수를 찾아 반환하는 함수를 작성하세요.

### 입력 형식
- 함수 인자로 정수 배열 \`arr\`이 주어집니다.

### 출력 형식
- 배열에서 가장 큰 정수를 반환합니다.

### 제약 조건
- 배열의 길이는 1 이상 1000 이하입니다.
- 배열의 각 요소는 -1,000,000 이상 1,000,000 이하의 정수입니다.

### 예제 1
\`\`\`
Input: arr = [1, 3, 5, 2, 4]
Output: 5
\`\`\`

### 예제 2
\`\`\`
Input: arr = [-10, -20, -5, -15]
Output: -5
\`\`\`
     `.trim(),
    constraints: JSON.stringify({
      time_limit_seconds: 1,
      memory_limit_mb: 128,
      input_constraints:
        "arr: 1 <= length <= 1000, -1,000,000 <= elements <= 1,000,000.",
    }),
    difficulty: "쉬움",
    language: "python",
    solutionCode: `
def findLargest(arr):
  if not arr:
      return None # Or raise error for empty array
  largest = arr[0]
  for num in arr:
      if num > largest:
          largest = num
  return largest
     `.trim(),
    testGeneratorCode: "",
    analyzedIntent: "배열에서 최댓값 찾기",
    testSpecifications: stringifyTestCases([
      { input: { arr: [1, 3, 5, 2, 4] }, output: 5 },
      { input: { arr: [7, 2, 9] }, output: 9 },
      { input: { arr: [-10, -20, -5, -15] }, output: -5 },
      { input: { arr: [100] }, output: 100 },
    ]),
    generationStatus: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
  },
  "3": {
    problemId: "3",
    title: "피보나치 수열 (DP) (보통)",
    description: `
### 문제 설명
N번째 피보나치 수를 계산하는 함수를 작성하세요. 피보나치 수열은 F(0) = 0, F(1) = 1이며, N > 1일 때 F(N) = F(N-1) + F(N-2) 입니다.

동적 프로그래밍(Dynamic Programming) 또는 메모이제이션(Memoization)을 사용하여 효율적으로 계산해야 합니다.

### 입력 형식
- 함수 인자로 정수 \`N\`이 주어집니다.

### 출력 형식
- N번째 피보나치 수를 반환합니다.

### 제약 조건
- 0 <= N <= 45

### 예제 1
\`\`\`
Input: N = 2
Output: 1
\`\`\`
설명: F(2) = F(1) + F(0) = 1 + 0 = 1

### 예제 2
\`\`\`
Input: N = 3
Output: 2
\`\`\`
설명: F(3) = F(2) + F(1) = 1 + 1 = 2

### 예제 3
\`\`\`
Input: N = 10
Output: 55
\`\`\`
    `.trim(),
    constraints: JSON.stringify({
      time_limit_seconds: 1,
      memory_limit_mb: 128,
      input_constraints: "0 <= N <= 45",
    }),
    difficulty: "보통",
    language: "python",
    solutionCode: `
# Using Dynamic Programming (Bottom-up)
def fib_dp(N):
    if N <= 1:
        return N
    dp = [0] * (N + 1)
    dp[1] = 1
    for i in range(2, N + 1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[N]

# Using Memoization (Top-down)
memo = {0: 0, 1: 1}
def fib_memo(N):
    if N in memo:
        return memo[N]
    memo[N] = fib_memo(N - 1) + fib_memo(N - 2)
    return memo[N]

# Choose one implementation for the actual solution
def fib(N):
    return fib_dp(N) # Or fib_memo(N)
    `.trim(),
    testGeneratorCode: "",
    analyzedIntent: "다이나믹 프로그래밍을 이용한 피보나치 수열 계산",
    testSpecifications: stringifyTestCases([
      { input: { N: 0 }, output: 0 },
      { input: { N: 1 }, output: 1 },
      { input: { N: 2 }, output: 1 },
      { input: { N: 3 }, output: 2 },
      { input: { N: 10 }, output: 55 },
      { input: { N: 45 }, output: 1134903170 }, // Max constraint
    ]),
    generationStatus: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
  },
  "4": {
    problemId: "4",
    title: "문자열 뒤집기 (쉬움)",
    description: `
### 문제 설명
주어진 문자열을 뒤집는 함수를 작성하세요.

### 입력 형식
- 함수 인자로 문자열 \`s\`가 주어집니다.

### 출력 형식
- 뒤집힌 문자열을 반환합니다.

### 제약 조건
- 문자열의 길이는 0 이상 1000 이하입니다.
- 문자열은 ASCII 문자로만 구성될 수 있습니다.

### 예제 1
\`\`\`
Input: s = "hello"
Output: "olleh"
\`\`\`

### 예제 2
\`\`\`
Input: s = "world"
Output: "dlrow"
\`\`\`

### 예제 3
\`\`\`
Input: s = "a"
Output: "a"
\`\`\`

### 예제 4
\`\`\`
Input: s = ""
Output: ""
\`\`\`
    `.trim(),
    constraints: JSON.stringify({
      time_limit_seconds: 1,
      memory_limit_mb: 128,
      input_constraints: "s: 0 <= length <= 1000, ASCII characters",
    }),
    difficulty: "쉬움",
    language: "python",
    solutionCode: `
def reverseString(s):
  # Pythonic way using slicing
  return s[::-1]

  # Alternative: using loop
  # reversed_s = ""
  # for char in s:
  #   reversed_s = char + reversed_s
  # return reversed_s
    `.trim(),
    testGeneratorCode: "",
    analyzedIntent: "문자열을 뒤집는 간단한 문제",
    testSpecifications: stringifyTestCases([
      { input: { s: "hello" }, output: "olleh" },
      { input: { s: "world" }, output: "dlrow" },
      { input: { s: "Python" }, output: "nohtyP" },
      { input: { s: "a" }, output: "a" },
      { input: { s: "" }, output: "" },
    ]),
    generationStatus: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
  },
  "5": {
    problemId: "5",
    title: "이진 탐색 (보통)",
    description: `
### 문제 설명
오름차순으로 정렬된 고유한 정수 배열 \`nums\`와 정수 \`target\`이 주어졌을 때, \`target\`이 배열 안에 있으면 그 인덱스를, 없으면 -1을 반환하는 함수를 작성하세요.

시간 복잡도는 O(log n)이어야 합니다.

### 입력 형식
- 함수 인자로 정렬된 정수 배열 \`nums\`와 정수 \`target\`이 주어집니다.

### 출력 형식
- \`target\`의 인덱스 또는 찾지 못한 경우 -1을 반환합니다.

### 제약 조건
- 1 <= nums.length <= 10^4
- -10^4 < nums[i], target < 10^4
- \`nums\`는 오름차순으로 정렬되어 있습니다.
- \`nums\`의 모든 정수는 고유합니다.

### 예제 1
\`\`\`
Input: nums = [-1, 0, 3, 5, 9, 12], target = 9
Output: 4
\`\`\`
설명: 9는 배열에 존재하며 인덱스는 4입니다.

### 예제 2
\`\`\`
Input: nums = [-1, 0, 3, 5, 9, 12], target = 2
Output: -1
\`\`\`
설명: 2는 배열에 존재하지 않으므로 -1을 반환합니다.
    `.trim(),
    constraints: JSON.stringify({
      time_limit_seconds: 1,
      memory_limit_mb: 256,
      input_constraints:
        "nums: 1 <= length <= 10^4, sorted unique integers between -10^4 and 10^4. target: integer between -10^4 and 10^4.",
    }),
    difficulty: "보통",
    language: "python",
    solutionCode: `
def binarySearch(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1 # Target not found
    `.trim(),
    testGeneratorCode: "",
    analyzedIntent: "정렬된 배열에서 이진 탐색으로 원소 찾기",
    testSpecifications: stringifyTestCases([
      { input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 }, output: 4 },
      { input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 }, output: -1 },
      { input: { nums: [5], target: 5 }, output: 0 },
      { input: { nums: [5], target: -5 }, output: -1 },
      { input: { nums: [2, 5], target: 5 }, output: 1 },
    ]),
    generationStatus: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
  },
  "6": {
    problemId: "6",
    title: "최단 경로 (Dijkstra) (어려움)",
    description: `
### 문제 설명
가중치가 있는 방향 그래프에서 주어진 시작 노드로부터 다른 모든 노드까지의 최단 경로 비용을 계산하는 함수를 작성하세요. (Dijkstra 알고리즘 사용)

### 입력 형식
- 함수 인자로 노드의 개수 \`V\`, 간선의 정보 \`edges\` (u, v, w 형태의 리스트), 시작 노드 번호 \`K\` (1-based index)가 주어집니다.
- \`edges\`는 \`[[u1, v1, w1], [u2, v2, w2], ...]\` 형태의 2차원 배열입니다. \`u\`에서 \`v\`로 가는 가중치 \`w\`인 간선을 의미합니다.

### 출력 형식
- 시작 노드 \`K\`로부터 각 노드(1부터 V까지)까지의 최단 경로 비용을 담은 리스트를 반환합니다.
- 경로가 존재하지 않는 경우 해당 노드의 비용은 무한대(infinity)를 나타내는 값 (예: 파이썬의 \`float('inf')\`)으로 설정합니다.
- 리스트의 인덱스는 0부터 시작하므로, 결과 리스트의 \`i\`번째 요소는 노드 \`i+1\`까지의 최단 거리를 나타냅니다.

### 제약 조건
- 노드의 개수 V는 1 이상 20,000 이하입니다.
- 간선의 개수 E는 1 이상 300,000 이하입니다. (\`edges\` 리스트의 길이)
- 각 간선의 가중치 w는 1 이상 10 이하의 자연수입니다.
- 시작 노드 K는 1 이상 V 이하입니다.

### 예제 1
\`\`\`
Input: V = 5, edges = [[5, 1, 1], [1, 2, 2], [1, 3, 3], [2, 3, 4], [2, 4, 5], [3, 4, 6]], K = 1
Output: [0, 2, 3, 7, float('inf')]
\`\`\`
설명: 노드 1에서 각 노드까지의 최단 거리는 1:0, 2:2, 3:3, 4:7 입니다. 노드 5로는 갈 수 없으므로 무한대입니다. (Output은 0-based index 기준)
    `.trim(),
    constraints: JSON.stringify({
      time_limit_seconds: 2, // Dijkstra can be slower
      memory_limit_mb: 512,
      input_constraints:
        "V: 1 <= V <= 20,000. E: 1 <= E <= 300,000. w: 1 <= w <= 10. K: 1 <= K <= V.",
    }),
    difficulty: "어려움",
    language: "python",
    solutionCode: `
import heapq
import sys

def dijkstra(V, edges, K):
    # Adjust K to be 0-based index
    start_node = K - 1
    
    # Initialize distances with infinity
    distances = [float('inf')] * V
    distances[start_node] = 0
    
    # Create adjacency list {node: [(neighbor, weight), ...]}
    graph = {i: [] for i in range(V)}
    for u, v, w in edges:
        # Adjust nodes to be 0-based index
        graph[u - 1].append((v - 1, w))
        
    # Priority queue (min-heap) storing (distance, node)
    priority_queue = [(0, start_node)]
    
    while priority_queue:
        current_distance, current_node = heapq.heappop(priority_queue)
        
        # If we found a shorter path already, skip
        if current_distance > distances[current_node]:
            continue
            
        # Explore neighbors
        for neighbor, weight in graph[current_node]:
            distance = current_distance + weight
            # If found a shorter path to the neighbor
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                heapq.heappush(priority_queue, (distance, neighbor))
                
    return distances
    `.trim(),
    testGeneratorCode: "",
    analyzedIntent: "다익스트라 알고리즘을 이용한 최단 경로 찾기",
    testSpecifications: stringifyTestCases([
      {
        input: {
          V: 5,
          E: 6, // E is implicit from edges length
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
        // Output should be distances array, INF represented by float('inf')
        // Note: JSON cannot represent float('inf'), so we might use null or a large number string in JSON
        // For consistency, let's use null in the JSON spec, but the function returns float('inf')
        output: [0, 2, 3, 7, null], // Using null to represent INF in JSON spec
      },
      {
        input: {
          V: 3,
          E: 2,
          K: 2,
          edges: [
            [1, 3, 5],
            [2, 1, 2],
          ],
        },
        output: [2, 0, 7], // Distances from node 2: to 1 is 2, to 2 is 0, to 3 is 2+5=7
      },
      {
        input: {
          V: 1,
          E: 0,
          K: 1,
          edges: [],
        },
        output: [0],
      },
    ]),
    generationStatus: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
  },
};

export const getStaticProblem = (id: string): ProblemDetail | undefined => {
  // Ensure the returned object matches the ProblemDetail type
  const problem = staticProblemsData[id];
  if (problem) {
    // Quick check for essential fields
    if (
      typeof problem.problemId === "string" &&
      typeof problem.title === "string" &&
      typeof problem.description === "string" &&
      typeof problem.difficulty === "string" &&
      typeof problem.constraints === "string" && // Should be JSON string
      typeof problem.testSpecifications === "string" // Should be JSON string
    ) {
      return problem;
    } else {
      console.error(
        `Static problem data for ID ${id} is missing required fields or has incorrect types.`
      );
      return undefined;
    }
  }
  return undefined;
};

export const isStaticProblemId = (id: string): boolean => {
  const num = parseInt(id, 10);
  // Adjust range if you update static problems
  return !isNaN(num) && num >= 1 && num <= 6 && String(num) === id;
};
