variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-northeast-2" # 예: 서울 리전
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "alpaco"
}

variable "environment" {
  description = "Deployment environment (e.g., dev, prod, staging)"
  type        = string
  default     = "dev" # 또는 release 등 브랜치명과 연관지을 수 있음
}

variable "bucket_name_suffix" {
  description = "Optional suffix for the S3 bucket name to ensure uniqueness"
  type        = string
  default     = "alpaco-frontend-bucket" # 필요시 고유한 값 입력 또는 random_string 사용
}

# GitHub Actions OIDC 연동을 위한 변수 (선택 사항, AWS 콘솔에서 직접 설정 가능)
variable "github_oidc_provider_url" {
  description = "URL of the GitHub OIDC provider"
  type        = string
  default     = "token.actions.githubusercontent.com" # 보통 이 값 고정
}

variable "github_repository" {
  description = "Your GitHub repository (e.g., your-username/your-repo)"
  type        = string
  default = "kookmin-sw/capstone-2025-04" 
}

