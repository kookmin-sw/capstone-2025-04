# 문제 채점기(@problem-grader) 테스트 환경 수동 설정 및 상태 기록

이 문서는 `@problem-grader` 테스트 환경 설정 및 디버깅 과정에서 수동으로 적용된 (주로 AWS CLI 사용) AWS 리소스 및 구성 상태를 요약합니다. Terraform으로 관리되는 리소스 (`test/terraform/main.tf`) 외의 보충 정보입니다.

**참고:** "(Terraform 관리)"로 표시된 리소스는 `terraform destroy`를 사용하여 정리해야 합니다.

## 1. ECR (Elastic Container Registry)

- **리포지토리 이름:** `problem-grader-python-runner`
  - 목적: Python 코드 실행기 Docker 이미지 저장소.
  - 생성 방법: AWS CLI (`aws ecr create-repository`) 로 생성됨. `terraform destroy` 이후에도 남아있을 수 있음.
  - 푸시된 이미지: `897722694537.dkr.ecr.ap-northeast-2.amazonaws.com/problem-grader-python-runner:latest`
    - **중요:** Fargate 호환성을 위해 `docker build --platform linux/amd64 ...` 옵션을 사용하여 빌드되었음.

## 2. ECS (Elastic Container Service)

- **클러스터 이름:** `problem-grader-test-cluster`

  - 목적: Fargate 태스크 실행을 위한 논리적 네임스페이스.
  - 생성 방법: AWS CLI (`aws ecs create-cluster`) 로 생성됨.

- **Task Definition Family:** `problem-grader-test-runner-task-def`
  - 목적: 실행기 컨테이너 실행 방식 정의 (이미지, 역할, CPU/메모리 등).
  - 생성 방법: AWS CLI (`aws ecs register-task-definition`) 로 등록됨. 여러 리비전이 존재할 수 있음.
  - **최신 활성 리비전 구성 (리비전 1 가정):**
    - 컨테이너 이름: `problem-grader-test-runner-container` (Terraform 변수 `runner_container_name_placeholder` 기본값과 일치)
    - 이미지 URI: `897722694537.dkr.ecr.ap-northeast-2.amazonaws.com/problem-grader-python-runner:latest`
    - CPU: `256`
    - 메모리: `512`
    - 실행 역할 ARN: `arn:aws:iam::897722694537:role/problem-grader-test-ecs-exec-role` **(Terraform 관리)**
    - 태스크 역할 ARN: `arn:aws:iam::897722694537:role/problem-grader-test-ecs-task-role` **(Terraform 관리)**
    - 로그 그룹: `/ecs/problem-grader-test-runner-task-def` **(Terraform 관리)**

## 3. IAM (Identity and Access Management)

- **참고:** 초기 계획했던 수동 IAM 역할 (`pg-test-ecs-*`) 대신, 최종적으로 Terraform 구성 내에서 관리되는 역할 (`problem-grader-test-*`)이 사용됨.
  - `problem-grader-test-lambda-exec-role`: Lambda 함수 실행 역할. (Terraform 관리)
  - `problem-grader-test-ecs-exec-role`: ECS 에이전트 역할 (이미지 가져오기, 로그 전송 등). (Terraform 관리)
  - `problem-grader-test-ecs-task-role`: 실행기 컨테이너 코드 역할 (S3/DynamoDB 접근). (Terraform 관리)
  - 관련 정책 (`*-policy`) 및 역할 연결(attachment)도 Terraform으로 관리됨.
  - **수정 이력:** Lambda 실행 역할 정책에 `iam:PassRole` (ECS 실행 역할 대상 추가), `dynamodb:PutItem` (submissions 테이블 대상), `ecs:TagResource` 권한이 추가되었고, 테스트를 위해 와일드카드(`*`) 권한으로 단순화되었다가 다시 구체적인 권한으로 일부 복구됨.

## 4. DynamoDB 데이터

- `problem-grader-test-problems` 테이블 (Terraform 관리)에 `id = "sample-problem-add-two"` 아이템 (`test/sample_problem_data.json` 기반)이 `aws dynamodb put-item` 명령으로 추가됨.

## 5. Lambda 환경 변수 업데이트

- `problem-grader-test-lambda` 함수 (Terraform 관리)의 환경 변수가 `aws lambda update-function-configuration` 명령을 통해 여러 차례 업데이트됨. 최종적으로 설정된 값은 다음과 같음:
  - `DYNAMODB_PROBLEMS_TABLE_NAME`: `problem-grader-test-problems`
  - `DYNAMODB_SUBMISSIONS_TABLE_NAME`: `problem-grader-test-submissions`
  - `S3_BUCKET_NAME`: `problem-grader-test-results-897722694537`
  - `ECS_CLUSTER_NAME`: `problem-grader-test-cluster`
  - `RUNNER_PYTHON_TASK_DEF_ARN`: `arn:aws:ecs:ap-northeast-2:897722694537:task-definition/problem-grader-test-runner-task-def:1` (가장 마지막에 설정된 활성 리비전 추정값)
  - `RUNNER_PYTHON_CONTAINER_NAME`: `problem-grader-test-runner-container`
  - `SUBNET_IDS`: `subnet-017ce875f56125b56,subnet-0749f96b14750c07c,subnet-07957a2efb3216fd6,subnet-0e8f7de3277620546` (Terraform 변수 플레이스홀더 값)
  - `SECURITY_GROUP_IDS`: `sg-0f95a4abfc6e0046a` (Terraform 변수 플레이스홀더 값)

## 6. 현재 상태 요약 (2025-05-03 기준)

- Terraform을 이용한 기본 인프라 (Lambda, DynamoDB, S3, IAM 역할/정책) 구축 완료 (`ap-northeast-2` 리전).
- 수동 설정 (ECR 리포지토리, ECS 클러스터, Task Definition) 완료.
- Docker 이미지 (`--platform linux/amd64`) 빌드 및 ECR 푸시 완료.
- Lambda 환경 변수 설정 완료.
- 여러 IAM 권한 문제 (PassRole, TagResource 등) 및 Docker 플랫폼 문제를 해결함.
- 최종 테스트(`sample_lambda_event_correct.json` 사용) 결과, Lambda 함수는 성공적으로 ECS 태스크를 실행하고 결과를 받았으나, 사용자 코드 실행 중 **`RUNTIME_ERROR`** 발생.

## 7. 향후 진행 단계

1.  **런타임 오류 분석:**
    - ECS 태스크 로그 (CloudWatch Log Group: `/ecs/problem-grader-test-runner-task-def`) 확인.
    - 또는 S3 결과 파일 (`s3://problem-grader-test-results-897722694537/results/sub_.../case_1.json`) 의 `stderr` 내용 확인.
    - 오류 발생 원인 (예: `run_code.py` 스크립트 오류, 사용자 코드 오류 등) 파악.
2.  **오류 수정:** 파악된 원인에 따라 `run_code.py` 또는 테스트용 사용자 코드 (`sample_lambda_event_correct.json` 내 코드) 수정.
3.  **재테스트:**
    - Docker 이미지 재빌드 및 푸시 (필요시).
    - Lambda 함수 재호출 (`sample_lambda_event_correct.json`).
    - 결과 확인 (`output.json`, DynamoDB, S3, CloudWatch Logs).
    - 예상 결과 (`ACCEPTED`) 확인.
4.  **추가 테스트 케이스 실행:**
    - `sample_solution_wrong.py`, `sample_solution_tle.py`, `sample_solution_runtime_error.py` 등을 사용하여 다양한 시나리오 테스트.

---

**정리:** `test/terraform` 디렉토리에서 `terraform destroy`를 실행하여 Terraform 관리 리소스를 제거합니다. 필요한 경우 ECR 리포지토리 (`problem-grader-python-runner`)와 ECS 클러스터 (`problem-grader-test-cluster`)는 수동으로 삭제합니다.
