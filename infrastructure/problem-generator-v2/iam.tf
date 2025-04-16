resource "aws_iam_role" "problem_generator_v2_lambda_role" {
  name = "${var.project_name}-problem-generator-v2-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_policy" "problem_generator_v2_lambda_policy" {
  name        = "${var.project_name}-problem-generator-v2-lambda-policy-${var.environment}"
  description = "Policy for Problem Generator V2 Lambda to access Bedrock and basic Lambda permissions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "problem_generator_v2_lambda_basic" {
  role       = aws_iam_role.problem_generator_v2_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "problem_generator_v2_lambda_custom" {
  role       = aws_iam_role.problem_generator_v2_lambda_role.name
  policy_arn = aws_iam_policy.problem_generator_v2_lambda_policy.arn
}

resource "aws_iam_policy" "problems_dynamodb_policy" {
  name        = "${var.project_name}-ProblemsDynamoDBPolicy-${var.environment}"
  description = "Policy for Problem Generator V2 Lambda to access the Problems DynamoDB table"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowDynamoDBActions"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:TransactWriteItems"
        ]
        Resource = [
          aws_dynamodb_table.problems_table.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "problems_dynamodb_access" {
  role       = aws_iam_role.problem_generator_v2_lambda_role.name
  policy_arn = aws_iam_policy.problems_dynamodb_policy.arn
}
