# Step Functions 상태 머신 실행을 위한 IAM 역할
resource "aws_iam_role" "sfn_execution_role" {
  name = "${var.project_name}-SFNExecutionRole-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          # 상태 머신 서비스 Principal (리전별로 다를 수 있으므로 확인 필요)
          Service = "states.${var.aws_region}.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-SFNExecutionRole-${var.environment}"
  })
}

# Step Functions 역할에 필요한 권한 정책
resource "aws_iam_policy" "sfn_grader_policy" {
  name        = "${var.project_name}-SFNGraderPolicy-${var.environment}"
  description = "Policy for Problem Grader Step Functions state machine"

  # 필요한 권한 구체화 (Lambda Invoke, ECS RunTask, IAM PassRole, DynamoDB PutItem 등)
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      # Lambda 함수 호출 권한 (특정 함수 제한 -> 이름 기반 와일드카드 ARN)
      {
        Effect   = "Allow",
        Action   = "lambda:InvokeFunction",
        # ARN 직접 참조 대신 이름 기반 와일드카드 ARN 사용
        Resource = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-ProblemGrader-${var.environment}"
      },
      # ECS Task 실행 권한 (.sync 패턴)
      {
        Effect = "Allow",
        Action = [
          "ecs:RunTask",
          "ecs:DescribeTasks",
          "ecs:StopTask"
        ],
        Resource = "*" # 필요시 특정 클러스터/Task Def ARN으로 제한
      },
      # ECS Task Role 전달 권한
      {
        Effect = "Allow",
        Action = "iam:PassRole",
        Resource = [
          aws_iam_role.ecs_task_role.arn,
          aws_iam_role.ecs_task_execution_role.arn
        ],
        Condition = {
           StringEquals = { "iam:PassedToService": "ecs-tasks.amazonaws.com" }
        }
      },
      # DynamoDB 저장 권한
      {
         Effect = "Allow",
         Action = "dynamodb:PutItem",
         Resource = aws_dynamodb_table.submissions_table.arn
      },
      # EventBridge 연동 권한 (.sync 패턴)
      {
         Effect = "Allow",
         Action = [
             "events:PutTargets",
             "events:PutRule",
             "events:DescribeRule"
         ],
         # 리소스 범위를 좀 더 명확하게 지정 (필요시 data source 사용)
         Resource = ["arn:aws:events:${var.aws_region}:${data.aws_caller_identity.current.account_id}:rule/StepFunctionsGetEventsForECSTaskRule"]
      },
      # CloudWatch Logs 권한 추가 (Step Functions 로깅)
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogDelivery",
          "logs:GetLogDelivery",
          "logs:UpdateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:ListLogDeliveries",
          "logs:PutResourcePolicy",
          "logs:DescribeResourcePolicies",
          "logs:DescribeLogGroups"
        ],
        Resource = "*" # Step Functions 서비스가 관리하므로 와일드카드 사용
      },
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        # 로그 그룹 ARN을 명시적으로 지정
        Resource = "${aws_cloudwatch_log_group.sfn_log_group.arn}:*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-SFNGraderPolicy-${var.environment}"
  })
}

resource "aws_iam_role_policy_attachment" "sfn_grader_policy_attachment" {
  role       = aws_iam_role.sfn_execution_role.name
  policy_arn = aws_iam_policy.sfn_grader_policy.arn
}


# Problem Grader Step Functions 상태 머신
resource "aws_sfn_state_machine" "problem_grader_state_machine" {
  name     = "${var.project_name}-problem-grader-${var.environment}"
  role_arn = aws_iam_role.sfn_execution_role.arn

  # Use templatefile to inject multiple variables, including the Lambda Function Name
  definition = templatefile("${path.module}/problem_grader_statemachine.asl.json", {
    lambda_function_name         = aws_lambda_function.problem_grader_lambda.function_name
    ecs_cluster_arn              = aws_ecs_cluster.grader_cluster.arn
    generator_task_def_arn       = aws_ecs_task_definition.generator_task_def.arn
    # runner_python_task_def_arn   = aws_ecs_task_definition.runner_python_task_def.arn # 주석 처리됨
    # Pass individual IDs instead of lists/JSON strings
    fargate_subnet_id_1          = local.fargate_subnet_ids[0]
    fargate_subnet_id_2          = local.fargate_subnet_ids[1]
    fargate_sg_id_1              = local.fargate_security_group_ids[0]
    generator_container_name     = var.generator_container_name
    runner_python_container_name = var.runner_python_container_name
    grader_output_bucket_name    = aws_s3_bucket.grader_output_bucket.bucket
    submissions_table_name       = aws_dynamodb_table.submissions_table.name
    # Add other variables if needed by the ASL template
  })

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.sfn_log_group.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
  # Ensure dependencies are correctly inferred or explicitly added if needed
}

# CloudWatch Log Group for Step Functions Execution Logs
resource "aws_cloudwatch_log_group" "sfn_log_group" {
  name              = "/aws/vendedlogs/states/${var.project_name}-problem-grader-sfn-${var.environment}"
  retention_in_days = 7 # Adjust as needed

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Locals 블록: Subnet 및 Security Group ID 리스트 정의
# 이 블록은 locals.tf 로 이동됨
# locals {
#   fargate_subnet_ids         = [aws_subnet.public_subnet_a.id, aws_subnet.public_subnet_c.id]
#   fargate_security_group_ids = [aws_security_group.fargate_sg.id]
#   lambda_security_group_ids  = [aws_security_group.lambda_sg.id]
# 
#   # 언어별 Runner 정보 맵
#   runner_info_map = {
#     python = {
#       task_def_arn   = aws_ecs_task_definition.runner_python_task_def.arn
#       container_name = var.runner_python_container_name
#     }
#     # TODO: 다른 언어 지원 추가 시 여기에 항목 추가
#     # cpp = {
#     #   task_def_arn = aws_ecs_task_definition.runner_cpp_task_def.arn
#     #   container_name = var.runner_cpp_container_name
#     # }
#   }
# }

# 변수 정의 (ASL 내에서 직접 사용하기 어려운 리스트 전달용 - 이제 locals 사용)
# variable "subnet_ids_tf" { ... } -> 삭제
# variable "security_group_ids_tf" { ... } -> 삭제 