data "archive_file" "code_executor_zip" {
  type        = "zip"
  source_dir  = var.executor_lambda_code_path # code-executor 디렉터리
  output_path = "${path.module}/code_executor.zip"
}

resource "aws_lambda_function" "code_executor" {
  function_name    = "${var.project_name}-code-executor-${var.environment}"
  filename         = data.archive_file.code_executor_zip.output_path
  source_code_hash = data.archive_file.code_executor_zip.output_base64sha256
  handler          = var.executor_lambda_handler
  runtime          = var.executor_lambda_runtime
  role             = aws_iam_role.code_executor_lambda_role.arn
  memory_size      = var.executor_lambda_memory_size
  timeout          = var.executor_lambda_timeout
  architectures    = ["arm64"] # Python은 arm64에서 성능/비용 이점

  # Layers가 필요하다면 여기에 추가 (현재 Python Lambda는 외부 라이브러리 없음)

  tags = var.common_tags
}
