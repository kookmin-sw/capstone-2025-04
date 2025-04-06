# Problem Grader Lambda (@problem-grader)

이 문서는 `@problem-grader` 시스템의 아키텍처, 워크플로우, 구성 요소, 배포 및 사용 방법에 대해 상세히 설명합니다. 이 시스템은 코드 채점 과정을 비동기적으로 처리하며, 여러 AWS 서비스를 복합적으로 사용하므로 처음 접하는 사용자를 위해 최대한 자세히 기술되었습니다.

## 1. 개요 (Overview)

`@problem-grader`는 사용자로부터 제출된 코드를 주어진 문제의 테스트 케이스에 대해 실행하고, 그 결과를 채점하여 저장하는 시스템입니다. 주요 특징은 다음과 같습니다.

- **비동기 처리:** API 요청 시 즉시 채점 결과를 반환하는 대신, 채점 프로세스를 백그라운드에서 시작하고 고유한 `submission_id`를 반환합니다. 실제 채점은 AWS Step Functions 워크플로우를 통해 비동기적으로 진행됩니다.
- **확장 가능한 아키텍처:** ECS Fargate를 사용하여 테스트 케이스 생성 및 코드 실행 환경을 컨테이너화하여, 리소스 요구량에 따라 자동으로 확장될 수 있습니다.
- **다양한 언어 지원 (확장 가능):** Python을 기본으로 지원하며, 새로운 언어 Runner 컨테이너를 추가하여 지원 언어를 확장할 수 있도록 설계되었습니다.
- **워크플로우 기반 오케스트레이션:** AWS Step Functions를 사용하여 복잡한 채점 단계를 상태 머신으로 정의하고, 각 단계의 실행, 데이터 전달, 오류 처리 및 재시도를 관리합니다.

## 2. 아키텍처 (Architecture)

이 시스템은 다음과 같은 주요 AWS 서비스들로 구성됩니다.

- **Amazon API Gateway (HTTP API):** 채점 요청을 받는 외부 진입점(Entry Point)입니다.
- **AWS Lambda:** 두 가지 주요 역할을 수행합니다.
  - **Starter Lambda:** API Gateway 요청을 받아 Step Functions 워크플로우 실행을 시작합니다.
  - **Task Lambda:** Step Functions 워크플로우 내에서 특정 작업(데이터 조회, S3 파일 파싱, 결과 집계 등)을 수행합니다.
- **AWS Step Functions (Standard Workflow):** 전체 채점 프로세스를 상태 머신으로 정의하고 오케스트레이션합니다. 각 단계를 상태(State)로 표현하며, 상태 간 데이터 전달 및 오류 처리를 관리합니다.
- **Amazon Elastic Container Service (ECS) with AWS Fargate:** 테스트 케이스 생성(Generator) 및 사용자 코드 실행(Runner)을 위한 컨테이너 실행 환경을 제공합니다. Fargate는 서버 관리 없이 컨테이너를 실행할 수 있는 서버리스 컴퓨팅 엔진입니다.
- **Amazon S3 (Simple Storage Service):** Generator 및 Runner 컨테이너의 중간 출력 결과(JSON 파일)를 저장합니다.
- **Amazon DynamoDB:** 문제 정보 및 최종 채점 결과(제출 정보)를 저장하는 NoSQL 데이터베이스입니다.
- **Amazon Elastic Container Registry (ECR):** Generator 및 Runner Docker 이미지를 저장하고 관리하는 리포지토리입니다.
- **AWS Identity and Access Management (IAM):** 각 AWS 서비스가 다른 서비스에 접근하는 데 필요한 권한을 안전하게 관리하기 위한 역할(Role)과 정책(Policy)을 정의합니다.

**데이터 및 제어 흐름:**

1.  **채점 요청:** 사용자는 API Gateway 엔드포인트로 특정 문제 ID(`problem_id`)와 함께 채점할 코드(`user_code`) 및 언어(`language`)를 POST 요청으로 전송합니다.
2.  **워크플로우 시작:** API Gateway는 Starter Lambda 함수를 트리거합니다.
3.  **Starter Lambda:**
    - 요청 유효성을 검사합니다.
    - 고유한 제출 ID(`submission_id`)를 생성합니다.
    - Step Functions 상태 머신 실행을 시작하고, 입력으로 `submission_id`, `problem_id`, `language`, `user_code` 등을 전달합니다.
    - DynamoDB `submissions_table`에 초기 상태(`PENDING`)로 제출 정보를 저장합니다.
    - 사용자에게 `submission_id`를 포함한 HTTP 202 Accepted 응답을 즉시 반환합니다.
4.  **Step Functions 워크플로우 실행:** 상태 머신이 정의된 워크플로우를 따라 각 상태를 순차적 또는 병렬적으로 실행합니다.
    - **문제 정보 조회 (Task Lambda):** DynamoDB `problems_table`에서 문제 세부 정보(테스트 케이스 생성 코드, 시간/메모리 제한 등)를 가져옵니다.
    - **테스트 케이스 생성 (ECS Fargate Task):** Generator 컨테이너를 Fargate Task로 실행합니다. 이 Task는 문제 정보(생성 코드)를 받아 테스트 케이스들을 생성하고, 결과를 JSON 파일 형태로 S3 버킷에 저장합니다. Step Functions는 `.sync` 패턴을 사용하여 이 Task가 완료될 때까지 기다립니다.
    - **생성 결과 파싱 (Task Lambda):** S3에 저장된 Generator의 출력 파일을 읽고 JSON 데이터를 파싱하여 테스트 케이스 목록을 얻습니다.
    - **Map 입력 준비 (Task Lambda):** 제출된 언어에 맞는 Runner Task Definition ARN과 컨테이너 이름을 조회하여, 병렬 실행을 위한 입력 데이터(`context`, `items`)를 준비합니다.
    - **테스트 케이스 병렬 실행 (Map State + ECS Fargate Task):** Step Functions의 `Map` 상태를 사용하여 각 테스트 케이스에 대해 Runner 컨테이너를 Fargate Task로 병렬 실행합니다. 각 Runner Task는 사용자 코드, 테스트 케이스 입력 데이터, 시간/메모리 제한 등을 환경 변수로 받아 코드를 실행하고, 실행 결과(stdout, stderr, 실행 시간, 상태 등)를 JSON 파일 형태로 S3 버킷에 저장합니다. 각 Task 역시 `.sync` 패턴으로 완료를 기다립니다.
    - **실행 결과 파싱 (Task Lambda - Map Iterator 내부):** 각 Runner Task가 완료된 후, 해당 Task의 S3 출력 파일을 읽고 JSON 결과를 파싱합니다.
    - **결과 집계 (Task Lambda):** 모든 테스트 케이스 실행 결과(Map State의 출력)를 취합하여 최종 채점 상태(ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED 등)를 결정하고, 최대 실행 시간을 계산합니다.
    - **결과 저장 (DynamoDB):** 최종 채점 결과(`submission_id`, 최종 상태, 실행 시간, 각 케이스 결과 요약 등)를 DynamoDB `submissions_table`에 업데이트(저장)합니다.
5.  **워크플로우 완료:** 모든 상태가 성공적으로 완료되면 상태 머신 실행이 종료됩니다. 오류 발생 시 `FailState`로 이동하거나 정의된 `Catch` 블록에 따라 처리됩니다.

**왜 Step Functions를 사용하는가?**

- **Lambda 타임아웃 한계 극복:** 코드 채점, 특히 여러 테스트 케이스 실행은 Lambda의 최대 실행 시간(15분)을 초과할 수 있습니다. Step Functions는 장기 실행 워크플로우를 관리하여 이 문제를 해결합니다.
- **복잡한 작업 오케스트레이션:** ECS Task 시작, 완료 대기, S3 결과 확인 등 여러 비동기 작업을 순차적 또는 병렬적으로 조율하는 로직을 상태 머신으로 명확하게 정의하고 자동화합니다.
- **시각적 워크플로우 및 디버깅:** AWS 콘솔에서 상태 머신의 실행 과정을 시각적으로 추적하고 각 단계의 입력/출력을 확인할 수 있어 디버깅이 용이합니다.
- **내장된 오류 처리 및 재시도:** 각 상태별로 오류 처리(Catch) 및 재시도(Retry) 로직을 쉽게 정의하여 워크플로우의 안정성을 높일 수 있습니다.

## 3. 워크플로우 상세 (Detailed Workflow - Step Functions)

채점 워크플로우는 `infrastructure/terraform/problem-grader/problem_grader_statemachine.asl.json` 파일에 ASL(Amazon States Language)로 정의되어 있습니다. 주요 상태(State)는 다음과 같습니다.

- **`GetProblemDetails` (Task - Lambda Invoke):** 입력으로 받은 `problem_id`를 사용하여 DynamoDB에서 해당 문제의 상세 정보(테스트 케이스 생성 코드, 시간/메모리 제한 등)를 조회합니다. 결과를 `problem_info` 경로에 저장합니다.
- **`CheckProblemDetails` (Choice):** `GetProblemDetails` 상태에서 오류가 발생했는지 확인합니다. 오류 시 `FailState`로 이동하고, 정상이면 `GenerateTestCases`로 진행합니다.
- **`GenerateTestCases` (Task - ECS RunTask.sync):** Generator Docker 컨테이너를 ECS Fargate Task로 실행합니다. 환경 변수로 테스트 케이스 생성 코드, 결과를 저장할 S3 버킷/키 정보 등을 전달합니다. `.sync` 통합 패턴은 Step Functions가 해당 Fargate Task가 완료될 때까지 자동으로 기다리게 합니다. Task ARN과 ID를 `generator_task_info` 경로에 저장합니다.
- **`ParseGeneratorOutput` (Task - Lambda Invoke):** `GenerateTestCases` 상태에서 얻은 Task ID를 사용하여 S3에 저장된 Generator의 출력 파일(`output.json`) 경로를 구성합니다. 해당 파일을 읽고 JSON 데이터를 파싱하여 테스트 케이스 목록을 추출합니다. 결과를 `parsed_generator_output.cases` 경로에 저장합니다.
- **`CheckGeneratedCases` (Choice):** 파싱된 테스트 케이스 목록이 유효한지(오류 없음, null 아님, 비어있지 않음) 확인합니다. 유효하지 않으면 `FailState` 또는 `NoTestCasesState`로 이동하고, 유효하면 `PrepareMapInput`으로 진행합니다.
- **`PrepareMapInput` (Task - Lambda Invoke):** Lambda 함수를 호출하여 `RunTestCasesMap` 상태의 입력을 준비합니다. Lambda는 입력으로 받은 `language` 값에 따라 적절한 Runner Task Definition ARN과 컨테이너 이름을 환경 변수(`RUNNER_INFO_JSON`) 또는 내부 로직에서 조회합니다. 조회된 정보와 이전 상태의 테스트 케이스 목록(`parsed_generator_output.cases`)을 조합하여 `context` 객체와 `items` 배열을 포함하는 `map_input` 객체를 생성합니다.
- **`RunTestCasesMap` (Map):** `PrepareMapInput`에서 준비된 `items` 배열(테스트 케이스 목록)을 순회하며 각 아이템에 대해 내부 워크플로우(`Iterator`)를 병렬로 실행합니다 (`MaxConcurrency` 설정에 따라 동시 실행 수 제한). 각 반복(`Iterator`)은 다음 상태들을 포함합니다:
  - **`RunSingleTestCase` (Task - ECS RunTask.sync):** 해당 언어의 Runner Docker 컨테이너를 ECS Fargate Task로 실행합니다. 환경 변수로 사용자 코드, 현재 테스트 케이스의 입력 데이터(JSON 문자열), 시간 제한, 결과 저장 S3 정보 등을 전달합니다. `TaskDefinition`과 컨테이너 `Name`은 `PrepareMapInput`에서 전달된 `context` 정보를 참조하여 동적으로 결정됩니다. `.sync` 패턴으로 Task 완료를 기다립니다.
  - **`ParseRunnerOutput` (Task - Lambda Invoke):** 완료된 Runner Task의 S3 출력 파일(`output.json`)을 읽고 JSON 결과를 파싱합니다.
  * **`FormatMapItemResult` (Pass):** 파싱된 Runner 결과와 Map 반복 컨텍스트(인덱스, 기대 출력 등)를 조합하여 Map 상태의 최종 출력 형식에 맞게 데이터를 가공합니다.
  - **`MapItemFail` (Pass):** `Iterator` 내에서 오류 발생 시(`Catch` 블록에서 처리), 오류 정보를 포함한 결과를 반환하여 전체 Map 상태가 실패하지 않도록 합니다.
- **`AggregateResults` (Task - Lambda Invoke):** `RunTestCasesMap` 상태의 최종 출력(모든 테스트 케이스의 실행 결과 리스트)을 입력으로 받아 전체 채점 결과를 집계합니다. 모든 케이스의 상태를 종합하여 최종 상태(ACCEPTED, WRONG_ANSWER 등)를 결정하고, 최대 실행 시간을 계산합니다. 집계된 결과를 `aggregation_result` 경로에 저장합니다.
- **`SaveResult` (Task - DynamoDB PutItem):** 최종 채점 결과를 DynamoDB `submissions_table`에 저장(업데이트)합니다. `submission_id`를 기본 키로 사용하고, 최종 상태, 실행 시간, 결과 요약 등을 저장합니다.
- **`FailState` (Fail):** 워크플로우 실행 중 처리할 수 없는 오류가 발생했을 때 도달하는 최종 실패 상태입니다.
- **`SuccessState` (Succeed):** 모든 채점 과정이 성공적으로 완료되었을 때 도달하는 최종 성공 상태입니다.

**데이터 흐름:** 각 상태는 이전 상태의 출력을 입력으로 받거나, `ResultPath`를 사용하여 입력 JSON의 특정 경로에 결과를 저장합니다. `Parameters` 필드를 사용하여 다음 상태나 서비스(Lambda, ECS) 호출에 필요한 데이터를 선택하고 가공하여 전달합니다. `$` 접두사는 JSON 경로를, `$$` 접두사는 컨텍스트 객체(실행 ID, 상태 정보 등)를 참조하는 데 사용됩니다.

## 4. 주요 구성 요소 (Core Components)

각 구성 요소의 역할과 관련 Terraform 파일은 다음과 같습니다.

- **API Gateway (`api_lambda.tf`):**
  - 역할: 외부 HTTP POST 요청 수신 (`/problems/{problem_id}/grade`).
  - 구현: HTTP API 타입, Lambda 프록시 통합 사용.
  - 주요 리소스: `aws_apigatewayv2_api`, `aws_apigatewayv2_integration`, `aws_apigatewayv2_route`, `aws_apigatewayv2_stage`.
- **Lambda 함수 (`api_lambda.tf`, `backend/lambdas/problem-grader/lambda_function.py`):**
  - 역할:
    1.  **Starter:** API Gateway 요청 처리, 입력 검증, `submission_id` 생성, Step Functions 실행 시작, 초기 상태 DB 저장, 202 응답 반환.
    2.  **Task Handler:** Step Functions `Task` 상태에서 호출되어 특정 로직 수행 (`getProblemDetails`, `parseS3Output`, `aggregateResults`, `prepareMapInput`). `action` 키로 분기.
  - 구현: Python 런타임, Boto3 SDK 사용. `RUNNER_INFO_JSON` 환경 변수를 통해 언어별 Runner 정보 로드.
  - 주요 리소스: `aws_lambda_function`, `aws_lambda_permission`, `data.archive_file` (코드 패키징).
- **Step Functions 상태 머신 (`step_functions.tf`, `problem_grader_statemachine.asl.json`):**
  - 역할: 채점 워크플로우 정의 및 실행 오케스트레이션.
  - 구현: Standard Workflow 타입. ASL (JSON 형식)으로 워크플로우 정의 (`problem_grader_statemachine.asl.json`), Terraform `templatefile` 함수로 로드.
  - 주요 리소스: `aws_sfn_state_machine`, `aws_iam_role` (sfn_execution_role), `aws_iam_policy` (sfn_grader_policy).
- **ECS Fargate Tasks (`ecs.tf`, `backend/lambdas/problem-grader/docker/generator/Dockerfile`, `backend/lambdas/problem-grader/docker/runner-python/Dockerfile` 등):**
  - 역할: 테스트 케이스 생성(Generator) 및 사용자 코드 실행(Runner)을 위한 격리된 환경 제공.
  - 구현: Docker 컨테이너 기반. Fargate Launch Type 사용 (서버리스). 환경 변수로 입력 전달, 결과를 JSON으로 표준 출력 또는 S3에 저장.
  - 주요 리소스: `aws_ecs_cluster`, `aws_ecs_task_definition` (generator, runner_python 등), `aws_cloudwatch_log_group`.
- **S3 (`storage.tf`):**
  - 역할: Generator 및 Runner Task의 중간 출력 결과(JSON 파일) 저장.
  - 구현: 표준 스토리지 클래스 버킷. 경로 규칙(`grader-outputs/{task_type}/{task_id}/output.json`) 사용.
  - 주요 리소스: `aws_s3_bucket`.
- **DynamoDB (`storage.tf`):**
  - 역할:
    1.  `problems_table`: 문제 정보 저장 (생성 코드, 제약 조건 등).
    2.  `submissions_table`: 채점 제출 정보 및 최종 결과 저장.
  - 구현: On-demand 용량 모드 (예상 트래픽 따라 변경 가능). 적절한 기본 키 및 속성 정의.
  - 주요 리소스: `aws_dynamodb_table` (2개).
- **ECR (`ecr.tf`):**
  - 역할: Generator 및 각 언어 Runner의 Docker 이미지 저장 및 버전 관리.
  - 구현: Private 리포지토리.
  - 주요 리소스: `aws_ecr_repository` (generator, runner_python 등).
- **IAM (`iam.tf`):**
  - 역할: 각 서비스에 필요한 최소한의 권한 부여.
    - Lambda 실행 역할: DynamoDB 접근, S3 접근, Step Functions 실행 시작, CloudWatch Logs 쓰기, VPC 접근 권한.
    - Step Functions 실행 역할: Lambda 함수 호출, ECS Task 실행/조회, DynamoDB 쓰기, EventBridge(Task 완료 이벤트용) 접근, IAM 역할 전달(PassRole) 권한.
    - ECS Task 실행 역할 (Execution Role): ECR 이미지 가져오기, CloudWatch Logs 쓰기 권한.
    - ECS Task 역할 (Task Role): 컨테이너 내부에서 S3 접근(결과 저장) 권한.
  - 구현: 각 역할 및 사용자 정의 정책 정의. AWS 관리형 정책 활용.
  - 주요 리소스: `aws_iam_role`, `aws_iam_policy`, `aws_iam_role_policy_attachment`.

## 5. Terraform 구조 (`*.tf`, `locals.tf`)

`infrastructure/terraform/problem-grader` 디렉토리 내 Terraform 파일들은 다음과 같이 구성됩니다.

- `provider.tf`: AWS Provider 및 리전 설정.
- `variables.tf`: 리전, 프로젝트 이름, 환경, 컨테이너 이름 등 재사용 가능한 변수 정의.
- `backend.tf`: Terraform 상태 파일 원격 관리 (S3, DynamoDB) 설정. **(사용자 수정 필요)**
- `network.tf`: VPC, 서브넷, 라우팅 테이블, 인터넷 게이트웨이, 보안 그룹 등 네트워킹 리소스 정의.
- `storage.tf`: S3 버킷 (결과 저장용) 및 DynamoDB 테이블 (문제, 제출 정보 저장용) 정의.
- `ecr.tf`: Generator 및 Runner Docker 이미지를 저장할 ECR 리포지토리 정의.
- `iam.tf`: Lambda, ECS Task, Step Functions 실행에 필요한 IAM 역할 및 정책 정의.
- `ecs.tf`: ECS 클러스터, CloudWatch 로그 그룹, Fargate Task Definition (Generator, Runner) 정의.
- `step_functions.tf`: Step Functions 상태 머신 및 관련 IAM 역할 정의. `templatefile` 함수를 사용하여 ASL 정의 로드.
- `problem_grader_statemachine.asl.json`: Step Functions 상태 머신의 실제 워크플로우 정의 (Amazon States Language).
- `api_lambda.tf`: 채점 요청을 받아 Step Functions 실행을 시작하는 Lambda 함수 및 API Gateway 엔드포인트 정의.
- `locals.tf`: 여러 파일에서 참조되는 로컬 변수(서브넷 ID 리스트, 보안 그룹 ID 리스트, 언어별 Runner 정보 맵 등)를 중앙에서 정의.
- `outputs.tf`: 배포 후 생성된 주요 리소스의 식별자 (API URL, S3 버킷 이름, 상태 머신 ARN 등) 출력.

## 6. 배포 방법 (Deployment Steps)

다음 단계를 따라 시스템을 AWS에 배포합니다.

**사전 요구 사항:**

- AWS 계정 및 Access Key/Secret Key (또는 IAM Role 기반 인증)
- AWS CLI 설치 및 인증 구성 완료 (`aws configure`)
- Terraform CLI 설치 (권장 버전 확인)
- Docker 설치

**배포 단계:**

1.  **Terraform 상태 백엔드 설정 (필수):**
    - `infrastructure/terraform/problem-grader/backend.tf` 파일을 엽니다.
    - `bucket`과 `dynamodb_table` 값을 Terraform 상태 파일을 저장할 S3 버킷 이름과 잠금(Locking)에 사용할 DynamoDB 테이블 이름으로 **수정합니다.** (이 S3 버킷과 DynamoDB 테이블은 미리 생성되어 있어야 합니다.)
    - 이 단계는 Terraform 상태를 안전하게 원격으로 관리하기 위해 중요합니다.
2.  **Terraform 초기화 및 배포:**
    - 터미널에서 `infrastructure/terraform/problem-grader` 디렉토리로 이동합니다.
    - `terraform init` 명령어를 실행하여 Terraform 작업 디렉토리를 초기화하고 필요한 플러그인을 다운로드합니다.
    - `terraform plan` 명령어를 실행하여 생성될 리소스 계획을 검토합니다.
    - `terraform apply` 명령어를 실행하고, 확인 메시지가 나타나면 `yes`를 입력하여 인프라 배포를 시작합니다. 이 과정에서 ECR 리포지토리, S3 버킷, DynamoDB 테이블, ECS 클러스터, Step Functions 상태 머신, Lambda 함수, API Gateway 등이 생성됩니다.
3.  **Docker 이미지 빌드 및 ECR 푸시:**
    - `terraform apply`가 완료되면, `terraform output generator_ecr_repository_url` 및 `terraform output runner_python_ecr_repository_url` 명령어를 실행하여 생성된 ECR 리포지토리 URL을 확인합니다.
    - Generator Docker 이미지를 빌드합니다.
      ```bash
      cd backend/lambdas/problem-grader/docker/generator
      docker build -t <generator_ecr_repository_url>:latest .
      ```
    - Python Runner Docker 이미지를 빌드합니다.
      ```bash
      cd ../runner-python # 경로 이동
      docker build -t <runner_python_ecr_repository_url>:latest .
      ```
    - AWS ECR에 로그인합니다. (리전 및 계정 ID는 환경에 맞게 조정)
      ```bash
      aws ecr get-login-password --region <your-aws-region> | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.<your-aws-region>.amazonaws.com
      ```
    - 빌드된 이미지를 ECR에 푸시합니다.
      ```bash
      docker push <generator_ecr_repository_url>:latest
      docker push <runner_python_ecr_repository_url>:latest
      ```
    - **(참고)** 만약 Terraform Task Definition에서 `latest` 태그 대신 특정 태그를 사용하도록 설정했다면, 해당 태그로 빌드하고 푸시해야 합니다. 초기 배포 시에는 `latest` 사용이 일반적입니다.
4.  **출력 확인:**
    - `terraform output api_gateway_endpoint` 명령어를 실행하여 배포된 API Gateway의 호출 URL을 확인합니다.
    - `terraform output step_functions_state_machine_arn` 명령어를 실행하여 생성된 상태 머신의 ARN을 확인합니다.

## 7. 사용 방법 (Usage)

배포된 시스템을 사용하여 코드 채점을 요청하는 방법은 다음과 같습니다.

1.  **API 엔드포인트 확인:** `terraform output api_gateway_endpoint` 명령어로 얻은 URL을 확인합니다. (예: `https://abcdef123.execute-api.us-east-1.amazonaws.com`)
2.  **채점 요청 보내기:** 확인된 엔드포인트 URL 뒤에 `/problems/{problem_id}/grade` 경로를 붙여 HTTP POST 요청을 보냅니다. `{problem_id}`는 채점할 문제의 ID로 대체합니다.
    - **HTTP Method:** `POST`
    - **URL:** `{api_gateway_endpoint}/problems/{problem_id}/grade`
    - **Headers:** `Content-Type: application/json`
    - **Request Body (JSON):**
      ```json
      {
        "language": "python", // 지원하는 언어 (예: "python")
        "user_code": "# 여기에 사용자 코드를 문자열로 입력\ndef solution(n):\n  return n + 1"
      }
      ```
3.  **응답 확인:** 요청이 성공적으로 접수되면 Lambda 함수는 즉시 다음과 같은 형식의 HTTP 202 Accepted 응답을 반환합니다.
    ```json
    {
      "message": "Grading process started.",
      "submission_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" // 생성된 고유 제출 ID
    }
    ```
4.  **결과 확인 (비동기):** 채점은 백그라운드에서 진행되므로, 결과를 확인하려면 다음 방법 중 하나를 사용합니다.
    - **DynamoDB 조회:** `terraform output submissions_table_name`으로 확인된 DynamoDB 테이블에서 반환받은 `submission_id`를 기본 키로 사용하여 항목을 조회합니다. `status` 속성 (PENDING, ACCEPTED, WRONG_ANSWER 등) 및 `results_json` (또는 `results_summary_json`) 속성을 통해 결과를 확인할 수 있습니다.
    - **Step Functions 콘솔:** AWS 관리 콘솔에서 Step Functions 서비스로 이동하여 해당 상태 머신(`terraform output step_functions_state_machine_arn`으로 확인)을 찾습니다. 실행 목록에서 해당 `submission_id` (실행 이름)를 찾아 실행 세부 정보 및 각 단계의 상태, 입력/출력을 시각적으로 확인할 수 있습니다.

## 8. 문제 해결 (Troubleshooting)

오류 발생 시 다음 위치에서 관련 정보를 확인할 수 있습니다.

- **Step Functions 실행 히스토리:** 워크플로우의 어떤 상태에서 오류가 발생했는지, 해당 상태의 입력/출력 및 오류 메시지를 확인하는 가장 좋은 방법입니다. (AWS Step Functions 콘솔)
- **CloudWatch Logs:**
  - **Lambda 함수 로그:** `/aws/lambda/{lambda_function_name}` 로그 그룹에서 Starter Lambda 및 Task Lambda의 실행 로그, 오류 메시지, `print` 또는 `logger` 출력 등을 확인할 수 있습니다.
  - **ECS Task 로그:** `/aws/ecs/{task_definition_family}` (예: `/aws/ecs/problem-grader-generator-dev`)와 같은 로그 그룹에서 Generator 및 Runner 컨테이너의 표준 출력(stdout) 및 표준 에러(stderr) 로그를 확인할 수 있습니다. 컨테이너 내부 오류 디버깅에 유용합니다.
- **Terraform 오류:** `terraform plan` 또는 `terraform apply` 실행 중 발생하는 오류는 주로 설정 오류(변수 누락, 리소스 이름 중복 등), 권한 부족, 또는 AWS 서비스 제한 때문일 수 있습니다. 오류 메시지를 주의 깊게 읽어보세요.
- **IAM 권한 오류:** "Access Denied" 또는 "is not authorized to perform"과 같은 오류는 관련된 IAM 역할(`lambda_execution_role`, `sfn_execution_role`, `ecs_task_role` 등)에 필요한 권한이 누락된 경우 발생합니다. `iam.tf` 파일의 정책 정의를 검토하고 수정해야 합니다.
- **네트워크 오류:** Lambda 함수나 ECS Task가 VPC 내 다른 리소스(예: RDS 데이터베이스 - 이 프로젝트에는 없음) 또는 외부 인터넷에 접근해야 하는데 서브넷 라우팅, 보안 그룹 규칙, NAT 게이트웨이 등이 잘못 설정된 경우 발생할 수 있습니다. `network.tf` 파일 및 관련 설정을 확인하세요.

## 9. 확장성 (Extensibility)

새로운 프로그래밍 언어 지원을 추가하려면 다음 단계를 따릅니다.

1.  **Runner Dockerfile 및 코드 작성:** 해당 언어의 코드를 실행하고 결과를 지정된 JSON 형식으로 출력(또는 S3에 저장)하는 Runner 컨테이너의 Dockerfile과 내부 코드를 작성합니다.
2.  **ECR 리포지토리 생성 (Terraform):** `ecr.tf` 파일에 새로운 언어 Runner를 위한 `aws_ecr_repository` 리소스를 추가합니다.
3.  **ECS Task Definition 생성 (Terraform):** `ecs.tf` 파일에 새로운 언어 Runner를 위한 `aws_ecs_task_definition` 리소스를 추가합니다. 적절한 Docker 이미지(ECR 리포지토리 URL 사용), 컨테이너 이름, 리소스 제한 등을 설정합니다.
4.  **언어 정보 맵 업데이트 (Terraform):** `locals.tf` 파일의 `runner_info_map` 로컬 변수에 새로운 언어 항목을 추가합니다. 해당 언어를 키로 사용하고, 값으로 생성된 Task Definition ARN (`aws_ecs_task_definition.<new_runner_task_def>.arn`)과 컨테이너 이름(`var.<new_runner_container_name>`)을 지정합니다.
5.  **(선택적) 컨테이너 이름 변수 추가 (Terraform):** `variables.tf` 파일에 새로운 Runner 컨테이너 이름을 위한 변수를 추가합니다.
6.  **Terraform 적용:** `terraform apply`를 실행하여 변경 사항을 배포합니다.
7.  **Docker 이미지 빌드 및 푸시:** 새로 생성된 ECR 리포지토리 URL을 확인하고, 작성한 Runner Docker 이미지를 빌드하여 해당 리포지토리에 푸시합니다.
8.  **테스트:** 새로운 언어를 `language` 파라미터로 지정하여 채점 요청을 보내고 정상적으로 동작하는지 확인합니다.
