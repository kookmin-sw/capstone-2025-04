# ECS 클러스터 생성
resource "aws_ecs_cluster" "grader_cluster" {
  name = "${var.project_name}-GraderCluster-${var.environment}"

  tags = merge(var.tags, {
    Name = "${var.project_name}-GraderCluster-${var.environment}"
  })
}

# CloudWatch Log Group 생성
resource "aws_cloudwatch_log_group" "grader_log_group" {
  name              = "/ecs/${var.project_name}-Grader-${var.environment}"
  retention_in_days = 7 # 로그 보관 기간 (예: 7일)

  tags = merge(var.tags, {
    Name = "${var.project_name}-GraderLogGroup-${var.environment}"
  })
}

# Generator Task Definition
resource "aws_ecs_task_definition" "generator_task_def" {
  family                   = "${var.project_name}-GeneratorTask-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"  # 0.25 vCPU (필요시 조정)
  memory                   = "512"  # 512 MiB (필요시 조정)
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = var.generator_container_name # 변수로 컨테이너 이름 참조
      image     = "${aws_ecr_repository.generator_repo.repository_url}:latest" # ECR 이미지 경로 (태그는 'latest' 가정)
      essential = true
      # 환경 변수 정의 (런타임에 Lambda가 Override할 수 있음)
      # 실제 값은 Lambda에서 전달하므로 여기서는 플레이스홀더 역할
      environment = [
        { name = "S3_BUCKET", value = aws_s3_bucket.grader_output_bucket.bucket },
        { name = "GENERATOR_CODE", value = "placeholder" },
        { name = "S3_KEY", value = "placeholder" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.grader_log_group.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs/${var.generator_container_name}" # 로그 스트림 접두사
        }
      }
      # 리소스 제한 (선택적, Task Definition 레벨 설정과 별개로 컨테이너 레벨 설정 가능)
      # cpu = 256
      # memoryReservation = 512
    }
  ])

  tags = merge(var.tags, {
    Name = "${var.project_name}-GeneratorTaskDef-${var.environment}"
  })

  # 수명 주기 설정: 이전 Task Definition 자동 등록 취소 방지
  lifecycle {
    ignore_changes = [task_role_arn, execution_role_arn]
  }
}

# Python Runner Task Definition
resource "aws_ecs_task_definition" "runner_python_task_def" {
  family                   = "${var.project_name}-RunnerPythonTask-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  # CPU 및 메모리 제한은 문제 제약 조건의 최대치를 고려하여 설정
  # Lambda에서 Task별로 Override는 불가능하므로, 충분한 값을 주거나 여러 Task Def을 고려
  cpu                      = "512"  # 0.5 vCPU (예시, 조정 필요)
  memory                   = "1024" # 1024 MiB (예시, 조정 필요)
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = var.runner_python_container_name # 변수로 컨테이너 이름 참조
      image     = "${aws_ecr_repository.runner_python_repo.repository_url}:latest" # ECR 이미지 경로
      essential = true
      environment = [
        { name = "S3_BUCKET", value = aws_s3_bucket.grader_output_bucket.bucket },
        { name = "USER_CODE", value = "placeholder" },
        { name = "INPUT_DATA", value = "placeholder" },
        { name = "TIME_LIMIT", value = "2" }, # 기본값, Lambda에서 Override
        { name = "S3_KEY", value = "placeholder" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.grader_log_group.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs/${var.runner_python_container_name}"
        }
      }
      # ulimits 설정 (선택적, 컨테이너 내 리소스 제한 - 예: 스택 크기)
      # ulimits = [
      #   {
      #     name      = "stack",
      #     softLimit = 10240000, # 예시 값
      #     hardLimit = 10240000
      #   }
      # ]
    }
  ])

  tags = merge(var.tags, {
    Name = "${var.project_name}-RunnerPythonTaskDef-${var.environment}"
  })

  # 수명 주기 설정
  lifecycle {
    ignore_changes = [task_role_arn, execution_role_arn]
  }
}

# 다른 언어 Runner Task Definition 추가 가능
# resource "aws_ecs_task_definition" "runner_cpp_task_def" { ... } 