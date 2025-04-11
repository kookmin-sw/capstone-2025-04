# 🚀 커뮤니티 API 인프라 구축 (`infrastructure/api`)

이 디렉토리에는 **ALPACO 커뮤니티 백엔드 API**를 위한 AWS 인프라를 생성하고 관리하는 Terraform 코드가 포함되어 있습니다.

## 📌 목적

커뮤니티 서비스 백엔드에 필요한 AWS 리소스를 정의하는 것을 목표로 합니다. 주요 내용은 다음과 같습니다:

- RESTful 엔드포인트를 노출하는 API Gateway.
- 비즈니스 로직(게시물/댓글/좋아요 생성 등)을 처리하는 Lambda 함수.
- 커뮤니티 데이터(게시물, 댓글)를 저장하는 DynamoDB 테이블.
- Lambda 함수에 필요한 권한을 부여하는 IAM 역할 및 정책.
- 공유 Node.js 의존성(예: `uuid`)을 위한 Lambda Layer.
- 특정 API 엔드포인트의 사용자 인증을 위한 Cognito 연동.

**✅ 중요:** 이 Terraform 구성은 상태(State) 저장을 위해 **원격 S3 백엔드**를 사용하고, 상태 잠금(Locking)을 위해 **DynamoDB**를 사용합니다. 따라서 이 구성을 초기화하거나 적용하기 전에 **반드시 `../backend-setup` 디렉토리의 Terraform 코드를 먼저 실행**하여 필요한 S3 버킷과 DynamoDB 테이블을 생성해야 합니다. 또한, 이 구성은 API Gateway Authorizer에 필요한 User Pool ARN과 같은 `../cognito` 인프라의 출력 값에 의존합니다.

## ✨ 생성되는 주요 리소스

- `aws_api_gateway_rest_api`: 커뮤니티 서비스를 위한 메인 REST API.
- `aws_api_gateway_resource`: `/community`, `/{postId}`, `/comments` 등 API 경로 정의.
- `aws_api_gateway_method`: 각 리소스에 대한 HTTP 메서드(GET, POST, PUT, DELETE, OPTIONS) 정의.
- `aws_api_gateway_integration`: API Gateway 메서드를 백엔드 Lambda 함수와 연결 (`AWS_PROXY`).
- `aws_api_gateway_authorizer`: 특정 엔드포인트 보호를 위한 Cognito User Pool Authorizer 설정.
- `aws_dynamodb_table` (`Community`): 게시물과 댓글을 저장하며, 효율적인 게시물 조회를 위한 Global Secondary Index (`postOnlyIndex`) 포함.
  - _(주의: `createPost`와 같은 Lambda 함수는 인덱스 활용을 위해 `GSI1PK`, `GSI1SK` 속성을 테이블에 기록해야 합니다.)_
- `aws_lambda_function`: `backend/lambdas/community/` 내의 `.js` 파일에 해당하는 여러 함수들. 특정 API 액션 처리 (예: `createPost`, `getComments`, `likePost`).
- `aws_lambda_layer_version` (`common-deps`): Lambda 함수에서 사용할 공유 Node.js 의존성(예: `uuid`) 패키징. 적용 전 레이어 소스 디렉토리에서 `npm install` 필요.
- `aws_iam_role` (`CommunityLambdaExecRole`): Lambda 함수 실행 역할.
- `aws_iam_policy`: Lambda 역할에 필요한 DynamoDB 권한을 부여하는 사용자 정의 정책.
- `aws_lambda_permission`: API Gateway가 해당 Lambda 함수를 호출할 수 있도록 권한 부여.
- `aws_api_gateway_deployment` & `aws_api_gateway_stage`: API 구성을 특정 스테이지(예: `production`)에 배포.
- `aws_cloudwatch_log_group`: API Gateway 액세스 로깅용.
- `data "terraform_remote_state" "cognito"`: Cognito Terraform 상태에서 출력 값(예: Cognito User Pool ARN) 읽기.

## ✅ 사전 준비 사항

1. **AWS 계정** 및 필요한 권한으로 구성된 **AWS CLI**.
2. **Terraform** 설치 완료 (예: v1.x 이상).
3. **백엔드 리소스 생성 완료:** `../backend-setup/terraform apply` 성공적으로 실행 완료. 다음 출력 값이 필요합니다:
   - S3 버킷 이름 (`tfstate_bucket_name`)
   - DynamoDB 테이블 이름 (`tfstate_lock_table_name`)
4. **Cognito 리소스 생성 완료:** `../cognito/terraform apply` 성공적으로 실행 완료. Cognito 상태 파일이 S3 백엔드의 `cognito/terraform.tfstate` 경로에 존재해야 합니다.
5. **Lambda 소스 코드:** 백엔드 Lambda 함수 코드가 이 `infrastructure/api` 디렉토리 기준으로 `../../backend/lambdas/community/` 디렉토리에 있어야 합니다.
6. **Lambda 레이어 소스 코드 및 의존성:** 레이어 소스 코드가 `layers/common-deps/nodejs/`에 있어야 하며, 해당 디렉토리 내에서 `npm install`을 통해 의존성(예: `uuid`)이 설치되어 있어야 합니다. _(일반적으로 CI/CD 파이프라인에서 처리)_

## ⚙️ 사용 방법

1. **디렉토리 이동:**

   ```bash
   cd infrastructure/api
   ```

2. **Terraform 초기화 (원격 백엔드 설정):**
   `-backend-config` 옵션을 사용하여 `backend-setup`에서 생성된 버킷, 키, 리전, 테이블을 지정합니다. **`<...>` 플레이스홀더를 실제 값으로 교체하세요.**

   ```bash
   terraform init \
     -backend-config="bucket=<YOUR_TFSTATE_BUCKET_NAME>" \
     -backend-config="key=api/community/terraform.tfstate" \
     -backend-config="region=<YOUR_AWS_REGION>" \
     -backend-config="dynamodb_table=<YOUR_TFSTATE_LOCK_TABLE_NAME>" \
     -backend-config="encrypt=true"

   # 예시:
   # terraform init \
   #   -backend-config="bucket=alpaco-tfstate-bucket-kmu" \
   #   -backend-config="key=api/community/terraform.tfstate" \
   #   -backend-config="region=ap-northeast-2" \
   #   -backend-config="dynamodb_table=alpaco-tfstate-lock-table" \
   #   -backend-config="encrypt=true"
   ```

   - 다른 상태 파일과 구분하기 위해 여기서는 특정 `key` 값(`api/community/terraform.tfstate`)을 사용합니다.

3. **(선택) 실행 계획 검토:**
   Terraform이 생성하거나 변경할 리소스를 미리 확인합니다.

   ```bash
   terraform plan
   ```

4. **변경 사항 적용:**
   AWS 리소스를 생성하거나 업데이트합니다.

   ```bash
   terraform apply
   ```

   - 확인 메시지가 나타나면 `yes`를 입력합니다.

5. **✅ 출력 값 기록:**
   `apply` 성공 후 표시되는 출력 값을 기록해두세요. 프론트엔드 및 CI/CD 설정에 필수적입니다:
   - `api_gateway_invoke_url`: 배포된 API 호출을 위한 기본 URL.
   - `community_dynamodb_table_name`: 생성된 DynamoDB 테이블 이름.
   - `lambda_exec_role_arn`: Lambda가 사용하는 역할의 ARN.
   - `common_deps_layer_arn`: 생성된 Lambda 레이어의 ARN.
   - ... (`outputs.tf`에 정의된 다른 출력 값들)

## 🔧 구성 변수 (`variables.tf`)

이 구성에서 사용되는 주요 변수:

- `aws_region`: 대상 AWS 리전.
- `project_name`: 리소스 이름 접두사.
- `environment`: 배포 환경 (예: `production`).
- `common_tags`: 리소스에 적용할 공통 태그.
- `tf_state_bucket`, `tf_state_lock_table`: `init` 시 `-backend-config`를 통해 전달됨.

## 👉 다음 단계

1. **프론트엔드 연동:**
   - 프론트엔드 애플리케이션(예: Next.js)에서 커뮤니티 API 호출 시 `api_gateway_invoke_url` 출력 값을 기본 URL로 사용하도록 설정합니다 (환경 변수 `NEXT_PUBLIC_API_ENDPOINT` 등 활용).
   - 보호된 API 엔드포인트(POST, PUT, DELETE) 요청 시 프론트엔드 클라이언트가 `Authorization` 헤더에 Cognito JWT ID 토큰을 포함하여 전송하도록 구현합니다.
2. **CI/CD 파이프라인:**
   - GitHub Actions 워크플로우 (`.github/workflows/deploy-api.yml` - `PLAN.md` 참조)를 설정합니다.
   - 필요한 GitHub Secrets를 설정합니다:
     - `AWS_IAM_ROLE_ARN_API`: 워크플로우가 Terraform을 실행하기 위해 AssumeRole 할 IAM 역할 ARN (API Gateway, Lambda, DynamoDB, IAM, Layer 관리 권한 필요).
     - `AWS_REGION`: AWS 리전.
     - `TF_STATE_BUCKET`: 상태 저장용 S3 버킷 이름.
     - `TF_STATE_LOCK_TABLE`: 잠금용 DynamoDB 테이블 이름.
   - 워크플로우가 `terraform apply` 전에 `infrastructure/api/layers/common-deps/nodejs/` 디렉토리에서 `npm install`을 실행하여 레이어 콘텐츠를 준비하도록 합니다.
   - 워크플로우를 트리거하여(예: `main` 브랜치 푸시) 자동 배포를 테스트합니다.
