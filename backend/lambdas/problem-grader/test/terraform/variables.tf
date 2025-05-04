variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-northeast-2" # 기본값을 서울 리전으로 설정
}

variable "aws_profile" {
  description = "AWS profile name to use"
  type        = string
  default     = "alpaco"
}

variable "prefix" {
  description = "Prefix for resource names to ensure uniqueness"
  type        = string
  default     = "problem-grader-test" # Updated prefix
}

variable "lambda_runtime" {
  description = "AWS Lambda runtime"
  type        = string
  default     = "python3.12"
}

variable "lambda_handler" {
  description = "Lambda function handler"
  type        = string
  default     = "lambda_function.handler" # Assumes lambda_function.py in the parent dir
}

# Note: ECS/Networking related variables are placeholders
variable "ecs_cluster_name_placeholder" {
  description = "Placeholder for ECS Cluster Name (Needs manual creation or tf expansion)"
  type        = string
  default     = "pg-test-cluster" # Updated default value
}

variable "runner_task_def_arn_placeholder" {
  description = "Placeholder for Runner Task Definition ARN (Needs manual creation or tf expansion)"
  type        = string
  default     = "arn:aws:ecs:ap-northeast-2:897722694537:task-definition/pg-test-runner-task-def:1" # Updated default value (assuming revision 1)
}

variable "runner_container_name_placeholder" {
  description = "Placeholder for Runner Container Name (Needs manual creation or tf expansion)"
  type        = string
  default     = "pg-test-runner-container" # Updated default value
}

variable "subnet_ids_placeholder" {
  description = "Placeholder for Subnet IDs (Needs manual creation or tf expansion, comma-separated)"
  type        = string
  default     = "subnet-017ce875f56125b56,subnet-0749f96b14750c07c,subnet-07957a2efb3216fd6,subnet-0e8f7de3277620546" # Updated default value
}

variable "security_group_ids_placeholder" {
  description = "Placeholder for Security Group IDs (Needs manual creation or tf expansion, comma-separated)"
  type        = string
  default     = "sg-0f95a4abfc6e0046a" # Updated default value
} 