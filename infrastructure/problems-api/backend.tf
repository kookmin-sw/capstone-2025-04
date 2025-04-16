terraform {
  backend "s3" {
    bucket         = "alpaco-tfstate-bucket-kmu" # From backend-setup output
    key            = "api/problems/terraform.tfstate" # Unique key for this module
    region         = "ap-northeast-2"            # Match backend-setup region
    dynamodb_table = "alpaco-tfstate-lock-table" # From backend-setup output
    encrypt        = true
  }
}