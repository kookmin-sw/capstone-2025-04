# AWS Secrets Manager에서 Google Client Secret 값을 가져옵니다.
# 이 리소스를 사용하려면 해당 Secret이 AWS에 미리 생성되어 있어야 합니다.
data "aws_secretsmanager_secret_version" "google_client_secret" {
  secret_id = var.google_client_secret_arn
}
