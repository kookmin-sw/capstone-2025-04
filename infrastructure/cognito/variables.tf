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
  description = "Deployment environment (e.g., dev, prod)"
  type        = string
  default     = "production" # 또는 dev 등
}

variable "cognito_domain_prefix" {
  description = "Unique prefix for the Cognito User Pool domain. Needs to be globally unique."
  type        = string
  # 중요: 이 값은 전역적으로 고유해야 합니다. 실제 프로젝트 이름과 환경을 포함하는 것이 좋습니다.
  # 예: default = "alpaco-auth-prod"
  default = "alpaco-auth-prod" # <- 실제 고유한 값으로 변경하세요!
}

variable "google_client_id" {
  description = "Client ID obtained from Google Cloud Console for OAuth 2.0"
  type        = string
  sensitive   = true # 값은 민감하지 않지만, 실수로 노출 방지
  default     = "673846620153-c2mc5dure43ptfp2h7cfvn8cr3bob0ks.apps.googleusercontent.com"
  # default = "YOUR_GOOGLE_CLIENT_ID" # 실제 값으로 대체하거나 tfvars 파일 사용
}

variable "google_client_secret" {
  type        = string
  description = "Google OAuth Client Secret"
  sensitive   = true # Terraform 출력에서 값을 가리도록 설정
}

variable "app_base_url" {
  type        = string
  description = "Base URL of your application."
  default     = "https://d2rgzjzynamwq2.cloudfront.net"
}

variable "localhost_base_url" {
  type        = string
  description = "Base URL of your application when running locally."
  default     = "http://localhost:3000"
}

variable "common_tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "alpaco"
    Environment = "production" # environment 변수와 동기화
    ManagedBy   = "Terraform"
  }
}
