# Output the ARN of the created Lambda function
output "chatbot_lambda_arn" {
  description = "ARN of the Chatbot Lambda function"
  value       = aws_lambda_function.chatbot_query.arn
}

# Output the Name of the created Lambda function
output "chatbot_lambda_function_name" {
  description = "Name of the Chatbot Lambda function"
  value       = aws_lambda_function.chatbot_query.function_name
}

# Output the ARN of the Lambda execution role
output "chatbot_lambda_role_arn" {
  description = "ARN of the IAM role for the Chatbot Lambda function"
  value       = aws_iam_role.chatbot_lambda_role.arn
}

# Output the Invoke URL for the HTTP API Gateway endpoint
output "chatbot_api_invoke_url" {
  description = "Invoke URL for the Chatbot HTTP API Gateway endpoint"
  value       = aws_apigatewayv2_api.chatbot_api.api_endpoint # Use api_endpoint for HTTP API
} 