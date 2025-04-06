# 기본 변수 정의

variable "aws_region" {
  description = "배포할 AWS 리전"
  type        = string
  default     = "ap-northeast-2" # 예: 서울 리전
}

variable "project_name" {
  description = "프로젝트 이름 (리소스 태그 등에 사용)"
  type        = string
  default     = "Alpaco"
}

variable "environment" {
  description = "배포 환경 (예: dev, stage, prod)"
  type        = string
  default     = "dev" # 기본값 'dev'
}

variable "tags" {
  description = "리소스에 적용할 공통 태그"
  type        = map(string)
  default = {
    Project     = "Alpaco"
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}

# 컨테이너 이름 변수
variable "generator_container_name" {
  description = "Generator Task Definition 내 컨테이너 이름"
  type        = string
  default     = "generator-container"
}

variable "runner_python_container_name" {
  description = "Python Runner Task Definition 내 컨테이너 이름"
  type        = string
  default     = "runner-python-container"
}

variable "grader_task_lambda_timeout" {
  description = "Timeout for the Problem Grader Task Lambda function"
  type        = number
  default     = 900 # 15 minutes
}

variable "generator_streaming_lambda_handler" {
  description = "Handler for the Problem Generator Streaming Lambda function"
  type        = string
  default     = "lambda_function.lambda_handler"
}

variable "generator_streaming_lambda_runtime" {
  description = "Runtime for the Problem Generator Streaming Lambda function"
  type        = string
  default     = "python3.11" # 예시, 실제 런타임에 맞게 조정 필요
}

variable "generator_streaming_lambda_memory_size" {
  description = "Memory size for the Problem Generator Streaming Lambda function"
  type        = number
  default     = 512 # 예시, 필요에 따라 조정
}

variable "generator_streaming_lambda_timeout" {
  description = "Timeout for the Problem Generator Streaming Lambda function"
  type        = number
  default     = 30 # 예시, 필요에 따라 조정
}

variable "generator_streaming_websocket_route_key" {
  description = "Route key for the WebSocket API integration"
  type        = string
  default     = "$default" # 또는 특정 라우트 키 (e.g., "generate")
} 