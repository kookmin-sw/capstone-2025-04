# Problem Generator API Specification

이 문서는 Problem Generator 애플리케이션의 HTTP API 엔드포인트 명세를 정의합니다.
API는 프롬프트를 기반으로 코딩 문제를 생성하고 조회하는 인터페이스를 제공합니다.

## Base URL

API Gateway 배포 후 생성되는 URL을 사용합니다. 예: `https://{api-id}.execute-api.{region}.amazonaws.com/`

## Authentication

현재 API는 인증을 요구하지 않습니다.

## Endpoints

### 1. 문제 생성 요청

- **Endpoint:** `POST /problems`
- **Description:** 주어진 프롬프트와 난이도를 바탕으로 새로운 코딩 문제 생성을 요청합니다. 이 엔드포인트는 요청을 수신하고 백그라운드에서 문제 생성을 시작합니다. 실제 생성 결과는 별도로 확인해야 합니다 (예: DynamoDB 조회).
- **Request Body:**
  ```json
  {
    "prompt": "예: 두 정수를 더하는 프로그램을 작성하세요.",
    "difficulty": "쉬움" // "튜토리얼", "쉬움", "보통", "어려움" 중 하나
  }
  ```
- **Success Response (202 Accepted):**
  요청이 성공적으로 접수되었으며 백그라운드 처리가 시작되었음을 의미합니다.
  ```json
  {
    "message": "Problem generation request accepted and is processing in the background."
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: 요청 본문 형식이 잘못되었거나 필수 필드(`prompt`, `difficulty`)가 누락된 경우.
  - `500 Internal Server Error`: API 핸들러 내부 오류 발생 시.

### 2. 문제 목록 조회

- **Endpoint:** `GET /problems`
- **Description:** 생성된 문제들의 목록을 조회합니다. (요약 정보만 포함)
- **Query Parameters:** 없음 (추후 페이지네이션 등 추가 가능)
- **Success Response (200 OK):**
  ```json
  {
    "problems": [
      {
        "problemId": "uuid-string-1",
        "title": "두 수 더하기",
        "difficulty": "쉬움",
        "algorithmType": "구현"
      },
      {
        "problemId": "uuid-string-2",
        "title": "최대값 찾기",
        "difficulty": "보통",
        "algorithmType": "구현"
      }
      // ... other problems ...
    ]
  }
  ```
- **Error Responses:**
  - `500 Internal Server Error`: DynamoDB 조회 중 오류 발생 시.

### 3. 문제 상세 조회

- **Endpoint:** `GET /problems/{problemId}`
- **Description:** 특정 `problemId`에 해당하는 문제의 상세 정보를 조회합니다.
- **Path Parameters:**
  - `problemId` (string, required): 조회할 문제의 고유 ID.
- **Success Response (200 OK):**
  ```json
  {
    "problemId": "uuid-string-...",
    "title": "과거 제출 기록의 가중 평균 점수",
    "description": "알고리즘 대회에 참가 중인 당신은 과거 제출 기록을 바탕으로 자신의 현재 실력을 가늠해보려 합니다...",
    "input_format": "첫 번째 줄에 제출 기록의 수 N (0 ≤ N ≤ 50)이 주어집니다...",
    "output_format": "계산된 가중 평균 점수를 **반올림한 정수** 값을 한 줄에 출력합니다...",
    "constraints": "- 제출 기록의 수 N은 0 이상 50 이하의 정수입니다...",
    "example_input": {
      "n": 3,
      "submissions": [
        ["2021/01/01 00:00:00", 100.0],
        ["2021/06/01 00:00:00", 200.0],
        ["2022/01/01 00:00:00", 300.0]
      ]
    },
    "example_output": {
      "weighted_average_score": 235
    },
    "testcases": [
      {
        "input": {
          "n": 3,
          "submissions": [
            ["2021/01/01 00:00:00", 100.0],
            ["2021/06/01 00:00:00", 200.0],
            ["2022/01/01 00:00:00", 300.0]
          ]
        },
        "output": { "weighted_average_score": 235 }
      },
      {
        "input": { "n": 1, "submissions": [["2022/01/01 00:00:00", 500.0]] },
        "output": { "weighted_average_score": 500 }
      }
      // ... more test cases ...
    ],
    "difficulty": "쉬움",
    "algorithmType": "구현",
    "likesCount": 0,
    "creatorId": "", // 생성자 ID (현재 빈 값, 추후 사용자 ID)
    "genStatus": "completed",
    "createdAt": "2025-04-13T07:08:39.784873",
    "updatedAt": "2025-04-13T07:08:39.784873",
    "language": "cpp",
    "solution_code": "// 변형된 C++ 코드 작성 시작...",
    "test_case_generation_code": "import json\nimport datetime\nimport math...",
    "template_source": "implementation/25318.cpp",
    "algorithm_hint": ""
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `problemId`가 경로에 없는 경우.
  - `404 Not Found`: 해당 `problemId`의 문제가 없는 경우.
  - `500 Internal Server Error`: DynamoDB 조회 중 오류 발생 시.
