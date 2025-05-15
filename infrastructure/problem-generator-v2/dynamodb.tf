resource "aws_dynamodb_table" "problems_table" {
  name         = "${var.project_name}-Problems-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "problemId"

  attribute {
    name = "problemId"
    type = "S"
  }

  attribute {
    name = "creatorId"
    type = "S"
  }

  global_secondary_index {
    name               = "CreatorIdIndex"
    hash_key           = "creatorId"
    projection_type    = "ALL"
    read_capacity      = 0
    write_capacity     = 0
  }

  tags = var.common_tags
} 