# --- Remote State for Cognito ---
# Reads outputs from the Cognito Terraform state file stored in the S3 backend.
# Ensure the Cognito state exists at the specified key.
data "terraform_remote_state" "cognito" {
  backend = "s3"
  config = {
    bucket = "alpaco-tfstate-bucket-kmu"         # Provided via -backend-config or tfvars/secrets
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

  # cloudwatch_role_arn is set in aws_api_gateway_account resource

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-CommunityAPI-${var.environment}"
  })
}

# --- API Gateway Account Settings ---
# Configures the AWS account-level settings for API Gateway, such as the CloudWatch role ARN.
# This is needed once per region per account.
resource "aws_api_gateway_account" "apigw_account" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch_role.arn

  # Ensure this depends on the role being created
  depends_on = [aws_iam_role.api_gateway_cloudwatch_role]
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
    "PATCH /community/{postId}" = { method = aws_api_gateway_method.post_update.http_method, path = aws_api_gateway_resource.post_id.path }
    "DELETE /community/{postId}" = { method = aws_api_gateway_method.post_delete.http_method, path = aws_api_gateway_resource.post_id.path }
    "POST /community/{postId}/like" = { method = aws_api_gateway_method.post_like_update.http_method, path = aws_api_gateway_resource.post_like.path }
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

# 4. PATCH /community/{postId} -> updatePost
resource "aws_api_gateway_method" "post_update" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.post_id.id
  http_method   = "PATCH"
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
  source_arn    = local.lambda_permission_source_arn["PATCH /community/{postId}"]
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

# 6. POST /community/{postId}/like -> likePost
resource "aws_api_gateway_method" "post_like_update" {
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  resource_id   = aws_api_gateway_resource.post_like.id
  http_method   = "POST"
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
  source_arn    = local.lambda_permission_source_arn["POST /community/{postId}/like"]
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
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
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
# Separate Integration Response for OPTIONS /community
resource "aws_api_gateway_integration_response" "options_community_root_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.community_root.id
  http_method = aws_api_gateway_method.options_community_root.http_method
  status_code = aws_api_gateway_method_response.options_community_root_response.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,GET,OPTIONS'" # Adjusted
    "method.response.header.Access-Control-Allow-Origin"  = "'*'" # Use var.frontend_url in production
  }
  response_templates = {
    "application/json" = "" # Empty body for OPTIONS response
  }
  depends_on = [aws_api_gateway_integration.options_community_root_integration]
}

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
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}
# Separate Integration Response for OPTIONS /community/{postId}
resource "aws_api_gateway_integration_response" "options_post_id_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.post_id.id
  http_method = aws_api_gateway_method.options_post_id.http_method
  status_code = aws_api_gateway_method_response.options_post_id_response.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,PATCH,DELETE,OPTIONS'" # Adjusted
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  response_templates = {
    "application/json" = ""
  }
  depends_on = [aws_api_gateway_integration.options_post_id_integration]
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
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}
# Separate Integration Response for OPTIONS /community/{postId}/like
resource "aws_api_gateway_integration_response" "options_post_like_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.post_like.id
  http_method = aws_api_gateway_method.options_post_like.http_method
  status_code = aws_api_gateway_method_response.options_post_like_response.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'" # Adjusted
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  response_templates = {
    "application/json" = ""
  }
  depends_on = [aws_api_gateway_integration.options_post_like_integration]
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
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}
# Separate Integration Response for OPTIONS /community/{postId}/comments
resource "aws_api_gateway_integration_response" "options_post_comments_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.post_comments.id
  http_method = aws_api_gateway_method.options_post_comments.http_method
  status_code = aws_api_gateway_method_response.options_post_comments_response.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'" # Adjusted
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  response_templates = {
    "application/json" = ""
  }
  depends_on = [aws_api_gateway_integration.options_post_comments_integration]
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
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}
# Separate Integration Response for OPTIONS /community/{postId}/comments/{commentId}
resource "aws_api_gateway_integration_response" "options_comment_id_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  resource_id = aws_api_gateway_resource.comment_id.id
  http_method = aws_api_gateway_method.options_comment_id.http_method
  status_code = aws_api_gateway_method_response.options_comment_id_response.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'DELETE,OPTIONS'" # Adjusted
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  response_templates = {
    "application/json" = ""
  }
  depends_on = [aws_api_gateway_integration.options_comment_id_integration]
}

# --- API Gateway Deployment ---
# This resource triggers redeployment when API configuration changes.
resource "aws_api_gateway_deployment" "community_api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id

  # Triggers for redeployment
  # Include resources that, when changed, should trigger a new deployment
  triggers = {
    redeployment = sha1(jsonencode([
      # Resources
      aws_api_gateway_resource.community_root.id,
      aws_api_gateway_resource.post_id.id,
      aws_api_gateway_resource.post_like.id,
      aws_api_gateway_resource.post_comments.id,
      aws_api_gateway_resource.comment_id.id,
      # Methods & Integrations (Including OPTIONS)
      # Note: Referencing the integration might be more robust than the method
      aws_api_gateway_integration.community_post_integration.id,
      aws_api_gateway_integration.community_get_all_integration.id,
      aws_api_gateway_integration.post_get_one_integration.id,
      aws_api_gateway_integration.post_update_integration.id,
      aws_api_gateway_integration.post_delete_integration.id,
      aws_api_gateway_integration.post_like_update_integration.id,
      aws_api_gateway_integration.comments_post_integration.id,
      aws_api_gateway_integration.comments_get_all_integration.id,
      aws_api_gateway_integration.comment_delete_integration.id,
      aws_api_gateway_integration.options_community_root_integration.id,
      aws_api_gateway_integration_response.options_community_root_integration_response.id,
      aws_api_gateway_integration.options_post_id_integration.id,
      aws_api_gateway_integration_response.options_post_id_integration_response.id,
      aws_api_gateway_integration.options_post_like_integration.id,
      aws_api_gateway_integration_response.options_post_like_integration_response.id,
      aws_api_gateway_integration.options_post_comments_integration.id,
      aws_api_gateway_integration_response.options_post_comments_integration_response.id,
      aws_api_gateway_integration.options_comment_id_integration.id,
      aws_api_gateway_integration_response.options_comment_id_integration_response.id,
      # Authorizer
      aws_api_gateway_authorizer.cognito_auth.id
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# --- API Gateway Stage ---
# Connects the deployment to a stage (e.g., 'dev', 'prod')
resource "aws_api_gateway_stage" "community_api_stage" {
  deployment_id = aws_api_gateway_deployment.community_api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.community_api.id
  stage_name    = var.environment

  # Enable access logging
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn
    format          = "$context.identity.sourceIp $context.identity.caller $context.identity.user [$context.requestTime] \"$context.httpMethod $context.resourcePath $context.protocol\" $context.status $context.responseLength $context.requestId"
  }

  # Execution logging and other settings are configured via aws_api_gateway_method_settings
  xray_tracing_enabled = false # Set to true to enable X-Ray tracing

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-CommunityAPI-Stage-${var.environment}"
  })

  depends_on = [
    aws_cloudwatch_log_group.api_gateway_logs,
    aws_api_gateway_account.apigw_account # Ensure account settings are applied before stage
  ]
}

# --- API Gateway Method Settings ---
# Apply settings like logging level and metrics to all methods in the stage
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.community_api.id
  stage_name  = aws_api_gateway_stage.community_api_stage.stage_name
  method_path = "*/*" # Apply to all methods

  settings {
    metrics_enabled = true       # Enable detailed CloudWatch metrics
    logging_level   = "INFO"     # Log full requests/responses (or ERROR)
    data_trace_enabled = true    # Log request/response bodies (use with caution)
    throttling_burst_limit = 5000 # Example throttling limit
    throttling_rate_limit  = 10000 # Example throttling limit
    # Caching settings can also be configured here if needed
    # caching_enabled = false
    # cache_ttl_in_seconds = 300
  }

  depends_on = [aws_api_gateway_stage.community_api_stage]
}

# --- CloudWatch Log Group for API Gateway Access Logs ---
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/api-gateway/${aws_api_gateway_rest_api.community_api.name}/${var.environment}" # Match expected format
  retention_in_days = 7 # Adjust retention as needed

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-APIGatewayLogs-${var.environment}"
  })
}

# --- Output ---
# Define outputs in outputs.tf