resource "aws_lambda_permission" "problem_generator_v2_cloudfront" {
  statement_id  = "AllowCloudFrontInvoke"
  action        = "lambda:InvokeFunctionUrl"
  function_name = aws_lambda_function.problem_generator_v2.function_name
  principal     = "cloudfront.amazonaws.com"
  function_url_auth_type = "AWS_IAM"
  source_arn    = aws_cloudfront_distribution.problem_generator_v2.arn
}
