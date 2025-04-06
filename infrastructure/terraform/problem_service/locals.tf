# Locals: Terraform 코드 내에서 재사용하거나 복잡한 표현식을 단순화하기 위한 변수 정의

locals {
  # Fargate Task 실행에 사용될 서브넷 및 보안 그룹 ID 리스트
  fargate_subnet_ids         = [aws_subnet.public_subnet_a.id, aws_subnet.public_subnet_c.id]
  fargate_security_group_ids = [aws_security_group.fargate_sg.id]

  # Lambda 함수 실행에 사용될 서브넷 및 보안 그룹 ID 리스트
  lambda_subnet_ids          = [aws_subnet.private_subnet_a.id, aws_subnet.private_subnet_c.id]
  lambda_security_group_ids  = [aws_security_group.lambda_sg.id]

  # 언어별 Runner Task Definition ARN 및 컨테이너 이름 맵
  runner_info_map = {
    python = {
      task_def_arn   = aws_ecs_task_definition.runner_python_task_def.arn
      container_name = var.runner_python_container_name
    }
    # TODO: 다른 언어 지원 추가 시 여기에 항목 추가
    # cpp = {
    #   task_def_arn = aws_ecs_task_definition.runner_cpp_task_def.arn
    #   container_name = var.runner_cpp_container_name
    # }
  }

  # Lambda 코드를 포함하는 디렉토리 경로
  lambda_code_dir = "../../../backend/lambdas/problem-generator-streaming/"
  # Lambda 레이어 빌드 관련 경로
  layer_build_dir = "${path.module}/lambda_layer_build"
  layer_zip_path  = "${path.module}/generator_streaming_lambda_layer.zip"
} 