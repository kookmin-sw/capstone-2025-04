# Chatbot 인프라스트럭처 (`infrastructure/chatbot/`)

이 디렉토리는 AWS에 배포되는 AI Chatbot 백엔드 인프라스트럭처를 위한 Terraform 설정을 포함합니다.

## 개요

이 인프라스트럭처는 다음과 같은 핵심 구성 요소를 설정합니다:

- **AWS Lambda 함수 (`lambda.tf`):** Node.js로 작성된 챗봇의 주요 백엔드 로직입니다.
- **AWS Lambda Layer (`layer.tf`):** Lambda 함수의 Node.js 의존성을 관리합니다.
- **API Gateway (`apigateway.tf`):** Lambda 함수를 호출하기 위한 HTTP 엔드포인트 (`/chatbot/query`)를 제공합니다.
- **IAM 역할 및 정책 (`iam.tf`):** Lambda 함수에 필요한 권한(예: Bedrock 접근, CloudWatch Logs)을 정의합니다.

배포는 [`.github/workflows/deploy-chatbot.yml`](../../.github/workflows/deploy-chatbot.yml) GitHub Actions 워크플로우를 통해 자동화됩니다.

## 의존성 관리를 위한 Lambda Layer

`chatbot-query` Lambda 함수에 필요한 Node.js 의존성([`backend/lambdas/chatbot-query/package.json`](../../backend/lambdas/chatbot-query/package.json)에 정의됨)은 함수의 배포 패키지 크기를 작게 유지하고 배포 시간을 개선하기 위해 AWS Lambda Layer를 사용하여 관리됩니다.

- **Terraform 정의:** Lambda Layer는 `layer.tf` 파일 내 `aws_lambda_layer_version` 리소스를 사용하여 정의됩니다.
- **디렉토리 구조:** GitHub Actions 워크플로우는 패키징 전에 `infrastructure/chatbot/layers/chatbot_deps/nodejs` 디렉토리에 의존성을 설치합니다. 이 구조(`nodejs/node_modules/...`)는 Lambda 런타임이 라이브러리를 찾는 데 필요합니다.
- **워크플로우 단계:** `deploy-chatbot.yml` 워크플로우는 빌드 과정에서 `npm install --prefix ./infrastructure/chatbot/layers/chatbot_deps/nodejs ./backend/lambdas/chatbot-query` 명령어를 사용하여 layer 디렉토리를 채웁니다.
- **제외 항목:** `layer.tf`의 `archive_file` 데이터 소스에는 불필요한 파일(예: 문서, 불필요한 메타데이터)을 압축 전에 제거하여 레이어 크기를 최소화하기 위한 `excludes` 목록이 포함되어 있습니다.

## Lambda 함수 설정

`chatbot-query` Lambda 함수 자체는 `lambda.tf` 파일에 정의되어 있습니다.

- **런타임:** Node.js 22.x (`nodejs22.x`)
- **아키텍처:** ARM64 (`arm64`) - 더 나은 성능과 비용 효율성을 위해 사용됩니다.
- **핸들러 코드:** 오직 핸들러 코드(`backend/lambdas/chatbot-query/index.mjs`)만 함수의 배포 패키지에 포함되며, 이는 `archive_file` 데이터 소스 (`chatbot_lambda_function_zip`)를 사용하여 생성됩니다.
- **의존성:** 함수는 `layer.tf`에 정의된 `chatbot_deps_layer`의 ARN을 `layers` 인수에 참조하여 해당 레이어를 사용하도록 설정됩니다.
- **환경 변수:** `BEDROCK_MODEL_ID` 및 `AWS_REGION`과 같은 주요 설정은 환경 변수(`variables.tf`에 정의됨)를 통해 전달됩니다.

## 배포

`infrastructure/chatbot/`, `backend/lambdas/chatbot-query/` 또는 워크플로우 파일 자체에 영향을 미치는 변경 사항이 `main` 브랜치에 푸시되면 `deploy-chatbot.yml` 워크플로우가 자동으로 트리거됩니다. 이 워크플로우는 다음 단계를 수행합니다:

1. 코드 체크아웃.
2. Node.js 22.x 설정.
3. `package.json`의 의존성을 레이어 디렉토리(`layers/chatbot_deps/nodejs`)에 설치 (`npm install` 사용).
4. OIDC 및 `AWS_IAM_ROLE_ARN_CHATBOT` 시크릿을 사용하여 AWS 자격 증명 구성.
5. `infrastructure/chatbot` 디렉토리 내에서 `terraform init`, `validate`, `plan`, `apply` 실행 (시크릿을 통해 전달된 S3 백엔드 설정 사용 - `TF_STATE_BUCKET`, `TF_STATE_LOCK_TABLE`).
6. 성공적인 배포 시 API Gateway 호출 URL 출력.

**참고:** 필요한 GitHub 시크릿(`AWS_IAM_ROLE_ARN_CHATBOT`, `AWS_REGION`, `TF_STATE_BUCKET`, `TF_STATE_LOCK_TABLE`)이 리포지토리 설정에 올바르게 구성되어 있는지 확인하세요. `AWS_IAM_ROLE_ARN_CHATBOT`에 지정된 IAM 역할은 Lambda 함수, 레이어, API Gateway, IAM 역할/정책을 관리하고 Terraform 상태 S3 버킷 및 DynamoDB 테이블에 접근할 수 있는 권한이 필요합니다.

### 수동 배포 (로컬 환경)

주요 배포 방법은 GitHub Actions 워크플로우를 통하는 것이지만, 로컬 개발 환경에서 수동으로 변경 사항을 적용할 수도 있습니다. 다음 사항을 확인하세요:

1. **Terraform CLI 설치됨.**
2. **AWS 자격 증명 구성됨:** 사용 환경에는 이 설정에 정의된 리소스(Lambda, Layers, API Gateway, IAM, 상태 관리를 위한 S3/DynamoDB)를 관리할 수 있는 유효한 AWS 자격 증명이 필요합니다.
3. **올바른 디렉토리로 이동함:** `infrastructure/chatbot/` 디렉토리 내에서 명령어를 실행해야 합니다.

주요 명령어:

- **초기화:** `terraform init -backend-config="chatbot.s3.tfbackend"` (이 명령어는 `chatbot.s3.tfbackend` 파일을 사용하여 설정을 구성합니다. 해당 파일 내의 값이 사용 환경에 맞는지 확인하거나, 필요한 경우 추가적인 `-backend-config="key=value"` 인자를 사용하여 특정 값을 덮어쓸 수 있습니다).
- **계획:** `terraform plan` (계획된 변경 사항을 주의 깊게 검토하세요).
- **적용:** `terraform apply` (AWS 계정에 변경 사항을 적용하세요).

**참고:** 특히 공유 환경에서는 자동화된 배포나 다른 수동 변경과의 충돌을 피하기 위해 수동 적용을 신중하게 수행해야 합니다.

## 다음 단계 (배포 후)

- 배포된 API Gateway 엔드포인트(워크플로우에서 출력된 호출 URL)를 `curl` 또는 Postman을 사용하여 수동으로 테스트하여 기본 설정이 작동하는지 확인합니다.
- `backend/lambdas/chatbot-query/index.mjs`에서 핵심 백엔드 로직 구현을 진행합니다 (`docs/chatbot-todo.md`의 Phase 2).
