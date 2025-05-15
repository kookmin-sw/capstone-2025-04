# 코드 실행 서비스 (Code Execution Service)

## 1. 개요

코드 실행 서비스는 사용자가 제출한 코드를 안전하게 실행하고, 미리 정의된 또는 사용자 정의 테스트 케이스에 대해 실행하며, 제출물을 채점하도록 설계된 백엔드 시스템입니다. 이 서비스는 API Gateway를 통해 오케스트레이션되는 두 개의 주요 AWS Lambda 함수로 구성됩니다:

1.  **`code-executor` Lambda:** 사용자가 제공한 임의의 Python 코드의 샌드박스 실행을 담당합니다. 입력 주입, stdout/stderr 캡처, 반환 값 추출 및 타임아웃 강제를 처리합니다.
2.  **`code-grader` Lambda:** 주요 오케스트레이터입니다. API Gateway를 통해 요청을 수신하고, DynamoDB에서 문제 세부 정보(테스트 케이스 포함)를 가져오며, 각 테스트 케이스에 대해 `code-executor` Lambda를 호출하고, 실제 출력을 예상 출력과 비교한 후, 제출 결과를 다시 DynamoDB에 저장합니다.

이 서비스는 두 가지 주요 운영 모드를 지원합니다:
*   **`GRADE_SUBMISSION`:** 특정 문제에 대한 모든 공식 테스트 케이스에 대해 사용자 코드를 완전히 채점합니다.
*   **`RUN_CUSTOM_TESTS`:** 사용자가 제공하는 사용자 정의 입력 데이터 세트에 대해 코드를 실행할 수 있게 하여, 주로 디버깅 및 테스트 목적으로 사용됩니다.

## 2. 아키텍처

```
+-----------------+      +---------------------+      +--------------------+      +--------------------------+
| 사용자/클라이언트 |----->| API Gateway (/grade)|----->| code-grader Lambda |----->| code-executor Lambda     |
| (예: 프론트엔드) |      | (Cognito 인증)      |      | (오케스트레이션,   |      | (격리된 코드 실행)       |
+-----------------+      +---------------------+      |  채점 로직)        |      +--------------------------+
                                                      +--------------------+
                                                         ^      |      ^
                                                         |      |      | (호출)
                                                         |      |      |
                                +------------------------+      |      +------------------------+
                                |                               v                               |
                       +---------------------+      +--------------------------+                |
                       | DynamoDB (Problems) |      | DynamoDB (Submissions)   |<---------------+
                       | (문제 상세 정보,    |      | (제출 결과 저장)         |
                       |  테스트 케이스 가져오기)|      +--------------------------+
                       +---------------------+
```

**`GRADE_SUBMISSION` 흐름:**
1.  클라이언트는 `executionMode: "GRADE_SUBMISSION"`, `userCode`, `problemId`, `language`를 포함하여 `/grade`로 `POST` 요청을 보냅니다.
2.  API Gateway는 요청을 인증(Cognito)하고 `code-grader` Lambda로 전달합니다.
3.  `code-grader`는 `Problems` DynamoDB 테이블에서 문제 상세 정보와 테스트 케이스를 검색합니다.
4.  각 테스트 케이스에 대해:
    a.  `code-grader`는 `userCode`, `input_data`(테스트 케이스에서 가져옴), `timeout_ms`를 사용하여 `code-executor` Lambda를 호출합니다.
    b.  `code-executor`는 `userCode`를 임시 파일에 쓰고, 러너 스크립트를 생성한 후, Python 서브프로세스에서 러너 스크립트를 실행합니다.
    c.  러너 스크립트는 사용자 코드를 가져오고, `input_data`로 솔루션 함수를 호출하며, `stdout`, `stderr` 및 `returnValue`(Base64 인코딩됨)를 캡처합니다.
    d.  `code-executor`는 실행 결과(stdout, stderr, returnValue, exitCode, executionTimeMs, timedOut)를 `code-grader`로 반환합니다.
5.  `code-grader`는 `code-executor`의 `returnValue`를 `judgeType`에 따라 테스트 케이스의 `expected_output`과 비교합니다.
6.  모든 테스트 케이스가 완료된 후, `code-grader`는 전체 상태를 컴파일하고 상세 제출 기록을 `Submissions` DynamoDB 테이블에 저장합니다.
7.  `code-grader`는 채점 요약을 클라이언트로 반환합니다.

**`RUN_CUSTOM_TESTS` 흐름:**
1.  클라이언트는 `executionMode: "RUN_CUSTOM_TESTS"`, `userCode`, `customTestCases`, `language` 및 선택적으로 `problemId`(시간 제한용)를 포함하여 `/grade`로 `POST` 요청을 보냅니다.
2.  API Gateway는 인증 후 `code-grader`로 전달합니다.
3.  `code-grader`는 (선택 사항) `problemId`가 제공된 경우 `Problems` 테이블에서 시간 제한을 가져옵니다.
4.  사용자가 제공한 각 사용자 정의 테스트 케이스 입력에 대해:
    a.  `code-grader`는 `userCode`, 사용자 정의 `input_data`, `timeout_ms`를 사용하여 `code-executor`를 호출합니다.
    b.  `code-executor`는 위에서 설명한 대로 코드를 실행합니다.
    c.  `code-executor`는 원시 실행 결과를 `code-grader`로 반환합니다.
5.  `code-grader`는 각 사용자 정의 테스트 케이스에 대한 `code-executor`의 모든 원시 실행 결과를 수집합니다.
6.  `code-grader`는 `Submissions` 테이블에 비교나 저장을 수행하지 않고 수집된 결과를 클라이언트로 반환합니다.

## 3. 핵심 구성 요소

### 3.1. `code-executor` Lambda
*   **파일:** `capstone-2025-04/backend/lambdas/code-executor/lambda_function.py`
*   **목적:** 제어된 환경에서 Python 코드를 실행합니다.
*   **입력 페이로드 (`code-grader`로부터):**
    ```json
    {
        "code_to_execute": "def solution(data):\\n  return data * 2",
        "input_data": {"value": 5}, // Python dict/list/primitive
        "timeout_ms": 5000 // 사용자 코드의 최대 실행 시간
    }
    ```
*   **출력 페이로드 (`code-grader`로):**
    ```json
    {
        "stdout": "사용자 print 문...",
        "stderr": "사용자 코드 또는 러너의 오류 메시지...",
        "returnValue": "...", // 사용자의 'solution' 함수에서 실제 반환 값
        "exitCode": 0, // 오류 시 0이 아닌 값
        "executionTimeMs": 123,
        "timedOut": false, // 사용자 코드가 timeout_ms를 초과한 경우 true
        "error": null, // code-executor 내 오케스트레이션 오류
        "isSuccessful": true // exitCode가 0이고 timedOut이 아닌 경우 true
    }
    ```
*   **주요 메커니즘:**
    *   **임시 파일:** 사용자 코드와 러너 스크립트가 Lambda 환경의 `/tmp`에 작성됩니다.
    *   **러너 스크립트:** `code-executor`에 의해 동적으로 생성되는 Python 스크립트입니다. 이 스크립트는 다음을 수행합니다:
        *   임시 솔루션 디렉터리를 `sys.path`에 추가합니다.
        *   사용자의 솔루션 모듈을 가져옵니다.
        *   `solution`, `solve`, `answer`, 또는 `main`이라는 이름의 함수를 찾습니다.
        *   `stdin`에서 `input_data`(JSON 문자열)를 읽습니다.
        *   역직렬화된 `input_data`로 사용자의 솔루션 함수를 호출합니다.
        *   반환 값에서 특수 부동 소수점 값(NaN, Infinity)을 처리합니다.
        *   `returnValue`를 `###_RETURN_VALUE_###` 접두사가 붙은 Base64 인코딩된 JSON 문자열로 출력합니다.
        *   사용자 코드의 런타임 오류를 JSON 객체로 `stderr`에 출력합니다.
        *   성공 시 `0`, 실패 시 `1`로 종료합니다.
    *   **서브프로세스 실행:** `code-executor`는 `sys.executable`(동일한 Python 버전 보장)을 사용하여 러너 스크립트를 실행하기 위해 `subprocess.run()`을 사용합니다.
    *   **반환 값 추출:** `code-executor`는 서브프로세스의 `stdout`을 파싱하여 `RETURN_VALUE_MARKER`를 찾고, Base64 JSON을 디코딩한 후, `result` 필드를 추출합니다.
    *   **타임아웃:** `subprocess.run()`의 `timeout` 매개변수를 사용합니다.
    *   **인코딩:** 파일 작업 및 서브프로세스 통신에 `utf-8`을 사용합니다.

### 3.2. `code-grader` Lambda
*   **파일:** `capstone-2025-04/backend/lambdas/code-grader/lambda_function.py`
*   **목적:** 코드 실행 및 채점을 오케스트레이션합니다.
*   **입력 (API Gateway로부터, `event.body`):** 4번 섹션: API 엔드포인트 참조.
*   **출력 (API Gateway로, 응답의 `body`):** 4번 섹션: API 엔드포인트 참조.
*   **주요 로직:**
    *   입력 페이로드를 파싱하고 `executionMode`를 결정합니다.
    *   인증 클레임(`userId`, `author`)을 처리합니다.
    *   **`GRADE_SUBMISSION` 모드:**
        *   `PROBLEMS_TABLE_NAME`에서 문제 데이터(`title`, `finalTestCases`, `judgeType`, `epsilon`, `timeLimitSeconds`)를 가져옵니다.
        *   `finalTestCases`를 반복합니다.
        *   각 테스트 케이스에 대해 `run_single_test_case` 헬퍼를 호출합니다.
        *   `run_single_test_case`는 `code-executor` Lambda를 호출합니다.
        *   `judgeType`(`equal`, `unordered_equal`, `float_eps`)에 따라 `compare_outputs` 함수를 사용하여 `actual_output`(`code-executor`의 returnValue)과 `expected_output`을 비교합니다.
        *   케이스 상태(`ACCEPTED`, `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `RUNTIME_ERROR`, `INTERNAL_ERROR`)를 결정합니다.
        *   결과 및 전체 제출 상태를 집계합니다.
        *   제출 세부 정보를 `SUBMISSIONS_TABLE_NAME`에 저장합니다.
    *   **`RUN_CUSTOM_TESTS` 모드:**
        *   페이로드의 `customTestCases`를 반복합니다.
        *   각 사용자 정의 입력에 대해 `run_single_test_case`를 호출합니다.
        *   비교 없이 `code-executor`의 원시 `runCodeOutput`을 수집합니다.
        *   수집된 결과를 반환합니다.
*   **환경 변수:**
    *   `PROBLEMS_TABLE_NAME`: 문제 정의를 저장하는 DynamoDB 테이블 이름입니다.
    *   `SUBMISSIONS_TABLE_NAME`: 제출 결과를 저장하는 DynamoDB 테이블 이름입니다.
    *   `RUN_CODE_LAMBDA_NAME`: `code-executor` Lambda의 함수 이름입니다.

### 3.3. API Gateway
*   **파일:** `capstone-2025-04/infrastructure/code-execution-service/apigateway.tf`
*   **목적:** `code-grader` Lambda에 대한 공개 HTTP 엔드포인트를 제공합니다.
*   **엔드포인트:** `/grade` (API Gateway 스테이지 URL 기준).
*   **메서드:** `POST`
*   **인증:** `COGNITO_USER_POOLS`. `Authorization` 헤더에 유효한 Cognito ID 토큰이 필요합니다.
*   **통합:** `code-grader` Lambda와의 `AWS_PROXY` 통합.
*   **CORS:** 프론트엔드에서의 교차 출처 요청을 허용하기 위해 `OPTIONS` 요청 및 오류 응답(`DEFAULT_4XX`, `DEFAULT_5XX`)에 대해 구성됩니다.

### 3.4. DynamoDB 테이블
*   **`Problems` 테이블 (원격 상태를 통해 참조):**
    *   `problem-generator-v3` Terraform 모듈에 의해 관리됩니다.
    *   `code-grader`가 `problemId`, `title`, `title_translated`, `finalTestCases`(JSON 문자열), `judgeType`, `epsilon`, `timeLimitSeconds`를 가져오는 데 사용됩니다.
*   **`Submissions` 테이블 (`problem-submissions`):**
    *   **파일:** `capstone-2025-04/infrastructure/code-execution-service/dynamodb.tf`
    *   **목적:** 채점된 제출 결과를 저장합니다.
    *   **기본 키:** `submissionId (S)`
    *   **속성 (예시):** `problemId (S)`, `userId (S)`, `author (S)`, `language (S)`, `status (S)`, `executionTime (N)`, `results (L)` (테스트 케이스 결과 목록), `submissionTime (N)`, `userCode (S)`, `errorMessage (S)`, `is_submission (S)`, `problemTitle (S)`, `problemTitleTranslated (S)`.
    *   **글로벌 보조 인덱스 (GSI):**
        *   `ProblemIdSubmissionTimeIndex`: `problemId` (해시), `submissionTime` (범위)
        *   `UserIdSubmissionTimeIndex`: `userId` (해시), `submissionTime` (범위)
        *   `AllSubmissionsByTimeIndex`: `is_submission` (해시), `submissionTime` (범위)
        *   `AuthorSubmissionTimeIndex`: `author` (해시), `submissionTime` (범위)
        *   `ProblemTitleSubmissionTimeIndex`: `problemTitle` (해시), `submissionTime` (범위)
        *   `ProblemTitleTranslatedSubmissionTimeIndex`: `problemTitleTranslated` (해시), `submissionTime` (범위)

## 4. API 엔드포인트

### POST `/grade`
*   **설명:** 채점을 위해 코드를 제출하거나 사용자 정의 테스트 케이스에 대해 코드를 실행합니다.
*   **인증:** Cognito ID 토큰이 필요합니다.
    *   헤더: `Authorization: Bearer <ID_TOKEN>`
*   **요청 본문 (JSON):**

    **공통 필드:**
    ```json
    {
        "userCode": "def solution(data):\n  return data['a'] + data['b']",
        "language": "python3.12" // 예: "python", "python3.12", "javascript" (언어 지원은 code-executor의 러너에 따라 다름)
    }
    ```

    **모드 1: 제출 채점 (Grade Submission)**
    ```json
    {
        "executionMode": "GRADE_SUBMISSION",
        "problemId": "problem-uuid-123",
        "userCode": "...",
        "language": "python3.12"
        // "submissionId": "optional-client-generated-uuid" // 제공되지 않으면 grader가 생성
    }
    ```

    **모드 2: 사용자 정의 테스트 실행 (Run Custom Tests)**
    ```json
    {
        "executionMode": "RUN_CUSTOM_TESTS",
        "userCode": "...",
        "language": "python3.12",
        "customTestCases": [
            {"value": 5},
            {"value": 10, "another_key": "test"},
            [1, 2, 3], // 입력 데이터는 모든 JSON 직렬화 가능한 Python 기본/컬렉션이 될 수 있음
            "a string input"
        ],
        "problemId": "optional-problem-uuid-for-time-limit" // timeLimitSeconds를 가져오기 위함
    }
    ```

*   **성공 응답 (JSON 본문):**

    **모드 1: `GRADE_SUBMISSION_RESULTS`**
    ```json
    // code-grader lambda_function.py 에서
    {
        "submissionId": "generated-uuid-abc",
        "status": "ACCEPTED", // "WRONG_ANSWER", "TIME_LIMIT_EXCEEDED", "RUNTIME_ERROR", "INTERNAL_ERROR"
        "executionTime": 0.123, // 테스트 케이스 전체에서 최대 실행 시간 (초, float)
        "results": [
            {
                "caseNumber": 1,
                "status": "ACCEPTED",
                "executionTime": 0.050, // 이 케이스의 실행 시간 (초, float)
                "stdout": "Optional stdout from this case...", // 최대 500자
                "stderr": null // 또는 오류 상세 정보
            },
            // ... 추가 테스트 케이스 결과
        ],
        "errorMessage": null, // 또는 overall_status가 오류 유형인 경우 문자열
        "executionMode": "GRADE_SUBMISSION_RESULTS",
        "problemTitle": "원본 문제 제목",
        "problemTitleTranslated": "번역된 문제 제목 (사용 가능한 경우)",
        "score": 100, // 계산된 점수
        "passedCaseCount": 2,
        "totalCaseCount": 2
    }
    ```

    **모드 2: `RUN_CUSTOM_TESTS_RESULTS`**
    ```json
    // code-grader lambda_function.py 에서
    {
        "executionMode": "RUN_CUSTOM_TESTS_RESULTS",
        "results": [
            {
                "caseIdentifier": "Custom Case 1",
                "input": {"value": 5},
                "runCodeOutput": { // code-executor의 원시 출력
                    "stdout": "User print: 5",
                    "stderr": "",
                    "returnValue": 10,
                    "exitCode": 0,
                    "executionTimeMs": 15,
                    "timedOut": false,
                    "error": null,
                    "isSuccessful": true,
                    "runCodeLambdaError": false // code-executor 자체에 처리되지 않은 오류가 있는 경우 true
                    // "errorMessage": "...", // runCodeLambdaError가 true인 경우
                    // "trace": [...] // runCodeLambdaError가 true인 경우
                }
            },
            // ... 추가 사용자 정의 테스트 케이스 결과
        ]
    }
    ```

*   **오류 응답 (JSON 본문):**
    *   `400 Bad Request`:
        ```json
        {
            "error": "Invalid input: Missing userCode"
        }
        ```
    *   `401 Unauthorized`: (일반적으로 토큰이 유효하지 않거나 누락된 경우 API Gateway에서 표준 메시지로 처리됨)
        ```json
        {
            "message": "인증 정보가 없습니다. 사용자 ID 또는 작성자 정보를 확인할 수 없습니다."
        }
        ```
    *   `500 Internal Server Error`:
        ```json
        // code-grader에서 매개변수 파싱 중 오류 발생 시
        {
            "error": "Internal server error during parameter parsing: ...",
            "stdout": "",
            "stderr": "Internal server error: ...",
            "returnValue": null,
            "exitCode": -1,
            "executionTimeMs": 0,
            "timedOut": false,
            "isSuccessful": false
        }
        // 또는 기타 내부 오류에 대한 간단한 메시지
        ```

## 5. 사용 기술

*   **AWS Lambda:** `code-executor` 및 `code-grader`를 위한 서버리스 컴퓨팅.
*   **AWS API Gateway:** HTTP 엔드포인트, 요청 라우팅, 인증.
*   **AWS DynamoDB:** 문제 데이터 및 제출 결과 저장을 위한 NoSQL 데이터베이스.
*   **AWS IAM:** 권한을 위한 역할 및 정책.
*   **AWS S3:** Lambda 배포 패키지 및 Terraform 상태 저장을 위함.
*   **AWS CloudWatch:** 로깅 및 모니터링.
*   **Python 3.12:** Lambda 함수를 위한 런타임.
*   **Terraform:** AWS 리소스 프로비저닝을 위한 코드형 인프라(IaC).
*   **AWS Cognito:** 사용자 인증 (API Gateway와 통합).

## 6. 배포 전제 조건

1.  **AWS 계정:** 활성 AWS 계정.
2.  **AWS CLI:** 자격 증명 및 기본 리전(`ap-northeast-2`)으로 구성.
    ```bash
    aws configure
    ```
3.  **Terraform:** 설치됨 (프로바이더 `~> 5.0`과 호환되는 버전).
4.  **Terraform 상태용 S3 버킷:** `alpaco-tfstate-bucket-kmu` (존재해야 함).
5.  **Terraform 잠금용 DynamoDB 테이블:** `alpaco-tfstate-lock-table` (존재해야 함).
6.  **Cognito용 원격 상태:** Cognito 사용자 풀에 대한 Terraform 상태가 `variables.tf`에 지정된 S3 버킷(`cognito_tfstate_bucket`, `cognito_tfstate_key`)에 존재해야 합니다.
7.  **문제 생성기용 원격 상태:** `problem-generator-v3`(`Problems` 테이블 정의)에 대한 Terraform 상태가 S3(`problem_generator_tfstate_bucket`, `problem_generator_tfstate_key`)에 존재해야 합니다.
8.  **Lambda 코드:** `code-executor` 및 `code-grader`용 Python 코드가 각 디렉터리(Terraform 모듈 기준 `../../backend/lambdas/code-executor` 및 `../../backend/lambdas/code-grader`)에 있어야 합니다.

## 7. 배포

이 서비스의 인프라는 Terraform에 의해 관리됩니다.

1.  **Terraform 모듈 디렉터리로 이동:**
    ```bash
    cd capstone-2025-04/infrastructure/code-execution-service
    ```

2.  **변수 검토 및 업데이트 (필요한 경우):**
    `variables.tf`를 엽니다. 대부분의 변수에는 기본값이 있습니다. 원격 상태 버킷/키 구성이 기본값과 다른 경우 설정을 확인하십시오. `terraform.tfvars` 파일을 만들어 기본 변수 값을 재정의할 수도 있습니다.

3.  **Terraform 초기화:**
    필요한 프로바이더 플러그인을 다운로드합니다.
    ```bash
    terraform init
    ```

4.  **배포 계획:**
    Terraform이 생성, 수정 또는 삭제할 리소스를 보여줍니다.
    ```bash
    terraform plan
    ```
    계획을 주의 깊게 검토하십시오.

5.  **구성 적용:**
    AWS 리소스를 생성합니다.
    ```bash
    terraform apply
    ```
    메시지가 표시되면 `yes`를 입력하여 확인합니다.

    성공적으로 적용된 후 Terraform은 다음과 같은 값을 출력합니다:
    *   `code_executor_lambda_name`
    *   `code_grader_lambda_name`
    *   `code_grader_api_invoke_url` (API의 기본 URL)
    *   `submissions_table_name_output`

6.  **API Gateway 배포:**
    `aws_api_gateway_deployment` 리소스에는 변경 시 재배포를 보장하는 `triggers`가 있습니다. API 스테이지(`grader_api_stage`)는 이 배포를 가리킵니다. `code_grader_api_invoke_url` 출력은 `https://<api_id>.execute-api.<region>.amazonaws.com/<stage_name>`이 됩니다. 채점 엔드포인트는 이 URL + `/grade`가 됩니다.

## 8. 코드 구조 (주요 파일)

*   `capstone-2025-04/backend/lambdas/code-executor/lambda_function.py`: 핵심 Python 코드 실행 로직.
*   `capstone-2025-04/backend/lambdas/code-grader/lambda_function.py`: 오케스트레이션, 채점 및 API 요청 처리 로직.
*   `capstone-2025-04/infrastructure/code-execution-service/`: 이 서비스를 위한 Terraform 파일.
    *   `main.tf` (또는 `providers.tf`, `backend.tf`): 일반 Terraform 설정. (주: 귀하의 구조에서는 `backend.tf` 및 `providers.tf`가 별도임).
    *   `lambda_executor.tf`: `code-executor` Lambda 및 관련 리소스 정의.
    *   `lambda_grader.tf`: `code-grader` Lambda 및 관련 리소스 정의.
    *   `iam.tf`: IAM 역할 및 정책 정의.
    *   `apigateway.tf`: API Gateway 리소스 정의.
    *   `dynamodb.tf`: `Submissions` DynamoDB 테이블 정의.
    *   `variables.tf`: Terraform 모듈에 대한 입력 변수.
    *   `outputs.tf`: Terraform 모듈의 출력.
    *   `data.tf`: 원격 상태 가져오기 등 데이터 소스.

## 9. 중요 참고 사항 및 고려 사항

*   **`code-executor` Lambda 타임아웃 vs. 사용자 코드 타임아웃:**
    *   `code-executor` Lambda 자체에는 타임아웃이 있습니다 (예: 30초, `variables.tf` -> `executor_lambda_timeout`에 구성).
    *   `code-executor`로 전달되는 `timeout_ms` 매개변수는 서브프로세스 내 *사용자 코드 실행*을 위한 것입니다 (예: 5000ms). 이 `timeout_ms`는 Lambda 자체의 타임아웃보다 작아야 합니다.
*   **보안:** 임의의 코드를 실행하는 것은 본질적으로 위험합니다. AWS Lambda는 강력한 격리 환경을 제공합니다. `code-executor`는 또한 호출당 격리되는 `/tmp` 디렉터리 내에서 작동합니다. 문제 해결 컨텍스트에 엄격하게 필요하지 않은 경우 쉬운 파일 시스템 탐색이나 네트워크 액세스를 허용하는 라이브러리 사용을 피하십시오.
*   **리소스 제한:** Lambda에는 실행 시간, 메모리 및 `/tmp` 공간(512MB)에 대한 제한이 있습니다. `code-executor`의 메모리는 Python 서브프로세스를 수용하기 위해 512MB로 설정됩니다.
*   **Python 버전:** 두 Lambda 모두 Python 3.12로 구성됩니다. `code-executor`는 서브프로세스가 동일한 Python 버전을 사용하도록 `sys.executable`을 사용합니다.
*   **JSON 직렬화:** 두 Lambda 모두 표준 JSON이 이러한 값을 지원하지 않으므로 `NaN` 및 `Infinity`와 같은 Python `float` 값을 JSON 직렬화를 위해 문자열로 변환하는 헬퍼(`convert_non_json_values`)를 포함합니다.
*   **오류 전파:**
    *   사용자 코드 내 오류는 `code-executor`의 러너 스크립트에 의해 포착되어 `stderr`를 통해 보고됩니다.
    *   `code-executor`의 오케스트레이션 오류(예: 파일 I/O)는 해당 `error` 필드에 보고됩니다.
    *   `code-grader`가 `code-executor`를 호출하거나 자체 로직에서 발생하는 오류는 처리되어 적절한 HTTP 오류 응답으로 반환됩니다.
*   **멱등성:** `GRADE_SUBMISSION`의 경우 클라이언트가 `submissionId`를 제공하면 `code-grader`가 이를 사용합니다. 동일한 `submissionId`가 여러 번 제출되면 기존 결과를 덮어쓸 수 있습니다. 현재 구현은 클라이언트가 `submissionId`를 제공하지 않으면 UUID를 생성합니다.
*   **확장성:** Lambda 및 DynamoDB를 사용하면 수요에 따라 서비스가 자동으로 확장될 수 있습니다.
*   **콜드 스타트:** Lambda 콜드 스타트는 특히 비활성 기간 후 첫 번째 요청에 대해 대기 시간을 추가할 수 있습니다. 콜드 스타트가 문제인 경우 성능이 중요한 애플리케이션에 대해 프로비저닝된 동시성을 고려할 수 있습니다.

## 10. 문제 해결

*   **CloudWatch Logs:** 디버깅을 위한 주요 소스입니다.
    *   `code-executor` Lambda 로그: `/aws/lambda/<project_name>-code-executor-<environment>`
    *   `code-grader` Lambda 로그: `/aws/lambda/<project_name>-code-grader-<environment>`
    *   API Gateway 로그: `/aws/api-gateway/<project_name>-CodeGraderAPI-<environment>/<environment>` (활성화된 경우 액세스 로그 및 실행 로그).
*   **매개변수 오류 (400):** API 사양에 대해 요청 페이로드를 확인하십시오. `executionMode` 및 해당 모드에 필요한 필드가 있는지 확인하십시오.
*   **인증 오류 (401/403):** Cognito ID 토큰이 유효하고 만료되지 않았으며 `Authorization` 헤더에 올바르게 포함되었는지 확인하십시오.
*   **`code-executor` 타임아웃:**
    *   `code-executor` Lambda 자체가 타임아웃되는 경우: `variables.tf`에서 `executor_lambda_timeout`을 늘리십시오.
    *   사용자 코드가 타임아웃되는 경우 (`code-executor`에서 `timedOut: true`로 보고됨): `timeout_ms`가 초과되었습니다. 이는 장시간 실행되는 사용자 코드에 대한 예상된 동작입니다.
*   **`Internal Server Error` (500):**
    *   스택 추적을 위해 `code-grader` Lambda 로그를 확인하십시오.
    *   `RUN_CUSTOM_TESTS` 결과에서 `runCodeLambdaError`가 true이거나 `code-grader`가 `code-executor` 호출 오류를 보고하는 경우 `code-executor` Lambda 로그를 확인하십시오.
    *   DynamoDB 액세스 문제(IAM 권한 확인), Lambda 코드에서 처리되지 않은 예외 또는 잘못된 구성으로 인해 발생할 수 있습니다.
*   **CORS 문제:** `apigateway.tf`의 API Gateway CORS 설정이 프론트엔드에서 사용하는 출처, 헤더 및 메서드를 허용하는지 확인하십시오. Lambda 함수도 응답에 CORS 헤더를 포함합니다.
