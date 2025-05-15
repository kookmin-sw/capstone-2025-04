data "terraform_remote_state" "problem_generator_v3" {
  backend = "s3"
  config = {
    bucket = var.problem_generator_tfstate_bucket
    key    = var.problem_generator_tfstate_key
    region = var.aws_region
  }
}

locals {
  # problem_generator_v3 모듈의 outputs에서 테이블 이름과 ARN을 가져옴
  problems_table_name_from_remote = data.terraform_remote_state.problem_generator_v3.outputs.problems_table_name
  problems_table_arn_from_remote  = data.terraform_remote_state.problem_generator_v3.outputs.problems_table_arn
}
