resource "null_resource" "build_lambda_layer" {
  triggers = {
    # Trigger on package-lock changes for v3
    package_lock_hash = filemd5("${path.module}/../../backend/lambdas/problem-generator-v3/package-lock.json")
    build_script_hash = filemd5("${path.module}/layers/build-layer.sh")
    dockerfile_hash   = filemd5("${path.module}/layers/Dockerfile.build")
  }
  provisioner "local-exec" {
    command = "${path.module}/layers/build-layer.sh"
  }
}

resource "aws_lambda_layer_version" "problem_generator_v3_deps" {
  filename                 = "${path.module}/layers/problem_generator_deps.zip"                 # Build script output
  layer_name               = "${var.project_name}-problem-generator-v3-deps-${var.environment}" # Updated to v3
  compatible_runtimes      = [var.lambda_runtime]
  compatible_architectures = ["arm64"]
  # Hash package-lock for v3
  source_code_hash = filebase64sha256("${path.module}/../../backend/lambdas/problem-generator-v3/package-lock.json")
  description      = "Dependencies for Problem Generator V3 Lambda (${var.lambda_runtime} ARM64)" # Updated to v3
  depends_on       = [null_resource.build_lambda_layer]
}
