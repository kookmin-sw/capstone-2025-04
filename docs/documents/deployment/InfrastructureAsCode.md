---
layout: default
title: "🛠️ Terraform 인프라"
parent: "🧑‍💻 개발 가이드"
nav_order: 3
description: "Terraform 인프라 가이드"
permalink: /documents/deployment/InfrastructureAsCode/
---

# ALPACO 프로젝트: Terraform 인프라 사용 가이드

이 문서는 Terraform을 사용하여 ALPACO 프로젝트의 AWS 인프라를 이해하고, 배포하며, 관리하는 방법에 대한 포괄적인 가이드입니다.

## 1. 서론

ALPACO 프로젝트는 AWS 클라우드 인프라를 코드화되고, 반복 가능하며, 버전 관리가 가능한 방식으로 정의하고 프로비저닝하기 위해 Terraform을 활용합니다. 이 접근 방식은 환경 전반의 일관성을 보장하고 복잡한 클라우드 리소스 관리를 단순화합니다.

이 가이드에서는 다음 내용을 다룹니다:

- 사용된 핵심 기술 및 원칙.
- Terraform 코드의 디렉토리 구조.
- 배포를 위한 사전 준비 사항.
- 각 인프라 모듈에 대한 단계별 배포 지침.
- CI/CD 통합 고려 사항.
- 시크릿(민감 정보) 관리.

## 2. 핵심 기술 및 원칙

- **Terraform:** 주요 IaC(Infrastructure as Code) 도구입니다.
  - **모듈성(Modularity):** 인프라는 논리적 모듈(예: `app`, `api`, `cognito`, `chatbot`)로 분할됩니다.
  - **원격 상태(Remote State):** Terraform 상태는 협업과 안전을 위해 S3 버킷에 저장되고 DynamoDB 테이블을 사용하여 잠깁니다. 이 S3 버킷과 DynamoDB 테이블은 `backend-setup` 모듈에 의해 생성됩니다.
  - **변수(Variables):** 다양한 환경이나 설정에 대한 구성 매개변수화.
  - **출력(Outputs):** 다른 모듈이나 애플리케이션 구성에서 사용할 수 있도록 중요한 리소스 식별자 노출.
- **활용된 AWS 서비스:**
  - **S3:** Terraform 상태 저장, 프론트엔드 정적 자산 호스팅.
  - **DynamoDB:** Terraform 상태 잠금, 애플리케이션 데이터 저장 (커뮤니티 게시물, 문제, 제출 기록 등).
  - **Cognito:** 사용자 인증 및 권한 부여.
  - **API Gateway:** 백엔드 서비스를 위한 RESTful API 노출.
  - **Lambda:** 백엔드 로직을 위한 서버리스 컴퓨팅 (커뮤니티 API, 문제 API, 코드 실행, 챗봇, 문제 생성).
  - **Lambda Layers:** Lambda 함수를 위한 공유 Node.js 의존성 관리.
  - **CloudFront:**
    - 프론트엔드 애플리케이션을 위한 CDN(Content Delivery Network).
    - 챗봇 및 문제 생성기와 같은 서비스를 위해 OAC(Origin Access Control)를 통해 Lambda 함수 URL을 안전하게 노출.
  - **IAM:** 안전한 접근 제어를 위한 역할, 정책, 권한.
  - **Route 53:** 사용자 지정 도메인을 위한 DNS 관리 (`app` 모듈에서 사용).
  - **ACM (AWS Certificate Manager):** 사용자 지정 도메인을 위한 SSL/TLS 인증서 (`app` 모듈에서 사용, CloudFront용 인증서는 `us-east-1` 리전에 생성).
  - **CloudWatch Logs:** Lambda, API Gateway 등의 로그 저장.
- **Lambda 런타임:**
  - Node.js (커뮤니티 API, 챗봇, 문제 생성기 v3, 문제 API, 제출 API용)
  - Python (코드 실행 서비스용)
- **Lambda Layer 의존성 관리:**
  - `nodejs` 하위 디렉토리에 직접 `npm install` (예: `infrastructure/api/layers/common-deps/nodejs`).
  - 더 복잡한 레이어의 경우 Docker 기반 빌드 사용, `nodejs` 디렉토리 구조로 출력 (예: `infrastructure/problem-generator-v3/layers/`).
- **CI/CD:** 자동화된 테스트 및 배포를 위해 GitHub Actions가 계획/사용됩니다 (세부 사항은 모듈별 README 또는 `PLAN.md` 참조).

## 3. 사전 준비 사항

시작하기 전에 다음 사항이 설치 및 구성되어 있는지 확인하십시오:

1. **AWS CLI:** 적절한 자격 증명 및 기본 리전으로 구성되어야 합니다.

    ```bash
    aws configure
    ```

2. **Terraform:** 최신 안정 버전 (예: v1.x).
3. **Node.js & npm:** Node.js 함수용 Lambda Layer 의존성 관리를 위해 필요합니다.
4. **Docker:** (선택 사항이지만, `problem-generator-v3`와 같은 특정 Lambda Layer 빌드에 필요합니다).
5. **Git:** 버전 관리를 위해 필요합니다.
6. **Google Cloud 프로젝트 자격 증명:**
    - **Google Client ID 및 Secret:** Cognito Google 로그인을 위해 필요 (`infrastructure/cognito`).
    - **Google AI API Key:** Gemini 모델을 사용하는 서비스를 위해 필요 (`infrastructure/chatbot`, `infrastructure/problem-generator-v3`).
7. **사용자 지정 도메인 (선택 사항):** `app` 모듈을 사용자 지정 도메인으로 배포하는 경우, 해당 DNS 관리에 접근할 수 있어야 합니다 (예: Route 53 호스팅 영역).

## 4. 디렉토리 구조 개요

Terraform 코드는 `infrastructure/` 디렉토리 아래에 구성됩니다:

```
capstone-2025-04/
├── infrastructure/
│   ├── backend-setup/          # Terraform 상태 백엔드 (S3, DynamoDB)
│   ├── cognito/                # 사용자 인증 (Cognito)
│   ├── app/                    # 프론트엔드 호스팅 (S3, CloudFront, OIDC 역할)
│   ├── api/                    # 커뮤니티 API (API GW, Lambda, DynamoDB, Layer)
│   ├── problems-api/           # 문제 API (API GW, Lambda, 문제 생성기의 DynamoDB 사용)
│   ├── problem-generator-v3/   # 문제 생성 서비스 v3 (Lambda URL, CF, DynamoDB, Layer)
│   ├── code-execution-service/ # 코드 채점기 및 실행기 (API GW, Lambdas, DynamoDB)
│   ├── submissions-api/        # 제출 API (API GW, Lambda, 코드 실행 서비스의 DynamoDB 사용)
│   ├── chatbot/                # 챗봇 서비스 (Lambda URL, CF, Layer)
│   └── ... (기타 잠재적 모듈 또는 공유 파일)
├── backend/
│   └── lambdas/                # Lambda 함수 소스 코드
│       ├── community-lambda-functions/
│       ├── chatbot-query/
│       ├── problem-generator-v3/
│       ├── code-executor/
│       ├── code-grader/
│       ├── problems-api/
│       └── submissions-api/
└── ... (프론트엔드 코드 등)
```

`infrastructure/` 내의 각 하위 디렉토리는 일반적으로 자체 `main.tf`, `variables.tf`, `outputs.tf` 및 `backend.tf`(원격 상태 사용 시)를 가진 고유한 Terraform 모듈을 나타냅니다.

## 5. 전역 설정: Terraform 상태 백엔드

이것은 기초 단계이며 **가장 먼저 수행해야 합니다**.

**모듈:** `infrastructure/backend-setup/`

1. **목적:** Terraform 상태 파일을 저장할 S3 버킷과 상태 잠금을 위한 DynamoDB 테이블을 생성합니다.
2. **상태 관리:** 이 모듈 자체는 원격 상태를 위한 리소스를 만들기 때문에 *로컬* 상태 파일(`terraform.tfstate`)을 사용합니다.
3. **배포:**

    ```bash
    cd infrastructure/backend-setup
    terraform init
    terraform plan
    terraform apply
    ```

4. **출력:** `tfstate_bucket_name`과 `tfstate_lock_table_name`을 기록해 두십시오. 이 값들은 다른 모든 모듈에서 사용됩니다.
    `output.txt` 예시:
    - `tfstate_bucket_name = "alpaco-tfstate-bucket-kmu"`
    - `tfstate_lock_table_name = "alpaco-tfstate-lock-table"`

## 6. 모듈별 배포 지침

`backend-setup`이 완료된 후 다른 모듈을 배포할 수 있습니다. 의존성으로 인해 순서가 중요할 수 있습니다 (예: API 모듈은 Cognito 출력에 의존할 수 있음).

**각 모듈에 대한 일반적인 Terraform 명령어 (달리 명시되지 않는 한):**

- **모듈 디렉토리로 이동:** `cd infrastructure/<module-name>`
- **Terraform 초기화:**

    ```bash
    terraform init \
      -backend-config="bucket=<YOUR_TFSTATE_BUCKET_NAME_FROM_BACKEND_SETUP>" \
      -backend-config="key=<module-specific-key-from-backend.tf>" \
      -backend-config="region=<YOUR_AWS_REGION>" \
      -backend-config="dynamodb_table=<YOUR_TFSTATE_LOCK_TABLE_NAME_FROM_BACKEND_SETUP>" \
      -backend-config="encrypt=true"
    ```

    *플레이스홀더를 실제 값으로 교체하십시오.*
    *`key`는 각 모듈의 `backend.tf` 파일에 정의되어 있습니다.*
    *예시:* `cognito` 모듈의 경우 키는 `cognito/terraform.tfstate`입니다.
- **실행 계획 검토:** `terraform plan` (필요한 `-var` 옵션 전달)
- **변경 사항 적용:** `terraform apply` (필요한 `-var` 옵션 전달)
- **출력 값 검토:** `terraform output`

---

### 6.1. Cognito (`infrastructure/cognito/`)

1. **목적:** AWS Cognito 사용자 풀을 설정하여 Google 로그인을 지원하고, 사용자 그룹 및 사용자를 기본 그룹에 추가하는 Lambda 트리거를 구성합니다.
2. **주요 리소스:** `aws_cognito_user_pool`, `aws_cognito_identity_provider` (Google), `aws_cognito_user_pool_client`, `aws_cognito_user_group`, `aws_lambda_function` (PostConfirmation 트리거).
3. **시크릿:**
    - `google_client_id`: `terraform.auto.tfvars` 또는 명령줄(`-var="google_client_id=..."`)을 통해 제공합니다.
    - `google_client_secret`: `terraform.auto.tfvars` (이 파일은 `.gitignore`에 추가) 또는 명령줄(`-var="google_client_secret=..."`)을 통해 제공합니다.
    **예시 `infrastructure/cognito/terraform.auto.tfvars` (`.gitignore`에 추가):**

    ```tfvars
    google_client_id     = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
    google_client_secret = "YOUR_GOOGLE_CLIENT_SECRET"
    ```

4. **배포:** 일반적인 명령어를 따릅니다. `backend.tf`는 `key = "cognito/terraform.tfstate"`를 지정합니다.
5. **출력:** `cognito_user_pool_id`, `cognito_user_pool_client_id`, `cognito_user_pool_arn` 등. Cognito와 통합되는 다른 서비스에 매우 중요합니다.

---

### 6.2. 코드 실행 서비스 (`infrastructure/code-execution-service/`)

1. **목적:** 코드 실행 및 채점 기능을 제공합니다. `code-executor` Lambda (Python)와 API Gateway를 통해 노출되는 `code-grader` Lambda (Python)를 포함합니다. 제출 기록을 DynamoDB 테이블에 저장합니다.
2. **주요 리소스:** `aws_lambda_function` (x2), `aws_dynamodb_table` (제출 기록), `aws_api_gateway_rest_api`.
3. **의존성:**
    - `problem-generator-v3` 모듈의 원격 상태에서 `problems_table_name` 및 `problems_table_arn`을 읽습니다.
    - API Gateway 권한 부여자(Authorizer)를 위해 `cognito` 모듈의 원격 상태에서 `cognito_user_pool_arn`을 읽습니다.
4. **배포:**
    - **순서 고려:** `problem-generator-v3` 모듈이 먼저 배포되어 `problems_table`을 생성해야 합니다.
    - 일반적인 명령어를 따릅니다. `backend.tf`는 `key = "code-execution-service/terraform.tfstate"`를 지정합니다.
5. **출력:** `code_grader_api_invoke_url`, `submissions_table_name_output`, `code_executor_lambda_arn` 등.

---

### 6.3. 문제 생성기 v3 (`infrastructure/problem-generator-v3/`)

1. **목적:** Google AI (Gemini)를 사용하여 프로그래밍 문제를 생성하고 DynamoDB에 저장합니다. CloudFront를 통해 Lambda 함수 URL로 기능을 노출합니다.
2. **주요 리소스:** `aws_lambda_function`, `aws_lambda_layer_version`, `aws_dynamodb_table` (Problems-v3), `aws_cloudfront_distribution`, `aws_cloudfront_origin_access_control`.
3. **의존성:**
    - `code-execution-service` 모듈의 `code_executor_lambda_arn`이 필요합니다 (변수로 전달).
4. **시크릿:**
    - `google_ai_api_key`: `terraform.auto.tfvars` 또는 명령줄을 통해 제공합니다.
    **예시 `infrastructure/problem-generator-v3/terraform.auto.tfvars` (`.gitignore`에 추가):**

    ```tfvars
    google_ai_api_key = "YOUR_GOOGLE_AI_API_KEY"
    ```

5. **Lambda Layer:** 이 모듈은 Docker 기반 빌드 스크립트 (`layers/build-layer.sh`)를 사용하여 Node.js 의존성을 패키징합니다. 이 스크립트는 `package-lock.json` 또는 빌드 스크립트가 변경되면 Terraform에 의해 `null_resource`를 통해 자동으로 실행됩니다.
    - 로컬에서 배포하는 경우 Docker가 실행 중인지 확인하십시오.
    - `build-layer.sh` 스크립트는 `backend/lambdas/problem-generator-v3/`에서 `package.json` 및 `package-lock.json`을 복사하여 레이어를 빌드합니다.
6. **순환 의존성 배포 전략 (`code-execution-service` 관련):**
    `problem-generator-v3/readme.md`에 언급된 바와 같이, 이 모듈은 `code-execution-service`의 `code_executor_lambda_arn`에 의존하고, `code-execution-service`는 이 모듈의 `problems_table_arn`에 의존합니다.
    - **1단계: `problem-generator-v3` 배포 (초기)**
        - `variables.tf`의 `code_executor_lambda_arn`을 임시 유효한 ARN 문자열로 설정하거나 기본값이 플레이스홀더인 경우 그대로 두고 배포합니다.
        - `problem-generator-v3`에 대해 `terraform apply`를 실행합니다. 이렇게 하면 `problems_table`이 생성됩니다.
    - **2단계: `code-execution-service` 배포**
        - `code-execution-service`에 대해 `terraform apply`를 실행합니다. 이 모듈은 `problem-generator-v3`의 상태에서 `problems_table_arn`을 읽어 `code_executor_lambda`를 생성합니다. `code_executor_lambda_arn` 출력을 기록합니다.
    - **3단계: `problem-generator-v3` 배포 (업데이트)**
        - 2단계에서 얻은 실제 ARN으로 `infrastructure/problem-generator-v3/variables.tf`를 업데이트하거나 `terraform.auto.tfvars`를 사용하여 `code_executor_lambda_arn`을 설정합니다.
        - `problem-generator-v3`에 대해 다시 `terraform apply`를 실행합니다.
7. **출력:** `cloudfront_distribution_domain`, `problems_table_name`, `problems_table_arn`.

---

### 6.4. 커뮤니티 API (`infrastructure/api/`)

1. **목적:** 커뮤니티 기능(게시물, 댓글, 좋아요)을 위한 핵심 백엔드입니다.
2. **주요 리소스:** `aws_api_gateway_rest_api`, 다수의 `aws_lambda_function` 리소스, `aws_dynamodb_table` (커뮤니티), `aws_lambda_layer_version`.
3. **의존성:**
    - API Gateway 권한 부여자(Authorizer)를 위해 `cognito` 모듈의 원격 상태에서 `cognito_user_pool_arn`을 읽습니다.
4. **Lambda Layer (`common-deps`):**
    - `uuid` 의존성을 포함합니다.
    - **`terraform apply` 전 수동 단계 (CI/CD에서 처리하지 않는 경우):**

        ```bash
        cd infrastructure/api/layers/common-deps/nodejs
        npm install
        cd ../../../.. # infrastructure/api로 돌아가기
        ```

5. **배포:** 일반적인 명령어를 따릅니다. `backend.tf`는 `key = "api/community/terraform.tfstate"`를 지정합니다.
6. **출력:** `api_gateway_invoke_url`, `community_dynamodb_table_name`.

---

### 6.5. 문제 API (`infrastructure/problems-api/`)

1. **목적:** 문제 데이터를 가져오는 읽기 전용 API 엔드포인트를 제공합니다.
2. **주요 리소스:** `aws_api_gateway_rest_api`, `aws_lambda_function` (x2: `getAllProblems`, `getProblemById`).
3. **의존성:**
    - `problem-generator-v3` 모듈의 원격 상태에서 `problems_table_name` 및 `problems_table_arn`을 읽습니다.
4. **Lambda 코드:** Lambda 핸들러 코드(`getAllProblems.mjs`, `getProblemById.mjs`)가 `backend/lambdas/problems-api/`에 있는지 확인합니다.
5. **배포:** 일반적인 명령어를 따릅니다. `backend.tf`는 `key = "api/problems/terraform.tfstate"`를 지정합니다.
6. **출력:** `problems_api_invoke_url`.

---

### 6.6. 제출 API (`infrastructure/submissions-api/`)

1. **목적:** 제출 기록 데이터를 가져오는 API 엔드포인트를 제공합니다.
2. **주요 리소스:** `aws_api_gateway_rest_api`, `aws_lambda_function` (`getSubmission`).
3. **의존성:**
    - `code-execution-service` 모듈의 원격 상태에서 `submissions_table_name_output` 및 `submissions_table_arn_output`을 읽습니다.
4. **Lambda 코드:** Lambda 핸들러 코드(`getSubmission.mjs`)가 `backend/lambdas/submissions-api/`에 있는지 확인합니다.
5. **배포:** 일반적인 명령어를 따릅니다. `backend.tf`는 `key = "api/submissions/terraform.tfstate"`를 지정합니다.
6. **출력:** `submissions_api_invoke_url`.

---

### 6.7. 챗봇 (`infrastructure/chatbot/`)

1. **목적:** Google AI (Gemini)를 사용하는 AI 챗봇 백엔드 서비스이며, Lambda 함수 URL과 CloudFront를 통해 노출됩니다.
2. **주요 리소스:** `aws_lambda_function`, `aws_lambda_layer_version`, `aws_cloudfront_distribution`, `aws_cloudfront_origin_access_control`.
3. **의존성:**
    - `cognito` 모듈의 원격 상태에서 Cognito 출력(`cognito_user_pool_id`, `cognito_user_pool_client_id` 등)을 읽습니다.
4. **시크릿:**
    - `google_ai_api_key`: `terraform.auto.tfvars` 또는 명령줄을 통해 제공합니다.
    **예시 `infrastructure/chatbot/terraform.auto.tfvars` (`.gitignore`에 추가):**

    ```tfvars
    google_ai_api_key = "YOUR_GOOGLE_AI_API_KEY"
    ```

5. **Lambda Layer (`chatbot_deps`):**
    - `@langchain/google-genai`, `jose` 등을 포함합니다.
    - **`terraform apply` 전 수동 단계 (CI/CD에서 처리하지 않는 경우):**
        레이어용 `package.json`은 `infrastructure/chatbot/layers/chatbot_deps/nodejs/`에 있습니다. 이 `nodejs` 디렉토리 내에 `node_modules`가 채워지도록 `npm install`을 실행해야 합니다.

        ```bash
        # 프로젝트 루트에서:
        npm install --prefix ./infrastructure/chatbot/layers/chatbot_deps/nodejs ./infrastructure/chatbot/layers/chatbot_deps/nodejs
        # 또는 (package.json이 backend/lambdas/chatbot-query에 상대적으로 의존성을 올바르게 나열하는 경우)
        # npm install --prefix ./infrastructure/chatbot/layers/chatbot_deps/nodejs ./backend/lambdas/chatbot-query
        ```

        그러면 `layer.tf`가 `infrastructure/chatbot/layers/chatbot_deps/`의 내용을 압축합니다.
6. **배포:** 일반적인 명령어를 따릅니다. `backend.tf`는 `key = "chatbot/terraform.tfstate"`를 지정합니다.
7. **출력:** `cloudfront_distribution_domain_name`.

---

### 6.8. 애플리케이션 프론트엔드 (`infrastructure/app/`)

1. **목적:** Next.js 프론트엔드 애플리케이션을 S3에 호스팅하고 CloudFront를 통해 제공합니다. 사용자 지정 도메인 설정 및 GitHub Actions 배포를 위한 IAM OIDC 역할을 포함합니다.
2. **주요 리소스:** `aws_s3_bucket`, `aws_cloudfront_distribution`, `aws_route53_record`, `aws_acm_certificate`, `aws_iam_role` (GitHub Actions용).
3. **사전 준비 사항:**
    - `custom_domain_name`(예: `alpaco.us`)에 대한 Route 53 퍼블릭 호스팅 영역.
4. **사용자 지정 도메인 및 ACM 인증서:**
    - CloudFront용 ACM 인증서는 **반드시 `us-east-1` 리전에 생성되어야 합니다**. 이 모듈의 `providers.tf`는 `us-east-1`용 별칭 공급자를 구성합니다.
    - 인증서용 DNS 유효성 검사 레코드는 Route 53 호스팅 영역에 자동으로 생성됩니다.
5. **OIDC 역할:** GitHub Actions가 프론트엔드 자산을 S3에 배포하고 CloudFront 캐시를 무효화하기 위해 맡을 수 있는 IAM 역할을 생성합니다.
6. **배포:** 일반적인 명령어를 따릅니다. `backend.tf`는 `key = "app/terraform.tfstate"`를 지정합니다.
    - 기본값과 다른 경우 `github_repository`를 전달해야 할 수 있습니다.
7. **출력:** `application_url` (사용자 지정 도메인), `cloudfront_distribution_domain_name`, `github_actions_deploy_role_arn`.

## 7. 전체 배포 전략 및 순서

모듈 간 의존성(주로 `terraform_remote_state`를 통해)으로 인해 일반적인 배포 순서가 권장됩니다:

1. **`infrastructure/backend-setup`**: (로컬 상태) 원격 상태를 위한 S3/DynamoDB 생성.
2. **`infrastructure/cognito`**: (원격 상태 사용) 사용자 풀 생성.
    - `google_client_id` 및 `google_client_secret` 필요.
3. **`infrastructure/problem-generator-v3` (1단계)**: (원격 상태 사용)
    - `google_ai_api_key` 필요.
    - 플레이스홀더 `code_executor_lambda_arn`으로 배포하거나 기본값 허용.
    - Docker를 사용하여 Lambda 레이어 빌드.
    - *출력: `problems_table_arn`.*
4. **`infrastructure/code-execution-service`**: (원격 상태 사용)
    - `problem-generator-v3` 상태에서 `problems_table_arn` 읽기.
    - `cognito` 상태에서 `cognito_user_pool_arn` 읽기.
    - *출력: `code_executor_lambda_arn`, `submissions_table_name_output`, `submissions_table_arn_output`.*
5. **`infrastructure/problem-generator-v3` (2단계 - 업데이트)**:
    - `code-execution-service` 출력에서 실제 `code_executor_lambda_arn`으로 업데이트.
    - 다시 `terraform apply` 실행.
6. **`infrastructure/api` (커뮤니티 API)**: (원격 상태 사용)
    - 레이어에 대해 `npm install` 필요.
    - `cognito` 상태에서 `cognito_user_pool_arn` 읽기.
7. **`infrastructure/chatbot`**: (원격 상태 사용)
    - 레이어에 대해 `npm install` 필요.
    - Cognito 상태 읽기.
    - `google_ai_api_key` 필요.
8. **`infrastructure/problems-api`**: (원격 상태 사용)
    - `problem-generator-v3` 상태에서 `problems_table_name` 읽기.
9. **`infrastructure/submissions-api`**: (원격 상태 사용)
    - `code-execution-service` 상태에서 `submissions_table_name_output` 읽기.
10. **`infrastructure/app`**: (원격 상태 사용)
    - 프론트엔드 호스팅 설정. OIDC 역할에 GitHub 저장소 이름 필요.

**최초 전체 배포:**
처음 전체 배포 시에는 일반적으로 위 순서대로 각 모듈을 적용하여 한 모듈의 출력이 다음 모듈에서 사용 가능하도록 합니다 (수동으로 변수를 전달하거나 `terraform_remote_state`를 통해 자동으로 읽음).

## 8. CI/CD (GitHub Actions)

- **워크플로우 파일:** GitHub Actions 워크플로우(예: `.github/workflows/deploy-app.yml`, `.github/workflows/deploy-api.yml`)는 특정 모듈의 배포를 자동화합니다.
- **OIDC 인증:** 워크플로우는 AWS와 인증하기 위해 OIDC를 사용해야 하며, 필요한 권한을 가진 IAM 역할을 맡습니다 (예: 프론트엔드용 `app` 모듈에서 생성된 역할 또는 백엔드 서비스용 전용 역할).
- **시크릿:**
  - AWS 자격 증명 (OIDC 역할 ARN을 통해).
  - `TF_STATE_BUCKET`, `TF_STATE_LOCK_TABLE`: `terraform init` 백엔드 구성용.
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_AI_API_KEY`: 해당 모듈에 필요. GitHub Secrets로 저장합니다.
- **CI/CD 내 Terraform 명령어:**
  - `terraform init -backend-config=...` (버킷/테이블 이름에 시크릿 사용).
  - `terraform plan -out=tfplan`.
  - `terraform apply tfplan`.
- **레이어 빌드:** CI/CD 파이프라인에는 다음 단계가 포함되어야 합니다:
  - 단순 Node.js 레이어(`api`, `chatbot` 등)의 경우 `npm install` 실행.
  - `problem-generator-v3`의 경우 Docker 빌드 스크립트(`build-layer.sh`) 실행.
    이는 해당 모듈에 대한 `terraform apply` *전에* 수행되어야 합니다.

## 9. 시크릿(민감 정보) 관리

- **로컬 개발:**
  - 각 모듈 디렉토리 내의 `terraform.auto.tfvars` 파일을 사용하여 API 키나 클라이언트 시크릿과 같은 민감한 변수를 저장합니다.
  - **중요:** 시크릿 커밋을 방지하기 위해 프로젝트의 `.gitignore` 파일에 `*.auto.tfvars`를 추가하십시오.
- **CI/CD (GitHub Actions):**
  - 민감한 값을 GitHub Secrets(예: `GOOGLE_AI_API_KEY`, `AWS_OIDC_ROLE_ARN`)로 저장합니다.
  - 워크플로우의 Terraform 단계에 이러한 시크릿을 환경 변수로 전달합니다. 예: `TF_VAR_google_ai_api_key: ${{ secrets.GOOGLE_AI_API_KEY }}`.

## 10. 문제 해결 및 모범 사례

- **`terraform validate`:** 계획 또는 적용 전에 구문을 확인하기 위해 실행합니다.
- **`terraform fmt`:** 코드를 일관되게 형식화합니다.
- **작고 점진적인 변경:** 문제 해결을 더 쉽게 하려면 변경 사항을 작은 단위로 적용합니다.
- **`terraform_remote_state` 이해:** `key`와 `bucket`이 의존성 모듈의 상태 파일을 올바르게 가리키는지 확인합니다. 의존성 모듈은 먼저 성공적으로 `apply`되어야 합니다.
- **IAM 권한:** `terraform apply`가 권한 오류로 실패하면 생성되거나 맡겨지는 IAM 정책 및 역할을 신중하게 검토하십시오. AWS 콘솔(IAM Access Analyzer, CloudTrail)이 도움이 될 수 있습니다.
- **순환 의존성:** 이러한 문제가 발생하면 모듈을 더 분리하거나 `problem-generator-v3` 및 `code-execution-service`에 대해 보여준 것처럼 다단계 적용을 사용해야 할 수 있습니다.
- **CloudFront 전파:** CloudFront 배포 변경 사항이 전 세계적으로 전파되는 데 몇 분 정도 걸릴 수 있습니다.
- **Lambda Layer 경로:** 레이어용 `data "archive_file"`의 `source_dir`이 설치된 의존성이 있는 `nodejs` (또는 `python`) 폴더를 포함하는 디렉토리를 올바르게 가리키는지 확인합니다.

이 가이드는 ALPACO 프로젝트의 Terraform 인프라 작업에 대한 확실한 기초를 제공합니다. 더 구체적인 세부 정보는 개별 모듈 `README.md` 파일을 참조하십시오.
