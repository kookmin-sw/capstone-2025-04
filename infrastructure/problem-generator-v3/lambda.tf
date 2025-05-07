# 1. Archive the Lambda handler code into a zip file
data "archive_file" "problem_generator_v3_lambda_zip" {
  type = "zip"
  # Source the entire source directory for v3
  source_dir = var.lambda_code_path # This variable will point to the v3 src path
  # Define the output path for the zip file (Terraform manages this temporary file)
  output_path = "${path.module}/problem_generator_v3_lambda.zip" # Updated to v3
}

# 2. Define the Lambda function using the generated zip file
resource "aws_lambda_function" "problem_generator_v3" {
  function_name = "${var.project_name}-problem-generator-v3-${var.environment}" # Updated to v3
  role          = aws_iam_role.problem_generator_v3_lambda_role.arn
  handler       = var.lambda_handler # Variable will be "src/handler.handler"
  runtime       = var.lambda_runtime
  architectures = ["arm64"]

  # Use the path and hash from the archive_file data source
  filename         = data.archive_file.problem_generator_v3_lambda_zip.output_path
  source_code_hash = data.archive_file.problem_generator_v3_lambda_zip.output_base64sha256

  timeout     = 900  # 15 minutes
  memory_size = 1024 # 1GB

  layers = [aws_lambda_layer_version.problem_generator_v3_deps.arn]

  environment {
    variables = {
      PROBLEMS_TABLE_NAME      = aws_dynamodb_table.problems_table.name
      GOOGLE_AI_API_KEY        = var.google_ai_api_key
      GENERATOR_VERBOSE        = tostring(var.generator_verbose)
      GEMINI_MODEL_NAME        = var.gemini_model_name
      CODE_EXECUTOR_LAMBDA_ARN = var.code_executor_lambda_arn # Added Code Executor ARN
      # MOCK_DYNAMODB is typically for local testing, not set in deployed Lambda.
      # DEFAULT_LANGUAGE and DEFAULT_TARGET_LANGUAGE are hardcoded in constants.mjs,
      # but could be made env vars if needed for more flexibility.
    }
  }

  tags = var.common_tags

  depends_on = [
    aws_iam_role.problem_generator_v3_lambda_role,
    aws_lambda_layer_version.problem_generator_v3_deps,
    data.archive_file.problem_generator_v3_lambda_zip
  ]
}

# 3. Define the Lambda Function URL
resource "aws_lambda_function_url" "problem_generator_v3_url" {
  function_name      = aws_lambda_function.problem_generator_v3.function_name
  authorization_type = "AWS_IAM"
  invoke_mode        = "RESPONSE_STREAM"

  cors {
    allow_credentials = false
    allow_origins     = ["*"] # Adjust for production if needed
    allow_methods     = ["*"]
    allow_headers     = ["content-type", "authorization", "x-amz-date", "x-amz-security-token", "x-amz-content-sha256"]
    expose_headers    = ["*"]
    max_age           = 86400
  }
}
