# Problem Generator Streaming API 명세서

이 문서는 코딩 문제 생성을 실시간 스트리밍으로 제공하는 API의 사용법을 설명합니다.

## 1. 엔드포인트

- **URL:** `[배포된 Lambda 함수 URL]` (배포 후 실제 URL로 대체 필요)
- **HTTP Method:** `POST`

## 2. 요청 (Request)

- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "prompt": "String",
    "difficulty": "String"
  }
  ```
  - **`prompt` (필수):** 문제 생성을 위한 사용자 입력 프롬프트 (예: "그래프 탐색을 이용한 최단 경로 문제", "DP를 사용해야 하는 배낭 문제")
  - **`difficulty` (필수):** 생성할 문제의 난이도. 다음 값 중 하나여야 합니다:
    - `"튜토리얼"`
    - `"쉬움"`
    - `"보통"`
    - `"어려움"`

## 3. 응답 (Response)

- **Headers:**
  ```
  Content-Type: application/x-ndjson
  ```
- **Body (Streaming - Newline Delimited JSON):**
  응답은 여러 개의 JSON 객체가 개행 문자(`\n`)로 구분되어 스트리밍됩니다. 각 JSON 객체는 다음과 같은 구조를 가집니다:

  ```json
  { "type": "String", "payload": "Any" }
  ```

  - **`type`:** 메시지의 종류를 나타냅니다. 가능한 값은 다음과 같습니다:

    - `status`: 생성 과정의 현재 상태를 나타내는 문자열 메시지입니다.
    - `token`: 문제 설명 등을 생성하는 과정에서 LLM이 생성하는 텍스트 조각(토큰)입니다.
    - `result`: 최종적으로 생성 및 저장된 문제 객체들의 리스트입니다. 스트림의 끝부분에서 한 번 전송됩니다.
    - `error`: 처리 중 오류가 발생했을 때 오류 메시지를 포함합니다.

  - **`payload`:** 메시지 종류(`type`)에 따른 실제 데이터입니다.

    - **`type: "status"` 일 때 `payload`:**

      ```json
      "상태 메시지 문자열"
      ```

      (예: "요청 분석 시작: '그래프 탐색' (보통)", "알고리즘 유형 감지됨: '그래프'", "✅ 생성 완료 및 저장됨!")

    - **`type: "token"` 일 때 `payload`:**

      ```json
      "LLM이 생성한 텍스트 토큰 문자열"
      ```

      (예: "문제 설명의 일부", "입니다.")

    - **`type: "result"` 일 때 `payload`:**
      생성된 문제 객체들의 리스트입니다. 각 문제 객체는 다음과 같은 필드를 포함할 수 있습니다 (실제 필드는 `ProblemGenerator` 구현에 따라 다를 수 있음):

      ```json
      [
        {
          "problemId": "String", // 새로 생성되고 DB에 저장된 문제의 고유 ID
          "title": "String",
          "description": "String",
          "testcases": "Any", // 예: [{"input": "...", "output": "..."}, ...] 또는 JSON 문자열
          "difficulty": "String", // 요청 시 사용된 난이도
          "algorithmType": "String" // 감지되거나 지정된 알고리즘 유형
          // ... 기타 생성된 문제 관련 필드
        }
        // (필요시 여러 문제가 생성될 수 있음)
      ]
      ```

    - **`type: "error"` 일 때 `payload`:**
      ```json
      "오류 메시지 문자열"
      ```
      (예: "오류 발생: Missing 'prompt' or 'difficulty' in request body")

## 4. 예시

- **요청:**

  ```bash
  curl -X POST '[Lambda 함수 URL]' \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "간단한 DFS 문제 만들어줘",
    "difficulty": "쉬움"
  }' --no-buffer # 스트리밍 출력을 위해 --no-buffer 옵션 사용 권장
  ```

- **응답 (스트리밍):**
  ```json
  {"type": "status", "payload": "요청 분석 시작: '간단한 DFS 문제 만들어줘' (쉬움)"}
  {"type": "status", "payload": "알고리즘 유형 감지됨: '그래프'"}
  {"type": "status", "payload": "문제 아이디어 구상 중..."}
  {"type": "token", "payload": "주어진"}
  {"type": "token", "payload": " 그래프에서"}
  {"type": "token", "payload": " 깊이 우선 탐색(DFS)을"}
  {"type": "status", "payload": "문제 설명 생성 중..."}
  {"type": "token", "payload": " 사용하여"}
  {"type": "token", "payload": " 모든 노드를"}
  {"type": "token", "payload": " 방문하는"}
  {"type": "token", "payload": " 코드를 작성하세요."}
  {"type": "status", "payload": "테스트 케이스 생성 중..."}
  {"type": "result", "payload": [{"problemId": "a1b2c3d4-e5f6-7890-1234-567890abcdef", "title": "DFS 기본 연습", "description": "주어진 그래프에서 깊이 우선 탐색(DFS)을 사용하여 모든 노드를 방문하는 코드를 작성하세요.", "testcases": "[{\"input\": \"...\", \"output\": \"...\"}]", "difficulty": "쉬움", "algorithmType": "그래프"}]}
  {"type": "status", "payload": "✅ 생성 완료 및 저장됨!"}
  ```
  _(실제 토큰 스트림은 더 잘게 나뉘어 전송될 수 있습니다.)_

## 5. 오류 처리

- 요청 형식이 잘못되었거나 서버 내부 처리 중 오류가 발생하면 `type: "error"` 메시지가 스트림으로 전송될 수 있습니다.
- 오류 발생 시에도 스트림은 `response_stream.close()` 호출과 함께 정상적으로 종료됩니다. 클라이언트는 `error` 타입 메시지를 확인하여 오류 상황을 인지해야 합니다.
