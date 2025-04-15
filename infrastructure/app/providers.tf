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