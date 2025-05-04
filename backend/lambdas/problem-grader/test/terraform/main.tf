terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.2.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# --- Lambda Function Code Archiving ---
# Assumes lambda_function.py is in the parent directory of `test`
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "../../lambda_function.py" # Path relative to this main.tf in test/terraform
  output_path = "${path.module}/lambda_function.zip"
}

# --- IAM Role: Lambda Execution ---
resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.prefix}-lambda-exec-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
  tags = { Name = "${var.prefix}-lambda-exec-role" }
}

resource "aws_iam_policy" "lambda_policy" {
  name        = "${var.prefix}-lambda-policy"
  description = "IAM policy for Problem Grader Lambda Execution (Wildcard Test)"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Basic Lambda permissions (CloudWatch Logs)
      {
        Effect = "Allow"
        Action = "logs:*",
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.prefix}-lambda:*"
      },
      # Full DynamoDB access for Lambda
      {
        Effect = "Allow",
        Action = "dynamodb:*",
        Resource = [
          aws_dynamodb_table.problems_table.arn,
          aws_dynamodb_table.submissions_table.arn
        ]
      },
       # Full S3 access for Lambda (if needed)
      {
        Effect = "Allow",
        Action = "s3:*",
        Resource = "${aws_s3_bucket.runner_results_bucket.arn}/*"
      },
      # Full ECS access
      {
        Effect   = "Allow"
        Action   = "ecs:*",
        Resource = "*"
      },
      # Permission to pass roles to ECS
      {
        Effect   = "Allow"
        Action   = "iam:PassRole"
        Resource = [
            aws_iam_role.ecs_task_role.arn,
            aws_iam_role.ecs_exec_role.arn
        ]
        Condition = {
           StringEquals = {"iam:PassedToService": "ecs-tasks.amazonaws.com"}
        }
      }
    ]
  })
  tags = { Name = "${var.prefix}-lambda-policy" }
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attach" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# --- IAM Role: ECS Task Execution ---
resource "aws_iam_role" "ecs_exec_role" {
  name = "${var.prefix}-ecs-exec-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
  tags = { Name = "${var.prefix}-ecs-exec-role" }
}

# Attach the AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_exec_policy_attach" {
  role       = aws_iam_role.ecs_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# --- IAM Role: ECS Task Role (for Runner Code) ---
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.prefix}-ecs-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
  tags = { Name = "${var.prefix}-ecs-task-role" }
}

resource "aws_iam_policy" "ecs_task_policy" {
  name        = "${var.prefix}-ecs-task-policy"
  description = "IAM policy for Problem Grader ECS Task (Runner - Wildcard Test)"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Full S3 permissions for results bucket
      {
        Effect = "Allow",
        Action = "s3:*",
        Resource = "${aws_s3_bucket.runner_results_bucket.arn}/*"
      },
      # Full DynamoDB permissions for submissions table
      {
        Effect = "Allow",
        Action = "dynamodb:*",
        Resource = aws_dynamodb_table.submissions_table.arn
      }
    ]
  })
  tags = { Name = "${var.prefix}-ecs-task-policy" }
}

resource "aws_iam_role_policy_attachment" "ecs_task_policy_attach" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_task_policy.arn
}

# --- CloudWatch Log Group for ECS Task ---
# Create the log group so the ECS task doesn't fail on initialization
resource "aws_cloudwatch_log_group" "ecs_task_log_group" {
  name = "/ecs/${var.prefix}-runner-task-def" # Match Task Def log config, use prefix

  # Optional: Set retention period, tags, etc.
  retention_in_days = 7 # Keep logs for 7 days

  tags = {
    Name        = "${var.prefix}-ecs-log-group"
    Environment = "Test"
  }
}

# --- DynamoDB Tables ---
resource "aws_dynamodb_table" "problems_table" {
  name         = "${var.prefix}-problems"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name        = "${var.prefix}-problems"
    Environment = "Test"
  }
}

resource "aws_dynamodb_table" "submissions_table" {
  name         = "${var.prefix}-submissions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "submission_id"

  attribute {
    name = "submission_id"
    type = "S"
  }

  tags = {
    Name        = "${var.prefix}-submissions"
    Environment = "Test"
  }
}

# --- S3 Bucket for Runner Results ---
resource "aws_s3_bucket" "runner_results_bucket" {
  # Bucket names must be globally unique
  bucket = "${var.prefix}-results-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.prefix}-results"
    Environment = "Test"
  }
}

resource "aws_s3_bucket_public_access_block" "runner_results_bucket_pab" {
  bucket = aws_s3_bucket.runner_results_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "runner_results_bucket_versioning" {
  bucket = aws_s3_bucket.runner_results_bucket.id
  versioning_configuration {
    status = "Disabled"
  }
}

# --- Lambda Function ---
resource "aws_lambda_function" "problem_grader_lambda" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.prefix}-lambda"
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = var.lambda_handler
  runtime          = var.lambda_runtime
  # Force update by changing the hash based on current time + file hash
  source_code_hash = filesha256(data.archive_file.lambda_zip.output_path) == "" ? "" : "${filesha256(data.archive_file.lambda_zip.output_path)}-${timestamp()}"

  timeout = 300
  memory_size = 512

  environment {
    variables = {
      DYNAMODB_PROBLEMS_TABLE_NAME   = aws_dynamodb_table.problems_table.name
      DYNAMODB_SUBMISSIONS_TABLE_NAME = aws_dynamodb_table.submissions_table.name
      S3_BUCKET_NAME                 = aws_s3_bucket.runner_results_bucket.id
      # --- Placeholders - MUST be replaced with actual values --- 
      ECS_CLUSTER_NAME               = var.ecs_cluster_name_placeholder
      RUNNER_PYTHON_TASK_DEF_ARN     = var.runner_task_def_arn_placeholder
      RUNNER_PYTHON_CONTAINER_NAME   = var.runner_container_name_placeholder
      SUBNET_IDS                     = var.subnet_ids_placeholder
      SECURITY_GROUP_IDS             = var.security_group_ids_placeholder
    }
  }

  tags = {
    Name        = "${var.prefix}-lambda"
    Environment = "Test"
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_policy_attach,
    aws_dynamodb_table.problems_table,
    aws_dynamodb_table.submissions_table,
    aws_s3_bucket.runner_results_bucket,
    aws_iam_role.ecs_task_role # Ensure task role exists before lambda potentially tries to pass it
  ]
} 