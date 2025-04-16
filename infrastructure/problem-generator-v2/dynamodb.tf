resource "aws_dynamodb_table" "problems_table" {
  name         = "${var.project_name}-Problems-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "problemId"

  attribute {
    name = "problemId"
    type = "S"
  }

  tags = var.common_tags
} 