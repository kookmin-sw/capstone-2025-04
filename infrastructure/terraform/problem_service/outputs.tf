# API Gateway 엔드포인트 URL 출력
output "api_endpoint" {
  description = "The endpoint URL for the Problem Grader API"
  value       = aws_apigatewayv2_api.grader_api.api_endpoint
}

# 생성된 S3 버킷 이름 출력
output "s3_bucket_name" {
  description = "Name of the S3 bucket for grader outputs"
  value       = aws_s3_bucket.grader_output_bucket.bucket
}

# 생성된 DynamoDB 테이블 이름 출력
output "submissions_table_name" {
  description = "The name of the DynamoDB table for submissions"
  value       = aws_dynamodb_table.submissions_table.name
}

output "generator_streaming_websocket_api_endpoint" {
  description = "The endpoint URL for the WebSocket API for Problem Generator Streaming"
  # Correct attribute is 'id', not 'api_id'
  value       = "wss://${aws_apigatewayv2_api.generator_streaming_api.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_apigatewayv2_stage.generator_streaming_stage.name}"
}

output "problems_table_name" {
  description = "Name of the DynamoDB table for problems"
  value       = aws_dynamodb_table.problems_table.name
}

# 생성된 ECR 리포지토리 URI 출력
output "generator_ecr_repo_url" {
  description = "URL of the ECR repository for the generator image"
  value       = aws_ecr_repository.generator_repo.repository_url
}

output "runner_python_ecr_repo_url" {
  description = "URL of the ECR repository for the Python runner image"
  value       = aws_ecr_repository.runner_python_repo.repository_url
}

# 생성된 Lambda 함수 이름 출력
output "lambda_function_name" {
  description = "Name of the Problem Grader Lambda function"
  value       = aws_lambda_function.problem_grader_lambda.function_name
}

# 생성된 ECS 클러스터 이름 출력
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.grader_cluster.name
}

# Step Functions 상태 머신 ARN
output "step_functions_state_machine_arn" {
  description = "ARN of the Step Functions state machine for grading"
  value       = aws_sfn_state_machine.problem_grader_state_machine.arn
} 