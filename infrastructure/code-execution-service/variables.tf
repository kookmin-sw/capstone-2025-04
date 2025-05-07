variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "alpaco"
}

variable "environment" {
  description = "Deployment environment (e.g., dev, prod)"
  type        = string
  default     = "production"
}

variable "common_tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "alpaco"
    Environment = "production"
    ManagedBy   = "Terraform"
    Service     = "CodeExecution"
  }
}

# Code Executor Lambda Variables
variable "executor_lambda_code_path" {
  description = "Path to the Code Executor Lambda function code directory"
  type        = string
  default     = "../../backend/lambdas/code-executor" # 경로 확인 필요
}

variable "executor_lambda_handler" {
  description = "Code Executor Lambda function handler"
  type        = string
  default     = "lambda_function.lambda_handler"
}

variable "executor_lambda_runtime" {
  description = "Code Executor Lambda function runtime"
  type        = string
  default     = "python3.12"
}

variable "executor_lambda_memory_size" {
  description = "Memory size for Code Executor Lambda"
  type        = number
  default     = 512 # Python subprocess 사용으로 메모리 조금 더 할당
}

variable "executor_lambda_timeout" {
  description = "Timeout for Code Executor Lambda (Lambda 자체의 타임아웃)"
  type        = number
  default     = 30 # 초 단위, 사용자가 전달하는 timeout_ms 보다 커야 함
}

# Code Grader Lambda Variables
variable "grader_lambda_code_path" {
  description = "Path to the Code Grader Lambda function code directory"
  type        = string
  default     = "../../backend/lambdas/code-grader" # 경로 확인 필요
}

variable "grader_lambda_handler" {
  description = "Code Grader Lambda function handler"
  type        = string
  default     = "lambda_function.lambda_handler"
}

variable "grader_lambda_runtime" {
  description = "Code Grader Lambda function runtime"
  type        = string
  default     = "python3.12"
}

variable "grader_lambda_memory_size" {
  description = "Memory size for Code Grader Lambda"
  type        = number
  default     = 512
}

variable "grader_lambda_timeout" {
  description = "Timeout for Code Grader Lambda"
  type        = number
  default     = 300 # 초 단위 (여러 테스트 케이스 처리 가능성 고려)
}

# DynamoDB Table Names (일부는 remote state에서, 일부는 여기서 직접 정의)
variable "submissions_table_name_override" {
  description = "Optional override for the submissions table name. If empty, a default will be used."
  type        = string
  default     = ""
}

# Problem Generator v3 remote state config
variable "problem_generator_tfstate_bucket" {
  description = "S3 bucket for problem-generator-v3 terraform state"
  type        = string
  default     = "alpaco-tfstate-bucket-kmu"
}

variable "problem_generator_tfstate_key" {
  description = "S3 key for problem-generator-v3 terraform state"
  type        = string
  default     = "problem-generator-v3/terraform.tfstate"
}
