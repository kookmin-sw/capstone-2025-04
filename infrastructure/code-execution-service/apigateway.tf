resource "aws_api_gateway_rest_api" "grader_api" {
  name        = "${var.project_name}-CodeGraderAPI-${var.environment}"
  description = "API Gateway for the Code Grader Lambda"
  endpoint_configuration {
    types = ["REGIONAL"]
  }
  tags = var.common_tags
}

resource "aws_api_gateway_resource" "grade_resource" {
  rest_api_id = aws_api_gateway_rest_api.grader_api.id
  parent_id   = aws_api_gateway_rest_api.grader_api.root_resource_id
  path_part   = "grade" # 예: /grade 엔드포인트
}

resource "aws_api_gateway_method" "grade_post" {
  rest_api_id   = aws_api_gateway_rest_api.grader_api.id
  resource_id   = aws_api_gateway_resource.grade_resource.id
  http_method   = "POST" # 채점 요청은 POST가 적합
  authorization = "NONE" # 필요에 따라 "AWS_IAM" 또는 Cognito Authorizer 등으로 변경
}

resource "aws_api_gateway_integration" "grade_post_lambda_integration" {
  rest_api_id             = aws_api_gateway_rest_api.grader_api.id
  resource_id             = aws_api_gateway_resource.grade_resource.id
  http_method             = aws_api_gateway_method.grade_post.http_method
  integration_http_method = "POST" # Lambda Proxy 통합은 항상 POST
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.code_grader.invoke_arn
}

# OPTIONS 메서드 (CORS 용)
resource "aws_api_gateway_method" "grade_options" {
  rest_api_id   = aws_api_gateway_rest_api.grader_api.id
  resource_id   = aws_api_gateway_resource.grade_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "grade_options_mock_integration" {
  rest_api_id = aws_api_gateway_rest_api.grader_api.id
  resource_id = aws_api_gateway_resource.grade_resource.id
  http_method = aws_api_gateway_method.grade_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "grade_options_200" {
  rest_api_id = aws_api_gateway_rest_api.grader_api.id
  resource_id = aws_api_gateway_resource.grade_resource.id
  http_method = aws_api_gateway_method.grade_options.http_method
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

resource "aws_api_gateway_integration_response" "grade_options_integration_200" {
  rest_api_id = aws_api_gateway_rest_api.grader_api.id
  resource_id = aws_api_gateway_resource.grade_resource.id
  http_method = aws_api_gateway_method.grade_options.http_method
  status_code = aws_api_gateway_method_response.grade_options_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'",
    "method.response.header.Access-Control-Allow-Origin"  = "'*'" # 실제 운영 환경에서는 특정 Origin으로 제한
  }
  response_templates = {
    "application/json" = ""
  }
  depends_on = [aws_api_gateway_integration.grade_options_mock_integration]
}


# API Gateway Deployment & Stage
resource "aws_api_gateway_deployment" "grader_api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.grader_api.id
  # API 변경 시 재배포를 트리거하기 위한 해시값들
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.grade_resource.id,
      aws_api_gateway_method.grade_post.id,
      aws_api_gateway_integration.grade_post_lambda_integration.id,
      aws_api_gateway_method.grade_options.id,
    ]))
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "grader_api_stage" {
  deployment_id = aws_api_gateway_deployment.grader_api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.grader_api.id
  stage_name    = var.environment # "dev", "prod" 등

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.grader_api_gateway_logs.arn
    format = jsonencode({
      requestId               = "$context.requestId",
      ip                      = "$context.identity.sourceIp",
      caller                  = "$context.identity.caller",
      user                    = "$context.identity.user",
      requestTime             = "$context.requestTime",
      httpMethod              = "$context.httpMethod",
      resourcePath            = "$context.resourcePath",
      status                  = "$context.status",
      protocol                = "$context.protocol",
      responseLength          = "$context.responseLength"
      integrationErrorMessage = "$context.integrationErrorMessage"
      error                   = "$context.error.message"
    })
  }
  depends_on = [aws_api_gateway_account.grader_apigw_account, aws_cloudwatch_log_group.grader_api_gateway_logs]
}

resource "aws_api_gateway_method_settings" "grader_api_all_methods_settings" {
  rest_api_id = aws_api_gateway_rest_api.grader_api.id
  stage_name  = aws_api_gateway_stage.grader_api_stage.stage_name
  method_path = "*/*" # 모든 메서드에 적용

  settings {
    metrics_enabled = true
    logging_level   = "INFO" # INFO 또는 ERROR
    # data_trace_enabled = true # 요청/응답 본문 로깅 (프로덕션에서는 주의)
  }
}

resource "aws_api_gateway_account" "grader_apigw_account" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch_role_grader.arn
  depends_on          = [aws_iam_role.api_gateway_cloudwatch_role_grader]
}

resource "aws_cloudwatch_log_group" "grader_api_gateway_logs" {
  name              = "/aws/api-gateway/${aws_api_gateway_rest_api.grader_api.name}/${var.environment}"
  retention_in_days = 7 # 로그 보관 기간
  tags              = var.common_tags
}

# Lambda Permission for API Gateway to invoke Code Grader Lambda
resource "aws_lambda_permission" "apigw_invoke_code_grader" {
  statement_id  = "AllowAPIGatewayInvokeCodeGrader"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.code_grader.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.grader_api.execution_arn}/*/${aws_api_gateway_method.grade_post.http_method}${aws_api_gateway_resource.grade_resource.path}"
}
