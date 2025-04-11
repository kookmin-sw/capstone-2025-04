resource "aws_dynamodb_table" "community_table" {
  name         = "${var.project_name}-Community-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"

  # Primary Key: PK (Partition Key), SK (Sort Key)
  hash_key  = "PK"
  range_key = "SK"

  # Define all attributes used in keys (Primary and GSI)
  attribute {
    name = "PK" # Partition Key (postId for posts, postId for comments)
    type = "S"
  }
  attribute {
    name = "SK" # Sort Key (POST for post meta, COMMENT#commentId for comments)
    type = "S"
  }
  attribute {
    name = "GSI1PK" # GSI Partition Key (e.g., "POST" for posts)
    type = "S"
  }
  attribute {
    name = "GSI1SK" # GSI Sort Key (e.g., createdAt for sorting posts)
    type = "S"
  }

  # Global Secondary Index for fetching all posts (postOnlyIndex)
  # Allows querying for all items where GSI1PK = "POST", sorted by GSI1SK (createdAt)
  global_secondary_index {
    name            = "postOnlyIndex"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "INCLUDE" # Include specific attributes needed for the list view

    # Attributes needed by getAllPosts.js (adjust if needed)
    non_key_attributes = [
      "PK",
      "title",
      "author",
      "likesCount",
      "commentCount",
      "problemId" # Changed back from job_id
      # createdAt is the range key (GSI1SK), so it's automatically included
      # PK is automatically included as it's the main table's hash key -> This comment is incorrect for INCLUDE projection
    ]
  }

  # Optional: Enable DynamoDB Streams if needed later
  # stream_enabled   = true
  # stream_view_type = "NEW_AND_OLD_IMAGES"

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-CommunityTable-${var.environment}"
  })
}