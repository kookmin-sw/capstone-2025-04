data "terraform_remote_state" "code_execution_service" {
  backend = "s3"
  config = {
    bucket = var.code_execution_service_tfstate_bucket
    key    = var.code_execution_service_tfstate_key
    region = var.aws_region
  }
}

locals {
  # code_execution_service 모듈의 outputs에서 Submissions 테이블 이름과 ARN을 가져옴
  submissions_table_name_from_remote = data.terraform_remote_state.code_execution_service.outputs.submissions_table_name_output
  submissions_table_arn_from_remote  = data.terraform_remote_state.code_execution_service.outputs.submissions_table_arn_output
}
