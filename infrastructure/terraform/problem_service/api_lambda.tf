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

  # Restrict the permission to the specific API Gateway API
  source_arn = "${aws_apigatewayv2_api.grader_api.execution_arn}/*/*"
}

# Problem Generator Streaming Lambda Function (MODIFIED to use Docker Image)
resource "aws_lambda_function" "generator_streaming_lambda" {
  function_name = "${var.project_name}-generator-streaming-${var.environment}"
  role          = aws_iam_role.generator_streaming_lambda_role.arn
  package_type  = "Image" # 패키지 타입을 Image로 변경
  architectures = ["x86_64"] # 실행 아키텍처 명시적 지정
  # image_uri 는 ecr.tf 에서 생성된 리포지토리 URL 사용
  image_uri     = "${aws_ecr_repository.generator_streaming_repo.repository_url}:latest"
  memory_size   = var.generator_streaming_lambda_memory_size
  timeout       = var.generator_streaming_lambda_timeout

  environment {
    variables = {
      PROBLEMS_TABLE_NAME = aws_dynamodb_table.problems_table.name
      # API_GW_ENDPOINT will be needed by Lambda to send messages back via WebSocket
      # Construct the Management API endpoint URL using the correct attribute 'id'
      API_GW_ENDPOINT     = "https://${aws_apigatewayv2_api.generator_streaming_api.id}.execute-api.${var.aws_region}.amazonaws.com/${var.environment}"
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# WebSocket API Gateway for Problem Generator Streaming
resource "aws_apigatewayv2_api" "generator_streaming_api" {
  name          = "${var.project_name}-generator-streaming-api-${var.environment}"
  protocol_type = "WEBSOCKET"
  route_selection_expression = "$request.body.action" # 클라이언트가 보내는 메시지 형식에 따라 조정 필요

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Integration between WebSocket API and Streaming Lambda
resource "aws_apigatewayv2_integration" "generator_streaming_integration" {
  api_id           = aws_apigatewayv2_api.generator_streaming_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.generator_streaming_lambda.invoke_arn
  # integration_method = "POST" # Not needed for AWS_PROXY with Lambda
}

# Route for WebSocket API (e.g., default message handling)
resource "aws_apigatewayv2_route" "generator_streaming_default_route" {
  api_id    = aws_apigatewayv2_api.generator_streaming_api.id
  route_key = var.generator_streaming_websocket_route_key # e.g., "$default", "$connect", "$disconnect", "generate"
  target    = "integrations/${aws_apigatewayv2_integration.generator_streaming_integration.id}"
  # authorization_type = "NONE" # Add authorizer if needed
}

# Deployment for the WebSocket API
resource "aws_apigatewayv2_deployment" "generator_streaming_deployment" {
  api_id = aws_apigatewayv2_api.generator_streaming_api.id

  # Important: Deployment needs to be triggered when routes or integrations change.
  # Using triggers based on relevant resources.
  triggers = {
    redeployment = sha1(jsonencode([
      aws_apigatewayv2_integration.generator_streaming_integration.id,
      aws_apigatewayv2_route.generator_streaming_default_route.id
      # Add other routes/integrations here if defined
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Stage for the WebSocket API (e.g., 'dev', 'prod')
resource "aws_apigatewayv2_stage" "generator_streaming_stage" {
  api_id        = aws_apigatewayv2_api.generator_streaming_api.id
  name          = var.environment # Using environment name as stage name
  deployment_id = aws_apigatewayv2_deployment.generator_streaming_deployment.id

  # Enable CloudWatch logging for the stage
  default_route_settings {
    throttling_burst_limit = 50 # Example limits
    throttling_rate_limit  = 100
    detailed_metrics_enabled = true
    data_trace_enabled       = true # Enable for debugging, disable for production potentially
    logging_level            = "INFO" # Or ERROR
  }

  # Access Log Settings (Optional but recommended)
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw_access_logs.arn # Requires a CloudWatch Log Group resource
    format = jsonencode({
      requestId               = "$context.requestId"
      ip                      = "$context.identity.sourceIp"
      caller                  = "$context.identity.caller"
      user                    = "$context.identity.user"
      requestTime             = "$context.requestTime"
      httpMethod              = "$context.httpMethod" # Will be null for WebSocket
      resourcePath            = "$context.resourcePath"
      status                  = "$context.status"
      protocol                = "$context.protocol"
      responseLength          = "$context.responseLength"
      connectionId            = "$context.connectionId" # WebSocket specific
      eventType               = "$context.eventType"     # WebSocket specific (CONNECT, MESSAGE, DISCONNECT)
      routeKey                = "$context.routeKey"      # WebSocket specific
      messageDirection        = "$context.messageDirection" # WebSocket specific (IN, OUT)
      # messageId             = "$context.messageId" # Only available for $default route with specific setup
    })
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# CloudWatch Log Group for API Gateway Access Logs (Needed for stage access logging)
resource "aws_cloudwatch_log_group" "api_gw_access_logs" {
  name              = "/aws/apigateway/${aws_apigatewayv2_api.generator_streaming_api.name}-${var.environment}-access"
  retention_in_days = 7 # Adjust as needed

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Grant API Gateway permission to invoke the Lambda function
resource "aws_lambda_permission" "generator_streaming_lambda_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.generator_streaming_lambda.function_name
  principal     = "apigateway.amazonaws.com"

  # Restrict the permission to the specific API Gateway API
  source_arn = "${aws_apigatewayv2_api.generator_streaming_api.execution_arn}/*/*"
} 