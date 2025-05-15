
**배포 순서 요약:**

1. **`code-execution-service` 모듈 배포:**
    * `terraform apply`를 실행하여 Code Executor Lambda 및 관련 리소스를 생성합니다.
    * 이 모듈의 `output "code_executor_lambda_arn"`이 Terraform State에 저장됩니다.

2. **`problem-generator-v3` 모듈 배포:**
    * `terraform apply`를 실행합니다.
    * `problem-generator-v3` 모듈의 `data.tf`가 `code-execution-service`의 상태 파일을 읽어 `code_executor_lambda_arn`을 가져옵니다.
    * Problem Generator Lambda는 올바른 Code Executor Lambda ARN으로 환경 변수가 설정되어 배포됩니다.

**고려 사항:**

* **첫 배포 시나리오:** 만약 두 모듈을 한 번에 `terraform apply`로 배포하려고 하면 (예: 루트 모듈에서 두 하위 모듈을 호출), Terraform은 의존성을 자동으로 파악하려고 시도합니다. 그러나 `data "terraform_remote_state"`는 이미 존재하는 상태 파일을 읽기 때문에, 첫 배포 시에는 `code-execution-service`가 먼저 완료되어 상태 파일이 생성되어야 `problem-generator-v3`가 그 출력을 읽을 수 있습니다.
* **CI/CD:** 자동화된 배포 파이프라인에서는 두 모듈을 별도의 단계로 나누어 순서대로 배포하는 것이 명확합니다.
* **상호 의존성:** 현재 구조에서는 `problem-generator-v3`가 `code-execution-service`의 ARN을 필요로 하고, `code-execution-service`는 `problem-generator-v3`의 `problems_table_arn`을 필요로 합니다. 이는 순환 의존성처럼 보일 수 있습니다.
  * **해결책:**
    * **`problems_table`을 별도의 모듈로 분리:** DynamoDB 테이블(`problems_table`, `submissions_table`)을 공통 데이터베이스 모듈로 분리하고, 두 서비스 모듈이 이 공통 모듈의 출력을 참조하도록 하는 것이 더 깔끔한 아키텍처입니다.
    * **현재 구조 유지 시:** `code-execution-service`의 `data.tf`는 `problem_generator_v3`의 `problems_table_arn`을 읽습니다. `problem-generator-v3`가 먼저 배포되어 `problems_table`을 만들고 그 ARN을 출력해야 합니다. 그런 다음 `code-execution-service`가 배포되어 이 ARN을 사용합니다. 이 경우 `code-execution-service`는 `problem-generator-v3`의 `code_executor_lambda_arn`을 참조하지 *않습니다* (자신이 만들기 때문).
      * 이 시나리오에서는 `problem-generator-v3`의 `lambda.tf`에서 `CODE_EXECUTOR_LAMBDA_ARN` 환경 변수를 `var.code_executor_lambda_arn`으로 유지하고, 이 변수의 값을 `code-execution-service` 모듈을 apply 한 후 얻은 output 값으로 수동 또는 스크립트를 통해 `problem-generator-v3` 모듈을 apply 할 때 전달해야 합니다.

**가장 권장되는 배포 흐름 (순환 의존성 회피):**

1. **`problem-generator-v3` 1차 배포 (Code Executor ARN 없이 또는 더미 값으로):**
    * `problem_generator_v3`의 `variables.tf`에서 `code_executor_lambda_arn`의 `default`를 임시 값 (예: `"TO_BE_REPLACED"`)으로 설정하거나, 배포 시 빈 값으로 둡니다.
    * `problem_generator_v3`를 배포하여 `problems_table`을 생성하고 `problems_table_arn`을 출력합니다.

2. **`code-execution-service` 배포:**
    * `code_execution_service`의 `data.tf`가 1단계에서 생성된 `problem_generator_v3`의 `problems_table_arn`을 읽습니다.
    * `code_execution_service`를 배포하여 `code_executor_lambda`를 생성하고 `code_executor_lambda_arn`을 출력합니다.

3. **`problem-generator-v3` 2차 배포 (올바른 Code Executor ARN으로 업데이트):**
    * 2단계에서 얻은 `code_executor_lambda_arn` 값을 `problem_generator_v3`의 `terraform.tfvars` 파일에 설정하거나, `terraform apply -var="code_executor_lambda_arn=VALUE"` 와 같이 전달합니다.
    * `problem_generator_v3`를 다시 배포합니다. 이제 Problem Generator Lambda가 올바른 Code Executor Lambda ARN으로 업데이트됩니다.

이 단계적 접근 방식은 Terraform의 `remote_state`를 활용하여 모듈 간의 명확한 의존성 흐름을 보장합니다.
만약 `problems_table`을 `code-execution-service`와 같은 모듈에서 관리하거나, 별도의 `database` 모듈에서 관리한다면 순서가 달라질 수 있습니다. 현재 제공된 파일 구조에서는 위의 3단계 배포가 가장 현실적입니다.
