# Chatbot 인프라스트럭처 (`infrastructure/chatbot/`)

이 디렉토리는 AWS에 배포되는 AI Chatbot 백엔드 인프라스트럭처를 위한 Terraform 설정을 포함합니다.

## 개요 (v3 - Lambda 함수 URL + CloudFront OAC)

이 인프라스트럭처는 다음과 같은 핵심 구성 요소를 설정합니다:

- **AWS Lambda 함수 (`lambda.tf`):** Node.js로 작성된 챗봇의 주요 백엔드 로직입니다. 사용자 인증 (JWT), Bedrock 상호작용, SSE 스트리밍을 처리합니다.
- **AWS Lambda Layer (`layer.tf`):** Lambda 함수의 Node.js 의존성(예: `@langchain/aws`, `jose`)을 관리합니다.
- **AWS Lambda 함수 URL (`lambda.tf`):** Lambda 함수를 위한 직접 HTTPS 엔드포인트이며, 스트리밍 응답(`RESPONSE_STREAM`) 및 IAM 인증(`AWS_IAM`)을 위해 설정됩니다.
- **AWS CloudFront 배포 (`cloudfront.tf`):** 공개적으로 접근 가능한 엔드포인트 역할을 합니다. Origin Access Control (OAC)를 사용하여 Lambda 함수 URL을 보호하고 필요한 헤더(JWT를 위한 `Authorization`, `x-amz-content-sha256` 등)를 전달합니다.
- **AWS CloudFront OAC (`cloudfront.tf`):** CloudFront가 SigV4를 사용하여 Lambda 함수 URL을 호출할 수 있는 권한을 부여합니다.
- **IAM 역할 및 정책 (`iam.tf`):** Lambda 함수에 필요한 권한(예: `bedrock:InvokeModelWithResponseStream`, CloudWatch Logs)을 정의합니다.
- **Lambda 권한 (`permissions.tf`):** 특정 CloudFront 배포가 Lambda 함수 URL을 호출하도록 허용합니다.

배포는 GitHub Actions를 통해 자동화되거나 수동으로 수행될 수 있습니다.

## 의존성 관리를 위한 Lambda Layer

`chatbot-query` Lambda 함수에 필요한 Node.js 의존성([`backend/lambdas/chatbot-query/package.json`](../../backend/lambdas/chatbot-query/package.json)에 정의됨)은 함수의 배포 패키지 크기를 작게 유지하고 배포 시간을 개선하기 위해 AWS Lambda Layer를 사용하여 관리됩니다.

- **Terraform 정의:** Lambda Layer는 `layer.tf` 파일 내 `aws_lambda_layer_version` 리소스를 사용하여 정의됩니다.
- **디렉토리 구조:** 빌드 프로세스(수동 또는 CI/CD, 예: GitHub Actions)는 패키징 전에 `infrastructure/chatbot/layers/chatbot_deps/nodejs` 디렉토리에 의존성을 설치해야 합니다. 이 구조(`nodejs/node_modules/...`)는 Lambda 런타임이 라이브러리를 찾는 데 필요합니다.
- **워크플로우 단계:** GitHub Actions 워크플로우(예: `deploy-chatbot.yml`)는 `npm install --prefix ./infrastructure/chatbot/layers/chatbot_deps/nodejs ./backend/lambdas/chatbot-query` 와 유사한 명령어를 사용하여 레이어 디렉토리를 채워야 합니다.
- **제외 항목:** `layer.tf`는 레이어 크기를 최소화하기 위해 `archive_file` 데이터 소스와 함께 제외 목록을 사용합니다.

## Lambda 함수 설정

`chatbot-query` Lambda 함수 자체는 `lambda.tf` 파일에 정의되어 있습니다.

- **런타임:** Node.js (`var.lambda_runtime`, 예: `nodejs20.x`).
- **아키텍처:** ARM64 (`arm64`).
- **핸들러 코드:** 핸들러 코드(`var.lambda_code_path`로 지정됨, 예: `backend/lambdas/chatbot-query/index.mjs`)만 함수의 배포 패키지에 포함됩니다.
- **의존성:** `chatbot_deps_layer` ARN을 사용합니다.
- **함수 URL:** `authorization_type = "AWS_IAM"` 및 `invoke_mode = "RESPONSE_STREAM"`으로 설정됩니다.
- **환경 변수:** `BEDROCK_MODEL_ID`, `COGNITO_JWKS_URL`, `COGNITO_ISSUER_URL`, `COGNITO_APP_CLIENT_ID`, `COGNITO_REGION`과 같은 주요 설정이 환경 변수로 전달됩니다.

## CloudFront 설정

- **OAC:** Lambda 오리진을 위해 특별히 `aws_cloudfront_origin_access_control` 리소스가 생성됩니다.
- **배포:** `aws_cloudfront_distribution` 리소스가 정의됩니다:
  - 오리진은 Lambda 함수 URL 도메인 이름을 가리킵니다.
  - 오리진은 설정된 OAC ID를 사용합니다.
  - 기본 캐시 동작은 필요한 헤더(예: `Authorization`, `Content-Type`, `x-amz-content-sha256`)를 전달하기 위해 적절한 Origin Request Policy (`Managed-AllViewerExceptHostHeader`)를 사용합니다.
  - 캐싱은 비활성화됩니다 (`Managed-CachingDisabled`).
  - 스트리밍 호환성을 위해 `Managed-SimpleCORS`와 같은 Response Headers Policy가 사용됩니다.

## 보안

- **엔드포인트 보안:** Lambda 함수 URL은 직접 접근할 수 없습니다. 접근은 OAC (SigV4 서명) 및 Lambda 리소스 정책을 통해 CloudFront 배포로 제한됩니다.
- **사용자 인증:** Lambda 함수는 요청을 처리하기 전에 Cognito User Pool에 대해 들어오는 JWT(`Authorization` 또는 커스텀 헤더로 전송됨)를 검증합니다.
- **AI 자격 증명:** AWS Bedrock 접근은 Lambda 실행 역할의 IAM 권한을 통해 제어됩니다 (코드에 장기 자격 증명 없음).

## 배포

변경 사항은 GitHub Actions 워크플로우 또는 수동으로 배포될 수 있습니다.

### 사전 요구 사항 (수동/워크플로우)

1. **레이어 채우기:** Terraform 적용 전에 `./layers/chatbot_deps/nodejs/` 디렉토리가 해당 디렉토리를 대상으로 `npm install`을 실행하여 올바른 `node_modules`로 채워졌는지 확인합니다. (CI/CD 워크플로우에서 이 단계를 수행하는 것이 일반적입니다.)
2. **Terraform CLI 설치됨.**
3. **AWS 자격 증명 구성됨:** Lambda, Layers, CloudFront, IAM 및 상태 관리를 위한 S3/DynamoDB에 필요한 권한.
4. **Cognito 원격 상태:** Cognito 인프라(`infrastructure/cognito`)가 배포되어 있고 상태 파일(`cognito/terraform.tfstate`)에 접근 가능해야 합니다.
5. **터미널에서 `infrastructure/chatbot/` 디렉토리로 이동합니다.**

### 주요 Terraform 명령어

- **초기화:** `terraform init` (백엔드 설정은 `backend.tf`에 정의되어 있습니다. 초기 실행 시 `-backend-config` 옵션을 사용하여 `backend-setup`에서 생성된 버킷/키/테이블 정보를 전달해야 할 수 있습니다. CI/CD에서는 환경 변수 사용).
- **계획:** `terraform plan` (생성/변경될 리소스 검토).
- **적용:** `terraform apply` (변경 사항 적용).

**참고:** CI/CD 파이프라인을 사용하는 경우, 수동 적용 시 주의해야 합니다.

## 다음 단계 (배포 후)

- Terraform에서 출력된 **CloudFront 배포 엔드포인트** (`cloudfront_distribution_domain_name`)를 기록합니다.
- `curl` 또는 Postman과 같은 도구를 사용하여 **CloudFront 엔드포인트**를 테스트합니다. POST 요청에는 다음 헤더가 필요합니다:
    - `Authorization: Bearer <YOUR_VALID_COGNITO_JWT_ID_TOKEN>`
    - `Content-Type: application/json`
    - `x-amz-content-sha256: <SHA256_HASH_OF_REQUEST_BODY>` (AWS SigV4 서명 요구 사항)
- 프론트엔드 애플리케이션의 환경 변수(`NEXT_PUBLIC_CHATBOT_API_ENDPOINT`)를 배포된 CloudFront 도메인 이름으로 업데이트합니다.
- 프론트엔드 API 클라이언트(`src/api/chatbotApi.ts`)가 요청 시 `Authorization` 및 `x-amz-content-sha256` 헤더를 올바르게 전송하는지 확인합니다.
