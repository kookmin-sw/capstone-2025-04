# IAM Role for Code Executor Lambda
resource "aws_iam_role" "code_executor_lambda_role" {
  name = "${var.project_name}-code-executor-lambda-role-${var.environment}"
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

resource "aws_iam_role_policy_attachment" "code_executor_lambda_basic_execution" {
  role       = aws_iam_role.code_executor_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# IAM Role for Code Grader Lambda
resource "aws_iam_role" "code_grader_lambda_role" {
  name = "${var.project_name}-code-grader-lambda-role-${var.environment}"
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

resource "aws_iam_role_policy_attachment" "code_grader_lambda_basic_execution" {
  role       = aws_iam_role.code_grader_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Policy for Code Grader to access DynamoDB and invoke Code Executor Lambda
resource "aws_iam_policy" "code_grader_permissions_policy" {
  name        = "${var.project_name}-code-grader-permissions-${var.environment}"
  description = "Permissions for Code Grader Lambda"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBProblemsReadAccess"
        Effect = "Allow"
        Action = ["dynamodb:GetItem"]
        Resource = [
          local.problems_table_arn_from_remote # From data.tf
        ]
      },
      {
        Sid    = "DynamoDBSubmissionsWriteAccess"
        Effect = "Allow"
        Action = ["dynamodb:PutItem"] # 필요에 따라 GetItem, UpdateItem 등 추가
        Resource = [
          aws_dynamodb_table.submissions_table.arn # 여기서 생성할 테이블
        ]
      },
      {
        Sid    = "LambdaInvokeCodeExecutor"
        Effect = "Allow"
        Action = ["lambda:InvokeFunction"]
        Resource = [
          aws_lambda_function.code_executor.arn # 여기서 생성할 code_executor Lambda
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "code_grader_custom_permissions" {
  role       = aws_iam_role.code_grader_lambda_role.name
  policy_arn = aws_iam_policy.code_grader_permissions_policy.arn
}

# IAM Role for API Gateway to write to CloudWatch Logs
resource "aws_iam_role" "api_gateway_cloudwatch_role_grader" {
  name = "${var.project_name}-APIGatewayCloudWatchRole-Grader-${var.environment}"
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

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch_policy_grader" {
  role       = aws_iam_role.api_gateway_cloudwatch_role_grader.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}
