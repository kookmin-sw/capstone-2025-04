data "archive_file" "code_grader_zip" {
  type        = "zip"
  source_dir  = var.grader_lambda_code_path # code-grader 디렉터리
  output_path = "${path.module}/code_grader.zip"
}

resource "aws_lambda_function" "code_grader" {
  function_name    = "${var.project_name}-code-grader-${var.environment}"
  filename         = data.archive_file.code_grader_zip.output_path
  source_code_hash = data.archive_file.code_grader_zip.output_base64sha256
  handler          = var.grader_lambda_handler
  runtime          = var.grader_lambda_runtime
  role             = aws_iam_role.code_grader_lambda_role.arn
  memory_size      = var.grader_lambda_memory_size
  timeout          = var.grader_lambda_timeout
  architectures    = ["arm64"]

  environment {
    variables = {
      PROBLEMS_TABLE_NAME    = local.problems_table_name_from_remote           # data.tf 에서 가져옴
      SUBMISSIONS_TABLE_NAME = aws_dynamodb_table.submissions_table.name       # 여기서 생성
      RUN_CODE_LAMBDA_NAME   = aws_lambda_function.code_executor.function_name # 의존성 주입!
      # PYTHONIOENCODING    = "utf-8" # Lambda Python 환경에서는 기본값으로 불필요할 수 있음
    }
  }
  tags = var.common_tags
  depends_on = [
    aws_lambda_function.code_executor,
    aws_dynamodb_table.submissions_table
  ]
}
