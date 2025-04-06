# Fargate Task 결과 저장용 S3 버킷
resource "aws_s3_bucket" "grader_output_bucket" {
  bucket = "${lower(var.project_name)}-grader-output-${var.environment}-${data.aws_caller_identity.current.account_id}" # 버킷 이름 고유성 확보

  # 버킷 공개 접근 차단 설정 (권장)
  # TODO: 실제 운영 시 Block Public Access 설정 추가 필요
  # aws_s3_bucket_public_access_block 리소스 사용

  force_destroy = false # 실수로 인한 데이터 삭제 방지 (prod 환경에서는 false 유지)

  tags = merge(var.tags, {
    Name = "${var.project_name}-GraderOutputBucket-${var.environment}"
  })
}

# 현재 AWS 계정 ID 가져오기 (버킷 이름 고유성 위해)
# data "aws_caller_identity" "current" {}

# S3 버킷 정책 (This should now follow the S3 bucket definition directly)
# ... (S3 bucket policy definition lines 107-139) ...
resource "aws_s3_bucket_policy" "grader_output_bucket_policy" {
  bucket = aws_s3_bucket.grader_output_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "AllowPutObjectFromEcsTaskRole"
        Effect = "Allow"
        Principal = {
            AWS = [aws_iam_role.ecs_task_role.arn]
        }
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.grader_output_bucket.arn}/*"
      },
      {
        Sid = "AllowGetObjectForLambdaAndStepFunctions"
        Effect = "Allow"
        Principal = {
            AWS = [
                aws_iam_role.lambda_execution_role.arn,
                aws_iam_role.sfn_execution_role.arn
            ]
        }
        Action = "s3:GetObject"
        Resource = "${aws_s3_bucket.grader_output_bucket.arn}/*"
      }
    ]
  })
  depends_on = [aws_s3_bucket.grader_output_bucket]
}

# KEEPING THE CORRECT DynamoDB table for Problems (originally line 141)
resource "aws_dynamodb_table" "problems_table" {
  name         = "${var.project_name}-problems-${var.environment}"
  billing_mode = "PAY_PER_REQUEST" # Or PROVISIONED
  hash_key = "problem_id"
  attribute {
    name = "problem_id"
    type = "S"
  }
  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# KEEPING THE CORRECT DynamoDB table for Submissions (originally line 179)
resource "aws_dynamodb_table" "submissions_table" {
  name         = "${var.project_name}-submissions-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key = "submission_id"
  attribute {
    name = "submission_id"
    type = "S"
  }
  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
} 