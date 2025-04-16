# Define Lambda functions for the Problems API

locals {
  # Define common settings for Lambda functions
  lambda_runtime = "nodejs20.x" # Consistent runtime
  lambda_timeout = 15 # seconds (Read operations are usually fast)
  lambda_memory  = 128 # MB (Can be adjusted)

  # Base path to the Lambda source code directory relative to this module
  # Assuming the code will be placed here later
  lambda_source_base_path = "${path.module}/../../backend/lambdas/problems-api"

  # Common environment variables for all problems API lambdas
  common_lambda_environment_variables = {
    PROBLEMS_TABLE_NAME                 = local.problems_table_name # From dynamodb.tf locals
    AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
  }
}

# --- Lambda Function: Get All Problems ---

data "archive_file" "get_all_problems_zip" {
  type        = "zip"
  # Assuming the handler file will be named getAllProblems.mjs
  source_file = "${local.lambda_source_base_path}/getAllProblems.mjs"
  output_path = "${path.module}/lambda_zips/getAllProblems.zip"
}

resource "aws_lambda_function" "get_all_problems" {
  function_name    = "${var.project_name}-getAllProblems-${var.environment}"
  filename         = data.archive_file.get_all_problems_zip.output_path
  source_code_hash = data.archive_file.get_all_problems_zip.output_base64sha256
  handler          = "getAllProblems.handler" # Assuming handler name
  runtime          = local.lambda_runtime
  role             = aws_iam_role.problems_api_lambda_role.arn # From iam.tf
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory
  architectures    = ["arm64"]

  environment {
    variables = local.common_lambda_environment_variables
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-getAllProblems-${var.environment}"
  })

  # Explicit dependency on the role
  depends_on = [aws_iam_role.problems_api_lambda_role]
}

# --- Lambda Function: Get Problem By ID ---

data "archive_file" "get_problem_by_id_zip" {
  type        = "zip"
  # Assuming the handler file will be named getProblemById.mjs
  source_file = "${local.lambda_source_base_path}/getProblemById.mjs"
  output_path = "${path.module}/lambda_zips/getProblemById.zip"
}

resource "aws_lambda_function" "get_problem_by_id" {
  function_name    = "${var.project_name}-getProblemById-${var.environment}"
  filename         = data.archive_file.get_problem_by_id_zip.output_path
  source_code_hash = data.archive_file.get_problem_by_id_zip.output_base64sha256
  handler          = "getProblemById.handler" # Assuming handler name
  runtime          = local.lambda_runtime
  role             = aws_iam_role.problems_api_lambda_role.arn # From iam.tf
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory
  architectures    = ["arm64"]

  environment {
    variables = local.common_lambda_environment_variables
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-getProblemById-${var.environment}"
  })

  # Explicit dependency on the role
  depends_on = [aws_iam_role.problems_api_lambda_role]
}