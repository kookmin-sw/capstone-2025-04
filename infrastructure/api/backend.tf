terraform {
  backend "s3" {
    bucket         = "alpaco-tfstate-bucket-kmu"
    key            = "api/community/terraform.tfstate"
    region         = "ap-northeast-2"
    dynamodb_table = "alpaco-tfstate-lock-table"
    encrypt        = true
  }
}