# Problem Solver 백엔드 시스템

## 1. 개요

사용자가 입력한 프롬프트를 기반으로 코딩 문제를 자동 생성하고, 사용자가 제출한 코드를 채점하는 통합 백엔드 시스템입니다. 문제 생성은 **`@problem-generator-aws`** 서비스가 담당하며, 생성된 문제는 DynamoDB에 저장됩니다. 채점은 **`@problem-grader`** 시스템이 처리하며, AWS Fargate/ECS를 활용한 안전한 코드 실행 환경과 AWS Step Functions 기반의 워크플로우를 사용합니다.

## 1.1. `@problem-generator-aws` 서비스

- **역할**: 사용자가 HTTP API를 통해 전달한 자연어 프롬프트와 난이도 설정을 바탕으로 알고리즘 코딩 문제를 생성합니다.
- **주요 기술**: AWS Lambda, LangChain 프레임워크, Google AI API (Gemini 모델)를 사용하여 문제를 생성합니다.
- **인터페이스**: API Gateway를 통해 HTTP API (`POST /problems`, `GET /problems`, `GET /problems/{problemId}`)를 제공합니다. `POST /problems` 요청 시, API 핸들러는 즉시 `202 Accepted`를 반환하고 실제 생성은 백그라운드에서 비동기적으로 처리됩니다.
- **데이터 저장**: 최종적으로 생성된 문제 데이터(제목, 설명, 제약 조건, 테스트 케이스 데이터, 테스트 케이스 생성 코드 등)는 DynamoDB의 `Problems` 테이블에 저장되어 채점 시스템 및 API 조회를 통해 사용됩니다.

## 2. 시스템 목표

- 프롬프트 기반 코딩 문제 자동 생성 API 제공
- 생성된 문제 조회 API 제공
- 사용자 코드 제출 및 채점 API 제공 (`@problem-grader`)
- 정의된 테스트 케이스 기반 정확성 채점 (`@problem-grader`)
- 안전하고 확장 가능한 코드 실행 및 채점 환경 (`@problem-grader`)

## 3. 아키텍처

```mermaid
graph LR
    subgraph Problem Generation (@problem-generator-aws)
        A[Client] -- 생성/조회 요청 --> B(API Gateway / Lambda);
        B -- 생성 요청 (Async Invoke) --> C(Problem Generator: Lambda);
        C -- 문제 생성 --> D{Problems Table: DynamoDB};
        B -- 조회 요청 --> D;
    end

    subgraph Problem Grading (@problem-grader)
        E[Client] -- 채점 요청 --> F(API Gateway / Lambda);
        F -- 문제 정보 조회 --> D;
        F -- 워크플로우 시작 --> G(Step Functions: GraderStateMachine);
        G -- Fargate Task 실행 요청 (병렬) --> H(Code Runner: Fargate Task);
        H -- 결과 반환 --> G;
        G -- 최종 결과 처리 요청 --> I(Result Processor: Lambda);
        I -- 채점 결과 저장 --> J{Submissions Table: DynamoDB};
        J -- 결과 조회 --> E;
    end
```

**흐름:**

1.  **(문제 생성)** 클라이언트가 `@problem-generator-aws`의 API (`POST /problems`)를 통해 문제 생성을 요청합니다.
2.  `ProblemApiHandlerFunction` Lambda가 요청을 수신하고, `ProblemGeneratorAWSFunction` Lambda를 비동기적으로 호출한 후 `202 Accepted`를 반환합니다.
3.  `ProblemGeneratorAWSFunction` Lambda는 LangChain과 Google AI API를 사용하여 문제를 생성하고, 결과를 **`Problems` DynamoDB 테이블에 저장합니다.**
4.  **(문제 조회)** 클라이언트가 `@problem-generator-aws`의 API (`GET /problems` 또는 `GET /problems/{problemId}`)를 통해 문제를 조회합니다.
5.  `ProblemApiHandlerFunction` Lambda가 `Problems` 테이블에서 해당 문제 정보를 조회하여 반환합니다.
6.  **(채점)** 클라이언트가 `@problem-grader`의 API를 통해 채점을 요청합니다 (문제 ID, 사용자 코드 등).
7.  `problem-grader-api` Lambda가 `Problems` 테이블에서 해당 문제의 테스트 케이스 정보를 조회합니다.
8.  Lambda는 Step Functions 워크플로우(`GraderStateMachine`)를 시작시킵니다.
9.  Step Functions는 각 테스트 케이스에 대해 병렬로 `code-runner` Fargate Task를 실행합니다.
10. `code-runner` Fargate Task는 코드를 실행하고 결과를 반환합니다.
11. Step Functions는 결과를 취합하여 `result-processor` Lambda에 전달합니다.
12. `result-processor` Lambda는 최종 채점 결과를 계산하고 **`Submissions` DynamoDB 테이블에 저장합니다.**

## 4. 구성 요소 상세

- **`@problem-generator-aws`:**
  - **`ProblemApiHandlerFunction` (Lambda + API Gateway):** HTTP 요청 처리, 기본 유효성 검사, `ProblemGeneratorAWSFunction` 비동기 호출, `Problems` 테이블 조회.
  - **`ProblemGeneratorAWSFunction` (Lambda):** LangChain/Google AI 기반 실제 문제 생성 로직 수행, `Problems` 테이블 저장.
  - **`Problems` Table (DynamoDB):** 문제 생성 서비스(`@problem-generator-aws`)가 생성하고 저장하는 문제 정보(제목, 설명, 제약 조건, 테스트 케이스 데이터, 생성 코드 등) 저장소.
- **`@problem-grader`:**
  - **`problem-grader-api` (Lambda + API Gateway):** 채점 요청 수신, `Problems` 테이블 조회, Step Functions 워크플로우 트리거.
  - **Step Functions 워크플로우 (`GraderStateMachine`):** 전체 채점 과정 조율 (Fargate Task 병렬 실행, 결과 취합, `result-processor` 호출).
  - **`code-runner` (Fargate Task):** 단일 테스트 케이스에 대한 사용자 코드 실행 및 결과 측정.
  - **`result-processor` (Lambda):** 채점 결과 계산 및 `Submissions` 테이블 저장.
  - **`Submissions` Table (DynamoDB):** 사용자 제출 정보 및 최종 채점 결과 저장.

## 5. 개발 단계 (요약)

1.  `problem-generator-aws` 및 `problem-grader` 관련 폴더 구조 생성 및 기본 설정.
2.  DynamoDB 테이블 (`Problems`, `Submissions`) 스키마 설계 및 IaC 코드로 정의 (`problem-infra/template.yaml`).
3.  `@problem-generator-aws` Lambda 함수 구현 (API 핸들러, 생성 로직, DB 저장).
4.  `code-runner` Fargate Task용 Docker 이미지 개발 (`problem-grader`).
5.  `code-runner` Fargate Task Definition 정의 (IaC).
6.  Step Functions 워크플로우 정의 (IaC).
7.  `problem-grader-api` Lambda 함수 구현.
8.  `result-processor` Lambda 함수 구현.
9.  API Gateway 또는 Lambda 함수 URL 설정 (IaC).
10. IAM 역할 및 권한 설정 (IaC - 최소 권한 원칙).
11. 단위/통합 테스트 및 배포 자동화 (`sam build`, `sam deploy`).

## 6. 주요 고려 사항

- **보안:** `code-runner` Fargate Task의 샌드박싱 환경 구축.
- **확장성:** 비동기 처리, Step Functions, Fargate 기반 확장성 확보. Lambda/Fargate 리소스 설정 조정.
- **비용:** Lambda 호출, Google AI API 사용량, Fargate Task 실행 시간, Step Functions 상태 전환, DynamoDB 사용량 등 비용 예측 및 최적화.
- **언어 지원:** 현재 문제 생성은 C++ 템플릿 기반, 테스트 케이스 생성 코드는 Python. 채점 시 다양한 언어 지원 필요 (`code-runner`).
- **타임아웃:** Lambda, Fargate Task, Step Functions 등 각 컴포넌트 타임아웃 설정 관리.
- **데이터 형식:** **`Problems` 테이블 스키마는 `@problem-generator-aws`와 `@problem-grader` 양쪽 모두에게 중요.** 변경 시 관련 로직 수정 필요.
