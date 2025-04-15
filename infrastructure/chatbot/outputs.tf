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


output "cloudfront_distribution_domain_name" {
  description = "The domain name of the CloudFront distribution for the chatbot"
  value       = aws_cloudfront_distribution.chatbot_distribution.domain_name
}

output "chatbot_lambda_function_url" {
  description = "The direct URL of the Lambda function (should NOT be accessed directly)"
  value       = aws_lambda_function_url.chatbot_url.function_url
  sensitive   = true # Mark as sensitive as it shouldn't be used directly
} 