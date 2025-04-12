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
    "title": "두 수 더하기",
    "description": "두 정수 A와 B를 입력받아 A+B를 출력하는 프로그램을 작성하시오.",
    "input_format": "첫째 줄에 A와 B가 주어진다. (0 < A, B < 10)",
    "output_format": "첫째 줄에 A+B를 출력한다.",
    "constraints": "시간 제한 1초, 메모리 제한 128MB",
    "testcases": [
      { "input": "1 1", "output": "2" },
      { "input": "2 3", "output": "5" }
    ],
    "difficulty": "쉬움",
    "algorithmType": "구현",
    "createdAt": "timestamp"
    // ... 기타 문제 정보 ...
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `problemId`가 경로에 없는 경우.
  - `404 Not Found`: 해당 `problemId`의 문제가 없는 경우.
  - `500 Internal Server Error`: DynamoDB 조회 중 오류 발생 시.
