resource "null_resource" "build_lambda_layer" {
  triggers = {
    requirements_hash = filemd5("${path.module}/../../backend/lambdas/problem-generator-v2/requirements.txt")
    build_script_hash = filemd5("${path.module}/layers/build-layer.sh")
    dockerfile_hash = filemd5("${path.module}/layers/Dockerfile.build")
  }
  provisioner "local-exec" {
    command = "${path.module}/layers/build-layer.sh"
  }
}

resource "aws_lambda_layer_version" "problem_generator_v2_deps" {
  filename              = "${path.module}/layers/problem_generator_deps.zip"
  layer_name            = "${var.project_name}-problem-generator-v2-deps-${var.environment}"
  compatible_runtimes   = [var.lambda_runtime] # e.g., "python3.12"
  compatible_architectures = ["arm64"]
  source_code_hash      = filebase64sha256("${path.module}/../../backend/lambdas/problem-generator-v2/requirements.txt")
  description           = "Dependencies for Problem Generator V2 Lambda (Python 3.12 ARM64)"
  depends_on            = [null_resource.build_lambda_layer]
}
