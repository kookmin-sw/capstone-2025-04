variable "aws_region" {
  description = "AWS region for backend resources"
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "alpaco"
}

variable "tfstate_bucket_name_suffix" {
  description = "Unique suffix for the Terraform state S3 bucket. CHANGE THIS if needed."
  type        = string
  # 중요: 이 값은 전역적으로 고유해야 합니다. 팀이나 개인 식별자를 추가하는 것이 좋습니다.
  # 예: default = "-tfstate-bucket-yourinitials"
  default     = "-tfstate-bucket-kmu" 
}

variable "tfstate_lock_table_name" {
  description = "Name for the Terraform state lock DynamoDB table"
  type        = string
  default     = "alpaco-tfstate-lock-table" # 이 이름은 해당 AWS 계정/리전 내에서 고유하면 됩니다.
}