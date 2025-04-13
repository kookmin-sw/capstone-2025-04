resource "aws_iam_role" "chatbot_lambda_role" {
  name = "${var.project_name}-${var.environment}-chatbot-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })

  tags = var.common_tags
}

# Attach the basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.chatbot_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Define and attach the Bedrock invocation policy
resource "aws_iam_policy" "bedrock_invoke_policy" {
  name        = "${var.project_name}-${var.environment}-chatbot-bedrock-invoke-policy"
  description = "Allows Lambda function to invoke Bedrock models with streaming"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "bedrock:InvokeModelWithResponseStream"
        ]
        Effect   = "Allow"
        Resource = "*" # Allows invoking any Bedrock model. Restrict if needed.
      },
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "bedrock_invoke" {
  role       = aws_iam_role.chatbot_lambda_role.name
  policy_arn = aws_iam_policy.bedrock_invoke_policy.arn
} 