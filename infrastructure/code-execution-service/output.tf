output "code_executor_lambda_name" {
  description = "The name of the Code Executor Lambda function"
  value       = aws_lambda_function.code_executor.function_name
}

output "code_executor_lambda_arn" {
  description = "The ARN of the Code Executor Lambda function"
  value       = aws_lambda_function.code_executor.arn
}

output "code_grader_lambda_name" {
  description = "The name of the Code Grader Lambda function"
  value       = aws_lambda_function.code_grader.function_name
}

output "code_grader_api_invoke_url" {
  description = "The invoke URL for the Code Grader API Gateway"
  value       = aws_api_gateway_stage.grader_api_stage.invoke_url
}

output "submissions_table_name_output" {
  description = "The name of the DynamoDB table for storing submissions"
  value       = aws_dynamodb_table.submissions_table.name
}

output "submissions_table_arn_output" {
  description = "The ARN of the DynamoDB table for storing submissions"
  value       = aws_dynamodb_table.submissions_table.arn
}
