# 🚀 Application Infrastructure Setup (`infrastructure/app`)

이 디렉토리의 Terraform 코드는 **ALPACO 프론트엔드 애플리케이션**을 호스팅하고 배포하는 데 필요한 AWS 인프라를 생성하고 관리합니다.

## 📌 목적

Next.js 정적 빌드 결과물을 S3에 배포하고, CloudFront를 통해 전 세계 사용자에게 빠르고 안전하게 콘텐츠를 제공하며, GitHub Actions를 이용한 자동 배포를 위한 인프라를 구축합니다.

**✅ 중요:** 이 코드의 Terraform 상태(State)는 **원격 S3 백엔드**에 저장되고, **DynamoDB**를 사용하여 상태 잠금(Locking)을 관리합니다. 따라서 이 코드를 실행하기 전에 **반드시 `../backend-setup` 디렉토리의 Terraform 코드를 먼저 실행**하여 해당 S3 버킷과 DynamoDB 테이블을 생성해야 합니다.

## ✨ 생성되는 주요 리소스

- `aws_s3_bucket` (웹사이트용): Next.js 정적 파일을 저장할 버킷
- `aws_s3_bucket_acl`, `aws_s3_bucket_public_access_block`: 웹사이트 버킷 보안 설정 (비공개 유지)
- `aws_cloudfront_origin_access_control`: CloudFront가 S3 버킷에 안전하게 접근하기 위한 설정
- `aws_cloudfront_distribution`: S3 버킷을 오리진으로 사용하는 CDN 배포
- `aws_cloudfront_function`: CloudFront Viewer Request 시 URL을 재작성하여 Next.js 정적 사이트의 경로 문제를 해결 (예: `/path` 요청을 `/path/index.html`로 변경하여 새로고침 시 403/404 오류 방지)
- `aws_s3_bucket_policy`: CloudFront OAC만 S3 버킷에 접근하도록 허용하는 정책
- `aws_iam_openid_connect_provider` (선택적): GitHub Actions OIDC 인증용 Provider (계정에 없을 경우 생성)
- `aws_iam_role` (GitHub Actions용): GitHub Actions 워크플로우가 AWS 리소스(S3 동기화, CloudFront 무효화)에 접근할 때 사용할 역할
- `aws_iam_role_policy`: 위 IAM Role에 필요한 최소 권한 정책 연결

## ✅ 사전 준비 사항

1. **AWS 계정** 및 **AWS CLI** 설정 (자격 증명 구성 완료)
2. **Terraform** 설치 (버전 확인, 예: v1.x 이상)
3. **백엔드 리소스 생성 완료:** `../backend-setup` 코드를 실행하여 Terraform 상태 저장용 S3 버킷과 잠금용 DynamoDB 테이블이 **이미 생성되어 있어야 합니다.**
4. **필요한 정보:**
   - `../backend-setup` 실행 후 출력된 **S3 버킷 이름** (`tfstate_bucket_name`)
   - `../backend-setup` 실행 후 출력된 **DynamoDB 테이블 이름** (`tfstate_lock_table_name`)
   - 배포 대상 **GitHub Repository 이름** (예: `kookmin-sw/capstone-2025-04`)
   - 백엔드 리소스가 있는 **AWS 리전** (예: `ap-northeast-2`)

## ⚙️ 사용 방법

1. **디렉토리 이동:**

   ```bash
   cd infrastructure/app
   ```

2. **Terraform 초기화 (원격 백엔드 설정):**
   `terraform init` 명령을 실행하면서 `backend.tf`의 값들을 사용하여 원격 백엔드 정보를 전달합니다.
   이는 infrastructure/backend 의 설정에 따릅니다.

   ```bash
   terraform init
   ```

3. **(선택) 실행 계획 검토:**
   생성/변경될 리소스를 미리 확인합니다. GitHub Repository 이름이 기본값과 다른 경우 `-var` 옵션으로 전달해야 할 수 있습니다.

   ```bash
   terraform plan
   # 예시: GitHub 레포지토리 변수 전달 시
   # terraform plan -var="github_repository=your-github-org/your-repo"
   ```

4. **인프라 생성/업데이트:**
   실제로 AWS 리소스를 생성하거나 업데이트합니다. `-var` 옵션은 `plan`과 동일하게 사용할 수 있습니다.

   ```bash
   terraform apply
   # 예시: GitHub 레포지토리 변수 전달 시
   # terraform apply -var="github_repository=your-github-org/your-repo"
   ```

   - 확인 메시지가 나오면 `yes`를 입력합니다.

5. **✅ 출력 값 기록:**
   `apply` 명령이 성공적으로 완료되면 **출력(Outputs) 값**이 표시됩니다. 이 값들은 GitHub Actions 워크플로우 설정 (GitHub Secrets)에 필요하므로 **반드시 기록**해두세요.
   - `s3_bucket_id`: 생성된 웹사이트 호스팅용 S3 버킷 이름
   - `cloudfront_distribution_id`: 생성된 CloudFront 배포 ID
   - `cloudfront_distribution_domain_name`: 생성된 CloudFront 도메인 이름 (이 주소로 접속)
   - `github_actions_deploy_role_arn`: 생성된 GitHub Actions용 IAM Role의 ARN

## 🔧 구성 변수 (`variables.tf`)

이 Terraform 코드는 `variables.tf` 파일에 정의된 변수들을 사용합니다. 주요 변수는 다음과 같습니다:

- `aws_region`: 리소스를 배포할 AWS 리전
- `project_name`: 리소스 이름에 사용할 접두사
- `environment`: 배포 환경 (예: `dev`, `prod`)
- `bucket_name_suffix`: 웹사이트 S3 버킷 이름의 고유성을 위한 접미사
- `github_oidc_provider_url`: GitHub OIDC Provider URL (보통 기본값 사용)
- `github_repository`: 배포를 허용할 GitHub Repository (기본값 확인 및 필요시 수정)

## 👉 다음 단계

이제 ALPACO 프론트엔드 애플리케이션을 위한 AWS 인프라가 준비되었습니다.

1. 위에서 기록한 **출력 값** (`s3_bucket_id`, `cloudfront_distribution_id`, `github_actions_deploy_role_arn`)을 사용하여 GitHub Repository의 **Secrets**를 설정하세요. (`.github/workflows/deploy.yml` 파일 참고)
2. GitHub Actions 워크플로우 (`.github/workflows/deploy.yml`)가 올바르게 설정되었는지 확인합니다.
3. 설정된 트리거(예: `v*` 태그 푸시)에 따라 GitHub Actions가 실행되어 코드를 빌드하고 S3에 배포하며 CloudFront 캐시를 무효화하는지 확인합니다.
4. `cloudfront_distribution_domain_name` 주소로 접속하여 배포된 애플리케이션을 확인합니다.

**이제 다음 단계를 진행할 수 있습니다:**

1. **GitHub Secrets 설정:**
   방금 출력된 값들을 사용하여 GitHub Repository의 Secrets를 설정하세요. (예시 값이며, 실제 출력값을 사용해야 합니다)

   - `AWS_IAM_ROLE_ARN`: `arn:aws:iam::ACCOUNT_ID:role/alpaco-github-actions-deploy-role-production`
   - `AWS_REGION`: `ap-northeast-2` (또는 사용한 리전)
   - `AWS_S3_BUCKET_NAME`: `alpaco-frontend-production-alpaco-frontend-bucket`
   - `AWS_CLOUDFRONT_DISTRIBUTION_ID`: `E1234567890ABC`

2. **GitHub Actions 워크플로우 확인:**

   - `.github/workflows/deploy.yml` 파일이 올바르게 설정되어 있는지 다시 한번 확인합니다 (특히 트리거 부분 `on: push: tags: - 'v*'` 등).

3. **배포 트리거 실행:**

   - 이제 실제 배포를 위해 Git 브랜치 전략에 따라 `main` 브랜치에 병합하고, `vX.Y.Z` 형식의 태그를 생성하여 푸시합니다.
   - 예:

     ```bash
     # (main 브랜치에서)
     git tag -a v0.1.0 -m "Release version 0.1.0"
     git push origin main --tags
     ```

4. **배포 확인:**
   - GitHub Repository의 Actions 탭에서 워크플로우가 실행되는 것을 확인합니다.
   - 워크플로우가 성공적으로 완료되면, 출력된 CloudFront 도메인 (예: `dxxxxxxxxxx.cloudfront.net`)으로 접속하여 프론트엔드 애플리케이션이 올바르게 배포되었는지, 그리고 새로고침 시에도 페이지가 정상적으로 로드되는지 확인합니다. (캐시 때문에 즉시 반영되지 않을 수 있으니 잠시 기다리거나 브라우저 캐시 삭제 후 확인하세요.)

축하합니다! 이제 Terraform으로 관리되는 AWS 인프라와 GitHub Actions를 이용한 자동 배포 파이프라인의 준비가 거의 완료되었습니다. 😊
