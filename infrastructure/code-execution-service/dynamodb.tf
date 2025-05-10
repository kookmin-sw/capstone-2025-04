locals {
  # submissions_table_name을 var에서 오버라이드 받거나 기본값 사용
  submissions_table_actual_name = var.submissions_table_name_override != "" ? var.submissions_table_name_override : "${var.project_name}-Submissions-${var.environment}"
}

resource "aws_dynamodb_table" "submissions_table" {
  name         = local.submissions_table_actual_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "submissionId"

  attribute {
    name = "submissionId"
    type = "S"
  }
  attribute {
    name = "problemId"
    type = "S"
  }
  attribute {
    name = "userId"
    type = "S"
  }
  attribute {
    name = "author"
    type = "S"
  }
  attribute {
    name = "submissionTime"
    type = "N"
  }
  attribute {
    name = "is_submission"
    type = "S"
  }

  global_secondary_index {
    name            = "ProblemIdSubmissionTimeIndex"
    hash_key        = "problemId"
    range_key       = "submissionTime"
    projection_type = "ALL" # 변경
  }

  global_secondary_index {
    name            = "UserIdSubmissionTimeIndex"
    hash_key        = "userId"
    range_key       = "submissionTime"
    projection_type = "ALL" # 변경
  }

  global_secondary_index {
    name            = "AllSubmissionsByTimeIndex"
    hash_key        = "is_submission"
    range_key       = "submissionTime"
    projection_type = "ALL" # 이미 이렇게 수정하심
  }

  global_secondary_index {
    name            = "AuthorSubmissionTimeIndex"
    hash_key        = "author"
    range_key       = "submissionTime"
    projection_type = "ALL" # 변경
  }

  tags = var.common_tags
}
