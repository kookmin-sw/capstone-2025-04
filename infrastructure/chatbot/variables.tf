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
    Project     = "alpaco" # Use project_name variable value
    Environment = "production" # Use environment variable value
    ManagedBy   = "Terraform"
  }
}

variable "bedrock_model_id" {
  description = "The ID of the Bedrock model to use for the chatbot"
  type        = string
  default     = "anthropic.claude-3-sonnet-20240229-v1:0" # Default to Claude 3 Sonnet
} 