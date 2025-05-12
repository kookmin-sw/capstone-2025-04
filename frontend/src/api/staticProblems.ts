import type { ProblemDetail } from "./problemApi"; // Use ProblemDetail which aliases ProblemDetailAPI

// Define the new structure for static test cases, aligning with finalTestCases
interface FinalStaticTestCase {
  input: Record<string, unknown> | string | number[];
  expected_output: unknown; // Allow various output types
  rationale: string;
}

// Helper to stringify final test cases
const stringifyFinalTestCases = (cases: FinalStaticTestCase[]): string => {
  return JSON.stringify(cases, null, 2);
};

// Update static data to match the ProblemDetail structure more closely
const staticProblemsData: Record<string, ProblemDetail> = {
  "1": {
    problemId: "1",
    title: "A+B (Easy)",
    title_translated: "A+B (쉬움)",
    description: `
### 문제 설명
안녕하세요! 아주 간단한 계산 문제를 풀어볼 시간입니다. 두 개의 숫자가 주어지면, 이 두 숫자를 더한 결과를 출력하는 문제입니다. 컴퓨터에게 덧셈을 시켜보는 첫걸음이 될 수 있어요!

### 입력 형식
입력은 한 줄로 주어집니다.
첫 번째 숫자와 두 번째 숫자가 공백으로 구분되어 있습니다.
두 숫자는 정수이며, 같은 값이 주어질 수도 있습니다.

### 출력 형식
두 숫자를 더한 결과를 정수 형태로 출력합니다.
출력은 계산된 합과 정확히 일치해야 합니다. (judge_type: equal)
주어진 입력에 대해 합은 항상 유일하므로, 별도의 동점 처리 규칙은 없습니다.

### 제약 조건
* 시간 제한: 1초
* 메모리 제한: 256 MB
* 입력 정수 범위: -10^15 <= a, b <= 10^15
* judge_type: equal

### 예제 1
\`\`\`
5 3
\`\`\`
\`\`\`
8
\`\`\`

### 예제 2
\`\`\`
8 8
\`\`\`
\`\`\`
16
\`\`\`
    `.trim(),
    description_translated: `
### 문제 설명
안녕하세요! 아주 간단한 계산 문제를 풀어볼 시간입니다. 두 개의 숫자가 주어지면, 이 두 숫자를 더한 결과를 출력하는 문제입니다. 컴퓨터에게 덧셈을 시켜보는 첫걸음이 될 수 있어요!

### 입력 형식
입력은 한 줄로 주어집니다.
첫 번째 숫자와 두 번째 숫자가 공백으로 구분되어 있습니다.
두 숫자는 정수이며, 같은 값이 주어질 수도 있습니다.

### 출력 형식
두 숫자를 더한 결과를 정수 형태로 출력합니다.
출력은 계산된 합과 정확히 일치해야 합니다. (judge_type: equal)
주어진 입력에 대해 합은 항상 유일하므로, 별도의 동점 처리 규칙은 없습니다.

### 제약 조건
* 시간 제한: 1초
* 메모리 제한: 256 MB
* 입력 정수 범위: -10^15 <= a, b <= 10^15
* judge_type: equal

### 예제 1
\`\`\`
5 3
\`\`\`
\`\`\`
8
\`\`\`

### 예제 2
\`\`\`
8 8
\`\`\`
\`\`\`
16
\`\`\`
    `.trim(),
    constraints: JSON.stringify({
      time_limit_seconds: 1,
      memory_limit_mb: 256,
      input_constraints: "Input consists of two integers, a and b, separated by a space. The range for both integers is -10^15 <= a, b <= 10^15.",
      judge_type: "equal",
    }),
    judgeType: "equal",
    difficulty: "쉬움",
    language: "python3.12",
    validatedSolutionCode: `
def solution(input_data):
  """
  Calculates the sum of two integers.

  Args:
    input_data: A list containing two integers [a, b].

  Returns:
    The sum of the two integers (a + b).
  """
  num1 = input_data[0]
  num2 = input_data[1]
  return num1 + num2
    `.trim(),
    startCode: `
import sys

# If using recursion, uncomment the following line:
# sys.setrecursionlimit(300000)

def solution(input_data: list[int]) -> int:
    """
    Calculates the sum of two integers.

    Args:
      input_data: A list containing two integers [a, b].

    Returns:
      The sum of the two integers (a + b).
    """
    # input_data is a list of two integers, e.g., [a, b]
    # a: int = input_data[0]
    # b: int = input_data[1]
    
    # Your amazing code here
    result: int = 0  # Placeholder
    
    return result
    `.trim(),
    finalTestCases: stringifyFinalTestCases([
      {
        input: [5, 3],
        expected_output: 8,
        rationale: "Basic test case with two small positive integers.",
      },
      {
        input: [10, -5],
        expected_output: 5,
        rationale: "Test case with one positive and one negative integer.",
      },
      {
        input: [-7, -2],
        expected_output: -9,
        rationale: "Test case with two negative integers.",
      },
      {
        input: [0, 15],
        expected_output: 15,
        rationale: "Test case with zero and a positive integer.",
      },
      {
        input: [0, -20],
        expected_output: -20,
        rationale: "Test case with zero and a negative integer.",
      },
      {
        input: [0, 0],
        expected_output: 0,
        rationale: "Edge case with two zeros.",
      },
      {
        input: [8, 8],
        expected_output: 16,
        rationale: "Test case with duplicate positive integers.",
      },
      {
        input: [-4, -4],
        expected_output: -8,
        rationale: "Test case with duplicate negative integers.",
      },
      {
        input: [1000000, 2000000],
        expected_output: 3000000,
        rationale: "Test case with large positive integers.",
      },
      {
        input: [-1000000, -2000000],
        expected_output: -3000000,
        rationale: "Test case with large negative integers.",
      },
      {
        input: [1000000000000000, 5],
        expected_output: 1000000000000005,
        rationale: "Test case with a very large positive integer and a small positive integer.",
      },
      {
        input: [-1000000000000000, 5],
        expected_output: -999999999999995,
        rationale: "Test case with a very large negative integer and a small positive integer.",
      }
    ]),
    generationStatus: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
    intent: JSON.stringify({
      goal: "Calculate the sum of two given integers.",
      concepts: ["Basic Arithmetic"],
      key_constraints: ["Input consists of exactly two integers.", "Output is a single integer representing the sum."],
    }),
    analyzedIntent: "두 정수의 합 계산하기",
    testGeneratorCode: "",
    author: "admin",
    creatorId: "admin",
    schemaVersion: "v3.2_static",
    targetLanguage: "ko",
    userPrompt: "a + b 아주 간단 기초 문제",
  },
  "2": {
    problemId: "2",
    title: "배열 최대값 찾기 (쉬움)",
    title_translated: "배열 최대값 찾기 (쉬움)",
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
    description_translated: `
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
      judge_type: "equal",
    }),
    judgeType: "equal",
    difficulty: "쉬움",
    language: "python",
    validatedSolutionCode: `
def findLargest(arr):
  if not arr:
      return None # Or raise error for empty array
  largest = arr[0]
  for num in arr:
      if num > largest:
          largest = num
  return largest
     `.trim(),
    startCode: `
def findLargest(arr):
    # 여기에 코드를 작성하세요
    # 예시: largest = arr[0]
    # for x in arr:
    #     if x > largest:
    #         largest = x
    # return largest
    pass
    `.trim(),
    finalTestCases: stringifyFinalTestCases([
      {
        input: { arr: [1, 3, 5, 2, 4] },
        expected_output: 5,
        rationale: "양수 배열",
      },
      {
        input: { arr: [7, 2, 9] },
        expected_output: 9,
        rationale: "다른 양수 배열",
      },
      {
        input: { arr: [-10, -20, -5, -15] },
        expected_output: -5,
        rationale: "음수 배열",
      },
      {
        input: { arr: [100] },
        expected_output: 100,
        rationale: "단일 요소 배열",
      },
      {
        input: { arr: [-1, 0, 1] },
        expected_output: 1,
        rationale: "혼합된 부호 배열",
      },
    ]),
    generationStatus: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
    intent: JSON.stringify({
      goal: "배열에서 최대값 찾기",
      concepts: ["배열 순회", "비교 연산"],
      key_constraints: ["배열 길이 1 이상"],
    }),
    analyzedIntent: "배열에서 최댓값 찾기",
    testGeneratorCode: "",
    author: "ALPACO Static Content",
    creatorId: "static-creator-uuid-2",
    schemaVersion: "v3.2_static",
    targetLanguage: "ko",
    userPrompt: "정수 배열에서 가장 큰 수를 찾는 문제를 만들어줘.",
  },
  "3": {
    problemId: "3",
    title: "피보나치 수열 (DP) (보통)",
    title_translated: "피보나치 수열 (DP) (보통)",
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
    description_translated: `
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
      judge_type: "equal",
    }),
    judgeType: "equal",
    difficulty: "보통",
    language: "python",
    validatedSolutionCode: `
# Using Dynamic Programming (Bottom-up)
def fib_dp(N):
    if N <= 1:
        return N
    dp = [0] * (N + 1)
    dp[1] = 1
    for i in range(2, N + 1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[N]

# Choose one implementation for the actual solution
def fib(N): # Assuming the function name in the problem is fib
    return fib_dp(N)
    `.trim(),
    startCode: `
memo = {} # For memoization approach
def fib(N):
    # 여기에 코드를 작성하세요
    # 동적 프로그래밍 또는 메모이제이션을 사용해야 합니다.
    # 예시 (메모이제이션):
    # if N <= 1: return N
    # if N in memo: return memo[N]
    # memo[N] = fib(N-1) + fib(N-2)
    # return memo[N]
    pass
    `.trim(),
    finalTestCases: stringifyFinalTestCases([
      { input: { N: 0 }, expected_output: 0, rationale: "기저 사례 F(0)" },
      { input: { N: 1 }, expected_output: 1, rationale: "기저 사례 F(1)" },
      { input: { N: 2 }, expected_output: 1, rationale: "예제 1: F(2)" },
      { input: { N: 3 }, expected_output: 2, rationale: "예제 2: F(3)" },
      { input: { N: 10 }, expected_output: 55, rationale: "예제 3: F(10)" },
      {
        input: { N: 45 },
        expected_output: 1134903170,
        rationale: "최대 제약 조건 N=45",
      },
    ]),
    generationStatus: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
    intent: JSON.stringify({
      goal: "N번째 피보나치 수 계산",
      concepts: ["동적 프로그래밍", "메모이제이션", "재귀"],
      key_constraints: ["0 <= N <= 45", "효율적 계산"],
    }),
    analyzedIntent: "다이나믹 프로그래밍을 이용한 피보나치 수열 계산",
    testGeneratorCode: "",
    author: "ALPACO Static Content",
    creatorId: "static-creator-uuid-3",
    schemaVersion: "v3.2_static",
    targetLanguage: "ko",
    userPrompt:
      "N번째 피보나치 수를 DP 또는 메모이제이션으로 푸는 문제를 만들어줘.",
  },
  "4": {
    problemId: "4",
    title: "문자열 뒤집기 (쉬움)",
    title_translated: "문자열 뒤집기 (쉬움)",
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
    `.trim(),
    description_translated: `
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
    `.trim(),
    constraints: JSON.stringify({
      time_limit_seconds: 1,
      memory_limit_mb: 128,
      input_constraints: "s: 0 <= length <= 1000, ASCII characters",
      judge_type: "equal_string",
    }),
    judgeType: "equal_string",
    difficulty: "쉬움",
    language: "python",
    validatedSolutionCode: `
def reverseString(s):
  # Pythonic way using slicing
  return s[::-1]
    `.trim(),
    startCode: `
def reverseString(s):
    # 여기에 코드를 작성하세요
    # 예시: return s[::-1]
    pass
    `.trim(),
    finalTestCases: stringifyFinalTestCases([
      {
        input: { s: "hello" },
        expected_output: "olleh",
        rationale: "기본 예제 1",
      },
      {
        input: { s: "world" },
        expected_output: "dlrow",
        rationale: "기본 예제 2",
      },
      {
        input: { s: "Python" },
        expected_output: "nohtyP",
        rationale: "대소문자 포함 문자열",
      },
      { input: { s: "a" }, expected_output: "a", rationale: "단일 문자" },
      { input: { s: "" }, expected_output: "", rationale: "빈 문자열" },
      {
        input: { s: "12345" },
        expected_output: "54321",
        rationale: "숫자로만 이루어진 문자열",
      },
    ]),
    generationStatus: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
    intent: JSON.stringify({
      goal: "문자열 뒤집기",
      concepts: ["문자열 처리", "슬라이싱", "반복문"],
      key_constraints: ["ASCII 문자열"],
    }),
    analyzedIntent: "문자열을 뒤집는 간단한 문제",
    testGeneratorCode: "",
    author: "ALPACO Static Content",
    creatorId: "static-creator-uuid-4",
    schemaVersion: "v3.2_static",
    targetLanguage: "ko",
    userPrompt: "주어진 문자열을 뒤집는 함수를 작성하는 문제를 만들어줘.",
  },
  "5": {
    problemId: "5",
    title: "이진 탐색 (보통)",
    title_translated: "이진 탐색 (보통)",
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

### 예제 2
\`\`\`
Input: nums = [-1, 0, 3, 5, 9, 12], target = 2
Output: -1
\`\`\`
    `.trim(),
    description_translated: `
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

### 예제 2
\`\`\`
Input: nums = [-1, 0, 3, 5, 9, 12], target = 2
Output: -1
\`\`\`
    `.trim(),
    constraints: JSON.stringify({
      time_limit_seconds: 1,
      memory_limit_mb: 256,
      input_constraints:
        "nums: 1 <= length <= 10^4, sorted unique integers between -10^4 and 10^4. target: integer between -10^4 and 10^4.",
      judge_type: "equal",
    }),
    judgeType: "equal",
    difficulty: "보통",
    language: "python",
    validatedSolutionCode: `
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
    startCode: `
def binarySearch(nums, target):
    # 여기에 코드를 작성하세요
    # 시간 복잡도 O(log n)을 만족해야 합니다.
    # 예시:
    # left, right = 0, len(nums) - 1
    # while left <= right:
    #     mid = (left + right) // 2
    #     if nums[mid] == target:
    #         return mid
    #     # ...
    pass
    `.trim(),
    finalTestCases: stringifyFinalTestCases([
      {
        input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 },
        expected_output: 4,
        rationale: "예제 1: 타겟이 배열에 있음",
      },
      {
        input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 },
        expected_output: -1,
        rationale: "예제 2: 타겟이 배열에 없음",
      },
      {
        input: { nums: [5], target: 5 },
        expected_output: 0,
        rationale: "단일 요소 배열, 타겟 존재",
      },
      {
        input: { nums: [5], target: -5 },
        expected_output: -1,
        rationale: "단일 요소 배열, 타겟 없음",
      },
      {
        input: { nums: [2, 5], target: 5 },
        expected_output: 1,
        rationale: "작은 배열, 타겟 오른쪽",
      },
      {
        input: { nums: [2, 5], target: 2 },
        expected_output: 0,
        rationale: "작은 배열, 타겟 왼쪽",
      },
    ]),
    generationStatus: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
    intent: JSON.stringify({
      goal: "정렬된 배열에서 이진 탐색으로 원소 찾기",
      concepts: ["이진 탐색", "분할 정복"],
      key_constraints: ["O(log n) 시간 복잡도", "정렬된 고유한 정수 배열"],
    }),
    analyzedIntent: "정렬된 배열에서 이진 탐색으로 원소 찾기",
    testGeneratorCode: "",
    author: "ALPACO Static Content",
    creatorId: "static-creator-uuid-5",
    schemaVersion: "v3.2_static",
    targetLanguage: "ko",
    userPrompt:
      "오름차순으로 정렬된 배열에서 target을 찾는 이진 탐색 문제를 만들어줘.",
  },
  "6": {
    problemId: "6",
    title: "최단 경로 (Dijkstra) (어려움)",
    title_translated: "최단 경로 (Dijkstra) (어려움)",
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
Output: [0, 2, 3, 7, null]
\`\`\`
(실제 JSON 표현에서는 float('inf') 대신 null 또는 큰 숫자로 표현될 수 있습니다. 여기서는 null을 사용합니다.)
설명: 노드 1에서 각 노드까지의 최단 거리는 1:0, 2:2, 3:3, 4:7 입니다. 노드 5로는 갈 수 없으므로 무한대입니다. (Output은 0-based index 기준)
    `.trim(),
    description_translated: `
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
Output: [0, 2, 3, 7, null]
\`\`\`
(실제 JSON 표현에서는 float('inf') 대신 null 또는 큰 숫자로 표현될 수 있습니다. 여기서는 null을 사용합니다.)
설명: 노드 1에서 각 노드까지의 최단 거리는 1:0, 2:2, 3:3, 4:7 입니다. 노드 5로는 갈 수 없으므로 무한대입니다. (Output은 0-based index 기준)
    `.trim(),
    constraints: JSON.stringify({
      time_limit_seconds: 2,
      memory_limit_mb: 512,
      input_constraints:
        "V: 1 <= V <= 20,000. E: 1 <= E <= 300,000. w: 1 <= w <= 10. K: 1 <= K <= V.",
      judge_type: "equal_array_with_inf_null",
    }),
    judgeType: "equal_array_with_inf_null",
    difficulty: "어려움",
    language: "python",
    validatedSolutionCode: `
import heapq

def dijkstra(V, edges, K):
    start_node_0_indexed = K - 1
    # Initialize distances: 0 for start_node, float('inf') for others
    distances = [float('inf')] * V
    if 0 <= start_node_0_indexed < V:
        distances[start_node_0_indexed] = 0

    # Create adjacency list: adj[u] = [(v, weight), ...]
    adj = [[] for _ in range(V)]
    for u, v, w_edge in edges:
        # Adjust to 0-based index for nodes u and v
        adj[u - 1].append((v - 1, w_edge))

    # Priority queue: (cost, node_index)
    priority_queue = [(0, start_node_0_indexed)]

    while priority_queue:
        current_distance, current_node = heapq.heappop(priority_queue)

        # Skip if we found a shorter path already
        if current_distance > distances[current_node]:
            continue

        # Explore neighbors
        for neighbor_node, weight in adj[current_node]:
            distance = current_distance + weight
            # If found a shorter path to the neighbor
            if distance < distances[neighbor_node]:
                distances[neighbor_node] = distance
                heapq.heappush(priority_queue, (distance, neighbor_node))

    return distances
    `.trim(),
    startCode: `
import heapq

def dijkstra(V, edges, K):
    # V: 노드의 개수
    # edges: [[u, v, w], ...] 형태의 간선 리스트 (1-based index)
    # K: 시작 노드 (1-based index)
    # 반환값: 시작 노드로부터 각 노드까지의 최단 거리를 담은 리스트 (0-based index)
    # 경로가 없으면 float('inf')를 사용하며, JSON 출력 시 null로 표현될 수 있습니다.

    distances = [float('inf')] * V
    # K를 0-based 인덱스로 변환
    start_node_idx = K - 1
    if 0 <= start_node_idx < V:
        distances[start_node_idx] = 0

    adj = [[] for _ in range(V)]
    for u, v, w in edges:
        adj[u-1].append((v-1, w)) # 0-based 인덱스로 간선 정보 저장

    pq = [(0, start_node_idx)] # (거리, 노드 인덱스)

    # 여기에 다익스트라 알고리즘 로직을 작성하세요

    return distances
    `.trim(),
    finalTestCases: stringifyFinalTestCases([
      {
        input: {
          V: 5,
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
        expected_output: [0, 2, 3, 7, null],
        rationale: "예제 1: 일반적인 다익스트라 케이스, 노드 5는 도달 불가",
      },
      {
        input: {
          V: 3,
          K: 2,
          edges: [
            [1, 3, 5],
            [2, 1, 2],
          ],
        },
        expected_output: [2, 0, 7],
        rationale: "다른 시작 노드 (2번 노드), 모든 노드 도달 가능",
      },
      {
        input: { V: 1, K: 1, edges: [] },
        expected_output: [0],
        rationale: "단일 노드, 간선 없음",
      },
      {
        input: {
          V: 4,
          K: 1,
          edges: [
            [1, 2, 1],
            [1, 3, 4],
            [2, 3, 1],
            [3, 4, 1],
            [2, 4, 5],
          ],
        },
        expected_output: [0, 1, 2, 3],
        rationale: "경로가 여러 개인 경우 최단 경로 선택",
      },
    ]),
    generationStatus: "completed",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z",
    intent: JSON.stringify({
      goal: "가중치 그래프에서 시작 노드로부터 다른 모든 노드까지의 최단 경로 비용 계산",
      concepts: ["다익스트라 알고리즘", "우선순위 큐", "그래프 탐색"],
      key_constraints: [
        "방향 그래프",
        "양의 가중치",
        "1-based indexing for input",
      ],
    }),
    analyzedIntent: "다익스트라 알고리즘을 이용한 최단 경로 찾기",
    testGeneratorCode: "",
    author: "ALPACO Static Content",
    creatorId: "static-creator-uuid-6",
    schemaVersion: "v3.2_static",
    targetLanguage: "ko",
    userPrompt:
      "가중치가 있는 방향 그래프에서 시작 노드로부터 모든 노드까지의 최단 경로를 찾는 다익스트라 알고리즘 문제를 만들어줘.",
  },
};

export const getStaticProblem = (id: string): ProblemDetail | undefined => {
  const problem = staticProblemsData[id];
  if (problem) {
    // Basic validation for critical fields to ensure type compatibility
    if (
      typeof problem.problemId === "string" &&
      typeof problem.title === "string" &&
      typeof problem.description === "string" &&
      typeof problem.difficulty === "string" &&
      typeof problem.constraints === "string" &&
      typeof problem.finalTestCases === "string" &&
      typeof problem.language === "string" &&
      typeof problem.generationStatus === "string" &&
      typeof problem.createdAt === "string" &&
      // Check optional fields that are expected to be strings if they exist
      (problem.validatedSolutionCode === undefined ||
        typeof problem.validatedSolutionCode === "string") &&
      (problem.startCode === undefined ||
        typeof problem.startCode === "string") &&
      (problem.intent === undefined || typeof problem.intent === "string") &&
      (problem.judgeType === undefined ||
        typeof problem.judgeType === "string") &&
      (problem.schemaVersion === undefined ||
        typeof problem.schemaVersion === "string") &&
      (problem.targetLanguage === undefined ||
        typeof problem.targetLanguage === "string")
    ) {
      try {
        // Validate JSON strings
        JSON.parse(problem.constraints);
        JSON.parse(problem.finalTestCases);
        if (problem.intent) JSON.parse(problem.intent);
        return problem;
      } catch (e) {
        console.error(
          `Static problem data for ID ${id} has invalid JSON string:`,
          e,
        );
        return undefined;
      }
    } else {
      console.error(
        `Static problem data for ID ${id} is missing required fields or has incorrect basic types.`,
      );
      return undefined;
    }
  }
  return undefined;
};

export const isStaticProblemId = (id: string): boolean => {
  const num = parseInt(id, 10);
  // Adjust range if you update static problems (currently 1 to 6)
  return !isNaN(num) && num >= 1 && num <= 6 && String(num) === id;
};
