# IAM Role for the Problems API Lambda functions
resource "aws_iam_role" "problems_api_lambda_role" {
  name = "${var.project_name}-ProblemsApiLambdaRole-${var.environment}"

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
    Name = "${var.project_name}-ProblemsApiLambdaRole-${var.environment}"
  })
}

# Attach the basic Lambda execution policy (for CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "problems_api_lambda_basic_execution" {
  role       = aws_iam_role.problems_api_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy granting read access to the Problems DynamoDB table
resource "aws_iam_policy" "problems_api_dynamodb_read_policy" {
  name        = "${var.project_name}-ProblemsApiDynamoDBReadPolicy-${var.environment}"
  description = "Policy for Problems API Lambdas to read from the Problems DynamoDB table"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowDynamoDBReadActions"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem", # For getProblemById
          "dynamodb:Scan",    # For getAllProblems (can be inefficient, consider GSI later if needed)
          "dynamodb:Query"    # If a GSI is added later for listing
        ]
        # Use the ARN obtained from the remote state data source
        Resource = [
          local.problems_table_arn,
          "${local.problems_table_arn}/index/*" # Allow access to any future indexes as well
        ]
      },
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ProblemsApiDynamoDBReadPolicy-${var.environment}"
  })
}

# Attach the custom DynamoDB read policy to the Lambda execution role
resource "aws_iam_role_policy_attachment" "problems_api_dynamodb_read_access" {
  role       = aws_iam_role.problems_api_lambda_role.name
  policy_arn = aws_iam_policy.problems_api_dynamodb_read_policy.arn
}

# --- API Gateway Logging Role (Re-use or Define) ---
# Option 1: Re-use the role from the 'api' module if it exists and is suitable.
#           Requires fetching its ARN via remote state.
# Option 2: Define a new one here if this module should be fully independent
#           or if the 'api' module doesn't exist/isn't deployed yet.
# For simplicity, let's define it here, assuming potential independence.
# If you have the role in the 'api' module, replace this with a data source.

resource "aws_iam_role" "problems_api_gateway_cloudwatch_role" {
  name = "${var.project_name}-ProblemsAPIGatewayCloudWatchRole-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "apigateway.amazonaws.com" }
    }]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ProblemsAPIGatewayCloudWatchRole-${var.environment}"
  })
}

resource "aws_iam_role_policy_attachment" "problems_api_gateway_cloudwatch_policy_attachment" {
  role       = aws_iam_role.problems_api_gateway_cloudwatch_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}