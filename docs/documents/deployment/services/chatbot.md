---
layout: default
title: "🤖 AI 챗봇"
parent: "🔌 마이크로서비스 API"
grand_parent: "🧑‍💻 개발 가이드"
nav_order: 2
description: "AI 챗봇 서비스 API 가이드"
permalink: /documents/deployment/services/chatbot/
---

## AI Chatbot (ALPACO) API 명세서

### 1. 개요

본 문서는 ALPACO 코딩 테스트 플랫폼 내 AI Chatbot 기능의 MSA(Microservice Architecture)에 대한 API 명세 및 관련 정보를 제공합니다. 챗봇은 사용자에게 프로그래밍 문제 해결에 대한 힌트, 개념 설명, 디버깅 전략 제안 등을 수행하며, 직접적인 정답이나 전체 코드는 제공하지 않습니다. 응답은 Server-Sent Events (SSE)를 통해 스트리밍 방식으로 제공됩니다.

### 2. 아키텍처

```
+-----------------+      +----------------------+      +-------------------------+      +-----------------------+      +------------------------+
|   Frontend      |----->| AWS CloudFront       |----->| AWS Lambda Function URL |----->| AWS Lambda            |----->| Google Generative AI   |
| (Next.js/React) |      | (OAC, Header Fwd)    |      | (IAM Auth, Streaming)   |      | (Node.js, Langchain)  |      | (Gemini Model)         |
+-----------------+      +----------------------+      +-------------------------+      +-----------------------+      +------------------------+
       ^                                                                                          |
       |                                                                                          | (JWT Validation)
       +------------------------------------------------------------------------------------------+
                                       Amazon Cognito (User Pool)
```

1.  **Frontend (클라이언트):** 사용자와의 인터랙션을 담당하며, AWS Amplify를 통해 Cognito로부터 JWT (ID Token)를 획득합니다.
2.  **AWS CloudFront:** 공개 엔드포인트 역할을 하며, Lambda 함수 URL을 보호하기 위해 OAC (Origin Access Control)를 사용합니다. 요청 시 SigV4 서명을 통해 Lambda 함수 URL을 호출하며, 필요한 헤더(`X-Custom-Auth-Token`, `x-amz-content-sha256` 등)를 전달합니다.
3.  **AWS Lambda Function URL:** Lambda 함수를 위한 HTTPS 엔드포인트로, `AWS_IAM` 인증 방식과 `RESPONSE_STREAM` 호출 모드로 설정되어 CloudFront OAC를 통한 안전한 스트리밍 호출을 지원합니다.
4.  **AWS Lambda (`chatbot-query`):**
    *   Node.js 런타임에서 실행됩니다.
    *   CloudFront로부터 전달받은 `X-Custom-Auth-Token` 헤더의 JWT를 Cognito JWKS를 통해 검증합니다.
    *   Langchain.js와 `@langchain/google-genai` 라이브러리를 사용하여 Google Generative AI (Gemini 모델)와 상호작용합니다.
    *   LLM으로부터 받은 응답을 SSE 스트림 형태로 CloudFront를 통해 클라이언트에 전달합니다.
    *   필요한 의존성은 AWS Lambda Layer를 통해 관리됩니다.
5.  **Google Generative AI:** 실제 자연어 처리 및 응답 생성을 담당하는 LLM 서비스입니다.
6.  **Amazon Cognito:** 사용자 인증 및 JWT 발급을 담당합니다.

### 3. 주요 기술 스택

*   **Backend:**
    *   AWS Lambda (Runtime: Node.js 20.x)
    *   Langchain.js (`@langchain/core`, `@langchain/google-genai`)
    *   Google Generative AI (e.g., Gemini 2.0 Flash)
    *   Server-Sent Events (SSE)
    *   `jose` (JWT 검증)
*   **Frontend (참고):**
    *   TypeScript, Next.js/React
    *   AWS Amplify (Cognito 인증 토큰 획득)
*   **Infrastructure & Deployment:**
    *   Terraform
    *   AWS CloudFront (OAC 포함)
    *   AWS Lambda Function URL, Layers
    *   AWS IAM (Identity and Access Management)
*   **Authentication:**
    *   Amazon Cognito (JWT ID Token)

### 4. API 엔드포인트 명세

#### 4.1. 챗봇 질의 및 스트리밍 응답

*   **Endpoint:** `/` (CloudFront 배포 도메인 루트)
*   **Method:** `POST`
*   **URL:** `https://{cloudfront_distribution_domain_name}`
    *   `{cloudfront_distribution_domain_name}`은 Terraform 배포 후 출력되는 값입니다. (예: `d123abcdef890.cloudfront.net`)
*   **인증 (Authentication):**
    *   요청 헤더에 Cognito ID Token을 포함해야 합니다. (자세한 내용은 5. 인증 참조)
    *   CloudFront OAC를 통해 Lambda 함수 URL을 호출하므로, IAM SigV4 서명을 위해 `x-amz-content-sha256` 헤더가 필요합니다.

*   **요청 헤더 (Request Headers):**

    | 헤더                    | 타입   | 필수 | 설명                                                                 |
    | :---------------------- | :----- | :--- | :------------------------------------------------------------------- |
    | `Content-Type`          | string | O    | `application/json`                                                   |
    | `X-Custom-Auth-Token`   | string | O    | `Bearer <COGNITO_ID_TOKEN>` (Cognito 사용자 풀에서 발급받은 ID 토큰) |
    | `x-amz-content-sha256`  | string | O    | 요청 본문(payload)의 SHA256 해시값. (AWS SigV4 서명 요구사항)          |

*   **요청 본문 (Request Body - JSON):**
    `chatbotApi.ts`의 `ChatContext` 및 `newMessage`를 기반으로 합니다.

    ```json
    {
      "problemDetails": { // 문제 상세 정보 (선택적, 없으면 null)
        "id": "string | number", // 문제 ID
        "title": "string",         // 문제 제목
        "description": "string"  // 문제 설명 (선택적)
      },
      "userCode": "string",      // 사용자가 작성한 현재 코드
      "history": [               // 이전 대화 기록 (배열, 선택적)
        {
          "role": "user",        // "user" 또는 "assistant" ("model"도 가능)
          "content": "string"    // 메시지 내용
        }
      ],
      "newMessage": "string"     // 사용자의 새 메시지 (필수)
    }
    ```

*   **응답 (Response - Server-Sent Events Stream):**
    *   `Content-Type: text/event-stream`
    *   `Cache-Control: no-cache`
    *   `Connection: keep-alive`

    **SSE 이벤트 형식:**

    1.  **토큰 (데이터 조각):**
        ```sse
        data: {"token": "응답 메시지의 일부"}\n\n
        ```
        *   `token`: LLM이 생성한 텍스트의 스트리밍 조각입니다.

    2.  **스트림 종료 신호 (선택적):**
        ```sse
        data: [DONE]\n\n
        ```
        *   클라이언트에서 스트림 종료를 명시적으로 처리하기 위한 신호입니다.

    3.  **오류 발생 시 (스트림 중):**
        ```sse
        data: {"error": "에러 메시지 요약", "details": "상세 에러 내용"}\n\n
        ```
        *   스트림이 시작된 후 백엔드에서 오류가 발생하면 이 형식으로 전송될 수 있습니다.

*   **HTTP 상태 코드 (Status Codes):**

    | 코드 | 설명                                                                                                | 응답 본문                                    |
    | :--- | :-------------------------------------------------------------------------------------------------- | :------------------------------------------- |
    | `200 OK` | 요청 성공 및 SSE 스트림 시작                                                                      | `text/event-stream` 형식의 SSE 데이터        |
    | `400 Bad Request` | 요청 본문 파싱 실패 또는 필수 필드 누락 (Lambda 내부에서 처리, SSE 헤더 전송 후 발생 시 SSE 오류로 전달) | JSON: `{"error": "Invalid request body.", "details": "..."}` 또는 SSE 오류 |
    | `401 Unauthorized` | `X-Custom-Auth-Token` 헤더 누락 또는 JWT 검증 실패                                        | JSON: `{"error": "Unauthorized", "details": "..."}` |
    | `500 Internal Server Error` | LLM 호출 실패 등 서버 내부 오류 (Lambda 내부에서 처리, SSE 헤더 전송 후 발생 시 SSE 오류로 전달) | JSON: `{"error": "Failed to get response from LLM", "details": "..."}` 또는 SSE 오류 |

### 5. 인증 (Authentication)

1.  클라이언트는 AWS Amplify의 `fetchAuthSession()` 함수를 사용하여 Amazon Cognito로부터 사용자의 ID 토큰 (JWT)을 가져옵니다.
2.  획득한 ID 토큰은 `X-Custom-Auth-Token` HTTP 헤더에 `Bearer ` 접두사와 함께 담겨 API로 전송됩니다.
    *   예: `X-Custom-Auth-Token: Bearer eyJraWQiOiJ...`
3.  백엔드 Lambda 함수는 수신된 JWT를 다음 환경 변수를 사용하여 검증합니다:
    *   `COGNITO_JWKS_URL`: Cognito User Pool의 JWKS (JSON Web Key Set) URI
    *   `COGNITO_ISSUER_URL`: Cognito User Pool의 발급자(Issuer) URL
    *   `COGNITO_APP_CLIENT_ID`: Cognito User Pool 앱 클라이언트 ID (Audience 검증용)
4.  JWT 검증이 성공하면 요청 처리가 계속되고, 실패하면 `401 Unauthorized` 오류가 반환됩니다.

### 6. 데이터 모델 (상세)

#### `ChatMessage` (대화 기록 내 메시지 객체)

| 필드      | 타입                               | 설명                        |
| :-------- | :--------------------------------- | :-------------------------- |
| `role`    | `"user"` \| `"assistant"` \| `"model"` | 메시지 발화자 역할          |
| `content` | `string`                           | 메시지 내용                 |

#### `ProblemDetailPlaceholder` (문제 상세 정보 객체)

| 필드          | 타입             | 설명        |
| :------------ | :--------------- | :---------- |
| `id`          | `string` \| `number` | 문제 ID     |
| `title`       | `string`         | 문제 제목   |
| `description` | `string` (선택적) | 문제 상세 설명 |

#### `ChatStreamPayload` (SSE 스트림 데이터 페이로드)

| 필드      | 타입             | 설명                               |
| :-------- | :--------------- | :--------------------------------- |
| `token`   | `string` (선택적) | LLM 응답 텍스트 조각               |
| `error`   | `string` (선택적) | 오류 발생 시 오류 메시지 요약        |
| `details` | `string` (선택적) | 오류 발생 시 상세 내용             |

### 7. 에러 처리

*   **인증 오류:** `X-Custom-Auth-Token` 헤더의 JWT가 유효하지 않거나 누락된 경우, Lambda 함수는 HTTP `401 Unauthorized` 응답과 함께 JSON 형식의 오류 메시지를 반환합니다.
*   **요청 유효성 검사 오류:** 요청 본문이 잘못되었거나 필수 필드가 누락된 경우, Lambda 함수는 상황에 따라 HTTP `400 Bad Request` 또는 SSE 스트림 내 오류 메시지를 반환합니다. (SSE 헤더가 이미 전송된 경우 스트림 내 오류로 처리)
*   **LLM 및 내부 서버 오류:** Google AI 모델 호출 실패 등 백엔드 처리 중 오류가 발생하면, Lambda 함수는 상황에 따라 HTTP `500 Internal Server Error` 또는 SSE 스트림 내 오류 메시지를 반환합니다.

### 8. 배포 (Deployment)

Terraform을 사용하여 AWS 인프라를 배포합니다. (`infrastructure/chatbot/README.md` 및 `README.ko.md` 참조)

**주요 단계:**

1.  **사전 준비:**
    *   AWS 계정 및 AWS CLI 설정 (`aws configure`)
    *   Terraform CLI 설치
    *   Node.js 및 npm 설치 (Lambda Layer 빌드용)
    *   Cognito 인프라가 이미 배포되어 있고, 해당 Terraform 상태 파일(`cognito/terraform.tfstate`)에 접근 가능해야 함.
    *   Google AI API Key (`GOOGLE_AI_API_KEY`) 준비.

2.  **환경 변수 설정:**
    *   Terraform 변수 `google_ai_api_key`에 준비된 Google AI API 키 값을 설정합니다. (예: `terraform.tfvars` 파일 생성 또는 CI/CD 환경 변수 `TF_VAR_google_ai_api_key` 설정)

3.  **저장소 클론 및 이동:**
    ```bash
    git clone <repository_url>
    cd <repository_name>/capstone-2025-04
    ```

4.  **Lambda Layer 의존성 설치:**
    Lambda Layer에 포함될 Node.js 패키지들을 지정된 디렉토리(`infrastructure/chatbot/layers/chatbot_deps/nodejs`)에 설치합니다.
    ```bash
    npm install --prefix ./infrastructure/chatbot/layers/chatbot_deps/nodejs ./backend/lambdas/chatbot-query
    ```
    *   위 명령어는 `backend/lambdas/chatbot-query/package.json`에 정의된 의존성을 `infrastructure/chatbot/layers/chatbot_deps/nodejs/node_modules` 경로 아래에 설치합니다.

5.  **Terraform 배포:**
    `infrastructure/chatbot` 디렉토리로 이동하여 Terraform 명령을 실행합니다.
    ```bash
    cd infrastructure/chatbot

    terraform init \
      -backend-config="bucket=alpaco-tfstate-bucket-kmu" \
      -backend-config="key=chatbot/terraform.tfstate" \
      -backend-config="region=ap-northeast-2" \
      -backend-config="dynamodb_table=alpaco-tfstate-lock-table"
    # 또는 backend.tf 파일이 이미 올바르게 설정되어 있으면 terraform init 만 실행

    terraform plan # (선택 사항) 변경될 내용 확인
    terraform apply # 인프라 배포
    ```
    *   `apply` 완료 후, `cloudfront_distribution_domain_name` 출력을 확인합니다.

6.  **프론트엔드 설정 업데이트:**
    *   Terraform 출력값인 `cloudfront_distribution_domain_name`을 프론트엔드 프로젝트의 환경 변수 `NEXT_PUBLIC_CHATBOT_API_ENDPOINT`에 설정합니다. (예: `https://{출력된_도메인_이름}`)

### 9. 사용 예시 (클라이언트 측 - `chatbotApi.ts` 참고)

프론트엔드의 `src/api/chatbotApi.ts` 파일에 있는 `streamChatbotResponse` 함수가 이 API를 호출하는 주요 로직을 담고 있습니다.

```typescript
// chatbotApi.ts (일부 발췌)
import { fetchAuthSession } from "aws-amplify/auth";

// ... (인터페이스 정의: ChatContext, ChatMessage, ChatStreamPayload, Callbacks)

const API_ENDPOINT = process.env.NEXT_PUBLIC_CHATBOT_API_ENDPOINT;

export const streamChatbotResponse = async (
  context: ChatContext,
  message: string,
  callbacks: { /* onData, onError, onComplete */ }
): Promise<void> => {
  const { onData, onError, onComplete } = callbacks;

  try {
    // 1. Cognito ID Token 획득
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    if (!idToken) throw new Error("User not authenticated.");

    // 2. 요청 본문 구성
    const payload = { ...context, newMessage: message };
    const payloadString = JSON.stringify(payload);

    // 3. SHA256 해시 계산 (x-amz-content-sha256 헤더용)
    const sha256Hash = await calculateSHA256(payloadString); // (calculateSHA256 함수는 crypto.subtle.digest 사용)

    // 4. Fetch API로 SSE 스트리밍 요청
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Custom-Auth-Token": `Bearer ${idToken}`,
        "x-amz-content-sha256": sha256Hash,
      },
      body: payloadString,
    });

    // ... (응답 상태 코드 및 SSE 스트림 처리 로직) ...

    // 5. SSE 스트림 파싱 및 콜백 호출
    //    reader.read() 로 데이터 수신
    //    decoder.decode() 로 텍스트 변환
    //    "data: " 로 시작하는 메시지 파싱
    //    JSON.parse() 로 객체 변환 후 onData, onError 콜백 호출
    //    스트림 종료 시 onComplete 호출

  } catch (error) {
    // ... (전체적인 에러 처리 및 onError, onComplete 콜백 호출) ...
  }
};
```

이 명세서가 ALPACO AI Chatbot API의 이해와 사용에 도움이 되기를 바랍니다.
