data "terraform_remote_state" "cognito" {
  backend = "s3"
  config = {
    # These must match the backend configuration of the Cognito module
    # Using placeholder values based on cognito/backend.tf
    # Ensure these values are correct or pass via -backend-config in init
    bucket = "alpaco-tfstate-bucket-kmu"
    key    = "cognito/terraform.tfstate" # Key for the Cognito state file
    region = var.aws_region             # Ensure region matches
  }
} 