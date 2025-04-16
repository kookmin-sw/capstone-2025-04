# Layer definition - Assumes the zip file is created by the CI/CD workflow

# Note: The source_dir below assumes a structure like './layers/chatbot_deps/python/' or './layers/chatbot_deps/nodejs/' exists
# and has been populated with dependencies (e.g., via pip install -t or npm install) before running terraform apply.

# 1. Package the Lambda layer dependencies from the prepared directory
data "archive_file" "chatbot_deps_layer_zip" {
  type        = "zip"
  source_dir  = var.lambda_layer_path # Use variable for path
  output_path = "${path.module}/chatbot_deps_layer.zip"

  # Common excludes
  excludes = [
    ".DS_Store",
    "README*",
    "LICENSE*",
    "NOTICE*",
    "__pycache__",
    "*.pyc"
  ]
}

# 2. Define the Lambda Layer Version resource
resource "aws_lambda_layer_version" "chatbot_deps_layer" {
  filename            = data.archive_file.chatbot_deps_layer_zip.output_path
  layer_name          = "${var.project_name}-chatbot-deps-layer-${var.environment}"
  source_code_hash    = data.archive_file.chatbot_deps_layer_zip.output_base64sha256

  # Use variable for runtime compatibility
  compatible_runtimes = [var.lambda_runtime] # Should be nodejs20.x or similar
  # Assuming arm64 based on old setup, could be a variable if needed
  compatible_architectures = ["arm64"]

  description         = "Layer containing dependencies for the Chatbot Lambda (${var.lambda_runtime})"

  # No specific license info provided for dependencies
  # license_info        = "MIT"

  # Ensure the archive file is created before this resource
  depends_on = [data.archive_file.chatbot_deps_layer_zip]
} 