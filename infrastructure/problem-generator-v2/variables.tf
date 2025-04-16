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
  }
  validation {
    condition     = contains(keys(var.common_tags), "Project") && contains(keys(var.common_tags), "Environment") && contains(keys(var.common_tags), "ManagedBy")
    error_message = "The common_tags map must contain Project, Environment, and ManagedBy keys."
  }
}

variable "bedrock_model_id" {
  description = "The ID of the Bedrock model to use for the problem generator"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "lambda_runtime" {
  description = "Lambda function runtime (ensure it matches layer compatibility)"
  type        = string
  default     = "python3.12"
}

variable "lambda_handler" {
  description = "Lambda function handler (e.g., lambda_function.lambda_handler)"
  type        = string
  default     = "lambda_function.lambda_handler"
}

variable "lambda_code_path" {
  description = "Path to the Lambda function handler code (relative to this module)"
  type        = string
  default     = "../../backend/lambdas/problem-generator-v2/lambda_function.py"
}

variable "lambda_layer_path" {
  description = "Path to the directory containing layer contents (e.g., ./layers/problem_generator_deps/)"
  type        = string
  default     = "./layers/problem_generator_deps"
}


variable "google_ai_api_key" {
  description = "API key for Google AI (Gemini) or other LLMs"
  type        = string
  default     = ""
}

variable "generator_verbose" {
  description = "Enable verbose logging in the problem generator Lambda"
  type        = bool
  default     = false
}
