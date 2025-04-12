# Problem Grader Service

이 서비스는 Step Functions 상태 머신과 AWS Fargate를 사용하여 사용자 코드 제출을 비동기적으로 채점하는 역할을 담당합니다.

## 주요 구성 요소

- **Step Functions State Machine (`ProblemGraderStateMachine`):** 전체 채점 워크플로우를 오케스트레이션합니다. (정의: `statemachine/grader_workflow.asl.json`)
  - 입력으로 제출 정보(problemId, code, language 등)와 문제 정보(testcases, timeLimit, memoryLimit 등)를 받습니다.
  - `Map` 상태를 사용하여 각 테스트 케이스에 대해 Fargate Task를 병렬로 실행합니다.
  - Fargate Task 실행 결과를 취합하여 반환합니다. (최종 결과 처리 및 저장은 현재 미구현)
- **Fargate Task (`code-runner`):** Docker 컨테이너 환경에서 단일 테스트 케이스에 대한 사용자 코드를 안전하게 실행하고 결과를 측정합니다. (Docker 이미지 및 실행 스크립트는 별도 관리)

## 설정 파일

- `statemachine/grader_workflow.asl.json`: 상태 머신 정의.

## 참고

- 이 서비스는 `api_handler` Lambda에 의해 트리거됩니다.
- 전체 시스템 아키텍처 및 배포 가이드는 `backend/problem-infra` 폴더의 문서를 참조하세요.
