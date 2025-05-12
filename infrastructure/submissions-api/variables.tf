variable "aws_region" {
  description = "AWS region to deploy API resources"
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
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "alpaco"
    Environment = "production"
    ManagedBy   = "Terraform"
    Service     = "SubmissionsAPI"
  }
}

variable "lambda_runtime" {
  description = "Lambda function runtime"
  type        = string
  default     = "nodejs20.x" # getSubmission.mjs는 Node.js 기반
}

variable "lambda_code_base_path" {
  description = "Base path to the Lambda function code directory"
  type        = string
  default     = "../../backend/lambdas/submissions-api"
}

variable "get_submission_handler" {
  description = "Handler for the getSubmission Lambda function"
  type        = string
  default     = "getSubmission.handler"
}

variable "lambda_memory_size" {
  description = "Memory size for the Lambda function"
  type        = number
  default     = 128 # 간단한 DynamoDB 조회이므로 최소 메모리
}

variable "lambda_timeout" {
  description = "Timeout for the Lambda function in seconds"
  type        = number
  default     = 30 # API Gateway 기본 타임아웃과 유사하게 설정
}

# code-execution-service remote state config
variable "code_execution_service_tfstate_bucket" {
  description = "S3 bucket for code-execution-service terraform state"
  type        = string
  default     = "alpaco-tfstate-bucket-kmu"
}

variable "code_execution_service_tfstate_key" {
  description = "S3 key for code-execution-service terraform state"
  type        = string
  default     = "code-execution-service/terraform.tfstate" # 이전 단계에서 정의한 키
}
