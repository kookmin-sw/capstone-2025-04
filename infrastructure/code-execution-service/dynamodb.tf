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
  } # For GSI
  attribute {
    name = "userId"
    type = "S"
  } # For GSI - userId가 저장된다고 가정
  attribute {
    name = "author" # Add author attribute
    type = "S"
  } # For GSI - author (cognito:username)이 저장된다고 가정
  attribute {
    name = "submissionTime"
    type = "N"
  } # For GSI
  attribute {
    name = "is_submission"
    type = "S"
  } # For GSI

  # `is_submission` 필드는 **"모든 제출물을 시간순으로 조회"** 라는 기능을 효율적으로 구현하기 위해 GSI에서 사용되는 **고정된 파티션 키 값**입니다. 
  # 이 더미 키를 통해 DynamoDB GSI의 쿼리 메커니즘을 활용하여 전체 테이블 스캔 없이 원하는 정렬 순서로 데이터를 가져올 수 있게 됩니다.

  # 만약 "특정 사용자의 최신 제출"이나 "특정 문제의 최신 제출"만 필요하다면, `UserIdSubmissionTimeIndex`나 `ProblemIdSubmissionTimeIndex` GSI가 더 적합하며,
  # 이 경우 `is_submission` 필드는 해당 GSI들에는 직접적으로 사용되지 않습니다. (물론, 기본 테이블 항목에는 존재할 수 있습니다.)


  global_secondary_index {
    name               = "ProblemIdSubmissionTimeIndex" # GSI_PROBLEM_ID_TIME
    hash_key           = "problemId"
    range_key          = "submissionTime"
    projection_type    = "INCLUDE" # 또는 ALL. INCLUDE 시 아래 projection_attributes 명시
    non_key_attributes = ["submissionId", "userId", "status", "executionTime", "language"] # 예시
  }

  global_secondary_index {
    name               = "UserIdSubmissionTimeIndex" # GSI_USER_ID_TIME
    hash_key           = "userId"
    range_key          = "submissionTime"
    projection_type    = "INCLUDE"
    non_key_attributes = ["submissionId", "problemId", "status", "executionTime", "language"] # 예시
  }

  global_secondary_index {
    name               = "AllSubmissionsByTimeIndex" # GSI_ALL_SUBMISSIONS_TIME
    hash_key           = "is_submission" # 예: "Y"
    range_key          = "submissionTime"
    projection_type    = "INCLUDE"
    non_key_attributes = ["submissionId", "problemId", "userId", "author", "status", "executionTime", "language"] # author 추가
  }

  global_secondary_index {
    name               = "AuthorSubmissionTimeIndex" # GSI_AUTHOR_TIME
    hash_key           = "author"
    range_key          = "submissionTime"
    projection_type    = "INCLUDE"
    non_key_attributes = ["submissionId", "problemId", "userId", "status", "executionTime", "language"] # 예시
  }

  tags = var.common_tags
}
