terraform {
  backend "s3" {
    bucket         = "alpaco-tfstate-bucket-kmu"
    key            = "problem-generator-v2/terraform.tfstate"
    region         = "ap-northeast-2"
    dynamodb_table = "alpaco-tfstate-lock-table"
    encrypt        = true
  }
}
