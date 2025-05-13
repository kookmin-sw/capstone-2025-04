terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # Pinning to major version 5
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Provider for ACM certificate in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}