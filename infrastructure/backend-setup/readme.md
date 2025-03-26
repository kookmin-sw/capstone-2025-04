# 🚀 Terraform Backend Infrastructure Setup (`infrastructure/backend-setup`)

이 디렉토리의 Terraform 코드는 **주요 애플리케이션 인프라(`../app`)의 Terraform 상태(State)를 원격으로 관리**하는 데 필요한 AWS 리소스를 생성합니다.

## 📌 목적

Terraform으로 인프라를 관리할 때, 여러 팀원이 협업하고 상태 파일(`.tfstate`)을 안전하게 관리하기 위해 원격 백엔드(Remote Backend)를 사용합니다. 이 코드는 원격 백엔드로 사용될 다음 리소스를 생성합니다:

1. **S3 Bucket:** Terraform 상태 파일(`.tfstate`)을 저장합니다.
2. **DynamoDB Table:** Terraform 실행 시 상태 파일 잠금(Locking)을 관리하여 동시 실행으로 인한 충돌을 방지합니다.

**⚠️ 중요:** 이 코드는 원격 백엔드 설정을 _사용하지 않습니다_ (자체 상태는 로컬에 저장됨). 왜냐하면 이 코드가 만드는 리소스가 바로 그 원격 백엔드이기 때문입니다 (닭과 달걀 문제).

## ✨ 생성되는 리소스

- `aws_s3_bucket`: Terraform 상태 저장용 S3 버킷
- `aws_s3_bucket_public_access_block`: 버킷의 퍼블릭 액세스 차단
- `aws_s3_bucket_versioning`: 버킷 버전 관리 활성화 (상태 복구에 유용)
- `aws_s3_bucket_server_side_encryption_configuration`: 버킷 서버 측 암호화 활성화
- `aws_dynamodb_table`: Terraform 상태 잠금용 DynamoDB 테이블 (`LockID` 파티션 키 사용)

## ✅ 사전 준비 사항

1. **AWS 계정** 및 **AWS CLI** 설정 (자격 증명 구성 완료)
2. **Terraform** 설치 (버전 확인, 예: v1.x 이상)

## ⚙️ 사용 방법

1. **디렉토리 이동:**

   ```bash
   cd infrastructure/backend-setup
   ```

2. **Terraform 초기화:**
   이 디렉토리의 상태는 로컬에 저장됩니다.

   ```bash
   terraform init
   ```

3. **(선택) 실행 계획 검토:**
   생성될 리소스를 미리 확인합니다.

   ```bash
   terraform plan
   ```

   - **팁:** 버킷 이름이 전역적으로 고유해야 하므로, `variables.tf`의 `tfstate_bucket_name_suffix` 기본값이 다른 계정과 충돌할 수 있습니다. 필요시 `-var` 옵션으로 접미사를 변경하세요:

     ```bash
     terraform plan -var="tfstate_bucket_name_suffix=-tfstate-myuniqueid"
     ```

4. **인프라 생성:**
   실제로 AWS 리소스를 생성합니다. `-var` 옵션은 `plan`과 동일하게 사용할 수 있습니다.

   ```bash
   terraform apply
   # 또는 접미사 지정 시
   # terraform apply -var="tfstate_bucket_name_suffix=-tfstate-myuniqueid"
   ```

   - 확인 메시지가 나오면 `yes`를 입력합니다.

5. **✅ 출력 값 기록:**
   `apply` 명령이 성공적으로 완료되면 **출력(Outputs) 값**이 표시됩니다. 이 값들은 다음 단계인 `../app` 디렉토리의 Terraform 설정에 필요하므로 **반드시 기록**해두세요.
   - `tfstate_bucket_name`: 생성된 S3 버킷의 이름
   - `tfstate_lock_table_name`: 생성된 DynamoDB 테이블의 이름

## 📝 상태 파일(`terraform.tfstate`) 관리

이 `backend-setup` 코드의 상태 파일(`terraform.tfstate`)은 로컬에 생성됩니다. 팀과 협업하는 방식에 따라 다음 중 하나를 선택하세요:

- **옵션 1 (권장): Git에 커밋:**
  이 디렉토리의 `.tfstate` 파일을 Git 리포지토리에 커밋합니다. 백엔드 리소스는 자주 변경되지 않으므로, 상태를 공유하고 추적하는 것이 유용할 수 있습니다. (단, 민감 정보 포함 여부 확인)
- **옵션 2: 로컬에 유지하고 `.gitignore` 처리:**
  이 디렉토리에 `.gitignore` 파일을 만들고 `terraform.tfstate*` 를 추가하여 Git 추적에서 제외합니다. 이 경우, 팀 내에서 상태 파일을 공유하거나 관리하는 별도의 방법이 필요합니다.

## 👉 다음 단계

이제 Terraform 상태를 저장할 S3 버킷과 잠금용 DynamoDB 테이블이 준비되었습니다. 다음으로 `../app` 디렉토리로 이동하여 애플리케이션 인프라를 설정하고 배포합니다. (`../app/README.md` 참고)
