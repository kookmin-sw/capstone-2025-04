resource "aws_dynamodb_table" "problems_table" {
  name         = "${var.project_name}-Problems-v3-${var.environment}" # Name is fine
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "problemId"

  attribute {
    name = "problemId"
    type = "S"
  }

  attribute {
    name = "creatorId" # Used by CreatorIdIndex and CreatorIdCreatedAtGSI
    type = "S"
  }

  attribute {
    name = "generationStatus" # Used by CompletedProblemsByCreatedAtGSI
    type = "S"
  }

  attribute {
    name = "createdAt" # Used as sort key in new GSIs (ensure it's a string)
    type = "S"
  }

  # Existing GSI (you might want to rename or remove this if CreatorIdCreatedAtGSI replaces its functionality)
  # For now, I'll keep it, but consider if it's still needed.
  # If CreatorIdCreatedAtGSI is intended to replace this, you can remove this block.
  global_secondary_index {
    name            = "CreatorIdIndex" # This is the old one.
    hash_key        = "creatorId"
    projection_type = "ALL"
    # For PAY_PER_REQUEST, read_capacity/write_capacity are not set for the GSI itself.
    # If your provider version is older and complains, you might need to set them to 0.
    # Modern providers handle this correctly.
  }

  # New GSI: For all completed problems, sorted by creation time
  global_secondary_index {
    name            = "CompletedProblemsByCreatedAtGSI" # Matches Lambda code
    hash_key        = "generationStatus"
    range_key       = "createdAt"
    projection_type = "ALL" # Or "INCLUDE" with specific attributes
  }

  # New GSI: For problems by a specific creator, sorted by creation time
  # This might make the old "CreatorIdIndex" redundant if all queries for creatorId will also sort by createdAt.
  global_secondary_index {
    name            = "CreatorIdCreatedAtGSI" # Matches Lambda code
    hash_key        = "creatorId"
    range_key       = "createdAt"
    projection_type = "ALL" # Or "INCLUDE" with specific attributes
  }

  tags = var.common_tags
}
