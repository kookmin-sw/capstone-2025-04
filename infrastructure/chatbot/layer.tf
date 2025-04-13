# Layer definition - Assumes the zip file is created by the CI/CD workflow

# 1. Package the Lambda layer dependencies - Terraform will zip the directory populated by the workflow
data "archive_file" "chatbot_deps_layer_zip" {
  type        = "zip"
  source_dir  = "${path.module}/layers/chatbot_deps" # Source dir containing the 'nodejs' subdir populated by workflow
  output_path = "${path.module}/chatbot_deps_layer.zip"

  # Excludes for Node.js (remove Python ones, potentially add others like package-lock.json if needed)
  excludes = [
    ".DS_Store",
    "README*",
    "LICENSE*",
    "NOTICE*"
    # Exclude package-lock.json if not needed in the layer itself
    # "package-lock.json"
  ]
}

# 2. Define the Lambda Layer Version resource
resource "aws_lambda_layer_version" "chatbot_deps_layer" {
  filename            = data.archive_file.chatbot_deps_layer_zip.output_path # Use archive_file output
  layer_name          = "${var.project_name}-chatbot-deps-layer-${var.environment}"
  source_code_hash    = data.archive_file.chatbot_deps_layer_zip.output_base64sha256 # Use archive_file hash

  compatible_runtimes = ["nodejs22.x"] # Updated runtime
  compatible_architectures = ["arm64"]

  description         = "Layer containing common Node.js dependencies for the Chatbot Lambda"

  # No specific license info provided for dependencies
  # license_info        = "MIT"

  # Explicit dependency on the archive file data source
  depends_on = [data.archive_file.chatbot_deps_layer_zip]
} 