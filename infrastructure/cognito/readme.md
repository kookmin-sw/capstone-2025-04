사용 방법:

파일 저장: 위의 코드를 각각 variables.tf, secrets.tf, cognito.tf, outputs.tf 파일로 저장합니다. (예: infrastructure/cognito/ 디렉토리 내)

Google Client Secret 저장: AWS Secrets Manager에 Google Client Secret을 저장하고, 그 ARN을 variables.tf의 google_client_secret_arn 기본값으로 설정하거나, terraform.tfvars 파일 또는 환경 변수(TF_VAR_google_client_secret_arn)로 전달합니다.

Google Client ID 설정: variables.tf의 google_client_id 기본값을 설정하거나, terraform.tfvars 파일 또는 환경 변수(TF_VAR_google_client_id)로 전달합니다.

Callback/Logout URL 확인: variables.tf의 app_callback_urls 및 app_logout_urls가 애플리케이션 설정과 일치하는지 확인하고 필요시 수정합니다. CloudFront 도메인 등을 사용하세요.

Cognito Domain Prefix 확인: variables.tf의 cognito_domain_prefix가 전역적으로 고유한지 확인하고 필요시 수정합니다.

Terraform 초기화 및 적용:

해당 디렉토리에서 terraform init 실행 (만약 app 디렉토리처럼 원격 백엔드를 사용한다면 해당 설정 포함)

```bash
cd infrastructure/cognito
terraform init -backend-config=cognito.s3.tfbackend
```

terraform plan으로 변경 사항 확인

terraform apply로 리소스 생성

terraform output으로 결과 다시 보기

다음 단계:

terraform apply 후 출력된 값들(cognito_user_pool_id, cognito_user_pool_client_id, cognito_user_pool_provider_url, cognito_user_pool_domain 등)을 프론트엔드 애플리케이션(예: Amplify 구성 또는 직접 SDK 사용 시) 설정에 사용합니다.

프론트엔드에서 Cognito SDK (또는 Amplify Auth)를 사용하여 Google 로그인 버튼을 구현하고, Cognito Hosted UI 또는 직접 Google OAuth 엔드포인트를 호출하여 로그인 흐름을 시작합니다.

이 Terraform 코드는 Cognito에서 Google 로그인만을 위한 기본적인 인프라를 설정합니다. 필요에 따라 추가적인 설정(예: Lambda 트리거, 사용자 지정 속성 등)을 Terraform으로 확장할 수 있습니다.

- **자동 사용자 그룹 할당**: `main.tf`에 정의된 `PostConfirmation` Lambda 트리거 (`lambda_function.py`)는 사용자가 가입(및 이메일 확인)을 완료하면 자동으로 `GeneralUsers` 그룹에 추가합니다. 이는 `aws_lambda_function.post_confirmation_trigger` 리소스와 `aws_cognito_user_pool`의 `lambda_config` 블록을 통해 설정됩니다.
