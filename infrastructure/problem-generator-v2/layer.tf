resource "null_resource" "build_lambda_layer" {
  triggers = {
    package_lock_hash = filemd5("${path.module}/../../backend/lambdas/problem-generator-v2/package-lock.json") # Trigger on package-lock changes
    build_script_hash = filemd5("${path.module}/layers/build-layer.sh")
    dockerfile_hash = filemd5("${path.module}/layers/Dockerfile.build")
  }
  provisioner "local-exec" {
    command = "${path.module}/layers/build-layer.sh"
  }
}

resource "aws_lambda_layer_version" "problem_generator_v2_deps" {
  filename              = "${path.module}/layers/problem_generator_deps.zip" # Build script output
  layer_name            = "${var.project_name}-problem-generator-v2-deps-${var.environment}"
  compatible_runtimes   = [var.lambda_runtime] # e.g., "nodejs20.x"
  compatible_architectures = ["arm64"]
  source_code_hash      = filebase64sha256("${path.module}/../../backend/lambdas/problem-generator-v2/package-lock.json") # Hash package-lock
  description           = "Dependencies for Problem Generator V2 Lambda (${var.lambda_runtime} ARM64)"
  depends_on            = [null_resource.build_lambda_layer]
}
