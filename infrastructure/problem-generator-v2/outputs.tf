output "lambda_function_url" {
  description = "The invoke URL for the Problem Generator V2 Lambda (Function URL)"
  value       = aws_lambda_function_url.problem_generator_v2_url.function_url
}

output "cloudfront_distribution_domain" {
  description = "The domain name of the CloudFront distribution for Problem Generator V2"
  value       = aws_cloudfront_distribution.problem_generator_v2.domain_name
}
