output "problems_api_invoke_url" {
  description = "The invoke URL for the deployed Problems API Gateway stage"
  # Format: https://{rest_api_id}.execute-api.{region}.amazonaws.com/{stage_name}
  value = aws_api_gateway_stage.problems_api_stage.invoke_url
}

output "problems_api_rest_api_id" {
  description = "The ID of the Problems REST API"
  value       = aws_api_gateway_rest_api.problems_api.id
}

output "problems_api_stage_name" {
  description = "The name of the deployed Problems API Gateway stage"
  value       = aws_api_gateway_stage.problems_api_stage.stage_name
}

output "problems_api_lambda_role_arn" {
  description = "ARN of the IAM role used by the Problems API Lambda functions"
  value       = aws_iam_role.problems_api_lambda_role.arn
}