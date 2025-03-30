# infrastructure/cognito/backend.tf (또는 main.tf/cognito.tf 상단)

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # ===> 원격 S3 백엔드 설정 추가! <===
  backend "s3" {
    # 아래 값들은 `backend-setup` 코드를 실행하여 생성된 리소스 이름과
    # Cognito 설정에 맞게 key 값을 지정해야 합니다.
    # `terraform init` 시 -backend-config 옵션으로 전달하거나 여기에 직접 지정할 수 있습니다.

    # bucket         = "alpaco-tfstate-bucket-kmu" # backend-setup에서 생성된 버킷 이름
    # key            = "cognito/terraform.tfstate" # 중요: 'app'과는 다른 경로(key) 지정!
    # region         = "ap-northeast-2"          # backend-setup과 동일한 리전
    # dynamodb_table = "alpaco-tfstate-lock-table" # backend-setup에서 생성된 DynamoDB 테이블 이름
    # encrypt        = true                        # 상태 파일 암호화 (권장)
  }
}

# Provider 설정도 여기에 같이 두거나 별도 provider.tf 파일로 분리 가능
provider "aws" {
  region = var.aws_region # variables.tf에 정의된 리전 변수 사용
}
