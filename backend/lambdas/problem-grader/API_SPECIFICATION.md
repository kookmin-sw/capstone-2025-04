# Problem Grader API Specification

이 문서는 Problem Grader 애플리케이션의 HTTP API 엔드포인트 명세를 정의합니다.
API는 문제 생성 요청, 코드 제출 및 채점 시작, 상태 조회를 위한 인터페이스를 제공합니다.

## Base URL

API Gateway 배포 후 생성되는 URL을 사용합니다. 예: `https://{api-id}.execute-api.{region}.amazonaws.com/`

## Authentication

현재 API는 인증을 요구하지 않습니다. (추후 필요시 API Gateway Authorizer 또는 다른 방식 추가 가능)

## Endpoints

### 1. 코드 제출 및 채점 시작

- **Endpoint:** `POST /submissions`
- **Description:** 특정 문제에 대한 사용자 코드를 제출하고 채점 프로세스를 시작합니다. 채점은 Step Functions 상태 머신을 통해 비동기적으로 진행됩니다.
- **Request Body:**
  ```json
  {
    "problemId": "uuid-string-of-the-problem",
    "code": "print(sum(map(int, input().split())))",
    "language": "python" // 예: "python", "cpp", "java" 등 (Fargate 컨테이너가 지원하는 언어)
  }
  ```
- **Success Response (202 Accepted):** 채점 요청이 성공적으로 접수되었음을 의미합니다. 실제 채점 결과는 `GET /submissions/{submissionId}`를 통해 확인해야 합니다.
  ```json
  {
    "message": "Submission received and grading process started.",
    "submissionId": "uuid-string-for-this-submission",
    "executionArn": "arn:aws:states:..." // Step Functions 실행 ARN
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: 요청 본문 형식이 잘못되었거나 필수 필드(`problemId`, `code`, `language`)가 누락된 경우.
  - `404 Not Found`: 요청한 `problemId`의 문제가 존재하지 않는 경우.
  - `500 Internal Server Error`: DynamoDB 오류 또는 상태 머신 실행 시작 실패 시.

### 2. 제출 목록 조회

- **Endpoint:** `GET /submissions`
- **Description:** 제출된 코드들의 목록을 조회합니다. (요약 정보만 포함)
- **Query Parameters:**
  - `limit` (integer, optional, default=100): 한 번에 가져올 최대 항목 수.
  - `startKey` (string, optional): 이전 응답에서 받은 `nextStartKey` 값을 Base64 인코딩하여 전달하면 다음 페이지 결과를 가져옵니다.
- **Success Response (200 OK):**
  ```json
  {
    "submissions": [
      {
        "submissionId": "uuid-string-1",
        "problemId": "uuid-problem-1",
        "status": "ACCEPTED",
        "language": "python",
        "createdAt": "timestamp"
      },
      {
        "submissionId": "uuid-string-2",
        "problemId": "uuid-problem-2",
        "status": "WRONG_ANSWER",
        "language": "cpp",
        "createdAt": "timestamp"
      }
      // ... other submissions ...
    ],
    "nextStartKey": "base64-encoded-string-or-null" // 다음 페이지 조회를 위한 키 (없으면 null)
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `startKey` 파라미터 형식이 잘못된 경우.
  - `500 Internal Server Error`: DynamoDB 조회 중 오류 발생 시.

### 3. 특정 제출 상태 조회

- **Endpoint:** `GET /submissions/{submissionId}`
- **Description:** 특정 `submissionId`에 해당하는 제출 건의 상세 정보 및 현재 채점 상태를 조회합니다.
- **Path Parameters:**
  - `submissionId` (string, required): 조회할 제출 건의 고유 ID.
- **Success Response (200 OK):**
  ```json
  {
    "submissionId": "uuid-string-...",
    "problemId": "uuid-problem-...",
    "language": "python",
    "code": "print(sum(map(int, input().split())))", // 포함 여부 확인 필요 (보안/크기)
    "status": "ACCEPTED", // 예: PENDING, RUNNING, ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, etc.
    "createdAt": "timestamp",
    "results": [
      // 채점 결과 상세 (상태 머신에서 업데이트)
      {
        "testcaseId": 0,
        "status": "ACCEPTED",
        "executionTime": 0.1,
        "memoryUsage": 10.5
      },
      {
        "testcaseId": 1,
        "status": "ACCEPTED",
        "executionTime": 0.12,
        "memoryUsage": 10.6
      }
    ],
    "errorMessage": null // 오류 발생 시 메시지
    // ... 기타 제출 정보 ...
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `submissionId`가 경로에 없는 경우.
  - `404 Not Found`: 해당 `submissionId`의 제출 건이 없는 경우.
  - `500 Internal Server Error`: DynamoDB 조회 중 오류 발생 시.

## 상태 값 (status)

- **제출 상태 (`GET /submissions/{submissionId}`의 `status` 필드):**
  - `PENDING`: 채점 대기 중
  - `RUNNING`: 채점 진행 중
  * `ACCEPTED`: 정답
  * `WRONG_ANSWER`: 오답
  * `TIME_LIMIT_EXCEEDED`: 시간 초과
  * `MEMORY_LIMIT_EXCEEDED`: 메모리 초과
  * `RUNTIME_ERROR`: 런타임 오류
  * `COMPILE_ERROR`: 컴파일 오류
  * `INTERNAL_ERROR`: 채점 시스템 내부 오류
  * `FAILED_TO_START`: 상태 머신 시작 실패

## Notes

- DynamoDB `Scan` 작업은 성능에 영향을 줄 수 있으므로, `/problems` 및 `/submissions` 엔드포인트는 실제 운영 환경에서는 GSI를 활용한 `
