resource "aws_iam_role" "problem_generator_v3_lambda_role" {
  name = "${var.project_name}-problem-generator-v3-lambda-role-${var.environment}" # Updated to v3

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

resource "aws_iam_policy" "problem_generator_v3_lambda_policy" {
  name        = "${var.project_name}-problem-generator-v3-lambda-policy-${var.environment}" # Updated to v3
  description = "Policy for Problem Generator V3 Lambda, Bedrock, and Code Executor"        # Updated to v3

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
          "bedrock:InvokeModel", # Kept for potential future use with Google models via Bedrock
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*" # Bedrock resources are broad, specific model ARNs can be used for more fine-grained control
      },
      {
        Sid    = "AllowInvokeCodeExecutorLambda"
        Effect = "Allow"
        Action = "lambda:InvokeFunction"
        Resource = [
          var.code_executor_lambda_arn # Use variable for Code Executor ARN
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "problem_generator_v3_lambda_basic" {
  role       = aws_iam_role.problem_generator_v3_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "problem_generator_v3_lambda_custom" {
  role       = aws_iam_role.problem_generator_v3_lambda_role.name
  policy_arn = aws_iam_policy.problem_generator_v3_lambda_policy.arn
}

resource "aws_iam_policy" "problems_dynamodb_policy" {
  name        = "${var.project_name}-ProblemsDynamoDBPolicy-${var.environment}-v3" 
  description = "Policy for Problem Generator V3 Lambda to access the Problems DynamoDB table"

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
          "dynamodb:TransactWriteItems" # Included if needed, otherwise can be removed
        ]
        Resource = [
          aws_dynamodb_table.problems_table.arn,
          "${aws_dynamodb_table.problems_table.arn}/index/*" # Allow access to GSI
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "problems_dynamodb_access" {
  role       = aws_iam_role.problem_generator_v3_lambda_role.name
  policy_arn = aws_iam_policy.problems_dynamodb_policy.arn
}
