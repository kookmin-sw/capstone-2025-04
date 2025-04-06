# Fargate Task 결과 저장용 S3 버킷
resource "aws_s3_bucket" "grader_output_bucket" {
  bucket = "${lower(var.project_name)}-grader-output-${var.environment}-${data.aws_caller_identity.current.account_id}" # 버킷 이름 고유성 확보

  # 버킷 공개 접근 차단 설정 (권장)
  # TODO: 실제 운영 시 Block Public Access 설정 추가 필요
  # aws_s3_bucket_public_access_block 리소스 사용

  force_destroy = false # 실수로 인한 데이터 삭제 방지 (prod 환경에서는 false 유지)

  tags = merge(var.tags, {
    Name = "${var.project_name}-GraderOutputBucket-${var.environment}"
  })
}

# 현재 AWS 계정 ID 가져오기 (버킷 이름 고유성 위해)
data "aws_caller_identity" "current" {}

# AlpacoSubmissions DynamoDB 테이블 (채점 결과 저장)
resource "aws_dynamodb_table" "submissions_table" {
  name           = "${var.project_name}-Submissions-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST" # 또는 PROVISIONED
  hash_key       = "submission_id"   # Partition Key

  attribute {
    name = "submission_id"
    type = "S" # String 타입 가정
  }

  # 필요시 Sort Key 추가 (예: user_id, submission_time 등)
  # attribute {
  #   name = "user_id"
  #   type = "S"
  # }
  # sort_key = "user_id"

  # 필요시 Global Secondary Index (GSI) 추가 (예: problem_id로 조회)
  # global_secondary_index {
  #   name            = "ProblemIdIndex"
  #   hash_key        = "problem_id"
  #   projection_type = "ALL" # 또는 INCLUDE, KEYS_ONLY
  # }
  # attribute {
  #   name = "problem_id" # GSI의 hash key도 attribute로 정의 필요
  #   type = "N" # Number 타입 가정
  # }

  tags = merge(var.tags, {
    Name = "${var.project_name}-SubmissionsTable-${var.environment}"
  })
}

# AlpacoProblems DynamoDB 테이블 (문제 정보 저장 - 이미 존재하면 data source로 가져오거나, 여기서 생성)
# 여기서는 새로 생성하는 예시 (실제 프로젝트 구조에 맞게 조정 필요)
resource "aws_dynamodb_table" "problems_table" {
  name           = "${var.project_name}-Problems-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id" # Partition Key

  attribute {
    name = "id"
    type = "N" # Number 타입 가정
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-ProblemsTable-${var.environment}"
  })

  # 주의: 이 테이블은 다른 모듈(예: problem-generator)에서 생성/관리될 수 있습니다.
  # 그 경우, 이 리소스 블록 대신 data source "aws_dynamodb_table"을 사용하여
  # 테이블 이름이나 ARN을 가져와야 합니다.
  # 예:
  # data "aws_dynamodb_table" "problems_table_data" {
  #   name = "Existing-Problems-Table-Name"
  # }
  # 이후 Lambda 환경 변수 등에 data.aws_dynamodb_table.problems_table_data.name 사용
} 