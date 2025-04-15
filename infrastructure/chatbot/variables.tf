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

variable "bedrock_model_id" {
  description = "The ID of the Bedrock model to use for the chatbot"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0" # Default based on old variables
}

/* Removed api_stage_name variable; stage now uses var.environment
variable "api_stage_name" {
  description = "Name for the API Gateway deployment stage"
  type        = string
  default     = "production" # Align with environment variable
}
*/

/* Removed tf_state_bucket variable as the bucket name is hardcoded in the remote state data source
variable "tf_state_bucket" {
  description = "Name of the S3 bucket used for Terraform state storage"
  type        = string
  # No default, should be provided via configuration
}
*/

/* Removing ai_api_key variable as Bedrock uses IAM permissions
variable "ai_api_key" {
  description = "API Key for the AI service (e.g., Google AI)"
  type        = string
  sensitive   = true
}
*/

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