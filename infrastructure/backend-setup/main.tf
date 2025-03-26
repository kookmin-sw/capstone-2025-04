terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # backend "s3" 블록 없음 - 로컬 상태 사용
}

provider "aws" {
  region = var.aws_region
}

# S3 버킷: Terraform 상태 파일 저장용
resource "aws_s3_bucket" "tfstate" {
  bucket = "${var.project_name}${var.tfstate_bucket_name_suffix}"

  tags = {
    Name    = "${var.project_name}-tfstate-bucket"
    Project = var.project_name
  }
}

# S3 버킷: 퍼블릭 액세스 차단
resource "aws_s3_bucket_public_access_block" "tfstate_pab" {
  bucket = aws_s3_bucket.tfstate.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 버킷: 버전 관리 활성화 (상태 파일 복구/추적에 유용)
resource "aws_s3_bucket_versioning" "tfstate_versioning" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 버킷: 서버 측 암호화 활성화 (기본 SSE-S3 사용)
resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate_sse" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# DynamoDB 테이블: Terraform 상태 잠금용
resource "aws_dynamodb_table" "tfstate_lock" {
  name         = var.tfstate_lock_table_name
  billing_mode = "PAY_PER_REQUEST" # 온디맨드 권장
  hash_key     = "LockID"          # 반드시 "LockID" 이어야 함

  attribute {
    name = "LockID"
    type = "S"                   # 반드시 String 타입이어야 함
  }

  tags = {
    Name    = "${var.project_name}-tfstate-lock-table"
    Project = var.project_name
  }
}