# Submissions API & 프론트엔드 연동 (capstone-2025-04)

## 1. 개요

이 모듈은 프로그래밍 경진대회 제출(Submission) 데이터를 조회하는 백엔드 서비스인 "Submissions API"를 구현합니다. 프론트엔드 애플리케이션이 이 API를 통해 제출 목록을 표시하고, 필터링하며, 개별 제출의 상세 정보를 볼 수 있도록 설계되었습니다.

API는 AWS API Gateway와 AWS Lambda를 사용하여 구축되었으며, 제출 기록을 저장하는 DynamoDB 테이블(이는 `code-execution-service` 모듈에서 관리)과 상호 작용합니다. 프론트엔드 연동은 이 API를 사용하는 Next.js/React 페이지를 통해 시연됩니다.

## 2. 주요 기능

*   **제출 목록 조회:** 모든 제출 또는 다양한 기준으로 필터링된 제출 목록을 페이지네이션(pagination)하여 가져옵니다.
*   **제출 필터링:**
    *   `userId` (제출한 사용자의 ID) 기준
    *   `problemId` (시도한 문제의 ID) 기준
    *   `author` (제출자의 닉네임/사용자명) 기준
    *   `problemTitleTranslated` (번역된 문제 제목에 대한 부분 또는 전체 일치) 기준
    *   `userId`와 `problemId` 조합
    *   `author`와 `problemId` 조합
*   **제출 정렬:** `submissionTime` 기준으로 오름차순(`ASC`) 또는 내림차순(`DESC`) 정렬합니다.
*   **페이지네이션:** 효율적인 데이터 로딩을 위해 `pageSize`와 `lastEvaluatedKey`를 지원합니다.
*   **특정 제출 조회:** `submissionId`를 사용하여 단일 제출의 전체 상세 정보(사용자 코드 `userCode` 포함)를 가져옵니다.
*   **CORS 지원:** API Gateway 수준에서 설정하고, 사전 요청(preflight request)을 위해 Lambda에서도 강화합니다.
*   **로깅:** API Gateway 접근 로그 및 Lambda 실행 로그는 CloudWatch Logs로 전송됩니다.
*   **코드형 인프라 (Infrastructure as Code):** 모든 AWS 리소스는 Terraform을 사용하여 프로비저닝됩니다.

## 3. 아키텍처

시스템은 서버리스 아키텍처를 따릅니다:

1.  **프론트엔드 (Next.js/React):** 사용자는 `/submissions` 페이지와 상호작용합니다.
2.  **API 클라이언트 (`submissionApi.ts`):** Submissions API로 HTTP GET 요청을 보냅니다.
3.  **AWS API Gateway (`submissions_api`):**
    *   `/submissions` 리소스에 `GET` 및 `OPTIONS` 메서드를 노출합니다.
    *   `GET` 요청을 `get_submission` Lambda 함수로 라우팅합니다 (AWS_PROXY 통합).
    *   CORS 사전 요청을 위해 MOCK 통합으로 `OPTIONS` 요청을 처리합니다.
4.  **AWS Lambda (`get_submission`):**
    *   Node.js 20.x 버전의 함수입니다.
    *   API Gateway 이벤트에서 쿼리 문자열 파라미터를 파싱합니다.
    *   `submissionId`가 있으면 DynamoDB 테이블에 대해 `GetItem` 작업을 수행합니다.
    *   그렇지 않으면, 필터에 따라 적절한 글로벌 보조 인덱스(GSI)를 활용하여 DynamoDB 테이블에 `Query` 작업을 구성하고 실행합니다.
    *   제출 데이터(또는 오류)를 API Gateway로 반환합니다.
5.  **AWS DynamoDB (`code-execution-service`에서 관리):**
    *   `Submissions` 테이블은 모든 제출 기록을 저장합니다.
    *   Lambda에서 사용되는 GSI:
        *   `ProblemIdSubmissionTimeIndex` (problemId-submissionTime)
        *   `UserIdSubmissionTimeIndex` (userId-submissionTime)
        *   `AllSubmissionsByTimeIndex` (is_submission-submissionTime, "모든 제출"용)
        *   `AuthorSubmissionTimeIndex` (author-submissionTime)
6.  **AWS IAM:** Lambda가 DynamoDB에 접근하고 API Gateway가 로그를 작성하는 데 필요한 권한을 제공합니다.
7.  **AWS CloudWatch Logs:** 모니터링 및 디버깅을 위해 API Gateway 및 Lambda의 로그를 저장합니다.

## 4. 기술 스택

*   **백엔드:**
    *   AWS API Gateway (Regional Endpoint)
    *   AWS Lambda (Node.js 20.x, arm64 아키텍처)
    *   AWS DynamoDB (AWS SDK v3 for JavaScript를 통해 접근)
    *   AWS IAM
    *   AWS CloudWatch Logs
*   **코드형 인프라:**
    *   Terraform (~> 5.0)
*   **프론트엔드 클라이언트 (`submissionApi.ts`):**
    *   TypeScript
    *   Fetch API
*   **프론트엔드 UI (`submissions/page.tsx`):**
    *   Next.js 13+ (App Router)
    *   React
    *   TypeScript
    *   Tailwind CSS (클래스명으로 유추)
    *   `date-fns` (날짜 포맷팅)
    *   `sonner` (토스트 알림)

## 5. API 엔드포인트 상세 정보

모든 엔드포인트는 API Gateway 스테이지 호출 URL을 기준으로 합니다 (예: `https://{api_id}.execute-api.{region}.amazonaws.com/{stage_name}`).

### 5.1. 제출 조회 (목록 또는 특정 건)

*   **경로:** `/submissions`
*   **메서드:** `GET`
*   **설명:** 쿼리 파라미터에 따라 제출 목록을 가져오거나, `submissionId`가 제공된 경우 단일 제출을 가져옵니다.
*   **쿼리 파라미터:**
    *   `submissionId` (문자열, 선택 사항): 제공된 경우, ID로 특정 제출을 가져옵니다. 다른 필터는 무시됩니다.
    *   `userId` (문자열, 선택 사항): 사용자의 고유 식별자로 필터링합니다.
    *   `problemId` (문자열, 선택 사항): 문제의 고유 식별자로 필터링합니다.
    *   `author` (문자열, 선택 사항): 작성자의 닉네임으로 필터링합니다.
    *   `problemTitleTranslated` (문자열, 선택 사항): 번역된 문제 제목에 대한 대소문자 구분 부분 문자열 일치로 필터링합니다.
    *   `pageSize` (숫자, 선택 사항, 기본값: 20): 페이지당 반환할 항목 수입니다.
    *   `lastEvaluatedKey` (문자열, 선택 사항): 다음 페이지를 가져오기 위한 이전 응답의 `lastEvaluatedKey`입니다. URL 인코딩된 JSON 문자열입니다.
    *   `sortOrder` (문자열, 선택 사항, 기본값: "DESC"): `submissionTime`에 대한 정렬 순서입니다. "ASC" 또는 "DESC"를 허용합니다.
*   **인증:** `NONE` (공개적으로 접근 가능, `apigateway.tf`에서 `AWS_IAM` 또는 Cognito로 변경 가능)
*   **성공 응답 (200 OK):**
    ```json
    // 목록 쿼리의 경우
    {
      "items": [
        {
          "submissionId": "unique-submission-id-1",
          "problemId": "problem-abc-123",
          "problemTitle": "Original Problem Title", // 항상 존재하지 않을 수 있음
          "problemTitleTranslated": "번역된 문제 제목",
          "userId": "user-xyz-789",
          "author": "AlpacoCoder",
          "status": "ACCEPTED", // 또는 WRONG_ANSWER, TIME_LIMIT_EXCEEDED 등
          "submissionTime": "2023-10-27T10:30:00.123Z", // ISO 8601 문자열 (DynamoDB 정렬 키)
          "executionTime": 0.123, // 초
          "language": "python",
          "errorMessage": null // 또는 상태가 오류인 경우 오류 세부 정보
          // submissionId로 조회 시 userCode도 여기에 포함될 수 있음 (프로젝션/가져오기 된 경우)
        }
        // ... 더 많은 항목들
      ],
      "lastEvaluatedKey": "URL_ENCODED_JSON_STRING_OR_NULL",
      "count": 1, // 이 응답의 항목 수
      "scannedCount": 1 // DynamoDB에서 스캔한 항목 수 (필터 효율성과 관련됨)
    }

    // 특정 submissionId 쿼리의 경우 (Lambda에서 동일한 구조로 래핑됨)
    {
      "items": [
        {
          "submissionId": "specific-submission-id",
          "problemId": "problem-def-456",
          "problemTitleTranslated": "특정 문제 제목",
          "userId": "user-abc-123",
          "author": "TestUser",
          "status": "RUNTIME_ERROR",
          "submissionTime": "2023-10-28T12:00:00.000Z",
          "executionTime": 0.050,
          "language": "javascript",
          "userCode": "console.log('hello world'); // 실제 사용자 코드",
          "errorMessage": "TypeError: undefined is not a function"
        }
      ],
      "lastEvaluatedKey": null,
      "count": 1,
      "scannedCount": 1
    }
    ```
*   **오류 응답:**
    *   `400 Bad Request`: 잘못된 `lastEvaluatedKey` 형식입니다.
    *   `404 Not Found`: `submissionId`가 제공되었지만 제출을 찾을 수 없는 경우입니다.
    *   `500 Internal Server Error`: 서버 측 오류 (예: Lambda 구성 오류, DynamoDB 접근 문제).

### 5.2. CORS 사전 요청 (Preflight)

*   **경로:** `/submissions`
*   **메서드:** `OPTIONS`
*   **설명:** 브라우저로부터의 CORS 사전 요청을 처리합니다.
*   **응답 (200 OK):**
    *   다음 헤더를 포함합니다:
        *   `Access-Control-Allow-Origin: '*'` (설정 가능)
        *   `Access-Control-Allow-Methods: 'GET,OPTIONS'`
        *   `Access-Control-Allow-Headers: 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'`

## 6. Lambda 함수 (`getSubmission.mjs`)

위치: `capstone-2025-04/backend/lambdas/submissions-api/getSubmission.mjs`

*   **목적:**
    *   API Gateway 프록시 통합 이벤트를 처리합니다.
    *   CORS를 위해 `OPTIONS` 요청에 응답합니다.
    *   쿼리 문자열 파라미터를 파싱합니다.
    *   DynamoDB에서 데이터를 가져옵니다:
        *   `submissionId`가 있으면 `GetItemCommand`를 사용합니다.
        *   목록/필터링된 요청의 경우 적절한 GSI와 `KeyConditionExpression`/`FilterExpression`을 사용하여 `QueryCommand`를 사용합니다.
    *   API Gateway를 위한 응답 형식을 지정합니다.
*   **환경 변수:**
    *   `SUBMISSIONS_TABLE_NAME`: 제출을 저장하는 DynamoDB 테이블의 이름 (`code-execution-service` 원격 상태에서 가져옴).
    *   `AWS_NODEJS_CONNECTION_REUSE_ENABLED`: AWS SDK의 TCP 연결 재사용을 활성화하여 성능을 향상시키려면 "1"로 설정합니다.
*   **주요 로직:**
    *   **GSI 선택:** `userId`, `problemId` 또는 `author` 파라미터에 따라 GSI를 동적으로 선택합니다. 특정 엔티티 필터가 제공되지 않으면 `AllSubmissionsByTimeIndex`를 기본값으로 사용합니다.
    *   **프로젝션 표현식 (Projection Expression):** 읽기 용량을 최적화하고 페이로드 크기를 줄이기 위해 DynamoDB에서 검색할 특정 속성을 선택합니다. *참고: `submissionId`로 가져올 때 Lambda는 해당 항목의 모든 속성(`userCode` 포함)을 검색합니다.*
    *   **오류 처리:** DynamoDB 작업 및 파라미터 파싱을 위한 기본 try-catch 블록입니다.
    *   **`unmarshallItem` 헬퍼 함수:** `GetItemCommand` 결과에 대해 DynamoDB의 속성 값 형식(예: `{ "S": "stringValue" }`)을 표준 JavaScript 객체로 변환합니다. `DynamoDBDocumentClient`는 `QueryCommand`에 대해 이를 자동으로 처리합니다.

## 7. 프론트엔드 연동

### 7.1. API 클라이언트 (`capstone-2025-04/frontend/src/api/submissionApi.ts`)

*   `SUBMISSIONS_API_BASE_URL`: `NEXT_PUBLIC_SUBMISSIONS_API_BASE_URL` 환경 변수를 통해 설정됩니다.
*   `getSubmissions(params)`:
    *   `GetSubmissionsParams`를 기반으로 쿼리 파라미터를 구성합니다.
    *   `/submissions` 엔드포인트로 `GET` 요청을 보냅니다.
    *   `Promise<GetSubmissionsResponse>`를 반환합니다.
*   `getSubmissionById(submissionId)`:
    *   `submissionId` 파라미터로 `/submissions` 엔드포인트를 쿼리합니다.
    *   동일한 제출 ID에 대한 중복 API 호출을 줄이기 위해 5분 만료 시간의 간단한 인메모리 캐시(`submissionCache`)를 포함합니다.
    *   Markdown 호환성을 위해 `language`가 소문자인지 확인하고, 없는 경우 "plaintext"를 기본값으로 설정합니다.
    *   `SubmissionSummary`가 `userCode`를 포함하는 `Promise<SubmissionSummary>`를 반환합니다.
*   `handleApiResponse`: 일반적인 응답 처리 및 오류 파싱을 위한 유틸리티 함수입니다.

### 7.2. 제출 페이지 (`capstone-2025-04/frontend/src/app/submissions/page.tsx`)

*   **상태 관리:** 제출 목록, 로딩 상태, 오류 메시지, 필터(`filterProblemTitle`, `filterAuthor`), 정렬 순서 및 페이지네이션(`lastEvaluatedKey`, `hasMore`)을 위해 `useState`를 사용합니다.
*   **데이터 가져오기:**
    *   `useEffect`와 `useCallback`으로 메모이징된 `fetchSubmissions` 함수를 사용하여 다음을 수행합니다:
        *   초기 데이터 로드.
        *   필터 또는 정렬 순서가 변경될 때 데이터 다시 가져오기.
    *   `handleLoadMore` 함수는 저장된 `lastEvaluatedKey`를 사용하여 후속 페이지를 가져옵니다.
*   **필터링 UI:** "문제 제목 (한글)" 및 "작성자"에 대한 입력 필드를 제공합니다.
*   **정렬 UI:** 정렬 순서(ASC/DESC)를 선택하는 드롭다운입니다.
*   **표시:**
    *   제출물을 테이블에 렌더링합니다.
    *   제출 ID를 결과 페이지(`/coding-test/result?id={problemId}&submissionId={submissionId}`)로 연결합니다.
    *   문제 제목을 문제 풀이 페이지(`/coding-test/solve?id={problemId}`)로 연결합니다.
    *   `date-fns`를 사용하여 `submissionTime`을 포맷합니다.
    *   적절한 스타일과 한글 텍스트로 상태를 표시합니다.
*   **오류 처리:** 가져오기가 실패하면 `toast` 알림 및 인라인 메시지를 사용하여 오류 메시지를 표시합니다.
*   **로딩 표시기:** 데이터 가져오기 중에 로딩 스피너를 표시합니다.
*   **Suspense:** 초기 페이지 로드 또는 경로 전환 중 더 나은 로딩 UX를 위해 `SubmissionsContent`를 래핑합니다.

## 8. 인프라 (Terraform)

위치: `capstone-2025-04/infrastructure/submissions-api/`

### 8.1. 주요 리소스 정의:

*   `aws_api_gateway_rest_api.submissions_api`: 주 API Gateway 인스턴스입니다.
*   `aws_api_gateway_resource.submissions_resource`: `/submissions` 경로입니다.
*   `aws_api_gateway_method.submissions_get`: `/submissions`에 대한 `GET` 메서드입니다.
    *   `request_parameters`: API Gateway에서 인식하는 예상 쿼리 문자열 파라미터를 정의합니다.
        *   *참고: 현재 `apigateway.tf` 파일의 `request_parameters`에는 `submissionId`, `author`, `problemTitleTranslated`가 누락되어 있습니다. Lambda는 이를 처리하지만, API Gateway 메서드 정의에 추가하면 문서화 및 Gateway 수준에서의 요청 유효성 검사에 유용할 수 있습니다.*
*   `aws_api_gateway_integration.submissions_get_lambda_integration`: `GET` 메서드를 `get_submission` Lambda와 통합합니다.
*   `aws_api_gateway_method.submissions_options` & `aws_api_gateway_integration.submissions_options_mock_integration`: CORS `OPTIONS` 요청을 처리합니다.
*   `aws_api_gateway_deployment.submissions_api_deployment` & `aws_api_gateway_stage.submissions_api_stage`: API를 배포하고 스테이징합니다. 스테이지에는 접근 로깅 구성이 포함됩니다.
*   `aws_cloudwatch_log_group.submissions_api_gateway_logs`: API Gateway 접근 로그를 위한 로그 그룹입니다.
*   `aws_iam_role.get_submission_lambda_role`: `get_submission` Lambda를 위한 IAM 역할입니다.
*   `aws_iam_policy.get_submission_dynamodb_policy`: Lambda가 Submissions DynamoDB 테이블(GSI 포함)에서 `Query` 및 `GetItem`을 수행할 수 있도록 허용하는 IAM 정책입니다.
*   `aws_iam_role.api_gateway_cloudwatch_role_submissions`: API Gateway가 CloudWatch로 로그를 푸시하기 위한 IAM 역할입니다.
*   `aws_lambda_function.get_submission`: Lambda 함수 정의입니다.
    *   `../../backend/lambdas/submissions-api/getSubmission.mjs`에서 코드를 패키징합니다.
    *   환경 변수 `SUBMISSIONS_TABLE_NAME`(원격 상태에서 가져옴) 및 `AWS_NODEJS_CONNECTION_REUSE_ENABLED`를 설정합니다.
*   `aws_lambda_permission.apigw_invoke_get_submission`: API Gateway가 Lambda를 호출할 수 있도록 허용합니다.
*   `data.terraform_remote_state.code_execution_service`: S3에 저장된 `code-execution-service` Terraform 상태에서 출력(DynamoDB 테이블 이름 및 ARN)을 가져옵니다.

### 8.2. 백엔드 구성 (`backend.tf`):

*   Terraform 상태는 S3 버킷(`alpaco-tfstate-bucket-kmu`)에 저장되며 상태 잠금을 위해 DynamoDB(`alpaco-tfstate-lock-table`)를 사용합니다.

### 8.3. 변수 (`variables.tf`):

*   `aws_region`, `project_name`, `environment`, `common_tags`와 같은 공통 변수를 정의합니다.
*   Lambda 관련 구성: `lambda_runtime`, `lambda_code_base_path`, `get_submission_handler`, `lambda_memory_size`, `lambda_timeout`.
*   `code-execution-service`에 대한 원격 상태 구성입니다.

### 8.4. 출력 (`outputs.tf`):

*   `get_submission_lambda_name`: 배포된 Lambda 함수의 이름입니다.
*   `submissions_api_invoke_url`: API Gateway 스테이지를 호출하기 위한 기본 URL입니다.

## 9. 배포 전제 조건

*   필요한 권한을 가진 AWS 계정 및 구성된 AWS CLI 자격 증명.
*   Terraform CLI (버전 ~> 5.0) 설치.
*   Node.js 및 npm/yarn (미리 빌드된 zip으로 `archive_file`을 사용하지 않는 경우 Lambda 패키징 및 프론트엔드 개발용).
*   `code-execution-service` 모듈이 성공적으로 배포되어야 합니다. 이 모듈은 DynamoDB 테이블 세부 정보에 대해 해당 모듈의 S3 원격 상태에 의존하기 때문입니다. Terraform 상태를 위한 S3 버킷(`alpaco-tfstate-bucket-kmu`)과 DynamoDB 테이블(`alpaco-tfstate-lock-table`)이 존재해야 합니다.

## 10. 설정 및 배포

1.  **리포지토리 복제:**
    ```bash
    git clone <your-repository-url>
    cd capstone-2025-04/infrastructure/submissions-api
    ```

2.  **Lambda 코드 존재 확인:**
    Lambda 함수 코드 `getSubmission.mjs`가 `var.lambda_code_base_path` (기본값: `../../backend/lambdas/submissions-api/getSubmission.mjs`)로 지정된 경로에 있는지 확인합니다.

3.  **변수 구성 (필요한 경우):**
    `variables.tf`를 검토하고, 기본값이 적합하지 않은 경우 `terraform.tfvars` 파일을 생성하거나 명령줄을 통해 변수를 재정의합니다.
    확인할 주요 변수:
    *   `aws_region`
    *   `project_name`
    *   `environment`
    *   `code_execution_service_tfstate_bucket`
    *   `code_execution_service_tfstate_key` (이것이 `code-execution-service`의 올바른 상태 파일을 가리키는지 확인)

4.  **Terraform 초기화:**
    ```bash
    terraform init
    ```

5.  **배포 계획:**
    ```bash
    terraform plan
    ```
    계획을 검토하여 예상되는 리소스가 생성/수정되는지 확인합니다.

6.  **구성 적용:**
    ```bash
    terraform apply
    ```
    메시지가 표시되면 `yes`를 입력하여 확인합니다.

7.  **API 호출 URL 기록:**
    성공적으로 배포되면 Terraform은 `submissions_api_invoke_url`을 출력합니다. 이것이 API의 기본 URL입니다.
    예시: `https://abcdef123.execute-api.ap-northeast-2.amazonaws.com/production`

8.  **프론트엔드 구성 업데이트:**
    프론트엔드 애플리케이션(예: Next.js의 경우 `.env.local` 파일)에서 `NEXT_PUBLIC_SUBMISSIONS_API_BASE_URL` 환경 변수를 이전 단계에서 얻은 `submissions_api_invoke_url`로 설정합니다.
    ```
    NEXT_PUBLIC_SUBMISSIONS_API_BASE_URL=https://abcdef123.execute-api.ap-northeast-2.amazonaws.com/production
    ```
    환경 변수가 적용되도록 프론트엔드 애플리케이션을 다시 빌드/시작합니다.

## 11. 향후 개선 사항 / 고려 사항

*   **인증:** API가 공개되어서는 안 되는 경우 강력한 인증(예: AWS IAM, Amazon Cognito)을 구현합니다.
*   **입력 유효성 검사:** API Gateway 수준 또는 Lambda 내에 보다 포괄적인 입력 유효성 검사를 추가합니다.
*   **오류 세분화:** API에서 보다 구체적인 오류 코드와 메시지를 제공합니다.
*   **고급 검색:** 보다 복잡한 검색 기능(예: 문제 제목 또는 코드에 대한 전체 텍스트 검색, 날짜 범위 필터링)을 구현합니다.
*   **캐싱:** 성능 문제가 발생하는 경우 자주 접근되고 개인화되지 않은 데이터에 대해 API Gateway 수준 캐싱을 고려합니다.
*   **Dead Letter Queue (DLQ):** 처리 실패를 처리하기 위해 Lambda 함수에 DLQ를 구성합니다.
*   **멱등성(Idempotency):** POST/PUT/DELETE 작업이 추가되는 경우 멱등성을 보장합니다.
*   **테스트:** Lambda 함수에 대한 단위 테스트 및 API에 대한 통합 테스트를 추가합니다.
*   **API Gateway 요청 파라미터:** `apigateway.tf`의 `aws_api_gateway_method.submissions_get`에 정의된 `request_parameters`를 Lambda에서 지원하는 모든 쿼리 파라미터(`submissionId`, `author`, `problemTitleTranslated` 등)와 일치시킵니다.

## 12. 문제 해결

*   **API Gateway 5xx 오류 (Internal Server Error 등):**
    *   API Gateway에 대한 CloudWatch Logs (`/aws/api-gateway/{api_name}/{stage_name}`)를 확인합니다.
    *   `get_submission` Lambda 함수에 대한 CloudWatch Logs (`/aws/lambda/{project_name}-getSubmission-{environment}`)를 확인합니다. 호출 오류, 권한 문제(예: DynamoDB 접근 거부) 또는 코드 오류를 찾습니다.
*   **브라우저의 CORS 오류:**
    *   API Gateway에서 `OPTIONS` 메서드가 올바르게 구성되었는지 확인합니다.
    *   `Access-Control-Allow-Origin` 헤더가 프론트엔드 애플리케이션의 오리진과 일치하는지 (또는 개발용으로 `*`인지) 확인합니다.
    *   특정 CORS 오류 메시지에 대해 브라우저 콘솔을 확인합니다.
*   **Lambda 시간 초과:**
    *   요청 시간이 초과되는 경우 CloudWatch에서 Lambda 실행 시간을 확인합니다. 필요한 경우 `var.lambda_timeout`을 늘립니다.
    *   DynamoDB 쿼리를 최적화합니다 (GSI가 효과적으로 사용되는지 확인하고 스캔된 항목을 줄임).
*   **Terraform 적용 실패:**
    *   Terraform의 오류 메시지를 주의 깊게 읽습니다. 종종 권한 문제, 잘못 구성된 리소스 또는 종속성 문제를 가리킵니다.
    *   `code-execution-service`에 대한 원격 상태에 접근할 수 있고 예상 출력을 포함하는지 확인합니다.
