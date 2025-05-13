data "archive_file" "get_submission_zip" {
  type        = "zip"
  source_file = "${var.lambda_code_base_path}/getSubmission.mjs" # variables.tf 에서 정의
  output_path = "${path.module}/getSubmission.zip"
}

resource "aws_lambda_function" "get_submission" {
  function_name    = "${var.project_name}-getSubmission-${var.environment}"
  filename         = data.archive_file.get_submission_zip.output_path
  source_code_hash = data.archive_file.get_submission_zip.output_base64sha256
  handler          = var.get_submission_handler
  runtime          = var.lambda_runtime
  role             = aws_iam_role.get_submission_lambda_role.arn
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout
  architectures    = ["arm64"] # Node.js는 arm64에서 성능/비용 이점

  environment {
    variables = {
      SUBMISSIONS_TABLE_NAME              = local.submissions_table_name_from_remote # data.tf에서 가져옴
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
    }
  }
  tags = var.common_tags
}
