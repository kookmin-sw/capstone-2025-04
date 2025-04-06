# ECS Task Execution Role (Fargate가 ECR, CloudWatch 등에 접근)
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-ECSTaskExecutionRole-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-ECSTaskExecutionRole-${var.environment}"
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_policy_attachment" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role (Generator/Runner 컨테이너가 S3 접근)
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ECSTaskRole-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-ECSTaskRole-${var.environment}"
  })
}

# ECS Task Role에 S3 접근 정책 연결
resource "aws_iam_policy" "s3_access_policy" {
  name        = "${var.project_name}-S3AccessPolicy-${var.environment}"
  description = "Allows ECS tasks to put/get objects in the grader output S3 bucket"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "s3:PutObject",
          "s3:GetObject" # Lambda에서도 결과를 읽어야 할 경우 필요할 수 있음 (Task Role에 포함)
        ],
        Effect   = "Allow",
        Resource = "${aws_s3_bucket.grader_output_bucket.arn}/grader-outputs/*" # 특정 경로에만 접근 허용
      },
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-S3AccessPolicy-${var.environment}"
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_s3_policy_attachment" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.s3_access_policy.arn
}


# Lambda Execution Role
resource "aws_iam_role" "lambda_execution_role" {
  name = "${var.project_name}-LambdaExecutionRole-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-LambdaExecutionRole-${var.environment}"
  })
}

# Lambda 기본 실행 정책 (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda VPC 실행 정책 (VPC 내 실행 시 필요)
resource "aws_iam_role_policy_attachment" "lambda_vpc_access_execution" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Lambda에 필요한 추가 권한 정책
resource "aws_iam_policy" "lambda_policy" {
  name        = "${var.project_name}-LambdaPolicy-${var.environment}"
  description = "Policy for Problem Grader Lambda function"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
          # 필요한 다른 DynamoDB 액션 추가
        ],
        Resource = [
          aws_dynamodb_table.problems_table.arn,
          aws_dynamodb_table.submissions_table.arn
        ]
      },
      {
        Effect = "Allow",
        Action = "s3:GetObject",
        # S3 경로는 Lambda 함수가 읽어야 하는 경로로 제한하는 것이 좋습니다.
        Resource = "${aws_s3_bucket.grader_output_bucket.arn}/*"
      },
      # Step Functions 상태 머신 실행 시작 권한 추가
      {
        Effect = "Allow",
        Action = "states:StartExecution",
        Resource = aws_sfn_state_machine.problem_grader_state_machine.arn # Terraform 리소스 참조 사용
      }
      # Step Functions 도입으로 Lambda에서 직접 ECS Task를 실행할 필요가 없어졌으므로 주석 처리
      # {
      #   Effect = "Allow",
      #   Action = "ecs:RunTask",
      #   Resource = "*" # 필요시 Task Definition ARN 등으로 제한
      # },
      # {
      #   Effect = "Allow",
      #   Action = "iam:PassRole",
      #   Resource = [
      #     aws_iam_role.ecs_task_role.arn,
      #     aws_iam_role.ecs_task_execution_role.arn
      #   ],
      #   Condition = {
      #      StringEquals = { "iam:PassedToService": "ecs-tasks.amazonaws.com" }
      #   }
      # }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-LambdaPolicy-${var.environment}"
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attachment" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
} 