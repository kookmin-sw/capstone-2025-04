resource "aws_dynamodb_table" "problems_table" {
  name         = "${var.project_name}-Problems-v3-${var.environment}" # Name doesn't need v3 explicitly as it's generic
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
    name            = "CreatorIdIndex"
    hash_key        = "creatorId"
    projection_type = "ALL"
    # PAY_PER_REQUEST mode doesn't use read_capacity/write_capacity at the table level for GSI
    # However, some older AWS provider versions might require them to be set to 0.
    # For modern providers, they can be omitted if billing_mode is PAY_PER_REQUEST.
    # Setting to 0 for wider compatibility.
    read_capacity  = 0
    write_capacity = 0
  }

  tags = var.common_tags
}
