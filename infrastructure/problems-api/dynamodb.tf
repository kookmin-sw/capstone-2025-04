# Data source to read outputs from the problem-generator-v2 Terraform state
data "terraform_remote_state" "problem_generator_v2" {
  backend = "s3"
  config = {
    bucket = "alpaco-tfstate-bucket-kmu" # Same bucket as backend.tf
    key    = "problem-generator-v2/terraform.tfstate" # Key for the generator's state file
    region = var.aws_region
  }
}

# Local variables to easily access the table name and ARN from the remote state
locals {
  problems_table_name = data.terraform_remote_state.problem_generator_v2.outputs.problems_table_name
  problems_table_arn  = data.terraform_remote_state.problem_generator_v2.outputs.problems_table_arn
}

# Note: We are not defining a new aws_dynamodb_table resource here,
# as we are referencing the table created by the problem-generator-v2 module.
# The local variables above will be used in iam.tf and lambdas.tf.