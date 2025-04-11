# Problem Grader 시스템 개발 계획

## 1. 개요

사용자가 제출한 소스 코드를 기반으로 코딩 문제의 정답 여부 및 효율성을 채점하는 시스템을 구축한다. AWS Fargate/ECS를 활용하여 안전하고 확장 가능한 코드 실행 환경을 마련하고, AWS Step Functions를 통해 전체 채점 워크플로우를 관리한다. 이 시스템은 **`@problem-generator-streaming`** 서비스가 WebSocket API를 통해 생성하고 DynamoDB에 저장한 문제 데이터를 기반으로 동작한다.

## 1.1. `@problem-generator-streaming` 서비스 (참고)

이 채점 시스템은 `@problem-generator-streaming` 서비스가 생성한 문제를 사용합니다. 해당 서비스는 다음과 같은 특징을 가집니다:

- **역할**: 사용자가 입력한 자연어 프롬프트와 난이도 설정을 바탕으로 알고리즘 코딩 문제를 생성합니다.
- **주요 기술**: AWS Lambda, LangChain 프레임워크, Google AI API (Gemini 모델)를 사용하여 문제를 생성합니다.
- **인터페이스**: WebSocket API를 통해 클라이언트와 통신합니다. 클라이언트는 WebSocket 연결을 통해 문제 생성을 요청하고, 생성 과정(템플릿 분석, 코드 변형, 설명 생성 등)의 상태 업데이트를 실시간으로 스트리밍 받습니다.
- **데이터 저장**: 최종적으로 생성된 문제 데이터(제목, 설명, 테스트 케이스, 제약 조건 등)는 채점 시스템에서 사용할 수 있도록 DynamoDB의 `Problems` 테이블에 저장됩니다.

## 2. 시스템 목표

- 사용자 코드 제출 API 제공
- 정의된 테스트 케이스 기반 정확성 채점
- 실행 시간 및 메모리 사용량 기반 효율성 채점 (선택 사항)
- 다양한 프로그래밍 언어 지원 (초기: Python)
- 안전한 코드 실행 환경 (샌드박싱)
- 확장 가능하고 안정적인 비동기 채점 처리

## 3. 아키텍처

이 채점 시스템은 `@problem-generator-streaming` 서비스가 생성한 문제 데이터에 의존합니다. 전체적인 데이터 흐름은 다음과 같습니다.

```
+-----------------------+
| WebSocket Client      |
+-----------------------+
    | 생성 요청 / 스트리밍
    v
+-----------------------------+
| @problem-generator-streaming|  (별도 서비스)
| (Lambda + WebSocket API)    |
| - LangChain, Google Gemini  |
+-----------------------------+
    | 문제 생성/저장
    v
+------------------------+
| Problems Table         |
| (DynamoDB)             |
+------------------------+
    ^ 조회 (문제 정보)
    |
+---------------------+      +------------------------+      +---------------------------+
|   API Gateway /     |----->| problem-grader-api     |----->|   AWS Step Functions      |
| Lambda Function URL |      | (Lambda)               |      |   (Orchestrator)          |
+---------------------+      +------------------------+      +---------------------------+
       ^ 채점 요청                                                |  (1) 워크플로우 시작
       |                                                          |  (2) Fargate Task 실행 요청 (병렬)
       |                                                          |  (3) 결과 취합
       |                                                          |  (4) 결과 처리 Lambda 호출
+------+-------+                                                   v
|   Client     |<---------------------------------------------+---------------------------+
+--------------+ 채점 결과                                    | result-processor          |---+
       ^ 저장/알림 (비동기)                                   | (Lambda)                  |   |
       |------------------------------------------------------|                           |   |
                                                               +---------------------------+  |
                                                                      | 저장 (채점 결과)      | 조회 (테스트 케이스 결과)
                                                                      v                      |
                                                             +------------------------+      |
                                                             | Submissions Table      |      |
                                                             | (DynamoDB)             |      |
                                                             +------------------------+      |
                                                                                             |
                                                             +---------------------------+   |
                                                             | code-runner (Fargate Task)|<--+
                                                             +---------------------------+
                                                                (안전한 코드 실행 환경)
```

**흐름:**

1.  **(전제 조건)** `@problem-generator-streaming` 서비스가 WebSocket API를 통해 사용자로부터 문제 생성 요청을 받아 처리합니다. 이 과정에서 문제 데이터(제목, 설명, 제약 조건, 테스트 케이스 등)가 생성되어 **`Problems` DynamoDB 테이블에 저장됩니다.**
2.  클라이언트가 채점 시스템의 API Gateway/Lambda Function URL을 통해 채점 요청 (문제 ID, 사용자 코드, 언어 등)을 전송합니다.
3.  `problem-grader-api` Lambda 함수가 요청을 수신하고 기본 유효성을 검사합니다.
4.  `problem-grader-api` Lambda는 요청된 `problemId`를 사용하여 `Problems` 테이블에서 해당 문제의 테스트 케이스 및 제약 조건 정보를 조회합니다.
5.  Lambda는 Step Functions 워크플로우(`GraderStateMachine`)를 시작시키며 사용자 코드, 언어, 조회된 테스트 케이스 및 제약 조건 등 필요한 데이터를 전달합니다.
6.  Step Functions는 전달받은 테스트 케이스 배열을 순회하며, 각 테스트 케이스에 대해 병렬로 `code-runner` Fargate Task 실행을 요청합니다. (`Map State` 활용)
7.  `code-runner` Fargate Task는 할당된 테스트 케이스의 입력 데이터와 사용자 코드를 사용하여 안전한 Docker 컨테이너 환경에서 코드를 실행합니다. 실행 결과(stdout, stderr, 실행 시간, 메모리 사용량 등)를 측정하여 반환합니다.
8.  Step Functions는 모든 Fargate Task의 실행 결과를 취합합니다.
9.  Step Functions는 취합된 결과를 `result-processor` Lambda 함수에 전달하여 최종 채점을 요청합니다.
10. `result-processor` Lambda는 각 테스트 케이스의 실행 결과를 예상 출력과 비교하고, 실행 시간/메모리 사용량 등을 고려하여 최종 채점 결과(점수, 상태 - 예: ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED 등)를 계산합니다.
11. `result-processor` Lambda는 이 최종 결과를 `Submissions` DynamoDB 테이블에 저장합니다.
12. (선택) 클라이언트에게 채점 완료를 알리는 비동기 메커니즘 (예: WebSocket, SNS 등)을 구현할 수 있습니다.

## 4. 구성 요소 상세

- **`@problem-generator-streaming` (Lambda + WebSocket API - 별도 서비스):**
  - 역할: 자연어 프롬프트와 난이도 설정을 기반으로 알고리즘 코딩 문제를 생성하는 서비스.
  - 인터페이스: WebSocket API를 통해 클라이언트와 실시간 스트리밍 통신.
  - 기술: AWS Lambda, LangChain, Google Gemini API.
  - **데이터 출력**: 생성된 문제 데이터(테스트 케이스, 제약 조건 포함)를 `Problems` DynamoDB 테이블에 저장하여 채점 시스템에서 사용할 수 있도록 함.
- **`problem-grader-api` (Lambda):**
  - 역할: 채점 요청 수신, 기본 유효성 검사, `Problems` 테이블 조회, Step Functions 워크플로우 트리거.
- **`Problems` Table (DynamoDB):**
  - 역할: **`@problem-generator-streaming` 서비스가 생성 및 저장한** 문제 정보(테스트 케이스, 제약 조건 등) 저장소.
  - **의존성**: 채점 시스템은 이 테이블의 스키마와 데이터 형식에 강하게 의존함. (`@problem-generator-streaming` 구현 확인 필수)
- **Step Functions 워크플로우 (`GraderStateMachine`):**
  - 역할: 전체 채점 과정 조율 (Fargate Task 병렬 실행, 결과 취합, 오류 처리, `result-processor` 호출).
  - 주요 상태: Map State (테스트 케이스 병렬 처리), Task State (Fargate `ecs:runTask`, Lambda `lambda:invoke`).
- **`code-runner` (Fargate Task):**
  - 역할: 단일 테스트 케이스에 대한 사용자 코드 실행 및 결과 측정 (stdout, stderr, 시간, 메모리).
  - 환경: 언어별 런타임 및 실행/측정 스크립트가 포함된 Docker 컨테이너.
  - 보안: 네트워크 격리, 리소스 제한(CPU, 메모리), 읽기 전용 파일 시스템 등 샌드박싱 적용.
- **`result-processor` (Lambda):**
  - 역할: 모든 `code-runner` Task 결과 취합, 예상 출력과 비교, 최종 점수 및 상태 계산, `Submissions` 테이블 저장.
- **`Submissions` Table (DynamoDB):**
  - 역할: 사용자 제출 정보 및 최종 채점 결과 저장.
  - 스키마 예시: `submissionId` (PK), `problemId` (GSI PK), `userId`, `code`, `language`, `status`, `score`, `results` (List: {testcaseId, status, stdout, stderr, time, memory}), `createdAt`, ...

## 5. 개발 단계 (요약)

1.  `problem-grader` 폴더 구조 생성 및 기본 설정 (`requirements.txt`, IaC 설정 파일 등).
2.  DynamoDB 테이블 (`Submissions`) 스키마 설계 및 IaC 코드로 정의.
3.  **`@problem-generator-streaming` 서비스가 사용하는 `Problems` 테이블 스키마 확인 및 의존성 명확화.**
4.  `code-runner` Fargate Task용 Docker 이미지 개발 (언어 런타임, 실행/측정 스크립트, 보안 설정).
5.  `code-runner` Fargate Task Definition 정의 (IaC).
6.  Step Functions 워크플로우 정의 (IaC - Map State, Task States, 오류 처리 등).
7.  `problem-grader-api` Lambda 함수 구현 (요청 처리, `Problems` 조회, State Machine 시작).
8.  `result-processor` Lambda 함수 구현 (결과 취합, 채점 로직, `Submissions` 저장).
9.  API Gateway 또는 Lambda 함수 URL 설정 (IaC).
10. IAM 역할 및 권한 설정 (Lambda, Step Functions, Fargate Task - 최소 권한 원칙).
11. 단위/통합 테스트 및 배포 자동화.

## 6. 주요 고려 사항

- **보안:** `code-runner` Fargate Task의 샌드박싱 환경 구축 (네트워크, 파일 시스템, 프로세스 제한 등)이 최우선 과제.
- **확장성:** Step Functions와 Fargate 기반으로 높은 동시성 처리 가능. 필요시 Lambda/Fargate 리소스(CPU, 메모리, 동시 실행 수) 설정 조정.
- **비용:** Fargate Task 실행 시간/횟수, Lambda 호출, Step Functions 상태 전환, DynamoDB 사용량 기반 비용 발생 예측 및 최적화.
- **언어 지원:** 초기 Python 지원 후, 다른 언어 추가 시 `code-runner` Docker 이미지 및 실행 로직 업데이트 필요.
- **타임아웃:** Step Functions, Fargate Task, Lambda 함수 등 각 컴포넌트의 타임아웃 설정 적절히 관리.
- **데이터 의존성:** **`@problem-generator-streaming` 서비스가 `Problems` 테이블에 저장하는 데이터의 스키마와 내용 형식에 대한 강한 의존성 존재.** 변경 시 채점 로직 수정 필요.
