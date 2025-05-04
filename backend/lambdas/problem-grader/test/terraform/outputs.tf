output "lambda_function_name" {
  description = "The name of the created Lambda function"
  value       = aws_lambda_function.problem_grader_lambda.function_name
}

output "lambda_function_arn" {
  description = "The ARN of the created Lambda function"
  value       = aws_lambda_function.problem_grader_lambda.arn
}

output "lambda_execution_role_arn" {
  description = "The ARN of the Lambda execution IAM role"
  value       = aws_iam_role.lambda_exec_role.arn
}

output "problems_dynamodb_table_name" {
  description = "The name of the Problems DynamoDB table"
  value       = aws_dynamodb_table.problems_table.name
}

output "submissions_dynamodb_table_name" {
  description = "The name of the Submissions DynamoDB table"
  value       = aws_dynamodb_table.submissions_table.name
}

output "runner_results_s3_bucket_name" {
  description = "The name of the S3 bucket for runner results"
  value       = aws_s3_bucket.runner_results_bucket.id
}

output "ecs_execution_role_arn" {
  description = "The ARN of the ECS Task Execution IAM role"
  value       = aws_iam_role.ecs_exec_role.arn
}

output "ecs_task_role_arn" {
  description = "The ARN of the ECS Task IAM role (for runner code)"
  value       = aws_iam_role.ecs_task_role.arn
} 