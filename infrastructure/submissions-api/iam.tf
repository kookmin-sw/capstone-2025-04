# IAM Role for getSubmission Lambda
resource "aws_iam_role" "get_submission_lambda_role" {
  name = "${var.project_name}-getSubmission-lambda-role-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "get_submission_lambda_basic_execution" {
  role       = aws_iam_role.get_submission_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Policy for getSubmission Lambda to query Submissions DynamoDB table (including GSIs)
resource "aws_iam_policy" "get_submission_dynamodb_policy" {
  name        = "${var.project_name}-getSubmission-dynamodb-${var.environment}"
  description = "Policy for getSubmission Lambda to query the Submissions table"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowDynamoDBQueryOnSubmissions"
        Effect = "Allow"
        Action = [
          "dynamodb:Query" # Query는 GSI 사용에 필수
        ]
        Resource = [
          local.submissions_table_arn_from_remote,             # 기본 테이블에 대한 권한
          "${local.submissions_table_arn_from_remote}/index/*" # 모든 GSI에 대한 권한
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "get_submission_dynamodb_access" {
  role       = aws_iam_role.get_submission_lambda_role.name
  policy_arn = aws_iam_policy.get_submission_dynamodb_policy.arn
}

# IAM Role for API Gateway to write to CloudWatch Logs
resource "aws_iam_role" "api_gateway_cloudwatch_role_submissions" {
  name = "${var.project_name}-APIGatewayCloudWatchRole-Submissions-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "apigateway.amazonaws.com" }
    }]
  })
  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch_policy_submissions" {
  role       = aws_iam_role.api_gateway_cloudwatch_role_submissions.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}
