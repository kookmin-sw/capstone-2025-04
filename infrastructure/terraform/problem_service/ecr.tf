# Generator Docker 이미지용 ECR 리포지토리
resource "aws_ecr_repository" "generator_repo" {
  name                 = "${lower(var.project_name)}/problem-grader-generator-${var.environment}"
  image_tag_mutability = "MUTABLE" # 또는 IMMUTABLE

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-GeneratorRepo-${var.environment}"
  })
}

# Python Runner Docker 이미지용 ECR 리포지토리
resource "aws_ecr_repository" "runner_python_repo" {
  name                 = "${lower(var.project_name)}/problem-grader-runner-python-${var.environment}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-RunnerPythonRepo-${var.environment}"
  })
}

# 다른 언어 Runner 지원 시 리포지토리 추가
# resource "aws_ecr_repository" "runner_cpp_repo" { ... }

# ECR Repository for Problem Generator Streaming Lambda
resource "aws_ecr_repository" "generator_streaming_repo" {
  name                 = "${lower(var.project_name)}/problem-generator-streaming-${var.environment}" # Lowercase naming convention
  image_tag_mutability = "MUTABLE" # Or IMMUTABLE

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-GeneratorStreamingRepo-${var.environment}"
  })
} 