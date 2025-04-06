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
      # Lambda 함수 호출 권한 (특정 함수 제한)
      {
        Effect   = "Allow",
        Action   = "lambda:InvokeFunction",
        Resource = aws_lambda_function.problem_grader_lambda.arn
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
  name     = "${var.project_name}-ProblemGrader-${var.environment}"
  role_arn = aws_iam_role.sfn_execution_role.arn

  # ASL 정의를 별도 파일에서 로드하고 변수 전달
  definition = templatefile("${path.module}/problem_grader_statemachine.asl.json", {
    # 필요한 값들을 템플릿 변수로 전달
    lambda_function_name         = aws_lambda_function.problem_grader_lambda.function_name
    ecs_cluster_arn              = aws_ecs_cluster.grader_cluster.arn
    generator_task_def_arn       = aws_ecs_task_definition.generator_task_def.arn
    runner_python_task_def_arn   = aws_ecs_task_definition.runner_python_task_def.arn
    # TODO: 다른 언어 runner task def 추가 시 변수 전달 필요
    fargate_subnet_ids_json      = jsonencode(local.fargate_subnet_ids)
    fargate_sg_ids_json          = jsonencode(local.fargate_security_group_ids)
    generator_container_name     = var.generator_container_name
    runner_python_container_name = var.runner_python_container_name
    # TODO: 다른 언어 runner container 이름 추가 시 변수 전달 필요
    grader_output_bucket_name    = aws_s3_bucket.grader_output_bucket.bucket
    submissions_table_name       = aws_dynamodb_table.submissions_table.name
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-ProblemGraderStateMachine-${var.environment}"
  })
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