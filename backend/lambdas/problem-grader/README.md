# Problem Grader 시스템 개발 계획

## 1. 개요

사용자가 제출한 소스 코드를 기반으로 코딩 문제의 정답 여부 및 효율성을 채점하는 시스템을 구축한다. AWS Fargate/ECS를 활용하여 안전하고 확장 가능한 코드 실행 환경을 마련하고, AWS Step Functions를 통해 전체 채점 워크플로우를 관리한다.

## 2. 시스템 목표

- 사용자 코드 제출 API 제공
- 정의된 테스트 케이스 기반 정확성 채점
- 실행 시간 및 메모리 사용량 기반 효율성 채점 (선택 사항)
- 다양한 프로그래밍 언어 지원 (초기: Python)
- 안전한 코드 실행 환경 (샌드박싱)
- 확장 가능하고 안정적인 비동기 채점 처리

## 3. 아키텍처

```
+---------------------+      +------------------------+      +---------------------------+
|   API Gateway /     |----->| problem-grader-api     |----->|   AWS Step Functions      |
| Lambda Function URL |      | (Lambda)               |      |   (Orchestrator)          |
+---------------------+      +------------------------+      +---------------------------+
       ^ 채점 요청                | 조회 (문제 정보)                |  (1) 워크플로우 시작
       |                         v                                 |  (2) Fargate Task 실행 요청 (병렬)
       |                      +------------------------+           |  (3) 결과 취합
       |                      | Problems Table         |           |  (4) 결과 처리 Lambda 호출
       |                      | (DynamoDB)             |           v
+------+-------+              +------------------------+      +---------------------------+
|   Client     |<--------------------------------------------| result-processor          |---+
+--------------+   채점 결과 저장/알림 (비동기)                | (Lambda)                  |   |
       ^                                                     +---------------------------+   |
       |-------------------------------------------------------------+                      |
                                                                     | 저장 (채점 결과)         | 조회 (테스트 케이스 결과)
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

1.  클라이언트가 API를 통해 채점 요청 (문제 ID, 사용자 코드, 언어 등) 전송.
2.  `problem-grader-api` Lambda 함수가 요청 수신 및 검증.
3.  `problem-grader-api` Lambda는 DynamoDB의 `Problems` 테이블에서 문제 정보(테스트 케이스, 제약 조건 등) 조회. (`@problem-generator-aws`가 저장한 데이터 활용)
4.  Lambda는 Step Functions 워크플로우를 시작시키며 필요한 데이터 전달.
5.  Step Functions는 각 테스트 케이스에 대해 병렬로 `code-runner` Fargate Task 실행 요청.
6.  `code-runner` Fargate Task는 전달받은 코드와 테스트 케이스 입력을 사용해 안전한 환경에서 코드를 실행하고 결과(stdout, stderr, 시간, 메모리 등) 반환.
7.  Step Functions는 모든 Fargate Task의 결과를 취합하여 `result-processor` Lambda 함수 호출.
8.  `result-processor` Lambda는 취합된 결과를 바탕으로 최종 채점 결과(점수, 상태) 계산.
9.  `result-processor` Lambda는 최종 결과를 DynamoDB의 `Submissions` 테이블에 저장.
10. (선택) 클라이언트에게 채점 완료 알림 전송.

## 4. 구성 요소 상세

- **`problem-grader-api` (Lambda):**
  - 역할: 채점 요청 수신, 기본 유효성 검사, 문제 정보 조회, Step Functions 워크플로우 트리거.
- **`Problems` Table (DynamoDB):**
  - 역할: 문제 정보 저장 (`@problem-generator-aws`와 연동).
  - 스키마 예시: `problemId` (PK), `testcases` (List: {input, expectedOutput}), `timeLimit`, `memoryLimit`, ...
- **Step Functions 워크플로우:**
  - 역할: 전체 채점 과정 조율 (Fargate Task 병렬 실행, 결과 취합, 오류 처리, 결과 처리).
  - 주요 상태: Map State (병렬 처리), Task State (Fargate, Lambda 호출).
- **`code-runner` (Fargate Task):**
  - 역할: 단일 테스트 케이스에 대한 사용자 코드 실행 및 결과 측정.
  - 환경: 언어별 런타임 및 실행 스크립트가 포함된 Docker 컨테이너.
  - 보안: 네트워크 격리, 리소스 제한(CPU, 메모리), 읽기 전용 파일 시스템 등 샌드박싱 적용.
  - 입력: 사용자 코드, 테스트 케이스 입력, 언어, 시간/메모리 제한.
  - 출력: stdout, stderr, 실행 시간, 메모리 사용량, 종료 상태.
- **`result-processor` (Lambda):**
  - 역할: 모든 테스트 케이스 실행 결과 취합, 예상 출력과 비교, 최종 점수 및 상태 계산, 결과 저장.
- **`Submissions` Table (DynamoDB):**
  - 역할: 채점 요청 및 결과 저장.
  - 스키마 예시: `submissionId` (PK), `problemId` (GSI PK), `userId`, `code`, `language`, `status`, `score`, `results` (List: {testcaseId, status, time, memory}), ...

## 5. 개발 단계 (요약)

1.  `problem-grader` 폴더 구조 생성 및 기본 설정 (`requirements.txt`, IaC 설정 파일 등).
2.  DynamoDB 테이블 (`Problems`, `Submissions`) 스키마 확정 및 IaC 코드로 정의. (@problem-generator-aws 의 스키마 확인 필요)
3.  `code-runner` Fargate Task용 Docker 이미지 개발 (Python 런타임, 실행 스크립트 포함).
4.  `code-runner` Fargate Task 정의 (IaC).
5.  Step Functions 워크플로우 정의 (IaC).
6.  `problem-grader-api` Lambda 함수 구현.
7.  `result-processor` Lambda 함수 구현.
8.  API Gateway 또는 Lambda 함수 URL 설정 (IaC).
9.  단위/통합 테스트 및 배포 자동화.

## 6. 주요 고려 사항

- **보안:** `code-runner` Fargate Task의 샌드박싱 환경 구축이 최우선 과제.
- **확장성:** Step Functions와 Fargate 기반으로 높은 동시성 처리 가능. 필요시 Lambda/Fargate 리소스 설정 조정.
- **비용:** Fargate Task 실행 시간/횟수, Lambda 호출, Step Functions 상태 전환, DynamoDB 사용량 기반 비용 발생 예측 및 최적화.
- **언어 지원:** 초기 Python 지원 후, 다른 언어 추가 시 `code-runner` Docker 이미지 및 실행 로직 업데이트 필요.
- **타임아웃:** Step Functions는 긴 작업 실행에 적합. Fargate Task 자체의 시간 제한 설정 필요.
- **데이터 연동:** `@problem-generator-aws`의 `Problems` 테이블 스키마 및 접근 권한 확인 필수.
