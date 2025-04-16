# --- API Gateway REST API ---
resource "aws_api_gateway_rest_api" "problems_api" {
  name        = "${var.project_name}-ProblemsAPI-${var.environment}"
  description = "API Gateway for the Problems Service (Get All, Get By ID)"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ProblemsAPI-${var.environment}"
  })
}

# --- API Gateway Account Settings ---
# Re-use the role defined in iam.tf
resource "aws_api_gateway_account" "apigw_account" {
  cloudwatch_role_arn = aws_iam_role.problems_api_gateway_cloudwatch_role.arn
  depends_on          = [aws_iam_role.problems_api_gateway_cloudwatch_role]
}

# --- API Gateway Resources (Paths) ---

# /problems
resource "aws_api_gateway_resource" "problems_root" {
  rest_api_id = aws_api_gateway_rest_api.problems_api.id
  parent_id   = aws_api_gateway_rest_api.problems_api.root_resource_id
  path_part   = "problems"
}

# /problems/{problemId}
resource "aws_api_gateway_resource" "problem_id_resource" {
  rest_api_id = aws_api_gateway_rest_api.problems_api.id
  parent_id   = aws_api_gateway_resource.problems_root.id
  path_part   = "{problemId}" # Path parameter
}

# --- Methods, Integrations, and Permissions ---

# Helper for Lambda permission source ARN
locals {
  problems_api_lambda_permission_source_arn = { for k, v in {
    "GET /problems"           = { method = "GET", path = aws_api_gateway_resource.problems_root.path }
    "GET /problems/{problemId}" = { method = "GET", path = aws_api_gateway_resource.problem_id_resource.path }
    } : k => format("%s/*/%s%s", aws_api_gateway_rest_api.problems_api.execution_arn, v.method, v.path)
  }
}

# 1. GET /problems -> getAllProblems
resource "aws_api_gateway_method" "problems_get_all" {
  rest_api_id   = aws_api_gateway_rest_api.problems_api.id
  resource_id   = aws_api_gateway_resource.problems_root.id
  http_method   = "GET"
  authorization = "NONE" # Public endpoint
}
resource "aws_api_gateway_integration" "problems_get_all_integration" {
  rest_api_id             = aws_api_gateway_rest_api.problems_api.id
  resource_id             = aws_api_gateway_resource.problems_root.id
  http_method             = aws_api_gateway_method.problems_get_all.http_method
  integration_http_method = "POST" # Always POST for AWS_PROXY
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_all_problems.invoke_arn
}
resource "aws_lambda_permission" "apigw_lambda_get_all_problems" {
  statement_id  = "AllowAPIGatewayInvokeGetAllProblems"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_all_problems.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.problems_api_lambda_permission_source_arn["GET /problems"]
}

# 2. GET /problems/{problemId} -> getProblemById
resource "aws_api_gateway_method" "problem_get_one" {
  rest_api_id   = aws_api_gateway_rest_api.problems_api.id
  resource_id   = aws_api_gateway_resource.problem_id_resource.id
  http_method   = "GET"
  authorization = "NONE" # Public endpoint
}
resource "aws_api_gateway_integration" "problem_get_one_integration" {
  rest_api_id             = aws_api_gateway_rest_api.problems_api.id
  resource_id             = aws_api_gateway_resource.problem_id_resource.id
  http_method             = aws_api_gateway_method.problem_get_one.http_method
  integration_http_method = "POST" # Always POST for AWS_PROXY
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_problem_by_id.invoke_arn
}
resource "aws_lambda_permission" "apigw_lambda_get_problem_by_id" {
  statement_id  = "AllowAPIGatewayInvokeGetProblemById"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_problem_by_id.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.problems_api_lambda_permission_source_arn["GET /problems/{problemId}"]
}

# --- OPTIONS Methods for CORS ---

# OPTIONS /problems
resource "aws_api_gateway_method" "options_problems_root" {
  rest_api_id   = aws_api_gateway_rest_api.problems_api.id
  resource_id   = aws_api_gateway_resource.problems_root.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "options_problems_root_integration" {
  rest_api_id = aws_api_gateway_rest_api.problems_api.id
  resource_id = aws_api_gateway_resource.problems_root.id
  http_method = aws_api_gateway_method.options_problems_root.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}
resource "aws_api_gateway_method_response" "options_problems_root_response" {
  rest_api_id = aws_api_gateway_rest_api.problems_api.id
  resource_id = aws_api_gateway_resource.problems_root.id
  http_method = aws_api_gateway_method.options_problems_root.http_method
  status_code = 200
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}
resource "aws_api_gateway_integration_response" "options_problems_root_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.problems_api.id
  resource_id = aws_api_gateway_resource.problems_root.id
  http_method = aws_api_gateway_method.options_problems_root.http_method
  status_code = aws_api_gateway_method_response.options_problems_root_response.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'" # Only GET is defined for this path
    "method.response.header.Access-Control-Allow-Origin"  = "'*'" # Allow all origins for simplicity, restrict in production
  }
  response_templates = {
    "application/json" = ""
  }
  depends_on = [aws_api_gateway_integration.options_problems_root_integration]
}

# OPTIONS /problems/{problemId}
resource "aws_api_gateway_method" "options_problem_id" {
  rest_api_id   = aws_api_gateway_rest_api.problems_api.id
  resource_id   = aws_api_gateway_resource.problem_id_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "options_problem_id_integration" {
  rest_api_id = aws_api_gateway_rest_api.problems_api.id
  resource_id = aws_api_gateway_resource.problem_id_resource.id
  http_method = aws_api_gateway_method.options_problem_id.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}
resource "aws_api_gateway_method_response" "options_problem_id_response" {
  rest_api_id = aws_api_gateway_rest_api.problems_api.id
  resource_id = aws_api_gateway_resource.problem_id_resource.id
  http_method = aws_api_gateway_method.options_problem_id.http_method
  status_code = 200
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}
resource "aws_api_gateway_integration_response" "options_problem_id_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.problems_api.id
  resource_id = aws_api_gateway_resource.problem_id_resource.id
  http_method = aws_api_gateway_method.options_problem_id.http_method
  status_code = aws_api_gateway_method_response.options_problem_id_response.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'" # Only GET is defined for this path
    "method.response.header.Access-Control-Allow-Origin"  = "'*'" # Allow all origins for simplicity, restrict in production
  }
  response_templates = {
    "application/json" = ""
  }
  depends_on = [aws_api_gateway_integration.options_problem_id_integration]
}

# --- API Gateway Deployment ---
resource "aws_api_gateway_deployment" "problems_api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.problems_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.problems_root.id,
      aws_api_gateway_resource.problem_id_resource.id,
      aws_api_gateway_integration.problems_get_all_integration.id,
      aws_api_gateway_integration.problem_get_one_integration.id,
      aws_api_gateway_integration.options_problems_root_integration.id,
      aws_api_gateway_integration_response.options_problems_root_integration_response.id,
      aws_api_gateway_integration.options_problem_id_integration.id,
      aws_api_gateway_integration_response.options_problem_id_integration_response.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# --- API Gateway Stage ---
resource "aws_api_gateway_stage" "problems_api_stage" {
  deployment_id = aws_api_gateway_deployment.problems_api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.problems_api.id
  stage_name    = var.environment

  # Enable access logging (using the role defined in iam.tf)
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.problems_api_gateway_logs.arn
    format          = "$context.identity.sourceIp $context.identity.caller $context.identity.user [$context.requestTime] \"$context.httpMethod $context.resourcePath $context.protocol\" $context.status $context.responseLength $context.requestId"
  }

  xray_tracing_enabled = false

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ProblemsAPI-Stage-${var.environment}"
  })

  depends_on = [
    aws_cloudwatch_log_group.problems_api_gateway_logs,
    aws_api_gateway_account.apigw_account
  ]
}

# --- API Gateway Method Settings ---
resource "aws_api_gateway_method_settings" "problems_api_all_methods" {
  rest_api_id = aws_api_gateway_rest_api.problems_api.id
  stage_name  = aws_api_gateway_stage.problems_api_stage.stage_name
  method_path = "*/*" # Apply to all methods

  settings {
    metrics_enabled    = true
    logging_level      = "INFO"
    data_trace_enabled = true # Log request/response bodies
  }

  depends_on = [aws_api_gateway_stage.problems_api_stage]
}

# --- CloudWatch Log Group for API Gateway Access Logs ---
resource "aws_cloudwatch_log_group" "problems_api_gateway_logs" {
  name              = "/aws/api-gateway/${aws_api_gateway_rest_api.problems_api.name}/${var.environment}"
  retention_in_days = 7

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ProblemsAPIGatewayLogs-${var.environment}"
  })
}