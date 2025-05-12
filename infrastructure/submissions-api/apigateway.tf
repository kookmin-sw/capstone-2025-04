resource "aws_api_gateway_rest_api" "submissions_api" {
  name        = "${var.project_name}-SubmissionsAPI-${var.environment}"
  description = "API Gateway for the Submissions Service"
  endpoint_configuration {
    types = ["REGIONAL"]
  }
  tags = var.common_tags
}

resource "aws_api_gateway_resource" "submissions_resource" {
  rest_api_id = aws_api_gateway_rest_api.submissions_api.id
  parent_id   = aws_api_gateway_rest_api.submissions_api.root_resource_id
  path_part   = "submissions" # 예: /submissions 엔드포인트
}

resource "aws_api_gateway_method" "submissions_get" {
  rest_api_id   = aws_api_gateway_rest_api.submissions_api.id
  resource_id   = aws_api_gateway_resource.submissions_resource.id
  http_method   = "GET"
  authorization = "NONE" # 필요에 따라 "AWS_IAM" 또는 Cognito 등으로 변경
  # 요청 파라미터 정의 (API Gateway 레벨에서 검증 가능)
  request_parameters = {
    "method.request.querystring.userId"           = false # 선택적 파라미터
    "method.request.querystring.problemId"        = false
    "method.request.querystring.pageSize"         = false
    "method.request.querystring.lastEvaluatedKey" = false
    "method.request.querystring.sortOrder"        = false
  }
}

resource "aws_api_gateway_integration" "submissions_get_lambda_integration" {
  rest_api_id             = aws_api_gateway_rest_api.submissions_api.id
  resource_id             = aws_api_gateway_resource.submissions_resource.id
  http_method             = aws_api_gateway_method.submissions_get.http_method
  integration_http_method = "POST" # Lambda Proxy 통합은 항상 POST
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_submission.invoke_arn
}

# OPTIONS 메서드 (CORS 용)
resource "aws_api_gateway_method" "submissions_options" {
  rest_api_id   = aws_api_gateway_rest_api.submissions_api.id
  resource_id   = aws_api_gateway_resource.submissions_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "submissions_options_mock_integration" {
  rest_api_id = aws_api_gateway_rest_api.submissions_api.id
  resource_id = aws_api_gateway_resource.submissions_resource.id
  http_method = aws_api_gateway_method.submissions_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "submissions_options_200" {
  rest_api_id = aws_api_gateway_rest_api.submissions_api.id
  resource_id = aws_api_gateway_resource.submissions_resource.id
  http_method = aws_api_gateway_method.submissions_options.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true,
    "method.response.header.Access-Control-Allow-Methods" = true,
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "submissions_options_integration_200" {
  rest_api_id = aws_api_gateway_rest_api.submissions_api.id
  resource_id = aws_api_gateway_resource.submissions_resource.id
  http_method = aws_api_gateway_method.submissions_options.http_method
  status_code = aws_api_gateway_method_response.submissions_options_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'", # 이 경로에는 GET, OPTIONS만 허용
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"            # 실제 운영 환경에서는 특정 Origin으로 제한
  }
  response_templates = {
    "application/json" = "" # OPTIONS는 본문 없이 헤더만 반환
  }
  depends_on = [aws_api_gateway_integration.submissions_options_mock_integration]
}


# API Gateway Deployment & Stage
resource "aws_api_gateway_deployment" "submissions_api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.submissions_api.id
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.submissions_resource.id,
      aws_api_gateway_method.submissions_get.id,
      aws_api_gateway_integration.submissions_get_lambda_integration.id,
      aws_api_gateway_method.submissions_options.id,
    ]))
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "submissions_api_stage" {
  deployment_id = aws_api_gateway_deployment.submissions_api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.submissions_api.id
  stage_name    = var.environment

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.submissions_api_gateway_logs.arn
    format = jsonencode({ # JSON 형식 로그 사용
      requestId      = "$context.requestId",
      ip             = "$context.identity.sourceIp",
      caller         = "$context.identity.caller",
      user           = "$context.identity.user",
      requestTime    = "$context.requestTime",
      httpMethod     = "$context.httpMethod",
      resourcePath   = "$context.resourcePath",
      status         = "$context.status",
      protocol       = "$context.protocol",
      responseLength = "$context.responseLength"
      # integrationErrorMessage = "$context.integrationErrorMessage" # 필요시 추가
      # error                   = "$context.error.message" # 필요시 추가
    })
  }
  depends_on = [aws_api_gateway_account.submissions_apigw_account, aws_cloudwatch_log_group.submissions_api_gateway_logs]
}

resource "aws_api_gateway_method_settings" "submissions_api_all_methods_settings" {
  rest_api_id = aws_api_gateway_rest_api.submissions_api.id
  stage_name  = aws_api_gateway_stage.submissions_api_stage.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled = true
    logging_level   = "INFO"
    # data_trace_enabled = true # 개발 시에만 사용, 프로덕션에서는 비용 및 민감 정보 노출 주의
  }
}

resource "aws_api_gateway_account" "submissions_apigw_account" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch_role_submissions.arn
  depends_on          = [aws_iam_role.api_gateway_cloudwatch_role_submissions]
}

resource "aws_cloudwatch_log_group" "submissions_api_gateway_logs" {
  name              = "/aws/api-gateway/${aws_api_gateway_rest_api.submissions_api.name}/${var.environment}"
  retention_in_days = 7
  tags              = var.common_tags
}

# Lambda Permission for API Gateway to invoke getSubmission Lambda
resource "aws_lambda_permission" "apigw_invoke_get_submission" {
  statement_id  = "AllowAPIGatewayInvokeGetSubmission"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_submission.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.submissions_api.execution_arn}/*/${aws_api_gateway_method.submissions_get.http_method}${aws_api_gateway_resource.submissions_resource.path}"
}
