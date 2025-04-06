# Terraform 및 AWS Provider 설정
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # 필요에 따라 버전 조정
    }
  }
}

# AWS Provider 구성
provider "aws" {
  region = var.aws_region
  # 필요시 AWS Profile 또는 다른 인증 방식 설정
  # profile = "your-aws-profile"
} 