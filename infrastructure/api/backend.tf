terraform {
  backend "s3" {
    # These values should be provided during `terraform init`
    # using -backend-config="key=value" or via a backend config file.
    # Example values are commented out.

    # bucket         = "alpaco-tfstate-bucket-kmu" # Use var.tf_state_bucket in CI/CD
    # dynamodb_table = "alpaco-tfstate-lock-table" # Use var.tf_state_lock_table in CI/CD
    # region         = "ap-northeast-2"          # Use var.aws_region

    # Unique key for this specific Terraform state
    key            = "api/community/terraform.tfstate"
    encrypt        = true
  }
}