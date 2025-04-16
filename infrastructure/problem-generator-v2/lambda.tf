resource "aws_lambda_function" "problem_generator_v2" {
  function_name = "${var.project_name}-problem-generator-v2-${var.environment}"
  role          = aws_iam_role.problem_generator_v2_lambda_role.arn
  handler       = var.lambda_handler
  runtime       = var.lambda_runtime
  filename      = var.lambda_code_path
  source_code_hash = filebase64sha256(var.lambda_code_path)

  layers = [aws_lambda_layer_version.problem_generator_v2_deps.arn]

  environment {
    variables = {
      BEDROCK_MODEL_ID      = var.bedrock_model_id
      PROBLEMS_TABLE_NAME   = aws_dynamodb_table.problems_table.name
      GOOGLE_AI_API_KEY     = var.google_ai_api_key
      GENERATOR_VERBOSE     = tostring(var.generator_verbose)
    }
  }

  tags = var.common_tags
}

resource "aws_lambda_function_url" "problem_generator_v2_url" {
  function_name      = aws_lambda_function.problem_generator_v2.function_name
  authorization_type = "AWS_IAM"
  invoke_mode        = "RESPONSE_STREAM"
}
