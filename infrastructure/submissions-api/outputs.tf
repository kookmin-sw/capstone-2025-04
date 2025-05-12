output "get_submission_lambda_name" {
  description = "The name of the getSubmission Lambda function"
  value       = aws_lambda_function.get_submission.function_name
}

output "submissions_api_invoke_url" {
  description = "The invoke URL for the Submissions API Gateway"
  value       = aws_api_gateway_stage.submissions_api_stage.invoke_url
}
