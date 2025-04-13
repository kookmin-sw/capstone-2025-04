terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # Match version used in other modules like cognito
    }
  }

  backend "s3" {
    bucket         = "alpaco-tfstate-bucket-kmu" # From backend-setup output
    key            = "chatbot/terraform.tfstate" # Specific key for this module
    region         = "ap-northeast-2"          # From cognito variables/provider config
    dynamodb_table = "alpaco-tfstate-lock-table" # From backend-setup output
    encrypt        = true                        # Enable encryption
  }
} 