# Lambda 함수 코드 아카이브 (ZIP 파일 방식)
# backend/lambdas/problem-grader 디렉토리의 내용을 압축한다고 가정
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../backend/lambdas/problem-grader" # Lambda 코드 경로
  output_path = "${path.module}/lambda_package.zip"
}

# Problem Grader Lambda 함수
resource "aws_lambda_function" "problem_grader_lambda" {
  function_name = "${var.project_name}-ProblemGrader-${var.environment}"
  filename      = data.archive_file.lambda_zip.output_path
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  role          = aws_iam_role.lambda_execution_role.arn
  timeout       = 30 # 상태 머신 시작만 하므로 타임아웃 단축 가능
  memory_size   = 256

  # Lambda 코드를 포함한 ZIP 파일 경로
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  # VPC 설정
  vpc_config {
    subnet_ids         = local.lambda_subnet_ids # Lambda용 서브넷 사용
    security_group_ids = local.lambda_security_group_ids
  }

  # 환경 변수 설정
  environment {
    variables = {
      PROBLEMS_TABLE_NAME     = aws_dynamodb_table.problems_table.name
      SUBMISSIONS_TABLE_NAME  = aws_dynamodb_table.submissions_table.name
      GRADER_OUTPUT_S3_BUCKET = aws_s3_bucket.grader_output_bucket.bucket
      # Step Functions 상태 머신 ARN 추가
      STATE_MACHINE_ARN       = aws_sfn_state_machine.problem_grader_state_machine.arn
      # Lambda 함수 자체 이름 (재귀적 호출 등에 사용 가능)
      FUNCTION_NAME           = "${var.project_name}-ProblemGrader-${var.environment}"
      # 언어별 Runner 정보를 JSON 문자열로 전달
      RUNNER_INFO_JSON        = jsonencode(local.runner_info_map)

      # 기존 ECS 관련 환경 변수 제거 (또는 주석 처리)
      # GENERATOR_TASK_DEF_ARN = aws_ecs_task_definition.generator_task_def.arn
      # RUNNER_PYTHON_TASK_DEF_ARN = aws_ecs_task_definition.runner_python_task_def.arn
      # ECS_CLUSTER_NAME = aws_ecs_cluster.grader_cluster.name
      # SUBNET_IDS = join(",", local.fargate_subnet_ids)
      # SECURITY_GROUP_IDS = join(",", local.fargate_security_group_ids)
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-ProblemGraderLambda-${var.environment}"
  })

  # Lambda 함수 코드가 변경될 때만 업데이트하도록 설정 (선택적)
  # lifecycle {
  #   ignore_changes = [filename, source_code_hash] # 코드는 CI/CD 파이프라인 등에서 별도 관리 시
  # }
}

# API Gateway (HTTP API) 생성
resource "aws_apigatewayv2_api" "grader_api" {
  name          = "${var.project_name}-GraderAPI-${var.environment}"
  protocol_type = "HTTP"
  description   = "API for Problem Grader"

  tags = merge(var.tags, {
    Name = "${var.project_name}-GraderAPI-${var.environment}"
  })
}

# Lambda 통합 생성
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id           = aws_apigatewayv2_api.grader_api.id
  integration_type = "AWS_PROXY" # Lambda 프록시 통합
  integration_uri  = aws_lambda_function.problem_grader_lambda.invoke_arn
  payload_format_version = "2.0" # Lambda 함수가 사용하는 이벤트 페이로드 버전
}

# API Gateway 라우트 생성 (POST /problems/{problem_id}/grade)
resource "aws_apigatewayv2_route" "grade_route" {
  api_id    = aws_apigatewayv2_api.grader_api.id
  route_key = "POST /problems/{problem_id}/grade" # 경로 및 메소드
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# API Gateway 기본 스테이지 생성 ($default)
resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.grader_api.id
  name        = "$default"
  auto_deploy = true # 변경 시 자동 배포 활성화

  # 접근 로깅 설정 (선택적)
  # default_route_settings {
  #   logging_level = "INFO"
  #   data_trace_enabled = true
  # }

  tags = merge(var.tags, {
    Name = "${var.project_name}-DefaultStage-${var.environment}"
  })
}

# API Gateway가 Lambda 함수를 호출할 권한 부여
resource "aws_lambda_permission" "api_gw_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.problem_grader_lambda.function_name
  principal     = "apigateway.amazonaws.com"

  # 특정 API Gateway의 특정 라우트에서만 호출 허용 (보안 강화)
  source_arn = "${aws_apigatewayv2_api.grader_api.execution_arn}/*/${aws_apigatewayv2_route.grade_route.route_key}"
  # 예: arn:aws:execute-api:us-east-1:123456789012:abcdef123/* /POST/problems/{problem_id}/grade
}

# Locals 블록 재정의 (locals.tf 로 이동됨)
# locals {
#   ...
# } 