# 1. Package ONLY the Lambda function handler code
data "archive_file" "chatbot_lambda_function_zip" {
  type        = "zip"
  source_file = "${path.module}/../../backend/lambdas/chatbot-query/index.mjs" # Direct source file (Node.js)
  output_path = "${path.module}/chatbot_lambda_function.zip"
}

# 2. Define the Lambda function resource
resource "aws_lambda_function" "chatbot_query" {
  filename         = data.archive_file.chatbot_lambda_function_zip.output_path
  source_code_hash = data.archive_file.chatbot_lambda_function_zip.output_base64sha256

  function_name = "${var.project_name}-${var.environment}-chatbot-query"
  role          = aws_iam_role.chatbot_lambda_role.arn # From iam.tf
  handler       = "index.handler"                      # Updated handler (index.mjs -> index.handler)
  runtime       = "nodejs22.x"                         # Updated runtime
  architectures = ["arm64"]
  timeout       = 30

  # Add the dependency layer
  layers = [
    aws_lambda_layer_version.chatbot_deps_layer.arn # From layer.tf
  ]

  environment {
    variables = {
      BEDROCK_MODEL_ID = var.bedrock_model_id
      # AWS_REGION is automatically provided by the Lambda runtime environment
      # AWS_REGION       = var.aws_region 
    }
  }

  tags = var.common_tags

  # Ensure the role and layer exist before creating the function
  depends_on = [
    aws_iam_role.chatbot_lambda_role,
    aws_lambda_layer_version.chatbot_deps_layer,
    data.archive_file.chatbot_lambda_function_zip
  ]
} 