terraform {
  backend "s3" {
    bucket         = "alpaco-tfstate-bucket-kmu"
    key            = "problem-generator-v3/terraform.tfstate" # Updated to v3
    region         = "ap-northeast-2"
    dynamodb_table = "alpaco-tfstate-lock-table"
    encrypt        = true
  }
}
