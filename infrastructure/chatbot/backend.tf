terraform {
  backend "s3" {
    bucket         = "alpaco-tfstate-bucket-kmu" # From backend-setup output
    key            = "chatbot/terraform.tfstate" # Specific key for this module
    region         = "ap-northeast-2"          # From cognito variables/provider config
    dynamodb_table = "alpaco-tfstate-lock-table" # From backend-setup output
    encrypt        = true                        # Enable encryption
  }
} 