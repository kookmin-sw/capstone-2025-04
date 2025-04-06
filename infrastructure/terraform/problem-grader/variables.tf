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