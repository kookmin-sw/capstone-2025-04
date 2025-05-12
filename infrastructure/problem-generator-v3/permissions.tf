resource "aws_lambda_permission" "problem_generator_v3_cloudfront" {
  statement_id           = "AllowCloudFrontInvokeV3" # Updated to v3
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.problem_generator_v3.function_name
  principal              = "cloudfront.amazonaws.com"
  function_url_auth_type = "AWS_IAM"
  source_arn             = aws_cloudfront_distribution.problem_generator_v3.arn
}
