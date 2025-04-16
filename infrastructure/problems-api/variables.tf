variable "aws_region" {
  description = "AWS region to deploy API resources"
  type        = string
  default     = "ap-northeast-2" # Default to Seoul, consistent with other modules
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "alpaco" # Consistent project name
}

variable "environment" {
  description = "Deployment environment (e.g., dev, prod)"
  type        = string
  default     = "production" # Consistent environment
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "alpaco"
    Environment = "production" # Should ideally match var.environment
    ManagedBy   = "Terraform"
    Service     = "ProblemsAPI" # Specific service tag for this API
  }
}