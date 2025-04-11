# IAM Role for Lambda functions execution
resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.project_name}-CommunityLambdaExecRole-${var.environment}"

  # Trust policy allowing Lambda service to assume this role
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

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-CommunityLambdaExecRole-${var.environment}"
  })
}

# Attach the basic Lambda execution policy (for CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy granting specific DynamoDB permissions
resource "aws_iam_policy" "dynamodb_policy" {
  name        = "${var.project_name}-CommunityDynamoDBPolicy-${var.environment}"
  description = "Policy for Community Lambdas to access the Community DynamoDB table"

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
          # Add BatchGetItem, BatchWriteItem if needed later
        ]
        Resource = [
          # ARN of the main table
          aws_dynamodb_table.community_table.arn,
          # ARN for any indexes on the table
          "${aws_dynamodb_table.community_table.arn}/index/*"
        ]
      },
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-CommunityDynamoDBPolicy-${var.environment}"
  })
}

# Attach the custom DynamoDB policy to the Lambda execution role
resource "aws_iam_role_policy_attachment" "dynamodb_access" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.dynamodb_policy.arn
}

# --- API Gateway Logging Role ---

# Role for API Gateway to push logs to CloudWatch
resource "aws_iam_role" "api_gateway_cloudwatch_role" {
  name = "${var.project_name}-APIGatewayCloudWatchRole-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "apigateway.amazonaws.com" }
    }]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-APIGatewayCloudWatchRole-${var.environment}"
  })
}

# Policy attachment for the logging role
resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch_policy_attachment" {
  role       = aws_iam_role.api_gateway_cloudwatch_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}