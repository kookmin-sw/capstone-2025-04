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

# variable "bedrock_model_id" { ... } # Optional: keep if might add bedrock later

variable "lambda_runtime" {
  description = "Lambda function runtime (ensure it matches layer compatibility)"
  type        = string
  default     = "nodejs20.x"
}

variable "lambda_handler" {
  description = "Lambda function handler (e.g., index.handler)"
  type        = string
  default     = "index.handler"
}

variable "lambda_code_path" {
  description = "Path to the Lambda function handler code (relative to this module)"
  type        = string
  default     = "../../backend/lambdas/problem-generator-v2/index.mjs"
}

# lambda_layer_path is now handled by the build script output path

variable "google_ai_api_key" {
  description = "API key for Google AI (Gemini)"
  type        = string
  default     = ""
  sensitive   = true # Mark API key as sensitive
}

variable "generator_verbose" {
  description = "Enable verbose logging in the problem generator Lambda"
  type        = bool
  default     = false
}

variable "gemini_model_name" {
  description = "The specific Gemini model to use (e.g., gemini-1.5-flash, gemini-pro)"
  type        = string
  default     = "gemini-1.5-flash" # A cost-effective choice
}
