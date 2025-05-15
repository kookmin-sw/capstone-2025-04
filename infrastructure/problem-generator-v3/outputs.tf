output "lambda_function_url" {
  description = "The invoke URL for the Problem Generator V3 Lambda (Function URL)" # Updated to v3
  value       = aws_lambda_function_url.problem_generator_v3_url.function_url
}

output "cloudfront_distribution_domain" {
  description = "The domain name of the CloudFront distribution for Problem Generator V3" # Updated to v3
  value       = aws_cloudfront_distribution.problem_generator_v3.domain_name
}

output "problems_table_name" {
  description = "The name of the DynamoDB table for storing generated problems"
  value       = aws_dynamodb_table.problems_table.name
}

output "problems_table_arn" {
  description = "The ARN of the DynamoDB table for storing generated problems"
  value       = aws_dynamodb_table.problems_table.arn
}
