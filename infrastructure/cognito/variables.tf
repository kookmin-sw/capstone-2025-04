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
  default = "alpaco-auth-prod-kmu" # <- 실제 고유한 값으로 변경하세요!
}

variable "google_client_id" {
  description = "Client ID obtained from Google Cloud Console for OAuth 2.0"
  type        = string
  sensitive   = true # 값은 민감하지 않지만, 실수로 노출 방지
  # default = "YOUR_GOOGLE_CLIENT_ID" # 실제 값으로 대체하거나 tfvars 파일 사용
}

variable "google_client_secret_arn" {
  description = "ARN of the AWS Secrets Manager secret containing the Google Client Secret"
  type        = string
  # 예: default = "arn:aws:secretsmanager:ap-northeast-2:123456789012:secret:GoogleClientSecret-xxxxxx"
  # default = "YOUR_SECRETS_MANAGER_ARN_FOR_GOOGLE_SECRET" # 실제 ARN으로 대체
}

variable "app_callback_urls" {
  description = "List of allowed callback URLs for your application after login."
  type        = list(string)
  default     = ["https://d2rgzjzynamwq2.cloudfront.net/callback"] # 예: 개발용 localhost 및 배포된 앱 URL
}

variable "app_logout_urls" {
  description = "List of allowed logout URLs for your application."
  type        = list(string)
  default     = ["https://d2rgzjzynamwq2.cloudfront.net/login"] # 예: 개발용 localhost 및 배포된 앱 URL
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
