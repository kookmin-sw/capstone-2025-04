variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-northeast-2" # Match region used in other modules
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "alpaco" # Match project name used in other modules
}

variable "environment" {
  description = "Deployment environment (e.g., dev, prod)"
  type        = string
  default     = "production" # Match environment used in other modules
}

variable "common_tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "alpaco"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
  # Allows overriding defaults if needed
  validation {
    condition     = contains(keys(var.common_tags), "Project") && contains(keys(var.common_tags), "Environment") && contains(keys(var.common_tags), "ManagedBy")
    error_message = "The common_tags map must contain Project, Environment, and ManagedBy keys."
  }
}

variable "google_ai_model_id" {
  description = "The ID of the Google ai model to use for the chatbot"
  type        = string
  default     = "gemini-2.0-flash-thinking-exp-01-21"
}

variable "google_ai_api_key" {
  description = "The API key for the Google API"
  type        = string
  sensitive   = true
}

variable "lambda_runtime" {
  description = "Lambda function runtime (ensure it matches layer compatibility)"
  type        = string
  default     = "nodejs20.x" # Match old setup
}

variable "lambda_handler" {
  description = "Lambda function handler" # e.g., index.handler or lambda_function.lambda_handler
  type        = string
  default     = "index.handler" # Match old setup (index.mjs)
}

variable "lambda_code_path" {
  description = "Path to the Lambda function handler code (relative to this module)"
  type        = string
  default     = "../../backend/lambdas/chatbot-query/index.mjs" # Match old setup
}

variable "lambda_layer_path" {
  description = "Path to the directory containing layer contents (e.g., ./layers/chatbot_deps/)"
  type        = string
  default     = "./layers/chatbot_deps"
}