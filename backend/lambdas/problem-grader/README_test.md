# `@problem-grader/test` 디렉토리 설명

이 디렉토리는 `@problem-grader` Lambda 함수의 아키텍처 및 핵심 로직을 검증하고 테스트하기 위한 자원들을 포함합니다. 주요 구성 요소는 다음과 같습니다.

## 1. `terraform/` 디렉토리

- **목적:** Lambda 함수 실행 및 테스트에 필요한 기본적인 AWS 인프라(Lambda 함수 자체, IAM 역할/정책, DynamoDB 테이블 2개, S3 버킷, CloudWatch 로그 그룹 등)를 Terraform 코드로 정의하고 생성합니다. 이를 통해 일관되고 반복 가능한 테스트 환경 구축을 지원합니다.
- **주요 파일:**
  - `main.tf`: AWS 리소스 정의.
  - `variables.tf`: 리전, 리소스 이름 접두사, Lambda 설정 등 변수 정의.
  - `outputs.tf`: 생성된 리소스의 주요 정보(ARN, 이름 등) 출력 정의.
- **사용법:** 이 디렉토리에서 `terraform init && terraform apply` 명령을 실행하여 인프라를 구축하고, 테스트 후 `terraform destroy`로 정리합니다.

## 2. 샘플 JSON 파일

- **`sample_lambda_event_correct.json`:** Lambda 함수를 테스트하기 위한 샘플 입력 페이로드입니다. `problem_id`, `language`, 그리고 정상적으로 작동하는 (Accepted 예상) `user_code`를 포함합니다. 다른 테스트 시나리오(오답, 시간 초과 등)를 위해서는 이 파일의 `user_code` 부분을 수정하거나 별도의 이벤트 파일을 생성하여 사용합니다.
- **`sample_problem_data.json`:** 테스트용 문제(`sample-problem-add-two`)의 데이터(ID, 시간 제한, 테스트 케이스 목록)를 정의합니다. 이 데이터를 Terraform으로 생성된 `problems` DynamoDB 테이블에 미리 삽입해야 Lambda 함수가 문제 정보를 올바르게 조회할 수 있습니다.

## 3. 샘플 Python 솔루션 파일

- 이 파일들은 `sample_lambda_event_*.json`의 `user_code` 필드에 들어갈 수 있는 예시 코드들입니다. 다양한 채점 결과를 테스트하는 데 사용될 수 있습니다.
- **`sample_solution_correct.py`:** `sample-problem-add-two` 문제의 모든 테스트 케이스를 통과하는 정답 코드 예시.
- **`sample_solution_wrong.py`:** 오답(Wrong Answer) 결과를 유도하는 코드 예시.
- **`sample_solution_tle.py`:** 시간 초과(Time Limit Exceeded) 결과를 유도하는 코드 예시 (예: 무한 루프).
- **`sample_solution_runtime_error.py`:** 런타임 오류(Runtime Error)를 유도하는 코드 예시.

## 4. 문서 파일

- **`MANUAL_SETUP_RESOURCES.md`:** Terraform으로 관리되지 않고 수동(주로 AWS CLI)으로 생성/설정된 리소스(ECR 리포지토리, ECS 클러스터, Task Definition 등) 및 최종 구성 상태, 테스트 진행 상황, 다음 단계를 상세히 기록하는 문서입니다. 컨텍스트 복구 및 협업에 도움을 줍니다.

## 5. 기타 파일

- **`temp_problem_data_cli.json`:** DynamoDB `put-item` 명령을 위한 CLI 형식의 임시 데이터 파일일 수 있습니다. (필수 파일은 아님)

## 테스트 흐름

일반적으로 이 디렉토리의 자원을 사용한 테스트는 다음과 같은 흐름으로 진행됩니다.

1. `terraform/` 디렉토리에서 `terraform apply`를 실행하여 기본 인프라를 구축합니다.
2. `sample_problem_data.json` 내용을 참조하여 `problems` DynamoDB 테이블에 테스트 문제 데이터를 삽입합니다.
3. ECR 리포지토리 생성, Docker 이미지 빌드/푸시, ECS 클러스터 생성, Task Definition 등록 등 수동 설정을 진행합니다 (`MANUAL_SETUP_RESOURCES.md` 참조).
4. Lambda 함수 환경 변수를 올바르게 설정합니다.
5. 테스트하려는 시나리오에 맞게 `sample_lambda_event_correct.json`의 `user_code`를 수정하거나 다른 이벤트 파일을 준비합니다.
6. 준비된 이벤트 페이로드를 사용하여 Lambda 함수를 호출합니다 (`aws lambda invoke`).
7. 호출 결과 (`output.json` 등), DynamoDB `submissions` 테이블, S3 결과 파일, CloudWatch Logs 등을 확인하여 예상대로 작동하는지 검증합니다.
8. 테스트 완료 후 `terraform destroy` 및 필요한 수동 리소스 삭제를 통해 환경을 정리합니다.

이 테스트 자원들은 `@problem-grader` 시스템의 각 컴포넌트가 올바르게 연동되고 예상대로 작동하는지 검증하는 데 중요한 역할을 합니다.
