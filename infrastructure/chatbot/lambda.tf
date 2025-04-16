data "terraform_remote_state" "cognito" {
  backend = "s3"
  config = {
    bucket = "alpaco-tfstate-bucket-kmu"
    key    = "cognito/terraform.tfstate" # Key for the Cognito state file
    region = var.aws_region             # Ensure region matches
  }
} 

# 1. Package ONLY the Lambda function handler code
data "archive_file" "chatbot_lambda_function_zip" {
  type        = "zip"
  source_file = var.lambda_code_path # Use variable for path
  output_path = "${path.module}/chatbot_lambda_function.zip"
}

# 2. Define the Lambda function resource
resource "aws_lambda_function" "chatbot_query" {
  filename         = data.archive_file.chatbot_lambda_function_zip.output_path
  source_code_hash = data.archive_file.chatbot_lambda_function_zip.output_base64sha256

  function_name = "${var.project_name}-${var.environment}-chatbot-query"
  role          = aws_iam_role.chatbot_lambda_role.arn # From iam.tf
  handler       = var.lambda_handler                   # Use variable
  runtime       = var.lambda_runtime                   # Use variable
  architectures = ["arm64"]                          # Assuming arm64, make variable if needed
  timeout       = 30                                   # Increase if needed for AI calls

  # Attach the dependency layer
  layers = [
    aws_lambda_layer_version.chatbot_deps_layer.arn # From layer.tf
  ]

  environment {
    variables = {
      GOOGLE_AI_MODEL_ID        = var.google_ai_model_id # Use Bedrock model ID from variables
      GOOGLE_AI_API_KEY      = var.google_ai_api_key # Use Bedrock model ID from variables
      # Fetch Cognito details from remote state
      COGNITO_USER_POOL_ID    = data.terraform_remote_state.cognito.outputs.cognito_user_pool_id
      COGNITO_REGION            = var.aws_region # Assuming Cognito is in the same region
      COGNITO_APP_CLIENT_ID     = data.terraform_remote_state.cognito.outputs.cognito_user_pool_client_id
      # Construct JWKS URL (common pattern)
      COGNITO_JWKS_URL          = "https://cognito-idp.${var.aws_region}.amazonaws.com/${data.terraform_remote_state.cognito.outputs.cognito_user_pool_id}/.well-known/jwks.json"
      COGNITO_ISSUER_URL        = data.terraform_remote_state.cognito.outputs.cognito_user_pool_provider_url # Issuer URL from Cognito outputs
    }
  }

  tags = var.common_tags

  # Ensure the role, layer, and function code zip exist before creating the function
  depends_on = [
    aws_iam_role.chatbot_lambda_role,
    aws_lambda_layer_version.chatbot_deps_layer,
    data.archive_file.chatbot_lambda_function_zip
  ]
}

# 3. Define the Lambda Function URL
resource "aws_lambda_function_url" "chatbot_url" {
  function_name      = aws_lambda_function.chatbot_query.function_name
  authorization_type = "AWS_IAM" # Secured by IAM, invoked via CloudFront OAC
  invoke_mode        = "RESPONSE_STREAM" # Enable streaming responses

  cors {
    allow_credentials = false # OAC uses SigV4, not cookies
    allow_origins     = ["*"] # Allow requests from any origin via CloudFront (can restrict later if needed)
    allow_methods     = ["*"] # Use wildcard to avoid length validation issue on OPTIONS
    allow_headers     = ["content-type", "authorization", "x-amz-content-sha256", "x-amz-date", "x-amz-security-token", "x-custom-auth-token"] # Headers needed for signed request + content + auth
    expose_headers    = ["*"] # Allow frontend to read any response headers if needed
    max_age           = 86400 # Cache preflight response for 1 day
  }
} 