# Problem Grader & Generator System

이 문서는 코드 채점(`@problem-grader`) 및 문제 생성 스트리밍(`@problem-generator-streaming`) 시스템의 통합 아키텍처, 워크플로우, 구성 요소, 배포 및 사용 방법에 대해 상세히 설명합니다. 여러 AWS 서비스를 복합적으로 사용하므로 처음 접하는 사용자를 위해 최대한 자세히 기술되었습니다.

## 1. 개요 (Overview)

이 시스템은 크게 두 가지 주요 기능을 제공합니다.

1.  **문제 생성 (Streaming):** 사용자의 프롬프트를 기반으로 여러 단계(분석, 변환, 설명, 테스트 케이스 생성 코드 등)에 걸쳐 프로그래밍 문제를 생성하고, 그 과정을 실시간으로 스트리밍합니다.
2.  **코드 채점 (Async Grading):** 사용자가 제출한 코드를 특정 문제에 대해 채점합니다. 채점 요청 시 즉시 결과를 반환하는 대신, 고유한 `submission_id`를 반환하고 백그라운드에서 비동기적으로 채점 프로세스를 진행합니다.

**주요 특징:**

- **통합 관리:** 문제 생성과 코드 채점에 필요한 AWS 인프라를 단일 Terraform 프로젝트에서 관리합니다.
- **비동기 채점:** AWS Step Functions를 사용하여 복잡하고 시간이 오래 걸릴 수 있는 채점 워크플로우를 안정적으로 오케스트레이션합니다.
- **실시간 생성 과정:** WebSocket (또는 유사 기술)을 사용하여 문제 생성의 각 단계별 결과를 클라이언트에 실시간 스트리밍합니다.
- **확장 가능한 실행 환경:** ECS Fargate를 사용하여 테스트 케이스 생성 및 코드 실행 환경을 컨테이너화하여 필요에 따라 확장합니다.
- **다양한 언어 지원 (확장 가능):** 채점 시 Python을 기본으로 지원하며, 다른 언어 Runner 추가가 용이하도록 설계되었습니다.

## 2. 아키텍처 (Architecture)

이 통합 시스템은 다음과 같은 주요 AWS 서비스들로 구성됩니다.

- **Amazon API Gateway:** 두 가지 주요 API 엔드포인트를 제공합니다.
  - **HTTP API (채점용):** 코드 채점 요청(`POST /problems/{problem_id}/grade`)을 수신하여 Starter Lambda를 트리거합니다.
  - **WebSocket API (문제 생성 스트리밍용 - 가정):** 클라이언트와 WebSocket 연결을 관리하고, Streaming Lambda와 상호작용합니다. (또는 HTTP 기반 스트리밍 방식일 수도 있음)
- **AWS Lambda:** 여러 역할을 수행합니다.
  - **Starter Lambda (채점용):** 채점 요청 처리, Step Functions 워크플로우 실행 시작.
  - **Task Lambda (채점용):** Step Functions 워크플로우 내 특정 작업 수행 (DB 조회, S3 파싱, 결과 집계 등).
  - **Streaming Lambda (생성용):** WebSocket 연결 관리, 문제 생성 로직(`ProblemGenerator` 클래스) 호출, 각 단계 결과 스트리밍.
- **AWS Step Functions (Standard Workflow):** **코드 채점** 프로세스를 상태 머신으로 정의하고 오케스트레이션합니다.
- **Amazon ECS (with AWS Fargate):** 컨테이너화된 작업을 실행합니다.
  - **Test Case Generation Task (채점 시):** Step Functions 워크플로우 내에서 실행되며, DynamoDB에 저장된 `generation_code`를 사용하여 **채점 시점에 테스트 케이스를 재생성**합니다.
  - **Runner Task (채점 시):** 제출된 사용자 코드를 각 테스트 케이스에 대해 실행합니다.
- **Amazon S3:** 채점 과정 중 생성되는 중간 결과 파일(테스트 케이스, 실행 결과 등)을 저장합니다.
- **Amazon DynamoDB:** 두 개의 주요 테이블을 사용합니다.
  - **`problems_table`:** 문제 정보(설명, `generation_code`, 제약 조건 등)를 저장하는 중앙 저장소. Generator가 쓰고 Grader가 읽습니다.
  - **`submissions_table`:** 코드 제출 정보 및 최종/초기 채점 결과를 저장합니다.
- **Amazon ECR:** Test Case Generator 및 각 언어 Runner의 Docker 이미지를 저장합니다.
- **AWS IAM:** 각 서비스가 다른 서비스에 접근하는 데 필요한 역할과 정책을 정의합니다.

**데이터 및 제어 흐름:**

**A. 문제 생성 흐름 (Streaming):**

1.  클라이언트가 WebSocket API에 연결 요청을 보냅니다.
2.  API Gateway가 Streaming Lambda를 트리거하여 연결을 수립합니다.
3.  클라이언트가 문제 생성 시작 메시지(프롬프트 포함)를 전송합니다.
4.  Streaming Lambda는 `ProblemGenerator` 로직을 단계별로 호출합니다.
5.  각 단계(분석, 변환, 설명, 테스트 케이스 생성 코드 생성 등) 결과가 나올 때마다 Streaming Lambda는 WebSocket을 통해 클라이언트에 결과를 스트리밍합니다.
6.  모든 단계 완료 후, 생성된 문제 정보(특히 `generation_code`)를 DynamoDB `problems_table`에 저장합니다.
7.  최종 완료 메시지를 클라이언트에 전송하고 연결을 종료(또는 유지)합니다.

**B. 코드 채점 흐름 (Async Grading via Step Functions):**

1.  사용자는 채점용 HTTP API 엔드포인트(`POST /problems/{problem_id}/grade`)로 문제 ID, 언어, 코드를 전송합니다.
2.  API Gateway가 Starter Lambda를 트리거합니다.
3.  Starter Lambda는 요청 검증, `submission_id` 생성, **Step Functions 상태 머신 실행 시작** (입력 전달), DynamoDB `submissions_table`에 초기 상태('PENDING') 저장 후, 사용자에게 `submission_id`를 포함한 202 응답을 반환합니다.
4.  Step Functions 워크플로우가 시작되어 다음 상태들을 실행합니다.
    - `GetProblemDetails` (Task Lambda): `problems_table`에서 `problem_id`로 문제 정보(특히 `generation_code`, `time_limit`) 조회.
    - `GenerateTestCases` (ECS Fargate Task - `.sync`): 조회된 `generation_code`를 입력으로 받아 **테스트 케이스들을 재생성**하고 결과를 S3에 저장.
    - `ParseGeneratorOutput` (Task Lambda): S3에서 생성된 테스트 케이스 파일 파싱.
    - `PrepareMapInput` (Task Lambda): 실행할 언어에 맞는 Runner 정보(Task Def ARN, 컨테이너 이름)를 조회하여 `context`에 추가.
    - `RunTestCasesMap` (Map State): 각 테스트 케이스(`items`)에 대해 내부 워크플로우(`Iterator`) 병렬 실행:
      - **`RunSingleTestCase`:** 해당 언어 Runner Task를 동기적(`.sync`)으로 실행 (사용자 코드, 입력 데이터, 제한 시간 전달). `TaskDefinition` 및 컨테이너 `Name`은 `PrepareMapInput` 결과(`context`) 참조.
      - **`ParseRunnerOutput`:** Runner Task의 S3 결과 파싱.
      - **`FormatMapItemResult`:** Map 반복 출력을 위한 데이터 가공.
      - **`MapItemFail`:** 반복 내 오류 처리.
    - `AggregateResults`: 모든 테스트 케이스 결과 집계, 최종 상태 판정 (출력 비교 포함).
    - `SaveResult`: 최종 결과를 DynamoDB `submissions_table`에 저장.
5.  워크플로우가 성공 또는 실패 상태로 종료됩니다.

**테스트 케이스 처리 방식 (옵션 A 채택):**

이 시스템은 **옵션 A: 채점 시 테스트 케이스 재생성** 방식을 사용합니다. 즉:

- 문제 생성 시(`@problem-generator-streaming`), 실제 테스트 케이스 데이터(입력/출력 쌍) 자체를 저장하는 대신, 해당 테스트 케이스들을 **생성할 수 있는 코드 또는 로직(`generation_code`)** 을 DynamoDB `problems_table`에 저장합니다.
- 코드 채점 시(`@problem-grader`), Step Functions 워크플로우의 `GenerateTestCases` 단계에서 이 `generation_code`를 실행하는 별도의 ECS Task를 구동하여 필요한 테스트 케이스들을 **매번 동일하게 재생성**합니다.
- **장점:** 문제 정의가 `generation_code`로 단순화되고 저장 공간이 절약됩니다. 채점 시 항상 동일한 테스트 케이스 사용이 보장됩니다.
- **단점:** 채점 시마다 테스트 케이스를 생성하는 시간이 소요됩니다. Grader 워크플로우에 테스트 케이스 생성 단계가 필요합니다.

**왜 Step Functions를 사용하는가? (채점 워크플로우)**

- Lambda 타임아웃 한계 극복, 복잡한 작업(ECS Task 실행/대기) 오케스트레이션, 시각적 워크플로우 및 디버깅, 내장된 오류 처리/재시도 기능 활용.

## 3. 워크플로우 상세 (Detailed Workflow - Step Functions for Grading)

코드 채점 워크플로우는 `infrastructure/terraform/problem_service/problem_grader_statemachine.asl.json` 파일에 정의되어 있습니다. 주요 상태는 다음과 같습니다.

- **`GetProblemDetails`:** DynamoDB에서 문제 정보 (`generation_code`, `time_limit` 등) 조회.
- **`CheckProblemDetails`:** 문제 정보 조회 성공 여부 확인.
- **`GenerateTestCases`:** ECS Fargate Task를 동기적(`.sync`)으로 실행. 입력받은 `generation_code`를 사용하여 **테스트 케이스들을 재생성**하고 결과를 S3에 저장.
- **`ParseGeneratorOutput`:** S3의 Generator 출력(테스트 케이스 목록) 파싱.
- **`CheckGeneratedCases`:** 유효한 테스트 케이스가 생성되었는지 확인.
- **`PrepareMapInput`:** Lambda를 호출하여 실행 언어에 맞는 Runner Task Definition ARN과 컨테이너 이름을 조회하고, Map 상태 실행을 위한 입력(`context`, `items`) 준비.
- **`RunTestCasesMap` (Map State):** 각 테스트 케이스(`items`)에 대해 내부 워크플로우(`Iterator`) 병렬 실행:
  - **`RunSingleTestCase`:** 해당 언어 Runner Task를 동기적(`.sync`)으로 실행 (사용자 코드, 입력 데이터, 제한 시간 전달). `TaskDefinition` 및 컨테이너 `Name`은 `PrepareMapInput` 결과(`context`) 참조.
  - **`ParseRunnerOutput`:** Runner Task의 S3 결과 파싱.
  - **`FormatMapItemResult`:** Map 반복 출력을 위한 데이터 가공.
  - **`MapItemFail`:** 반복 내 오류 처리.
- **`AggregateResults`:** 모든 테스트 케이스 결과 집계, 최종 상태 판정 (출력 비교 포함).
- **`SaveResult`:** 최종 결과를 DynamoDB `submissions_table`에 저장.
- **`FailState` / `SuccessState`:** 워크플로우 최종 상태.

## 4. 주요 구성 요소 (Core Components)

- **API Gateway (`api_lambda.tf` 등):**
  - 채점 요청용 HTTP API (`POST /problems/{problem_id}/grade`).
  - 문제 생성 스트리밍용 WebSocket API (가정).
- **Lambda 함수 (`api_lambda.tf`, `lambda_function.py` 등):**
  - **Starter Lambda (채점):** API Gateway -> Step Functions 실행 시작.
  - **Task Lambda (채점):** Step Functions `Task` 상태 처리 (`getProblemDetails`, `parseS3Output`, `aggregateResults`, `prepareMapInput`). `RUNNER_INFO_JSON` 환경 변수 사용.
  - **Streaming Lambda (생성):** WebSocket 연결 관리, `ProblemGenerator` 호출, 결과 스트리밍.
- **Step Functions 상태 머신 (`step_functions.tf`, `problem_grader_statemachine.asl.json`):**
  - 코드 채점 워크플로우 오케스트레이션. ASL로 정의.
- **ECS Fargate Tasks (`ecs.tf`, Dockerfiles):**
  - **Test Case Generation Task:** 채점 시 `generation_code`를 받아 테스트 케이스 재생성.
  - **Runner Task:** 사용자 코드 실행.
- **Amazon S3:** 채점 중간 결과 (재생성된 테스트 케이스, Runner 출력) 저장.
- **Amazon DynamoDB:** 두 개의 주요 테이블을 사용합니다.
  - **`problems_table`:** 문제 정보 저장 (특히 `generation_code` 포함).
  - **`submissions_table`:** 채점 제출/결과 저장.
- **Amazon ECR:** Test Case Generator 및 각 언어 Runner의 Docker 이미지를 저장합니다.
- **AWS IAM:** 각 서비스가 다른 서비스에 접근하는 데 필요한 역할과 정책을 정의합니다.

## 5. Terraform 구조 (`*.tf`, `locals.tf`)

`infrastructure/terraform/problem_service` 디렉토리 내 Terraform 코드는 **문제 생성 스트리밍과 코드 채점 시스템 모두에 필요한 AWS 인프라를 통합 관리**합니다.

- `provider.tf`: AWS Provider 및 리전 설정.
- `variables.tf`: 프로젝트 전반에 사용되는 변수 정의 (리전, 이름 지정 규칙, Lambda 설정 등 - Generator Streaming 관련 변수 포함).
- `backend.tf`: Terraform 상태 원격 관리 설정 **(사용자 수정 필요)**.
- `network.tf`: VPC, 서브넷, 보안 그룹 등 네트워킹 리소스.
- `storage.tf`: S3 버킷 (채점 결과 저장용), DynamoDB 테이블 (`problems_table`, `submissions_table`).
- `ecr.tf`: ECR 리포지토리 (Generator Task, Runner Task 용).
- `iam.tf`: **통합 시스템 전체**에 필요한 IAM 역할 및 정책 (채점용 Lambda/Step Functions/ECS 역할, 생성 스트리밍용 Lambda 역할 등).
- `ecs.tf`: ECS 클러스터, CloudWatch 로그 그룹, Task Definitions (Generator Task, Runner Task 용).
- `step_functions.tf`: **채점용** Step Functions 상태 머신 및 관련 IAM 역할, CloudWatch 로그 그룹.
- `problem_grader_statemachine.asl.json`: **채점용** Step Functions 상태 머신의 워크플로우 정의 (Amazon States Language).
- `api_lambda.tf`: **API 및 Lambda 통합 관리.**
  - 채점용 HTTP API Gateway 및 Starter/Task Lambda 함수.
  - **생성 스트리밍용 WebSocket API Gateway 및 Streaming Lambda 함수.**
  - **Streaming Lambda용 의존성 Layer 생성 로직 (`null_resource`, `local-exec` 사용).**
    - _주의: `local-exec` 방식은 Terraform 실행 환경에 Python/pip가 필요하며, OS 간 호환성 문제가 발생할 수 있습니다. Docker를 사용한 Layer 빌드를 권장합니다._
- `locals.tf`: 중앙 집중식 로컬 변수 정의 (서브넷/보안그룹 ID, Runner 정보 맵 등).
- `outputs.tf`: 배포된 주요 리소스 식별자 출력 (채점 API URL, 상태 머신 ARN, **WebSocket API URL** 등).

**(진행 상황 및 이슈):** 현재 Terraform 리소스 정의는 대부분 통합되었으나, `terraform plan` 실행 시 Step Functions와 Lambda 간의 **순환 종속성 오류**가 발생하고 있습니다. 이는 `problem_grader_statemachine.asl.json` 파일 내 Lambda 참조 방식 확인 및 수정이 필요한 상태입니다.

## 6. 배포 방법 (Deployment Steps)

...(이전과 동일한 내용 유지 - 사전 요구 사항, 백엔드 설정, init/plan/apply, Docker 빌드/푸시, 출력 확인)...

## 7. 사용 방법 (Usage)

**A. 코드 채점 요청:**

...(이전과 동일 - 채점 API 엔드포인트 확인, POST 요청 예시, submission_id 확인, 결과 확인 방법)...

**B. 문제 생성 요청 (Streaming):**

**(구현 후 추가 예정)** WebSocket 엔드포인트 연결 및 메시지 프로토콜에 대한 설명이 필요합니다.

## 8. 문제 해결 (Troubleshooting)

...(이전과 동일 - Step Functions 히스토리, CloudWatch Logs (Lambda, ECS), Terraform 오류, IAM 오류, 네트워크 오류 확인)...

## 9. 확장성 (Extensibility)

**A. 채점 언어 추가:**

...(이전과 동일 - Runner Dockerfile/코드 작성, Terraform ECR/TaskDef/locals 수정, 이미지 빌드/푸시, 테스트)...

**B. 문제 생성 로직 확장:**

...(향후 관련 모듈/클래스 수정 및 배포 방법에 대한 설명 추가)...
