# Allow CloudFront distribution to invoke the Lambda Function URL
resource "aws_lambda_permission" "allow_cloudfront_invoke" {
  statement_id  = "AllowCloudFrontInvoke"
  action        = "lambda:InvokeFunctionUrl"
  function_name = aws_lambda_function.chatbot_query.function_name
  principal     = "cloudfront.amazonaws.com"

  # Condition the permission to the specific CloudFront distribution ARN
  source_arn = aws_cloudfront_distribution.chatbot_distribution.arn

  # Also specify the Function URL qualifier if needed, but typically ARN is sufficient
  # qualifier = aws_lambda_function.chatbot_query.name
} 