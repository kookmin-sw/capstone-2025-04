# Create a zip archive of the layer's source code directory
# Note: Terraform needs to be run from the root directory or adjust paths accordingly.
data "archive_file" "common_deps_layer_zip" {
  type = "zip"
  # Source directory containing the 'nodejs' folder with dependencies
  source_dir  = "${path.module}/layers/common-deps"
  output_path = "${path.module}/lambda_layers/common-deps-layer.zip"

  # Exclude unnecessary files from the zip archive
  excludes = [
    ".DS_Store",
    "package-lock.json" # Usually not needed in the layer itself
  ]
}

# Define the Lambda Layer Version resource
resource "aws_lambda_layer_version" "common_deps_layer" {
  filename            = data.archive_file.common_deps_layer_zip.output_path
  layer_name          = "${var.project_name}-common-deps-${var.environment}"
  source_code_hash    = data.archive_file.common_deps_layer_zip.output_base64sha256

  # Specify compatible runtimes for the layer
  compatible_runtimes = ["nodejs20.x", "nodejs22.x"] # Match your Lambda function runtimes

  description = "Common Node.js dependencies (uuid) for Community API"

  # Optional: Define license info if needed
  # license_info = "MIT"

  # Ensure the zip file is created before the layer resource
  depends_on = [
    data.archive_file.common_deps_layer_zip
  ]
}