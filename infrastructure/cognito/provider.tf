# Configure the AWS Provider (main.tf 또는 별도 파일에 있을 수 있음)
provider "aws" {
  region = var.aws_region
}
