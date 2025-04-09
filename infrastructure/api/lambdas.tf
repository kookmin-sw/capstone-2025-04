# Define Lambda functions for the Community API

locals {
  # Define common settings for Lambda functions
  lambda_runtime = "nodejs20.x"
  lambda_timeout = 30 # seconds
  lambda_memory  = 256 # MB

  # Base path to the Lambda source code directory relative to this module
  lambda_source_base_path = "${path.module}/../../backend/lambdas/community"

  # Common environment variables for all community lambdas
  common_lambda_environment_variables = {
    COMMUNITY_TABLE_NAME = aws_dynamodb_table.community_table.name
    AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1" # Recommended for performance
    # Add other common variables if needed (e.g., LOG_LEVEL)
  }
}

# --- Post Functions ---

# 1. createPost
data "archive_file" "create_post_zip" {
  type        = "zip"
  source_file = "${local.lambda_source_base_path}/createPost.js"
  output_path = "${path.module}/lambda_zips/createPost.zip"
}

resource "aws_lambda_function" "create_post" {
  function_name    = "${var.project_name}-createPost-${var.environment}"
  filename         = data.archive_file.create_post_zip.output_path
  source_code_hash = data.archive_file.create_post_zip.output_base64sha256
  handler          = "createPost.handler"
  runtime          = local.lambda_runtime
  role             = aws_iam_role.lambda_exec_role.arn
  layers           = [aws_lambda_layer_version.common_deps_layer.arn]
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory

  environment {
    variables = local.common_lambda_environment_variables
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-createPost-${var.environment}"
  })
}

# 2. deletePost
data "archive_file" "delete_post_zip" {
  type        = "zip"
  source_file = "${local.lambda_source_base_path}/deletePost.js"
  output_path = "${path.module}/lambda_zips/deletePost.zip"
}

resource "aws_lambda_function" "delete_post" {
  function_name    = "${var.project_name}-deletePost-${var.environment}"
  filename         = data.archive_file.delete_post_zip.output_path
  source_code_hash = data.archive_file.delete_post_zip.output_base64sha256
  handler          = "deletePost.handler"
  runtime          = local.lambda_runtime
  role             = aws_iam_role.lambda_exec_role.arn
  layers           = [aws_lambda_layer_version.common_deps_layer.arn]
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory

  environment {
    variables = local.common_lambda_environment_variables
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-deletePost-${var.environment}"
  })
}

# 3. getAllPosts
data "archive_file" "get_all_posts_zip" {
  type        = "zip"
  source_file = "${local.lambda_source_base_path}/getAllPosts.js"
  output_path = "${path.module}/lambda_zips/getAllPosts.zip"
}

resource "aws_lambda_function" "get_all_posts" {
  function_name    = "${var.project_name}-getAllPosts-${var.environment}"
  filename         = data.archive_file.get_all_posts_zip.output_path
  source_code_hash = data.archive_file.get_all_posts_zip.output_base64sha256
  handler          = "getAllPosts.handler"
  runtime          = local.lambda_runtime
  role             = aws_iam_role.lambda_exec_role.arn
  layers           = [aws_lambda_layer_version.common_deps_layer.arn]
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory

  environment {
    variables = local.common_lambda_environment_variables
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-getAllPosts-${var.environment}"
  })
}

# 4. getPost
data "archive_file" "get_post_zip" {
  type        = "zip"
  source_file = "${local.lambda_source_base_path}/getPost.js"
  output_path = "${path.module}/lambda_zips/getPost.zip"
}

resource "aws_lambda_function" "get_post" {
  function_name    = "${var.project_name}-getPost-${var.environment}"
  filename         = data.archive_file.get_post_zip.output_path
  source_code_hash = data.archive_file.get_post_zip.output_base64sha256
  handler          = "getPost.handler"
  runtime          = local.lambda_runtime
  role             = aws_iam_role.lambda_exec_role.arn
  layers           = [aws_lambda_layer_version.common_deps_layer.arn]
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory

  environment {
    variables = local.common_lambda_environment_variables
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-getPost-${var.environment}"
  })
}

# 5. likePost
data "archive_file" "like_post_zip" {
  type        = "zip"
  source_file = "${local.lambda_source_base_path}/likePost.js"
  output_path = "${path.module}/lambda_zips/likePost.zip"
}

resource "aws_lambda_function" "like_post" {
  function_name    = "${var.project_name}-likePost-${var.environment}"
  filename         = data.archive_file.like_post_zip.output_path
  source_code_hash = data.archive_file.like_post_zip.output_base64sha256
  handler          = "likePost.handler"
  runtime          = local.lambda_runtime
  role             = aws_iam_role.lambda_exec_role.arn
  layers           = [aws_lambda_layer_version.common_deps_layer.arn]
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory

  environment {
    variables = local.common_lambda_environment_variables
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-likePost-${var.environment}"
  })
}

# 6. updatePost
data "archive_file" "update_post_zip" {
  type        = "zip"
  source_file = "${local.lambda_source_base_path}/updatePost.js"
  output_path = "${path.module}/lambda_zips/updatePost.zip"
}

resource "aws_lambda_function" "update_post" {
  function_name    = "${var.project_name}-updatePost-${var.environment}"
  filename         = data.archive_file.update_post_zip.output_path
  source_code_hash = data.archive_file.update_post_zip.output_base64sha256
  handler          = "updatePost.handler"
  runtime          = local.lambda_runtime
  role             = aws_iam_role.lambda_exec_role.arn
  layers           = [aws_lambda_layer_version.common_deps_layer.arn]
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory

  environment {
    variables = local.common_lambda_environment_variables
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-updatePost-${var.environment}"
  })
}


# --- Comment Functions ---

# 7. createComment
data "archive_file" "create_comment_zip" {
  type        = "zip"
  source_file = "${local.lambda_source_base_path}/comment/createComment.js"
  output_path = "${path.module}/lambda_zips/createComment.zip"
}

resource "aws_lambda_function" "create_comment" {
  function_name    = "${var.project_name}-createComment-${var.environment}"
  filename         = data.archive_file.create_comment_zip.output_path
  source_code_hash = data.archive_file.create_comment_zip.output_base64sha256
  handler          = "createComment.handler"
  runtime          = local.lambda_runtime
  role             = aws_iam_role.lambda_exec_role.arn
  layers           = [aws_lambda_layer_version.common_deps_layer.arn]
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory

  environment {
    variables = local.common_lambda_environment_variables
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-createComment-${var.environment}"
  })
}

# 8. deleteComment
data "archive_file" "delete_comment_zip" {
  type        = "zip"
  source_file = "${local.lambda_source_base_path}/comment/deleteComment.js"
  output_path = "${path.module}/lambda_zips/deleteComment.zip"
}

resource "aws_lambda_function" "delete_comment" {
  function_name    = "${var.project_name}-deleteComment-${var.environment}"
  filename         = data.archive_file.delete_comment_zip.output_path
  source_code_hash = data.archive_file.delete_comment_zip.output_base64sha256
  handler          = "deleteComment.handler"
  runtime          = local.lambda_runtime
  role             = aws_iam_role.lambda_exec_role.arn
  layers           = [aws_lambda_layer_version.common_deps_layer.arn]
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory

  environment {
    variables = local.common_lambda_environment_variables
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-deleteComment-${var.environment}"
  })
}

# 9. getComments
data "archive_file" "get_comments_zip" {
  type        = "zip"
  source_file = "${local.lambda_source_base_path}/comment/getComments.js"
  output_path = "${path.module}/lambda_zips/getComments.zip"
}

resource "aws_lambda_function" "get_comments" {
  function_name    = "${var.project_name}-getComments-${var.environment}"
  filename         = data.archive_file.get_comments_zip.output_path
  source_code_hash = data.archive_file.get_comments_zip.output_base64sha256
  handler          = "getComments.handler"
  runtime          = local.lambda_runtime
  role             = aws_iam_role.lambda_exec_role.arn
  layers           = [aws_lambda_layer_version.common_deps_layer.arn]
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory

  environment {
    variables = local.common_lambda_environment_variables
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-getComments-${var.environment}"
  })
}