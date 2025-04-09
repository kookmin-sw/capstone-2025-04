output "api_gateway_invoke_url" {
  description = "The invoke URL for the deployed API Gateway stage"
  # Format: https://{rest_api_id}.execute-api.{region}.amazonaws.com/{stage_name}
  value = aws_api_gateway_stage.community_api_stage.invoke_url
}

output "api_gateway_rest_api_id" {
  description = "The ID of the Community REST API"
  value       = aws_api_gateway_rest_api.community_api.id
}

output "api_gateway_stage_name" {
  description = "The name of the deployed API Gateway stage"
  value       = aws_api_gateway_stage.community_api_stage.stage_name
}

output "lambda_exec_role_arn" {
  description = "ARN of the IAM role used by the Community Lambda functions"
  value       = aws_iam_role.lambda_exec_role.arn
}

output "community_dynamodb_table_name" {
  description = "Name of the DynamoDB table for the Community service"
  value       = aws_dynamodb_table.community_table.name
}

output "common_deps_layer_arn" {
  description = "ARN of the common dependencies Lambda Layer"
  value       = aws_lambda_layer_version.common_deps_layer.arn
}

output "common_deps_layer_version" {
  description = "Version number of the common dependencies Lambda Layer"
  value       = aws_lambda_layer_version.common_deps_layer.version
}