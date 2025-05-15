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
  default     = "production" # Assuming 'production' for v3 as well
}

variable "common_tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "alpaco"
    Environment = "production" # Ensure this matches the 'environment' variable if used in names
    ManagedBy   = "Terraform"
    Version     = "v3" # Added a version tag
  }
  validation {
    condition     = contains(keys(var.common_tags), "Project") && contains(keys(var.common_tags), "Environment") && contains(keys(var.common_tags), "ManagedBy")
    error_message = "The common_tags map must contain Project, Environment, and ManagedBy keys."
  }
}

variable "lambda_runtime" {
  description = "Lambda function runtime (ensure it matches layer compatibility)"
  type        = string
  default     = "nodejs20.x"
}

variable "lambda_handler" {
  description = "Lambda function handler (e.g., index.handler)"
  type        = string
  default     = "index.handler" # Updated for v3 structure
}

variable "lambda_code_path" {
  description = "Path to the Lambda function code directory (relative to this module)"
  type        = string
  default     = "../../backend/lambdas/problem-generator-v3/src" # Updated for v3
}

variable "google_ai_api_key" {
  description = "API key for Google AI (Gemini)"
  type        = string
  default     = "" # Ensure this is set in terraform.auto.tfvars or environment
  sensitive   = true
}

variable "generator_verbose" {
  description = "Enable verbose logging in the problem generator Lambda"
  type        = bool
  default     = true # Changed default to true as per local-test.mjs
}

variable "gemini_model_name" {
  description = "The specific Gemini model to use"
  type        = string
  default     = "gemini-2.5-flash-preview-04-17" #  "gemini-2.5-pro-exp-03-25"
}

variable "code_executor_lambda_arn" {
  description = "ARN of the Code Executor Lambda function"
  type        = string
  default     = "arn:aws:lambda:ap-northeast-2:897722694537:function:alpaco-code-executor-production" # Default from constants
}
