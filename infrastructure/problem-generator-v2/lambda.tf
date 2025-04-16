# 1. Archive the Lambda handler code into a zip file
data "archive_file" "problem_generator_v2_lambda_zip" {
  type = "zip"
  # Source the single Node.js handler file
  source_file = var.lambda_code_path # Should point to index.mjs via variables.tf default
  # Define the output path for the zip file (Terraform manages this temporary file)
  output_path = "${path.module}/problem_generator_v2_lambda.zip"
}

# 2. Define the Lambda function using the generated zip file
resource "aws_lambda_function" "problem_generator_v2" {
  function_name = "${var.project_name}-problem-generator-v2-${var.environment}"
  role          = aws_iam_role.problem_generator_v2_lambda_role.arn
  handler       = var.lambda_handler # Default should be "index.handler"
  runtime       = var.lambda_runtime # Default should be "nodejs20.x"
  architectures = ["arm64"]

  # Use the path and hash from the archive_file data source
  filename         = data.archive_file.problem_generator_v2_lambda_zip.output_path
  source_code_hash = data.archive_file.problem_generator_v2_lambda_zip.output_base64sha256

  timeout     = 900 # 15 minutes
  memory_size = 1024 # 1GB

  # Keep the layer reference
  layers = [aws_lambda_layer_version.problem_generator_v2_deps.arn]

  # Keep environment variables (add GEMINI_MODEL_NAME if needed)
  environment {
    variables = {
      # BEDROCK_MODEL_ID    = var.bedrock_model_id # Keep if supporting Bedrock later
      PROBLEMS_TABLE_NAME = aws_dynamodb_table.problems_table.name
      GOOGLE_AI_API_KEY   = var.google_ai_api_key
      GENERATOR_VERBOSE   = tostring(var.generator_verbose)
      GEMINI_MODEL_NAME   = var.gemini_model_name # Add this variable
    }
  }

  # Keep tags
  tags = var.common_tags

  # Ensure the zip file is created before the function is deployed
  depends_on = [
    aws_iam_role.problem_generator_v2_lambda_role,
    aws_lambda_layer_version.problem_generator_v2_deps,
    data.archive_file.problem_generator_v2_lambda_zip # Added dependency
  ]
}

# 3. Define the Lambda Function URL (no changes needed here for packaging)
resource "aws_lambda_function_url" "problem_generator_v2_url" {
  function_name      = aws_lambda_function.problem_generator_v2.function_name
  authorization_type = "AWS_IAM"
  invoke_mode        = "RESPONSE_STREAM"

  cors {
    allow_credentials = false
    allow_origins     = ["*"] # Adjust for production if needed
    allow_methods     = ["*"] # Use wildcard
    allow_headers     = ["content-type", "authorization", "x-amz-date", "x-amz-security-token", "x-amz-content-sha256"] # Keep required headers
    expose_headers    = ["*"]
    max_age           = 86400
  }
}
