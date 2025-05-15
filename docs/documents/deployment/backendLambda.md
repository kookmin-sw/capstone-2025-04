# ALPACO 프로젝트: 마이크로서비스 아키텍처(MSA) Lambda 개발 가이드

## 1. 서론

본 문서는 ALPACO 프로젝트의 백엔드 시스템을 구성하는 AWS Lambda 함수들을 마이크로서비스 아키텍처(MSA) 관점에서 개발, 배포 및 통합하는 방법에 대한 포괄적인 기술 가이드입니다. ALPACO는 여러 독립적인 Lambda 함수들을 조합하여 특정 비즈니스 기능을 수행하는 MSA 원칙을 따릅니다.

이 가이드는 개발자가 각 Lambda 서비스의 역할, 다른 서비스와의 상호작용, 데이터 관리, 배포 전략, 그리고 MSA 환경에서의 모범 사례를 이해하는 데 도움을 주는 것을 목표로 합니다. 제공된 `chatbot-query`, `code-executor`, `code-grader`, `community-lambda-functions`, `problem-generator-v3`, `problems-api`, `submissions-api` 등의 Lambda 함수들과 관련 인프라 문서를 주요 참고 자료로 활용합니다.

## 2. MSA 및 Lambda 기본 원칙

ALPACO 프로젝트는 다음과 같은 MSA 원칙을 Lambda 함수 설계에 적용합니다:

*   **단일 책임 원칙 (Single Responsibility Principle):** 각 Lambda 함수는 특정 비즈니스 기능 또는 도메인에 집중합니다. (예: `code-executor`는 코드 실행만 담당, `chatbot-query`는 챗봇 로직만 담당).
*   **독립적인 배포:** 각 Lambda 서비스는 다른 서비스에 미치는 영향을 최소화하면서 독립적으로 배포 및 업데이트될 수 있습니다 (Terraform 모듈로 관리).
*   **분산된 데이터 관리:** 각 서비스는 자체 데이터 저장소(주로 DynamoDB 테이블)를 소유하거나, 명확하게 정의된 인터페이스를 통해 다른 서비스의 데이터에 접근합니다. (예: `Community` 테이블, `Problems` 테이블, `Submissions` 테이블).
*   **기술 다양성 (Polyglot Persistence & Programming):** MSA는 서비스별로 최적의 기술 스택을 선택할 수 있게 해줍니다. ALPACO는 주로 Node.js를 Lambda 런타임으로 사용하지만, `code-executor`는 Python을 사용합니다.
*   **탄력성 및 확장성:** AWS Lambda의 서버리스 특성은 트래픽에 따라 자동으로 확장/축소되어 높은 가용성과 비용 효율성을 제공합니다.
*   **API 기반 통신:** 서비스 간 상호작용은 잘 정의된 API(주로 API Gateway 또는 Lambda 직접 호출)를 통해 이루어집니다.

## 3. ALPACO Lambda 함수 개발 패턴

### 3.1. 공통 구조

대부분의 ALPACO Node.js Lambda 함수는 다음과 같은 일반적인 구조를 따릅니다:

```javascript
// 예시: backend/lambdas/chatbot-query/index.mjs
import { /* 필요한 AWS SDK 클라이언트, 라이브러리 */ } from "...";

// 전역 범위에서 클라이언트 초기화 (연결 재사용)
// const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event, context) => {
  // 1. CORS 및 사전 요청(Preflight) 처리 (API Gateway Lambda Proxy 통합 시)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: { /* CORS 헤더 */ },
      body: JSON.stringify({ message: "CORS preflight check successful" }),
    };
  }

  try {
    // 2. 입력 파싱 및 유효성 검사
    //  - event.body (API Gateway), event (직접 호출)
    //  - event.pathParameters, event.queryStringParameters
    //  - event.requestContext.authorizer.claims (Cognito 인증 정보)
    const requestBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    // ... 유효성 검사 로직 ...

    // 3. 인증 및 권한 부여 (필요시)
    //  - JWT 토큰 검증 (예: chatbot-query, code-grader)
    //  - IAM 역할 기반 권한 (Lambda 실행 역할)

    // 4. 핵심 비즈니스 로직 수행
    //  - 외부 서비스 호출 (예: Google Gemini API, 다른 Lambda 함수)
    //  - 데이터베이스 작업 (DynamoDB CRUD)
    //  - 계산 및 데이터 변환

    // 5. 응답 생성
    const responseBody = { /* 결과 데이터 */ };
    return {
      statusCode: 200, // 또는 201, 204 등
      headers: {
        "Content-Type": "application/json",
        /* CORS 헤더 */
      },
      body: JSON.stringify(responseBody),
    };

  } catch (error) {
    console.error("Error processing request:", error);
    // 6. 오류 처리 및 응답
    return {
      statusCode: error.statusCode || 500,
      headers: {
        "Content-Type": "application/json",
        /* CORS 헤더 */
      },
      body: JSON.stringify({
        message: error.message || "Internal server error",
        details: error.details, // 추가 오류 정보 (선택 사항)
      }),
    };
  }
};

// 스트리밍 응답의 경우 (예: chatbot-query, problem-generator-v3)
// export const handler = awslambda.streamifyResponse(async (event, responseStream, context) => {
//   // ... 유사한 구조, responseStream.write() 및 responseStream.end() 사용
// });
```

### 3.2. 입력 처리 및 유효성 검사

*   **API Gateway 프록시 통합:** `event.httpMethod`, `event.pathParameters`, `event.queryStringParameters`, `event.body`(JSON 문자열)를 사용합니다. `event.body`는 `JSON.parse()`가 필요합니다.
*   **직접 Lambda 호출:** `event` 객체가 직접 입력 페이로드입니다. (예: `code-grader`가 `code-executor` 호출 시).
*   **인증 정보:** Cognito와 통합된 API Gateway를 사용하는 경우, `event.requestContext.authorizer.claims`에서 사용자 클레임(예: `sub` (사용자 ID), `cognito:username`)을 가져옵니다.
*   **유효성 검사:** 필수 필드 누락, 데이터 타입 불일치 등을 초기에 확인하여 오류를 조기에 반환합니다. (Zod와 같은 라이브러리 사용 가능, 현재는 수동 검사 위주).

### 3.3. 설정 및 환경 변수

*   Lambda 함수 설정(예: 데이터베이스 테이블 이름, 외부 API 키, 다른 서비스 ARN)은 환경 변수를 통해 주입됩니다.
*   Terraform (`*.tf` 파일의 `environment` 블록)을 사용하여 환경 변수를 설정합니다. (예: `PROBLEMS_TABLE_NAME`, `GOOGLE_AI_API_KEY`, `CODE_EXECUTOR_LAMBDA_ARN`).
*   `backend/lambdas/*/src/utils/constants.mjs`와 같은 유틸리티 파일에서 환경 변수를 읽어 애플리케이션 전체에서 일관되게 사용합니다.

### 3.4. 인증 및 권한 부여

*   **Cognito JWT 인증 (API Gateway):**
    *   API Gateway 엔드포인트는 Cognito 사용자 풀 권한 부여자로 보호됩니다.
    *   클라이언트는 `Authorization: Bearer <ID_TOKEN>` 헤더를 전송합니다.
    *   `chatbot-query`, `code-grader`, 커뮤니티 API 등은 내부적으로 JWT를 검증하거나(예: `chatbot-query`의 `validateJwt` 함수) API Gateway 권한 부여자에 의존하여 사용자 정보를 `event.requestContext.authorizer.claims`로 받습니다.
*   **IAM 역할 및 정책:**
    *   각 Lambda 함수는 최소 권한 원칙을 따르는 IAM 실행 역할을 가집니다.
    *   이 역할은 필요한 AWS 서비스(DynamoDB, 다른 Lambda 호출, CloudWatch Logs 등)에 대한 접근 권한을 부여합니다. (예: `infrastructure/api/iam.tf`).
*   **Lambda 함수 URL 인증:**
    *   `chatbot-query` 및 `problem-generator-v3`는 `AWS_IAM` 인증을 사용하는 Lambda 함수 URL을 통해 노출됩니다.
    *   CloudFront는 OAC(Origin Access Control)를 사용하여 이러한 함수 URL을 안전하게 호출하며, SigV4 서명을 통해 인증합니다.

### 3.5. 오류 처리

*   `try...catch` 블록을 사용하여 예상되는 오류와 예기치 않은 오류를 모두 처리합니다.
*   일관된 오류 응답 형식을 사용합니다 (예: `statusCode`, `{ message, details }` 본문).
*   `console.error`를 사용하여 CloudWatch Logs에 상세한 오류 정보를 기록합니다.
*   스트리밍 응답의 경우, 오류도 SSE 스트림을 통해 전달될 수 있습니다. (예: `chatbot-query`의 `responseStream.write(JSON.stringify({ error: ..., details: ... }))`).

### 3.6. 로깅 및 모니터링

*   `console.log`, `console.info`, `console.warn`, `console.error`를 사용하여 CloudWatch Logs에 로그를 기록합니다.
*   `GENERATOR_VERBOSE` (`problem-generator-v3`)와 같은 환경 변수를 사용하여 로그 상세 수준을 제어할 수 있습니다.
*   CloudWatch Logs는 디버깅, 성능 분석, 오류 추적에 필수적입니다.

### 3.7. 의존성 관리 및 Lambda Layers

*   **Node.js 프로젝트:** 각 Lambda 함수 또는 관련 서비스 그룹은 자체 `package.json`을 가질 수 있습니다. (예: `backend/lambdas/chatbot-query/package.json`).
*   **Lambda Layers:** 여러 Lambda 함수에서 공유되는 공통 의존성(예: AWS SDK, LangChain 라이브러리, `uuid`, `jose`)을 Lambda Layer로 패키징합니다.
    *   `infrastructure/api/layers/common-deps/`: 커뮤니티 API용 간단한 `uuid` 레이어.
    *   `infrastructure/chatbot/layers/chatbot_deps/`: 챗봇용 `@langchain/google-genai`, `jose` 등.
    *   `infrastructure/problem-generator-v3/layers/`: Docker 기반 빌드를 사용하는 더 복잡한 레이어.
    *   Terraform (`layer.tf` 또는 `lambda.tf` 내)에서 `aws_lambda_layer_version` 리소스로 정의됩니다.
    *   레이어 빌드 프로세스는 로컬 `npm install` 또는 Docker 빌드 스크립트(`build-layer.sh`)를 통해 관리됩니다.

## 4. 서비스 간 통신

ALPACO 프로젝트의 Lambda 기반 마이크로서비스는 다음과 같은 방식으로 상호작용합니다:

### 4.1. API Gateway를 통한 동기식 호출

*   **패턴:** 클라이언트 (또는 다른 서비스) -> API Gateway -> Lambda 함수
*   **예시:**
    *   프론트엔드가 `submissions-api`를 호출하여 제출 목록을 가져옵니다.
    *   프론트엔드가 `code-grader` API를 호출하여 코드 채점을 요청합니다.
    *   `problem-generator-v3` 서비스 (백엔드)가 `code-execution-service` API Gateway를 호출하여 생성된 코드 조각을 검증할 수 있습니다 (현재 구현은 Lambda 직접 호출).
*   **특징:** 요청-응답 모델, HTTP 기반, API Gateway가 인증, 속도 제한, 로깅, CORS 등을 처리.

### 4.2. Lambda 직접 동기식 호출

*   **패턴:** Lambda A -> AWS SDK -> Lambda B (동기식 호출, Lambda A는 Lambda B의 응답을 기다림)
*   **예시:**
    *   `code-grader` Lambda가 각 테스트 케이스에 대해 `code-executor` Lambda를 동기적으로 호출합니다. `code-grader`는 `code-executor`의 실행 결과를 기다린 후 다음 단계를 진행합니다.
    *   `problem-generator-v3` Lambda가 생성된 솔루션 코드 검증을 위해 `code-executor` Lambda를 호출합니다.
*   **특징:** 서비스 간 낮은 지연 시간. 호출하는 Lambda는 호출되는 Lambda의 응답 형식과 오류 처리에 대해 알고 있어야 합니다. IAM 권한으로 호출을 제어합니다.

### 4.3. CloudFront + Lambda 함수 URL (SSE 스트리밍)

*   **패턴:** 클라이언트 -> CloudFront -> Lambda 함수 URL -> Lambda (스트리밍 응답)
*   **예시:**
    *   `chatbot-query`: 챗봇 응답을 SSE를 통해 클라이언트로 스트리밍합니다.
    *   `problem-generator-v3`: 문제 생성 진행 상황과 최종 결과를 SSE를 통해 클라이언트로 스트리밍합니다.
*   **특징:** 실시간 업데이트, 장기 실행 작업에 적합. CloudFront OAC를 사용하여 Lambda 함수 URL을 보호합니다.

## 5. 데이터 관리

*   **DynamoDB:** 주요 데이터 저장소로 사용됩니다.
    *   `alpaco-Community-production`: 커뮤니티 게시물, 댓글, 좋아요. (`infrastructure/api/dynamodb.tf`)
    *   `alpaco-Problems-production` 또는 `alpaco-Problems-v3-production`: 생성된 문제, 테스트 케이스, 솔루션 등. (`infrastructure/problem-generator-v3/dynamodb.tf`)
    *   `problem-submissions`: 코드 제출 결과. (`infrastructure/code-execution-service/dynamodb.tf`)
*   **데이터 격리:** 각 주요 서비스 도메인(커뮤니티, 문제, 제출)은 자체 DynamoDB 테이블을 갖는 경향이 있습니다. 이는 MSA의 "서비스당 데이터베이스" 패턴과 유사합니다.
*   **글로벌 보조 인덱스 (GSI):** 다양한 쿼리 패턴을 효율적으로 지원하기 위해 광범위하게 사용됩니다. (예: `getAllPosts`의 `CompletedProblemsByCreatedAtGSI`, `getSubmission`의 다양한 GSI).
*   **데이터 일관성:**
    *   **원자적 카운터 (Atomic Counters):** DynamoDB의 원자적 카운터를 사용하여 `likesCount`, `commentCount`와 같은 속성을 업데이트합니다.
    *   **트랜잭션:** `community-lambda-functions/comment/createComment_modified.mjs` 및 `deleteComment_modified.mjs`는 `TransactWriteCommand`를 사용하여 댓글을 추가/삭제하고 게시물의 `commentCount`를 원자적으로 업데이트하여 데이터 일관성을 보장합니다.
*   **프로젝션 표현식:** Lambda 함수는 필요한 속성만 읽도록 DynamoDB 쿼리에 프로젝션 표현식을 사용하여 읽기 성능을 최적화하고 비용을 절감합니다.

## 6. 배포 (Terraform을 사용한 IaC)

ALPACO의 모든 AWS 리소스(Lambda, API Gateway, DynamoDB, IAM 역할, CloudFront 등)는 Terraform을 사용하여 코드로 관리됩니다.

*   **모듈식 구조:** Terraform 코드는 서비스별 디렉터리(`infrastructure/api`, `infrastructure/chatbot` 등)로 구성되어 각 마이크로서비스를 독립적으로 또는 함께 배포할 수 있습니다.
*   **원격 상태:** Terraform 상태는 S3 버킷(`alpaco-tfstate-bucket-kmu`)에 중앙에서 관리되며, DynamoDB 테이블(`alpaco-tfstate-lock-table`)을 사용하여 상태 잠금을 처리합니다. (`infrastructure/backend-setup/` 모듈에서 설정).
*   **`terraform_remote_state`:** 한 모듈이 다른 모듈의 출력(예: Cognito 사용자 풀 ARN, DynamoDB 테이블 이름)에 의존하는 경우 `data "terraform_remote_state"`를 사용합니다. (예: `code-execution-service`가 `problem-generator-v3`의 `problems_table_arn`을 참조).
*   **변수 및 출력:** 각 Terraform 모듈은 `variables.tf`를 사용하여 입력을 받고 `outputs.tf`를 통해 중요한 리소스 식별자를 노출합니다.
*   **CI/CD:** GitHub Actions를 사용하여 코드 변경 시 Terraform 구성을 자동으로 계획하고 적용합니다. OIDC를 사용하여 AWS에 안전하게 인증합니다.
    *   Lambda 레이어 빌드 단계는 CI/CD 파이프라인에 통합되어 `terraform apply` 전에 실행됩니다.
*   **배포 순서:** 모듈 간 의존성으로 인해 특정 배포 순서가 필요할 수 있습니다. ([InfrastructureAsCode.md](./InfrastructureAsCode.md)의 "전체 배포 전략 및 순서" 참조). 특히 `problem-generator-v3`와 `code-execution-service` 간의 순환 의존성은 다단계 배포로 해결됩니다.

## 7. 로컬 개발 및 테스트

*   **Lambda 개별 테스트:**
    *   `chatbot-query/howto.md`: AWS CLI를 사용하여 `chatbot-query` Lambda를 수동으로 호출하고 테스트하는 방법을 설명합니다.
    *   `problem-generator-v3/local-test.mjs`: `problem-generator-v3` 파이프라인을 로컬에서 시뮬레이션하고 테스트합니다. DynamoDB 모킹을 지원하며, `.env` 파일을 통해 환경 변수를 설정합니다.
*   **모킹:**
    *   `problem-generator-v3`의 `local-test.mjs`는 `mock-dynamodb.mjs`를 사용하여 DynamoDB 작업을 모킹할 수 있습니다.
    *   외부 API 호출(예: Google Gemini)은 일반적으로 로컬 테스트 중 실제 호출되거나, 필요시 모킹 라이브러리(예: `sinon`, `jest.mock`)를 사용하여 모킹될 수 있습니다.
    *   현재 `codeExecutor.mjs`의 Python 코드 실행은 로컬 테스트 중에도 배포된 실제 Code Executor Lambda를 호출합니다. 완전한 오프라인 테스트를 위해서는 이 부분에 대한 모킹 또는 로컬 Python 실행기 구현이 필요합니다.
*   **단위 테스트:** 각 Lambda 함수의 핵심 로직에 대해 Jest, Mocha 등의 프레임워크를 사용한 단위 테스트를 작성하는 것이 좋습니다 (현재 코드베이스에는 명시적인 단위 테스트 프레임워크 사용이 두드러지지 않음).
*   **통합 테스트:** 배포된 환경에서 서비스 간 상호작용을 테스트합니다 (예: API Gateway 엔드포인트 호출).

## 8. ALPACO Lambda 서비스 예시 및 MSA 패턴 적용

### 8.1. `code-grader` 및 `code-executor` (오케스트레이션 및 작업자 패턴)

*   `code-grader`는 채점 요청을 받는 오케스트레이터 역할을 합니다.
*   `code-executor`는 특정 작업(코드 실행)을 수행하는 작업자 역할을 합니다.
*   이 둘은 Lambda 직접 동기식 호출을 통해 통신합니다.
*   이는 MSA에서 복잡한 작업을 더 작고 관리하기 쉬운 단위로 나누는 일반적인 패턴입니다.

### 8.2. `chatbot-query` 및 `problem-generator-v3` (외부 API 통합 및 스트리밍)

*   두 서비스 모두 외부 LLM(Google Gemini)과 상호작용합니다.
*   API 키와 같은 민감한 정보는 환경 변수를 통해 안전하게 관리됩니다.
*   응답을 SSE 스트림으로 클라이언트에 전송하여 사용자 경험을 향상시킵니다.
*   `chatbot-query`는 JWT 인증을 직접 처리하여 보안 계층을 추가합니다.

### 8.3. 커뮤니티 API (CRUD 및 데이터 중심 서비스)

*   `createPost`, `getPost`, `updatePost`, `deletePost`, `likePost`, `createComment` 등은 특정 데이터 엔티티(게시물, 댓글)에 대한 CRUDL(Create, Read, Update, Delete, Like) 작업을 제공합니다.
*   단일 DynamoDB 테이블과 여러 GSI를 사용하여 다양한 접근 패턴을 지원합니다.
*   트랜잭션을 사용하여 `commentCount`와 같은 파생 데이터를 일관되게 유지합니다.

### 8.4. `problems-api` 및 `submissions-api` (읽기 전용 데이터 API)

*   주로 데이터를 조회하고 필터링하는 간단한 API입니다.
*   다른 서비스(`problem-generator-v3`, `code-execution-service`)에 의해 채워진 DynamoDB 테이블에서 데이터를 읽습니다.
*   페이지네이션 및 정렬을 효율적으로 처리하기 위해 GSI를 활용합니다.

## 9. 결론 및 모범 사례 요약

ALPACO 프로젝트는 AWS Lambda를 활용하여 마이크로서비스 아키텍처를 효과적으로 구현합니다. MSA 환경에서 Lambda를 개발할 때 다음 모범 사례를 고려하십시오:

*   **단일 책임:** Lambda 함수를 작고 특정 기능에 집중하도록 유지합니다.
*   **상태 비저장(Stateless):** Lambda 함수는 가능한 상태를 저장하지 않도록 설계합니다. 필요한 상태는 DynamoDB와 같은 외부 저장소에 보관합니다.
*   **환경 변수 활용:** 설정을 코드에서 분리합니다.
*   **IAM 최소 권한:** 각 Lambda에 필요한 최소한의 권한만 부여합니다.
*   **코드 재사용 (Layers):** 공통 로직 및 의존성은 Lambda Layer를 통해 공유합니다.
*   **오류 처리 및 재시도:** 견고한 오류 처리 메커니즘과 적절한 재시도 로직(예: `problem-generator-v3` 파이프라인)을 구현합니다.
*   **로깅 및 모니터링:** 포괄적인 로깅을 활성화하고 CloudWatch를 사용하여 성능과 오류를 모니터링합니다.
*   **IaC (Terraform):** 인프라를 코드로 관리하여 일관성, 반복성 및 버전 관리를 보장합니다.
*   **API 버전 관리:** API 변경 시 하위 호환성을 유지하거나 API Gateway를 통해 버전 관리를 구현합니다.
*   **테스트:** 단위 테스트, 통합 테스트, 종단 간 테스트를 철저히 수행합니다.

이 가이드가 ALPACO 프로젝트의 Lambda 기반 마이크로서비스를 이해하고 개발하는 데 유용한 자료가 되기를 바랍니다.
