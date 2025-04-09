# --- Remote State for Cognito ---
# Reads outputs from the Cognito Terraform state file stored in the S3 backend.
# Ensure the Cognito state exists at the specified key.
data "terraform_remote_state" "cognito" {
  backend = "s3"
  config = {
    bucket = var.tf_state_bucket         # Provided via -backend-config or tfvars/secrets
    key    = "cognito/terraform.tfstate" # Key for the Cognito state file
    region = var.aws_region
  }
}

# --- API Gateway REST API ---
resource "aws_api_gateway_rest_api" "community_api" {
  name        = "${var.project_name}-CommunityAPI-${var.environment}"
  description = "API Gateway for the Community Service"

  endpoint_configuration {
    types = ["REGIONAL"] # Or EDGE for CloudFront distribution
  }

  # Enable CloudWatch logging for API Gateway
  # (Requires an IAM role for API Gateway to write logs - define separately if needed)
  # cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch_role.arn

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-CommunityAPI-${var.environment}"
  })
}

# --- Cognito Authorizer ---
resource "aws_api_gateway_authorizer" "cognito_auth" {
  name                   = "${var.project_name}-CognitoAuthorizer-${var.environment}"
  rest_api_id            = aws_api_gateway_rest_api.community_api.id
  type                   = "COGNITO_USER_POOLS"
  identity_source        = "method.request.header.Authorization" # Where to find the token
  provider_arns          = [data.terraform_remote_state.cognito.outputs.cognito_user_pool_arn] # ARN from Cognito state output
  # Ensure 'cognito_user_pool_arn' is an output in infrastructure/cognito/outputs.tf

  # Optional: Cache authorizer results for performance
  # authorizer_result_ttl_in_seconds = 300
}


# --- API Gateway Resources (Paths) ---

# /community
resource "aws_api_gateway_resource" "community_root" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  parent_id   = aws_api_gateway_rest_api.community_api.root_resource_id
  path_part   = "community"
}

# /community/{postId}
resource "aws_api_gateway_resource" "post_id" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  parent_id   = aws_api_gateway_resource.community_root.id
  path_part   = "{postId}"
}

# /community/{postId}/like
resource "aws_api_gateway_resource" "post_like" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  parent_id   = aws_api_gateway_resource.post_id.id
  path_part   = "like"
}

# /community/{postId}/comments
resource "aws_api_gateway_resource" "post_comments" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  parent_id   = aws_api_gateway_resource.post_id.id
  path_part   = "comments"
}

# /community/{postId}/comments/{commentId}
resource "aws_api_gateway_resource" "comment_id" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  parent_id   = aws_api_gateway_resource.post_comments.id
  path_part   = "{commentId}"
}


# --- Methods, Integrations, and Permissions ---

# Helper function for Lambda permission source ARN
locals {
  # Constructs the source ARN for lambda permissions based on method and resource path
  lambda_permission_source_arn = { for k, v in {
    # Posts
    "POST /community"   = { method = aws_api_gateway_method.community_post.http_method, path = aws_api_gateway_resource.community_root.path }
    "GET /community"    = { method = aws_api_gateway_method.community_get_all.http_method, path = aws_api_gateway_resource.community_root.path }
    "GET /community/{postId}" = { method = aws_api_gateway_method.post_get_one.http_method, path = aws_api_gateway_resource.post_id.path }
    "PUT /community/{postId}" = { method = aws_api_gateway_method.post_update.http_method, path = aws_api_gateway_resource.post_id.path }
    "DELETE /community/{postId}" = { method = aws_api_gateway_method.post_delete.http_method, path = aws_api_gateway_resource.post_id.path }
    "PUT /community/{postId}/like" = { method = aws_api_gateway_method.post_like_update.http_method, path = aws_api_gateway_resource.post_like.path }
    # Comments
    "POST /community/{postId}/comments" = { method = aws_api_gateway_method.comments_post.http_method, path = aws_api_gateway_resource.post_comments.path }
    "GET /community/{postId}/comments" = { method = aws_api_gateway_method.comments_get_all.http_method, path = aws_api_gateway_resource.post_comments.path }
    "DELETE /community/{postId}/comments/{commentId}" = { method = aws_api_gateway_method.comment_delete.http_method, path = aws_api_gateway_resource.comment_id.path }
    } : k => format("%s/*/%s%s", aws_api_gateway_rest_api.community_api.execution_arn, v.method, v.path)
  }
}

# 1. POST /community -> createPost
resource "aws_api_gateway_method" "community_post" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.community_root.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_auth.id
}
resource "aws_api_gateway_integration" "community_post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.community_api.id
  resource_id             = aws_api_gateway_resource.community_root.id
  http_method             = aws_api_gateway_method.community_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_post.invoke_arn
}
resource "aws_lambda_permission" "apigw_lambda_create_post" {
  statement_id  = "AllowAPIGatewayInvokeCreatePost"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_post.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.lambda_permission_source_arn["POST /community"]
}

# 2. GET /community -> getAllPosts
resource "aws_api_gateway_method" "community_get_all" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.community_root.id
  http_method   = "GET"
  authorization = "NONE" # Public endpoint
}
resource "aws_api_gateway_integration" "community_get_all_integration" {
  rest_api_id             = aws_api_gateway_rest_api.community_api.id
  resource_id             = aws_api_gateway_resource.community_root.id
  http_method             = aws_api_gateway_method.community_get_all.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_all_posts.invoke_arn
}
resource "aws_lambda_permission" "apigw_lambda_get_all_posts" {
  statement_id  = "AllowAPIGatewayInvokeGetAllPosts"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_all_posts.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.lambda_permission_source_arn["GET /community"]
}

# 3. GET /community/{postId} -> getPost
resource "aws_api_gateway_method" "post_get_one" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.post_id.id
  http_method   = "GET"
  authorization = "NONE" # Public endpoint
}
resource "aws_api_gateway_integration" "post_get_one_integration" {
  rest_api_id             = aws_api_gateway_rest_api.community_api.id
  resource_id             = aws_api_gateway_resource.post_id.id
  http_method             = aws_api_gateway_method.post_get_one.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_post.invoke_arn
}
resource "aws_lambda_permission" "apigw_lambda_get_post" {
  statement_id  = "AllowAPIGatewayInvokeGetPost"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_post.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.lambda_permission_source_arn["GET /community/{postId}"]
}

# 4. PUT /community/{postId} -> updatePost
resource "aws_api_gateway_method" "post_update" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.post_id.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_auth.id
}
resource "aws_api_gateway_integration" "post_update_integration" {
  rest_api_id             = aws_api_gateway_rest_api.community_api.id
  resource_id             = aws_api_gateway_resource.post_id.id
  http_method             = aws_api_gateway_method.post_update.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.update_post.invoke_arn
}
resource "aws_lambda_permission" "apigw_lambda_update_post" {
  statement_id  = "AllowAPIGatewayInvokeUpdatePost"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_post.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.lambda_permission_source_arn["PUT /community/{postId}"]
}

# 5. DELETE /community/{postId} -> deletePost
resource "aws_api_gateway_method" "post_delete" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.post_id.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_auth.id
}
resource "aws_api_gateway_integration" "post_delete_integration" {
  rest_api_id             = aws_api_gateway_rest_api.community_api.id
  resource_id             = aws_api_gateway_resource.post_id.id
  http_method             = aws_api_gateway_method.post_delete.http_method
  integration_http_method = "POST" # Still POST for proxy integration
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.delete_post.invoke_arn
}
resource "aws_lambda_permission" "apigw_lambda_delete_post" {
  statement_id  = "AllowAPIGatewayInvokeDeletePost"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete_post.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.lambda_permission_source_arn["DELETE /community/{postId}"]
}

# 6. PUT /community/{postId}/like -> likePost
resource "aws_api_gateway_method" "post_like_update" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.post_like.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_auth.id
}
resource "aws_api_gateway_integration" "post_like_update_integration" {
  rest_api_id             = aws_api_gateway_rest_api.community_api.id
  resource_id             = aws_api_gateway_resource.post_like.id
  http_method             = aws_api_gateway_method.post_like_update.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.like_post.invoke_arn
}
resource "aws_lambda_permission" "apigw_lambda_like_post" {
  statement_id  = "AllowAPIGatewayInvokeLikePost"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.like_post.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.lambda_permission_source_arn["PUT /community/{postId}/like"]
}

# 7. POST /community/{postId}/comments -> createComment
resource "aws_api_gateway_method" "comments_post" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.post_comments.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_auth.id
}
resource "aws_api_gateway_integration" "comments_post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.community_api.id
  resource_id             = aws_api_gateway_resource.post_comments.id
  http_method             = aws_api_gateway_method.comments_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_comment.invoke_arn
}
resource "aws_lambda_permission" "apigw_lambda_create_comment" {
  statement_id  = "AllowAPIGatewayInvokeCreateComment"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_comment.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.lambda_permission_source_arn["POST /community/{postId}/comments"]
}

# 8. GET /community/{postId}/comments -> getComments
resource "aws_api_gateway_method" "comments_get_all" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.post_comments.id
  http_method   = "GET"
  authorization = "NONE" # Public endpoint
}
resource "aws_api_gateway_integration" "comments_get_all_integration" {
  rest_api_id             = aws_api_gateway_rest_api.community_api.id
  resource_id             = aws_api_gateway_resource.post_comments.id
  http_method             = aws_api_gateway_method.comments_get_all.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_comments.invoke_arn
}
resource "aws_lambda_permission" "apigw_lambda_get_comments" {
  statement_id  = "AllowAPIGatewayInvokeGetComments"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_comments.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.lambda_permission_source_arn["GET /community/{postId}/comments"]
}

# 9. DELETE /community/{postId}/comments/{commentId} -> deleteComment
resource "aws_api_gateway_method" "comment_delete" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.comment_id.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_auth.id
}
resource "aws_api_gateway_integration" "comment_delete_integration" {
  rest_api_id             = aws_api_gateway_rest_api.community_api.id
  resource_id             = aws_api_gateway_resource.comment_id.id
  http_method             = aws_api_gateway_method.comment_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.delete_comment.invoke_arn
}
resource "aws_lambda_permission" "apigw_lambda_delete_comment" {
  statement_id  = "AllowAPIGatewayInvokeDeleteComment"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete_comment.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = local.lambda_permission_source_arn["DELETE /community/{postId}/comments/{commentId}"]
}

# --- OPTIONS Methods for CORS ---
# Add OPTIONS method for each resource path to handle CORS preflight requests
resource "aws_api_gateway_method" "options_community_root" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.community_root.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "options_community_root_integration" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.community_root.id
  http_method = aws_api_gateway_method.options_community_root.http_method
  type        = "MOCK" # Return CORS headers directly
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
  # Integration response for MOCK is handled implicitly by returning statusCode 200
  # Response headers are defined in the aws_api_gateway_method_response resource
}
resource "aws_api_gateway_method_response" "options_community_root_response" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.community_root.id
  http_method = aws_api_gateway_method.options_community_root.http_method
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
# Repeat OPTIONS method/integration/response for other resources: post_id, post_like, post_comments, comment_id

# --- OPTIONS for /community/{postId} ---
resource "aws_api_gateway_method" "options_post_id" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.post_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "options_post_id_integration" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.post_id.id
  http_method = aws_api_gateway_method.options_post_id.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}
resource "aws_api_gateway_method_response" "options_post_id_response" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.post_id.id
  http_method = aws_api_gateway_method.options_post_id.http_method
  status_code = 200
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true # Should reflect allowed methods on this resource (GET, PUT, DELETE)
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# --- OPTIONS for /community/{postId}/like ---
resource "aws_api_gateway_method" "options_post_like" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.post_like.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "options_post_like_integration" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.post_like.id
  http_method = aws_api_gateway_method.options_post_like.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}
resource "aws_api_gateway_method_response" "options_post_like_response" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.post_like.id
  http_method = aws_api_gateway_method.options_post_like.http_method
  status_code = 200
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true # Should reflect allowed methods (PUT)
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# --- OPTIONS for /community/{postId}/comments ---
resource "aws_api_gateway_method" "options_post_comments" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.post_comments.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "options_post_comments_integration" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.post_comments.id
  http_method = aws_api_gateway_method.options_post_comments.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}
resource "aws_api_gateway_method_response" "options_post_comments_response" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.post_comments.id
  http_method = aws_api_gateway_method.options_post_comments.http_method
  status_code = 200
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true # Should reflect allowed methods (GET, POST)
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# --- OPTIONS for /community/{postId}/comments/{commentId} ---
resource "aws_api_gateway_method" "options_comment_id" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.comment_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "options_comment_id_integration" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.comment_id.id
  http_method = aws_api_gateway_method.options_comment_id.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}
resource "aws_api_gateway_method_response" "options_comment_id_response" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.comment_id.id
  http_method = aws_api_gateway_method.options_comment_id.http_method
  status_code = 200
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true # Should reflect allowed methods (DELETE)
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# post_id, post_like, post_comments, comment_id
# post_id, post_like, post_comments, comment_id


# --- Deployment ---
# Create a deployment that triggers when API structure changes
resource "aws_api_gateway_deployment" "community_api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id

  # Trigger deployment by hashing the configuration of methods/integrations
  triggers = {
    redeployment = sha1(jsonencode([
      # List all method and integration resources to track changes
      aws_api_gateway_integration.community_post_integration,
      aws_api_gateway_integration.community_get_all_integration,
      aws_api_gateway_integration.post_get_one_integration,
      aws_api_gateway_integration.post_update_integration,
      aws_api_gateway_integration.post_delete_integration,
      aws_api_gateway_integration.post_like_update_integration,
      aws_api_gateway_integration.comments_post_integration,
      aws_api_gateway_integration.comments_get_all_integration,
      aws_api_gateway_integration.comment_delete_integration,
      # Include ALL OPTIONS integrations
      aws_api_gateway_integration.options_community_root_integration,
      aws_api_gateway_integration.options_post_id_integration,
      aws_api_gateway_integration.options_post_like_integration,
      aws_api_gateway_integration.options_post_comments_integration,
      aws_api_gateway_integration.options_comment_id_integration,
      # ... add other OPTIONS integrations ...
    ]))
  }

  lifecycle {
    create_before_destroy = true # Avoid downtime during updates
  }
}

# --- Stage ---
# Create a stage (e.g., 'dev' or 'prod') linked to the deployment
resource "aws_api_gateway_stage" "community_api_stage" {
  deployment_id = aws_api_gateway_deployment.community_api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  stage_name    = var.environment # Use environment variable for stage name

  # Enable CloudWatch Logs for this stage (Detailed metrics cost extra)
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn # Define log group separately
    format          = jsonencode({ "requestId" : "$context.requestId", "ip" : "$context.identity.sourceIp", "caller" : "$context.identity.caller", "user" : "$context.identity.user", "requestTime" : "$context.requestTime", "httpMethod" : "$context.httpMethod", "resourcePath" : "$context.resourcePath", "status" : "$context.status", "protocol" : "$context.protocol", "responseLength" : "$context.responseLength" })
  }
  # Enable detailed metrics if needed
  # metrics_enabled = true

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-CommunityAPIStage-${var.environment}"
  })
}

# --- CloudWatch Log Group for API Gateway ---
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/api-gateway/${aws_api_gateway_rest_api.community_api.name}/${var.environment}"
  retention_in_days = 14 # Adjust retention as needed

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-APIGatewayLogs-${var.environment}"
  })
}

# --- Output ---
# Define outputs in outputs.tf