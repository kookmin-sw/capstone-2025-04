# 인프라 배포 문서

이 문서는 Terraform을 사용하여 AWS에 Alpaco 프로젝트의 "문제 서비스" 인프라를 배포하고 관리하는 방법을 설명합니다. Terraform을 처음 사용하는 분들도 이해하기 쉽도록 구성 요소와 배포 과정을 상세히 기술했습니다.

## 1. Terraform 이란?

Terraform은 코드를 통해 클라우드 인프라(서버, 데이터베이스, 네트워크 등)를 안전하고 효율적으로 구축, 변경 및 관리할 수 있게 해주는 도구입니다. 인프라를 코드로 정의하므로 버전 관리, 재사용, 자동화가 용이합니다.

## 2. 이 Terraform 프로젝트의 목표

이 Terraform 코드는 문제 생성, 채점, 스트리밍 등을 포함하는 "문제 서비스"를 AWS 상에 배포하는 것을 목표로 합니다. 주요 기능은 다음과 같습니다:

- 사용자 요청에 따라 프로그래밍 문제를 동적으로 생성합니다.
- 생성 과정을 WebSocket을 통해 실시간으로 스트리밍합니다.
- 제출된 코드의 실행 및 채점을 수행합니다.
- 문제, 제출 결과 등의 데이터를 관리합니다.

## 3. 프로젝트 구조 및 파일 설명 (`problem_service` 디렉토리)

이 디렉토리(`infrastructure/terraform/problem_service/`) 내의 각 `.tf` 파일은 특정 유형의 AWS 리소스를 정의합니다.

- `provider.tf`: 사용할 AWS Terraform Provider (AWS 리소스 생성/관리 도구)의 버전과 기본 리전(`ap-northeast-2`, 서울)을 설정합니다.
- `backend.tf`: Terraform 상태 파일(`terraform.tfstate`, 현재 인프라 상태 기록)을 로컬이 아닌 AWS S3 버킷에 원격으로 저장하도록 설정합니다. 이를 통해 여러 사람이 협업하고 상태를 안전하게 관리할 수 있습니다.
- `variables.tf`: Terraform 코드 전체에서 사용될 변수들(예: 프로젝트 이름, 환경(dev/prod), 리소스 크기 등)을 정의합니다. 기본값을 설정하거나 외부에서 값을 주입받을 수 있습니다.
- `locals.tf`: 복잡하거나 반복적으로 사용되는 값들을 지역 변수(local variables)로 정의하여 코드의 가독성과 유지보수성을 높입니다. 예를 들어, 여러 리소스에서 공통으로 사용하는 서브넷 ID 목록 등을 정의합니다.
- `network.tf`: 서비스에 필요한 네트워크 인프라를 정의합니다.
  - `aws_vpc`: 서비스가 배포될 가상 프라이빗 클라우드(VPC)를 생성합니다.
  - `aws_subnet`: VPC 내부에 퍼블릭 서브넷과 프라이빗 서브넷을 생성합니다. 퍼블릭 서브넷은 외부 인터넷과 통신이 가능하고, 프라이빗 서브넷은 외부에서 직접 접근할 수 없습니다.
  - `aws_internet_gateway`: VPC가 인터넷과 통신할 수 있도록 연결하는 관문입니다.
  - `aws_route_table` / `aws_route_table_association`: 서브넷 간의 트래픽 경로를 정의하고 서브넷에 연결합니다.
  - `aws_security_group`: 리소스(Lambda, ECS Task 등)에 대한 인바운드/아웃바운드 네트워크 트래픽 규칙을 정의하는 가상 방화벽입니다. (`fargate_sg`, `lambda_sg`)
- `storage.tf`: 데이터 저장을 위한 리소스를 정의합니다.
  - `aws_dynamodb_table`: NoSQL 데이터베이스 테이블을 생성합니다. 문제 정보(`problems_table`)와 제출 정보(`submissions_table`)를 저장합니다.
  - `aws_s3_bucket`: 객체 스토리지 버킷을 생성합니다. 여기서는 채점 결과(`grader_output_bucket`)를 저장하는 데 사용됩니다.
  - `aws_s3_bucket_policy`: S3 버킷에 대한 접근 권한 정책을 정의합니다.
- `ecr.tf`: 컨테이너 이미지를 저장하고 관리하기 위한 ECR(Elastic Container Registry) 리포지토리를 정의합니다.
  - `aws_ecr_repository`: 문제 생성기(`generator_repo`), 스트리밍 생성기(`generator_streaming_repo`), 파이썬 실행기(`runner_python_repo`) 등의 Docker 이미지를 저장할 리포지토리를 생성합니다.
- `iam.tf`: AWS 서비스 및 리소스 간의 안전한 접근 제어를 위한 IAM(Identity and Access Management) 역할 및 정책을 정의합니다.
  - `aws_iam_role`: 특정 서비스(ECS Task, Lambda 함수, Step Functions 등)가 다른 AWS 서비스에 접근할 때 필요한 권한을 부여하는 역할들을 생성합니다. (예: `ecs_task_execution_role`, `ecs_task_role`, `lambda_execution_role`, `generator_streaming_lambda_role`, `sfn_execution_role`)
  - `aws_iam_policy`: 특정 작업(Action)을 특정 리소스(Resource)에 대해 허용(Allow) 또는 거부(Deny)하는 권한 정책들을 정의합니다. (예: `s3_access_policy`, `lambda_policy`, `generator_streaming_lambda_policy`, `sfn_grader_policy`)
  - `aws_iam_role_policy_attachment`: 생성된 역할을 생성된 정책에 연결하여 실제 권한을 부여합니다.
- `api_lambda.tf`: API Gateway 및 관련 Lambda 함수들을 정의합니다.
  - `aws_lambda_function`: 서버리스 함수를 정의합니다. 코드를 실행하여 요청을 처리합니다.
    - `problem_grader_lambda`: 코드 채점 로직을 수행하는 Lambda 함수 (ZIP 패키지 기반).
    - `generator_streaming_lambda`: 문제 생성을 수행하고 WebSocket으로 스트리밍하는 Lambda 함수 (Docker 이미지 기반).
  - `aws_apigatewayv2_api`: HTTP API (`grader_api`) 또는 WebSocket API (`generator_streaming_api`)의 엔드포인트를 생성합니다.
  - `aws_apigatewayv2_route`: API 요청 경로(예: `$default`, `/grade`)와 해당 요청을 처리할 대상(Integration)을 연결합니다.
  - `aws_apigatewayv2_integration`: API Gateway 라우트와 백엔드 리소스(여기서는 Lambda 함수)를 연결합니다.
  - `aws_apigatewayv2_deployment` / `aws_apigatewayv2_stage`: API 변경 사항을 배포하고, 특정 배포 버전(예: `dev`, `prod`)에 접근할 수 있는 스테이지를 생성합니다.
  - `aws_lambda_permission`: API Gateway가 Lambda 함수를 호출할 수 있도록 권한을 부여합니다.
  - `aws_cloudwatch_log_group`: API Gateway 접근 로그를 저장할 CloudWatch Log Group을 생성합니다.
- `ecs.tf`: 컨테이너화된 애플리케이션(문제 생성기, 실행기)을 실행하기 위한 ECS(Elastic Container Service) 관련 리소스를 정의합니다.
  - `aws_ecs_cluster`: ECS 리소스를 논리적으로 그룹화하는 클러스터(`grader_cluster`)를 생성합니다.
  - `aws_ecs_task_definition`: 컨테이너를 실행하는 방법을 정의합니다. 사용할 Docker 이미지, CPU/메모리, 실행 역할 등을 지정합니다. (`generator_task_def`, `runner_python_task_def`)
- `step_functions.tf`: 여러 단계로 구성된 워크플로우(여기서는 문제 채점 프로세스)를 조율하기 위한 Step Functions 상태 머신을 정의합니다.
  - `aws_sfn_state_machine`: 상태 머신의 정의(`problem_grader_statemachine.asl.json` 파일 참조)와 실행 역할을 지정하여 상태 머신(`problem_grader_state_machine`)을 생성합니다.
- `problem_grader_statemachine.asl.json`: Step Functions 상태 머신의 워크플로우를 JSON 형식의 Amazon States Language (ASL)로 정의한 파일입니다. 채점 프로세스의 각 단계를 명시합니다.
- `outputs.tf`: Terraform 실행 후 생성된 중요한 리소스 정보(예: API 엔드포인트 URL, ECR 리포지토리 URL, DynamoDB 테이블 이름 등)를 출력하도록 정의합니다. 배포 후 다른 시스템이나 사용자가 이 정보를 쉽게 참조할 수 있습니다.
- `.terraform/`: `terraform init` 실행 시 생성되는 디렉토리로, 다운로드한 공급자 플러그인과 모듈 정보가 저장됩니다. (버전 관리 시스템에는 포함하지 않음)
- `.terraform.lock.hcl`: `terraform init` 실행 시 사용된 공급자 버전을 기록하는 잠금 파일입니다. 이를 통해 협업 시 동일한 공급자 버전을 사용하도록 보장합니다. (버전 관리 시스템에 포함)

## 4. 배포 절차 (Terraform 초심자 가이드)

Terraform을 사용하여 이 인프라를 AWS에 배포하는 기본 단계는 다음과 같습니다.

1.  **Terraform 설치:** 로컬 컴퓨터에 Terraform CLI를 설치합니다. ([Terraform 공식 설치 가이드](https://learn.hashicorp.com/tutorials/terraform/install-cli) 참조)
2.  **AWS 자격 증명 설정:** Terraform이 AWS 계정에 리소스를 생성할 수 있도록 자격 증명을 설정해야 합니다. 가장 일반적인 방법은 AWS CLI를 설치하고 `aws configure` 명령을 사용하여 Access Key ID와 Secret Access Key를 설정하는 것입니다. ([AWS CLI 구성 가이드](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) 참조)
3.  **코드 다운로드:** 이 Terraform 코드가 포함된 Git 저장소를 로컬 컴퓨터로 복제(clone)하거나 다운로드합니다.
4.  **디렉토리 이동:** 터미널(명령 프롬프트 또는 PowerShell)을 열고 이 `README.md` 파일이 있는 `infrastructure/terraform/problem_service` 디렉토리로 이동합니다.
    ```bash
    cd path/to/your/project/infrastructure/terraform/problem_service
    ```
5.  **초기화 (`terraform init`):** Terraform 작업 디렉토리를 초기화합니다. 이 명령은 필요한 AWS 공급자 플러그인을 다운로드하고, `backend.tf`에 설정된 S3 백엔드에 연결합니다. 처음 한번, 또는 `provider.tf`, `backend.tf` 파일이 변경될 때마다 실행해야 합니다.
    ```bash
    terraform init
    ```
    _만약 공급자 버전을 업데이트하고 싶다면 `terraform init -upgrade`를 사용합니다._
6.  **실행 계획 검토 (`terraform plan`):** Terraform이 현재 구성 파일을 바탕으로 AWS에 어떤 리소스를 생성, 수정 또는 삭제할지 계획을 세우고 보여줍니다. 실제 변경은 수행하지 않으므로 안전하게 실행하여 예상되는 변경 사항을 검토할 수 있습니다.
    ```bash
    terraform plan
    ```
7.  **변경 사항 적용 (`terraform apply`):** `plan` 단계에서 검토한 변경 사항을 실제로 AWS 계정에 적용합니다. Terraform이 생성/수정/삭제할 리소스 목록을 다시 보여주고 실행 여부를 묻습니다. `yes`를 입력하면 적용이 시작됩니다.
    ```bash
    terraform apply
    ```
    _실행 계획 검토 및 확인 절차 없이 즉시 적용하려면 `-auto-approve` 옵션을 추가할 수 있지만, 주의해서 사용해야 합니다: `terraform apply -auto-approve`_
8.  **리소스 삭제 (`terraform destroy`):** Terraform으로 생성한 모든 리소스를 삭제하려면 이 명령을 사용합니다. **주의: 이 명령은 실제 AWS 리소스를 영구적으로 삭제하므로 매우 신중하게 사용해야 합니다.**
    ```bash
    terraform destroy
    ```
    _확인 절차 없이 즉시 삭제하려면 `-auto-approve` 옵션을 추가합니다: `terraform destroy -auto-approve`_

## 5. 문제 해결 기록 (참고)

초기 배포 과정에서 다음과 같은 문제들이 발생했으며, 해결 과정은 위 절차를 이해하는 데 도움이 될 수 있습니다.

1.  **예약된 환경 변수 (`AWS_REGION`):** Lambda 환경 변수에 `AWS_REGION`을 설정하여 발생. 해당 변수 제거로 해결.
2.  **선언되지 않은 서브넷 리소스:** `private_subnet_a/c` 정의 누락. `network.tf`에 추가하여 해결.
3.  **Lambda 소스 이미지를 찾을 수 없음 (초기):** ECR에 Lambda용 Docker 이미지가 없음. `Dockerfile` 생성 및 이미지 빌드/푸시로 해결.
4.  **Lambda 소스 이미지 미디어 타입 미지원:** 로컬 환경(macOS)에서 빌드한 이미지 형식이 Lambda와 호환되지 않음. **AWS CloudShell**에서 이미지를 빌드/푸시하여 해결. (Linux 환경 빌드 권장)
5.  **Lambda 소스 이미지를 찾을 수 없음 (Destroy/재푸시 후):** Lambda 실행 역할에 ECR 이미지 가져오기 권한 누락. `iam.tf`의 관련 정책에 ECR 권한 추가 및 이미지 재푸시로 해결.
6.  **API Gateway 스테이지 생성 실패 (CloudWatch Logs 역할):** AWS 계정/리전 수준의 API Gateway 설정에 CloudWatch 로깅 역할 ARN이 설정되지 않음. **AWS 콘솔에서 수동으로 역할 ARN을 설정**하여 해결 (일회성 작업).

## 6. 현재 상태

위 문제들을 해결하여 현재 인프라 배포가 **성공**했습니다.
