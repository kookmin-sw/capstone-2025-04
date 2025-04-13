# --- API Gateway REST API ---
resource "aws_api_gateway_rest_api" "chatbot_api" {
  name        = "${var.project_name}-ChatbotAPI-${var.environment}"
  description = "API Gateway for the Chatbot Service"

  endpoint_configuration {
    types = ["REGIONAL"] # Consistent with community_api
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ChatbotAPI-${var.environment}"
  })
}

# --- API Gateway Resources (Paths) ---

# /chatbot
resource "aws_api_gateway_resource" "chatbot_root" {
  rest_api_id = aws_api_gateway_rest_api.chatbot_api.id
  parent_id   = aws_api_gateway_rest_api.chatbot_api.root_resource_id
  path_part   = "chatbot"
}

# /chatbot/query
resource "aws_api_gateway_resource" "chatbot_query_resource" {
  rest_api_id = aws_api_gateway_rest_api.chatbot_api.id
  parent_id   = aws_api_gateway_resource.chatbot_root.id
  path_part   = "query"
}

# --- POST /chatbot/query Method & Integration ---

resource "aws_api_gateway_method" "chatbot_query_post" {
  rest_api_id   = aws_api_gateway_rest_api.chatbot_api.id
  resource_id   = aws_api_gateway_resource.chatbot_query_resource.id
  http_method   = "POST"
  authorization = "NONE" # Defer Cognito auth as per plan
  # authorizer_id will be added later
}

resource "aws_api_gateway_integration" "chatbot_query_post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.chatbot_api.id
  resource_id             = aws_api_gateway_resource.chatbot_query_resource.id
  http_method             = aws_api_gateway_method.chatbot_query_post.http_method
  integration_http_method = "POST" # Required for AWS_PROXY
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.chatbot_query.invoke_arn # From lambda.tf
}

# --- Lambda Permission ---

# Construct the source ARN for lambda permissions
locals {
  chatbot_lambda_permission_source_arn = format(
    "%s/*/%s%s",
    aws_api_gateway_rest_api.chatbot_api.execution_arn,
    aws_api_gateway_method.chatbot_query_post.http_method,
    aws_api_gateway_resource.chatbot_query_resource.path
  )
}

resource "aws_lambda_permission" "apigw_lambda_chatbot_query" {
  statement_id  = "AllowAPIGatewayInvokeChatbotQuery"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chatbot_query.function_name # From lambda.tf
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.chatbot_lambda_permission_source_arn
}

# --- Deployment & Stage ---

resource "aws_api_gateway_deployment" "chatbot_api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.chatbot_api.id

  # Triggers redeployment when the API configuration changes
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.chatbot_root.id,
      aws_api_gateway_resource.chatbot_query_resource.id,
      aws_api_gateway_method.chatbot_query_post.id,
      aws_api_gateway_integration.chatbot_query_post_integration.id,
      # Add other resources here if they affect the deployment
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "chatbot_api_stage" {
  deployment_id = aws_api_gateway_deployment.chatbot_api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.chatbot_api.id
  stage_name    = var.environment # Use environment name for the stage (e.g., 'production')

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ChatbotAPI-Stage-${var.environment}"
  })
} 