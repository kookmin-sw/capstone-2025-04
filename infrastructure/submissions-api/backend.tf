terraform {
  backend "s3" {
    bucket         = "alpaco-tfstate-bucket-kmu"         # 기존 버킷 사용
    key            = "api/submissions/terraform.tfstate" # 새 모듈을 위한 고유 키
    region         = "ap-northeast-2"
    dynamodb_table = "alpaco-tfstate-lock-table" # 기존 잠금 테이블 사용
    encrypt        = true
  }
}
