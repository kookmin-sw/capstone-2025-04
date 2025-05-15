# Problems API 서비스

## 1. 개요

Problems API 서비스는 DynamoDB 테이블에 저장된 코딩 문제에 대한 정보를 검색하기 위한 HTTP 엔드포인트를 제공합니다. 이 서비스를 통해 "완료된(completed)" 상태의 모든 문제 목록을 가져오고(페이지네이션 및 생성자별 필터링 옵션 포함), 특정 문제 ID를 사용하여 해당 문제의 상세 정보를 검색할 수 있습니다.

이 서비스는 AWS Lambda(컴퓨팅), API Gateway(요청 라우팅), DynamoDB(데이터 저장)를 활용하여 서버리스(Serverless) 방식으로 설계되었습니다. 인프라는 Terraform을 통해 코드로 관리됩니다.

## 2. 기능

*   **문제 목록 조회:** 페이지네이션을 지원하는 문제 목록을 검색합니다.
    *   `creatorId`를 사용한 필터링을 지원합니다.
    *   생성 날짜(`createdAt`)를 기준으로 오름차순 또는 내림차순 정렬을 지원합니다.
    *   `generationStatus = "completed"` 상태인 문제만 반환합니다.
*   **ID로 문제 조회:** 고유한 `problemId`를 사용하여 단일 문제의 전체 상세 정보를 검색합니다.
*   **CORS 지원:** 브라우저 기반 클라이언트 접근을 위한 CORS(Cross-Origin Resource Sharing) 헤더를 포함합니다.
*   **서버리스 아키텍처:** AWS 관리형 서비스를 활용하여 확장성을 확보하고 운영 오버헤드를 줄입니다.
*   **Infrastructure as Code (IaC):** 모든 AWS 리소스는 Terraform을 사용하여 코드로 정의하고 관리합니다.

## 3. API 엔드포인트

API의 기본 URL은 API Gateway 배포에 의해 결정됩니다 (예: `https://{api-id}.execute-api.{region}.amazonaws.com/{stage}`).

### 3.1. 모든 문제 조회 (Get All Problems)

문제 목록을 검색합니다. 주로 `generationStatus = "completed"` 상태인 문제를 반환합니다.

*   **메서드:** `GET`
*   **경로:** `/problems`
*   **쿼리 파라미터:**
    *   `creatorId` (선택 사항, 문자열): 문제 생성자의 ID로 문제를 필터링합니다. 이 파라미터가 제공되면 `CreatorIdCreatedAtGSI`를 사용하며, 추가적으로 `generationStatus = "completed"` 조건으로 필터링합니다.
    *   `pageSize` (선택 사항, 숫자, 기본값: `20`): 페이지당 반환할 최대 문제 수입니다.
    *   `sortOrder` (선택 사항, 문자열, 기본값: `DESC`): `createdAt` 기준 정렬 순서입니다. `ASC` 또는 `DESC` 값을 사용할 수 있습니다.
    *   `lastEvaluatedKey` (선택 사항, 문자열): 이전 응답에서 받은 `LastEvaluatedKey` 값을 URL 인코딩된 JSON 문자열 형태로 전달하며, 페이지네이션에 사용됩니다.
*   **성공 응답 (200 OK):**
    ```json
    {
      "items": [
        {
          "problemId": "uuid-problem-1",
          "title": "Problem Title 1",
          "title_translated": "번역된 문제 제목 1",
          "difficulty": "Medium",
          "algorithmType": "Dynamic Programming",
          "createdAt": "2023-10-26T10:00:00.000Z",
          "creatorId": "user-abc",
          "author": "Author Name",
          "generationStatus": "completed"
        }
        // ... 추가 문제 항목들
      ],
      "lastEvaluatedKey": "encoded_json_string_or_null", // 다음 페이지 조회를 위한 키 (없으면 null)
      "count": 20, // 현재 응답에 포함된 항목 수
      "scannedCount": 25 // 필터링 전 스캔된 항목 수 (해당되는 경우)
    }
    ```
    *   `items` 배열은 Lambda 함수 내 `ProjectionExpression`에 정의된 문제 속성들의 일부를 포함합니다.
*   **오류 응답:**
    *   `400 Bad Request`: `lastEvaluatedKey` 형식이 잘못된 경우.
    *   `500 Internal Server Error`: `PROBLEMS_TABLE_NAME` 환경 변수가 설정되지 않았거나 다른 서버 측 문제가 발생한 경우.

### 3.2. ID로 문제 조회 (Get Problem by ID)

특정 문제의 전체 상세 정보를 검색합니다.

*   **메서드:** `GET`
*   **경로:** `/problems/{problemId}`
*   **경로 파라미터:**
    *   `problemId` (필수, 문자열): 문제의 고유 식별자입니다.
*   **성공 응답 (200 OK):**
    ```json
    {
      "problemId": "uuid-problem-1",
      "userPrompt": "Generate a hard problem about graphs.",
      "difficulty": "Hard",
      "language": "python",
      "targetLanguage": "ko",
      "createdAt": "2023-10-26T10:00:00.000Z",
      "completedAt": "2023-10-26T10:05:00.000Z",
      "generationStatus": "completed",
      "errorMessage": null,
      "title": "Graph Traversal Challenge",
      "title_translated": "그래프 탐색 챌린지",
      "description": "Detailed problem description...",
      "description_translated": "상세 번역된 문제 설명...",
      "intent": "User's intent for the problem...",
      "finalTestCases": "[{\"input\": ...}, ...]",
      "validatedSolutionCode": "def solution(...): ...",
      "startCode": "def solution(...): \n  # Your code here\n  pass",
      "constraints": "Problem constraints...",
      // ... ProblemDetail 인터페이스에 정의된 다른 속성들
      "creatorId": "user-xyz",
      "author": "Author Name"
    }
    ```
*   **오류 응답:**
    *   `400 Bad Request`: `problemId`가 누락된 경우.
    *   `404 Not Found`: 주어진 `problemId`에 해당하는 문제가 없는 경우.
    *   `500 Internal Server Error`: `PROBLEMS_TABLE_NAME` 환경 변수가 설정되지 않았거나 다른 서버 측 문제가 발생한 경우.

### 3.3. CORS 프리플라이트 (CORS Preflight)

`/problems` 및 `/problems/{problemId}` 경로는 모두 CORS 프리플라이트 검사를 위해 `OPTIONS` 요청을 지원합니다. API Gateway는 이러한 요청에 대해 MOCK 통합으로 구성되어 있으며, Lambda 함수 또한 명시적으로 `OPTIONS` 요청을 처리하여 적절한 CORS 헤더를 반환합니다.

*   **메서드:** `OPTIONS`
*   **경로:** `/problems` 또는 `/problems/{problemId}`
*   **성공 응답 (200 OK):**
    *   **헤더:**
        *   `Access-Control-Allow-Origin: *` (참고: 프로덕션 환경에서는 특정 도메인으로 제한해야 합니다.)
        *   `Access-Control-Allow-Methods: GET, OPTIONS`
        *   `Access-Control-Allow-Headers: Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token`
    *   **본문:** `{"message": "CORS preflight check successful"}` (Lambda에서 처리하는 경우) 또는 비어 있음 (API Gateway MOCK 통합만 사용하는 경우)

## 4. 기술 스택

*   **AWS Lambda:** Node.js 20.x 런타임 (백엔드 로직 처리).
    *   `@aws-sdk/client-dynamodb`: DynamoDB 클라이언트를 위한 AWS SDK v3.
    *   `@aws-sdk/lib-dynamodb`: 손쉬운 JSON 처리를 위한 AWS SDK v3 DynamoDB Document Client.
*   **Amazon API Gateway:** HTTP 엔드포인트 관리, 요청 라우팅 및 CORS 처리.
*   **Amazon DynamoDB:** 문제 데이터 저장을 위한 NoSQL 데이터베이스. 테이블 자체는 `problem-generator-v3` 모듈에서 관리합니다.
*   **Terraform:** AWS 리소스 프로비저닝 및 관리를 위한 Infrastructure as Code (IaC) 도구.
*   **AWS IAM:** Lambda 및 API Gateway의 권한 및 역할 관리.
*   **AWS CloudWatch:** 로깅 및 모니터링.

## 5. 데이터 모델 (DynamoDB)

API는 DynamoDB 테이블과 상호작용합니다 (테이블 이름은 `PROBLEMS_TABLE_NAME` 환경 변수를 통해 제공됨).

*   **테이블 이름:** Terraform에서 `local.problems_table_name`으로 참조되며, 이는 `problem-generator-v3` 모듈의 원격 상태(remote state)에서 가져옵니다.
*   **기본 키 (Primary Key):**
    *   `problemId` (문자열): 파티션 키 (Partition Key).
*   **이 API에서 사용되는 글로벌 보조 인덱스 (Global Secondary Indexes, GSIs):**
    1.  **`CompletedProblemsByCreatedAtGSI`** (`getAllProblems.mjs`에 명명된 이름)
        *   목적: *완료된(completed)* 모든 문제를 생성 날짜 순으로 조회.
        *   파티션 키 (PK): `generationStatus` (문자열)
        *   정렬 키 (SK): `createdAt` (문자열, ISO 8601 형식)
        *   쿼리 로직: `generationStatus = "completed"`, `createdAt` 기준으로 정렬.
    2.  **`CreatorIdCreatedAtGSI`** (`getAllProblems.mjs`에 명명된 이름)
        *   목적: 특정 사용자가 생성한 문제를 생성 날짜 순으로 조회.
        *   파티션 키 (PK): `creatorId` (문자열)
        *   정렬 키 (SK): `createdAt` (문자열, ISO 8601 형식)
        *   쿼리 로직: `creatorId = :creatorIdVal`, `createdAt` 기준으로 정렬. 추가적으로 `generationStatus = "completed"` 조건을 만족하는 항목만 필터링합니다.
*   **주요 속성 (일부, 전체 목록은 `problemApi.ts`의 `ProblemSummary` 및 `ProblemDetail` 타입 정의 참조):**
    *   `problemId`: String (PK) - 문제의 고유 ID.
    *   `title`: String - 문제 제목.
    *   `title_translated`: String (선택 사항) - 번역된 문제 제목.
    *   `description`: String - 문제의 전체 설명.
    *   `description_translated`: String (선택 사항) - 번역된 문제 설명.
    *   `difficulty`: String - 문제 난이도 (예: "Easy", "Medium", "Hard").
    *   `algorithmType`: String (선택 사항) - 알고리즘 유형 (예: "Arrays", "Dynamic Programming").
    *   `createdAt`: String (ISO 8601 형식) - 생성 타임스탬프.
    *   `creatorId`: String (선택 사항) - 문제 생성을 요청한 사용자 ID.
    *   `author`: String (선택 사항) - 문제 출제자 (AI 모델 이름 또는 사용자).
    *   `generationStatus`: String - 문제 생성 상태 (예: "pending", "completed", "failed"). 이 API는 주로 "completed" 상태의 문제를 조회합니다.
    *   `finalTestCases`: String (JSON 배열 형식) - 문제의 테스트 케이스.
    *   `startCode`: String (선택 사항) - 사용자를 위한 기본 제공 코드.
    *   `validatedSolutionCode`: String (선택 사항) - AI가 생성한 솔루션 코드.
    *   `language`: String - 문제의 주 프로그래밍 언어 (예: "python", "javascript").

## 6. Lambda 함수

API는 `capstone-2025-04/backend/lambdas/problems-api/` 디렉토리에 정의된 두 개의 주요 Lambda 함수를 사용합니다:

1.  **`getAllProblems.mjs`**
    *   **Terraform 리소스 이름:** `aws_lambda_function.get_all_problems`
    *   **AWS에서의 함수 이름:** `${var.project_name}-getAllProblems-${var.environment}`
    *   **핸들러:** `getAllProblems.handler`
    *   **목적:** `GET /problems` 요청을 처리합니다. GSIs를 사용하여 DynamoDB에서 문제 목록을 조회합니다.
    *   **주요 환경 변수:**
        *   `PROBLEMS_TABLE_NAME`: DynamoDB 테이블 이름.
        *   `AWS_NODEJS_CONNECTION_REUSE_ENABLED=1`: SDK 연결 재사용 최적화.

2.  **`getProblemById.mjs`**
    *   **Terraform 리소스 이름:** `aws_lambda_function.get_problem_by_id`
    *   **AWS에서의 함수 이름:** `${var.project_name}-getProblemById-${var.environment}`
    *   **핸들러:** `getProblemById.handler`
    *   **목적:** `GET /problems/{problemId}` 요청을 처리합니다. 기본 키에 대해 `GetItem` 작업을 사용하여 DynamoDB에서 단일 문제를 가져옵니다.
    *   **주요 환경 변수:**
        *   `PROBLEMS_TABLE_NAME`: DynamoDB 테이블 이름.
        *   `AWS_NODEJS_CONNECTION_REUSE_ENABLED=1`: SDK 연결 재사용 최적화.

*참고: `getProblems.mjs` 파일은 Lambda 소스 디렉토리에 존재하지만, 현재 `lambdas.tf`의 Terraform 구성에 의해 배포되지 않습니다. Terraform 구성은 각 경로에 대해 `getAllProblems.mjs` 및 `getProblemById.mjs`를 배포합니다.*

## 7. 인프라 및 배포 (Terraform)

이 API의 인프라는 `capstone-2025-04/infrastructure/problems-api/` 디렉토리에 정의되어 있습니다.

### 사전 준비 사항

*   Terraform CLI (예: v1.x 버전)
*   적절한 자격 증명 및 기본 리전으로 구성된 AWS CLI.
*   Terraform 원격 상태 백엔드(S3 bucket 및 DynamoDB table) (`backend.tf` 파일에 구성됨). 이는 사전에 설정되어 있어야 합니다 (예: `backend-setup` 모듈에 의해).
*   `problem-generator-v3` Terraform 모듈이 성공적으로 적용(apply)되어 있어야 합니다. 이 API는 해당 모듈의 상태를 읽어 DynamoDB 테이블 이름과 ARN을 가져옵니다.

### 배포 단계

1.  Terraform 모듈 디렉토리로 이동합니다:
    ```bash
    cd capstone-2025-04/infrastructure/problems-api
    ```

2.  Terraform을 초기화합니다:
    ```bash
    terraform init
    ```

3.  (선택 사항) 실행 계획을 검토합니다:
    ```bash
    terraform plan -var-file="dev.tfvars" # 또는 해당 환경의 .tfvars 파일
    ```
    *`aws_region`, `project_name`, `environment`와 같은 변수를 위해 `.tfvars` 파일을 생성하거나 기본값을 사용할 수 있습니다.*

4.  Terraform 구성을 적용합니다:
    ```bash
    terraform apply -var-file="dev.tfvars" # 또는 해당 환경의 .tfvars 파일
    ```
    프롬프트가 나타나면 `yes`를 입력하여 확인합니다.

### 주요 Terraform 파일

*   `apigateway.tf`: API Gateway REST API, 리소스, 메서드, 통합 및 배포를 정의합니다.
*   `lambdas.tf`: AWS Lambda 함수를 정의하며, 소스 코드 패키징(`data "archive_file"`)을 포함합니다.
*   `iam.tf`: Lambda 실행 및 API Gateway 로깅을 위한 IAM 역할 및 정책을 정의합니다.
*   `dynamodb.tf`: `problem-generator-v3` 모듈에서 DynamoDB 테이블 세부 정보를 가져오기 위한 `terraform_remote_state` 데이터 소스를 정의합니다. 새로운 테이블을 생성하지는 *않습니다*.
*   `variables.tf`: 모듈의 입력 변수 (예: `aws_region`, `project_name`, `environment`).
*   `outputs.tf`: 배포 후 생성되는 출력 값 (예: `problems_api_invoke_url`).
*   `providers.tf`: AWS 공급자 구성을 지정합니다.
*   `backend.tf`: Terraform S3 원격 상태 백엔드를 구성합니다.

### Lambda 코드 패키징

`lambdas.tf` 파일은 `data "archive_file"` 블록을 사용하여 개별 `.mjs` 파일을 `lambda_zips` 하위 디렉토리(`lambdas.tf` 파일 기준 상대 경로) 내의 `.zip` 아카이브(예: `getAllProblems.zip`, `getProblemById.zip`)로 패키징합니다. 이 작업은 `terraform plan/apply` 단계에서 수행됩니다. 이렇게 생성된 zip 파일들은 Lambda 함수에 업로드됩니다.

## 8. 환경 변수 (Lambda)

*   `PROBLEMS_TABLE_NAME`: (필수) 문제 데이터를 저장하는 DynamoDB 테이블의 이름입니다. 이 값은 Terraform (`local.problems_table_name`)으로부터 전달됩니다.
*   `AWS_NODEJS_CONNECTION_REUSE_ENABLED`: AWS SDK의 TCP 연결 재사용을 활성화하여 성능을 향상시키기 위해 `1`로 설정됩니다.

## 9. CORS 구성

CORS는 다음 두 가지 수준에서 처리됩니다:

1.  **API Gateway:** `/problems` 및 `/problems/{problemId}` 리소스에 대해 `OPTIONS` 메서드가 MOCK 통합으로 정의되어 있습니다. 이러한 통합은 필요한 `Access-Control-Allow-*` 헤더를 반환합니다.
2.  **Lambda 함수:** 각 Lambda 핸들러는 명시적으로 `event.httpMethod === "OPTIONS"`를 확인하고 CORS 헤더와 함께 200 응답을 반환합니다. 이는 API Gateway MOCK 통합이 `OPTIONS`에 사용되지 않는 경우 대체 메커니즘으로 작동하거나 주요 메커니즘이 될 수 있습니다.

`Access-Control-Allow-Origin` 헤더는 현재 `*` (모든 오리진 허용)로 설정되어 있습니다. **프로덕션 환경에서는 이 값을 프론트엔드 애플리케이션의 특정 도메인으로 제한해야 합니다.**

## 10. 오류 처리

*   Lambda 함수는 적절한 HTTP 상태 코드와 함께 JSON 형식의 응답을 반환합니다.
*   일반적인 오류 응답은 다음과 같습니다:
    *   `400 Bad Request`: 잘못된 입력 값 (예: 형식이 잘못된 `lastEvaluatedKey`).
    *   `404 Not Found`: 특정 리소스 (예: ID로 조회한 문제)를 찾을 수 없는 경우.
    *   `500 Internal Server Error`: 서버 측 구성 문제 (예: `PROBLEMS_TABLE_NAME` 누락) 또는 DynamoDB 작업 중 예기치 않은 오류 발생 시. 오류 세부 정보는 CloudWatch Logs에 기록됩니다.
*   프론트엔드 `problemApi.ts` 파일에는 이러한 응답을 처리하기 위한 `ApiError` 클래스와 `handleApiResponse` 함수가 포함되어 있습니다.
