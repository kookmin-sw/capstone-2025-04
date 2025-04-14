# --- API Gateway HTTP API ---
data "terraform_remote_state" "cognito" {
  backend = "s3"
  config = {
    bucket = "alpaco-tfstate-bucket-kmu" # Hardcode bucket name as it's consistent
    key    = "cognito/terraform.tfstate" # Key for the Cognito state file
    region = var.aws_region
  }
}

resource "aws_apigatewayv2_api" "chatbot_api" {
  name          = "${var.project_name}-ChatbotHttpApi-${var.environment}"
  protocol_type = "HTTP"
  description   = "HTTP API Gateway for the Chatbot Service"

  # CORS Configuration (adjust origins as needed)
  cors_configuration {
    allow_origins = ["*"] # Replace with frontend URL(s) for production
    allow_methods = ["POST", "OPTIONS"] # Allow POST and preflight OPTIONS
    allow_headers = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"] # Headers needed
    max_age       = 300 # Cache preflight response for 5 minutes
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ChatbotHttpApi-${var.environment}"
  })
}

# --- JWT Authorizer for Cognito ---
# Note: Requires Cognito User Pool Client ID and Issuer URL from remote state
resource "aws_apigatewayv2_authorizer" "chatbot_jwt_auth" {
  api_id           = aws_apigatewayv2_api.chatbot_api.id
  name             = "${var.project_name}-ChatbotJwtAuthorizer-${var.environment}"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"] # Expect token in Authorization header

  jwt_configuration {
    # Audience must match the App Client ID used by the frontend
    audience = [data.terraform_remote_state.cognito.outputs.cognito_user_pool_client_id] # Assuming this output exists
    # Issuer URL for the Cognito User Pool
    issuer = data.terraform_remote_state.cognito.outputs.cognito_user_pool_provider_url # Use existing provider URL output
  }

  depends_on = [data.terraform_remote_state.cognito]
}

# --- Lambda Integration ---
resource "aws_apigatewayv2_integration" "query_post_integration" {
  api_id           = aws_apigatewayv2_api.chatbot_api.id
  integration_type = "AWS_PROXY"
  # integration_method defaults to POST for AWS_PROXY
  integration_uri          = aws_lambda_function.chatbot_query.invoke_arn
  payload_format_version = "2.0" # Required for Lambda proxy integration with HTTP API

  # Optional: Add timeout if needed, defaults to 30 seconds
  # timeout_milliseconds = 29000
}

# --- Route for POST /query ---
resource "aws_apigatewayv2_route" "query_post_route" {
  api_id    = aws_apigatewayv2_api.chatbot_api.id
  route_key = "POST /query"

  target = "integrations/${aws_apigatewayv2_integration.query_post_integration.id}"

  # Attach the JWT authorizer
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.chatbot_jwt_auth.id
}

# --- Deployment Stage ---
resource "aws_apigatewayv2_stage" "chatbot_api_stage" {
  api_id = aws_apigatewayv2_api.chatbot_api.id
  name   = "$default" # Use the default stage for simplicity

  auto_deploy = true # Automatically deploy changes

  # Optional: Configure access logging if needed
  # access_log_settings {
  #   destination_arn = aws_cloudwatch_log_group.chatbot_http_api_logs.arn # Need to define this log group
  #   format          = "...json format..."
  # }

  # Optional: Configure throttling
  # default_route_settings {
  #   throttling_burst_limit = 500
  #   throttling_rate_limit  = 1000
  # }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ChatbotHttpApi-Stage-${var.environment}"
  })
}

# --- Lambda Permission --- Needs update
resource "aws_lambda_permission" "apigw_lambda_chatbot_query" {
  statement_id  = "AllowHttpApiGatewayInvokeChatbotQuery"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chatbot_query.function_name
  principal     = "apigateway.amazonaws.com"

  # Source ARN for HTTP API is different from REST API
  source_arn = "${aws_apigatewayv2_api.chatbot_api.execution_arn}/*/*" # Allow any method on any path of this API
  # Or more specific: "${aws_apigatewayv2_api.chatbot_api.execution_arn}/${aws_apigatewayv2_stage.chatbot_api_stage.name}/POST/query"

  depends_on = [aws_apigatewayv2_api.chatbot_api, aws_apigatewayv2_stage.chatbot_api_stage]
}

# Note: Removed OPTIONS method resources, handled by cors_configuration on aws_apigatewayv2_api
# Note: Removed aws_api_gateway_* resources replaced by aws_apigatewayv2_* 