# Terraform 상태 관리 백엔드 설정 (S3)
# 주의: 이 파일을 적용하기 전에 해당 S3 버킷과 DynamoDB 테이블이 미리 생성되어 있어야 합니다.
# 또는 별도의 Terraform 설정으로 이 백엔드 리소스를 먼저 관리할 수 있습니다.
terraform {
  backend "s3" {
    bucket         = "your-terraform-state-bucket-name" # !!! 실제 생성된 S3 버킷 이름으로 변경 필요 !!!
    key            = "alpaco/problem-grader/terraform.tfstate" # S3 내 상태 파일 경로
    region         = "ap-northeast-2"                     # S3 버킷이 있는 리전 (variables.tf와 일치 권장)
    dynamodb_table = "your-terraform-lock-table-name"    # !!! 실제 생성된 DynamoDB 테이블 이름으로 변경 필요 !!!
    encrypt        = true
  }
} 