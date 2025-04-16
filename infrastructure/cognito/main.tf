resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-user-pool-${var.environment}"

  # Google 로그인을 사용하므로 복잡한 비밀번호 정책은 불필요하나, 최소 요구사항 충족
  password_policy {
    minimum_length    = 8
    require_lowercase = false
    require_numbers   = false
    require_symbols   = false
    require_uppercase = false
  }

  # 이메일을 사용자 이름으로 사용하고 자동 확인 처리
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # MFA 비활성화 (필요시 "ON" 또는 "OPTIONAL"로 변경)
  mfa_configuration = "OFF"

  # ===> Lambda Trigger Configuration <===
  lambda_config {
    # Invoke the Lambda function after user confirmation
    post_confirmation = aws_lambda_function.post_confirmation_trigger.arn
  }

  tags = var.common_tags
}

# 2. Google Identity Provider 설정
resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret # 변수 사용
    authorize_scopes = "profile email openid"   # 표준 Google 스코프
  }

  # Google 속성을 Cognito 표준 속성에 매핑
  attribute_mapping = {
    email       = "email"
    # family_name = "family_name" # 학교 구글 계정인 경우 family_name이 없을 수 있음
    given_name  = "given_name"
    picture     = "picture"
    username    = "sub" # Google의 고유 ID(sub)를 Cognito username으로 사용
  }
}

# 3. Cognito User Pool Domain 설정 (Cognito 호스팅 UI 또는 직접 연동 시 필요)
resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id
}

# 4. Cognito User Pool Client 생성 (애플리케이션 연동용)
resource "aws_cognito_user_pool_client" "app_client" {
  name         = "${var.project_name}-app-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  # 웹 애플리케이션 클라이언트는 보통 시크릿 생성 안 함 (Implicit Grant 등 사용 시)
  # Authorization Code Grant + PKCE 사용 시에도 public client는 시크릿 불필요
  generate_secret = false

  # Google 로그인만 지원하도록 설정
  supported_identity_providers = ["Google"]
  # 중요: 만약 Google 로그인 후 Cognito에서 발급한 JWT 토큰(특히 Refresh Token)을 사용하려는 경우,
  # OAuth 흐름을 활성화하고 "COGNITO"도 provider에 포함시켜야 할 수 있습니다.
  # 하지만 명시적으로 Google만 사용한다면 ["Google"] 만으로 시작해 보세요.

  # OAuth 2.0 설정 (웹 앱 표준: Authorization Code Grant)
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]                       # PKCE 사용 권장
  allowed_oauth_scopes                 = ["openid", "email", "profile"] # 요청할 사용자 정보 범위

  # Google 로그인 후 리디렉션될 앱 URL
  callback_urls = [
    "${var.app_base_url}/auth/callback",
    "${var.localhost_base_url}/auth/callback",
  ]

  # 로그아웃 후 리디렉션될 앱 URL
  logout_urls = [
    "${var.app_base_url}/auth/login",       # 로그아웃 후 리디렉션될 경로로 수정하세요
    "${var.localhost_base_url}/auth/login", # 로컬용
  ]

  # 토큰 유효 기간 설정 (예시, 필요에 따라 조정)
  access_token_validity  = 1  # 시간 (hours)
  id_token_validity      = 1  # 시간 (hours)
  refresh_token_validity = 30 # 일 (days)
  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  prevent_user_existence_errors = "ENABLED" # 보안 강화

  # User Pool에 Google IdP를 추가했으므로, User Pool Client가 이를 사용하도록 명시적 의존성 추가
  depends_on = [aws_cognito_identity_provider.google]
}


# ===> NEW: Cognito User Groups <===
resource "aws_cognito_user_group" "general_users" {
  name         = "${var.project_name}-GeneralUsers-${var.environment}" # Group name
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "General users, typically added automatically on signup/confirmation"
  precedence   = 10 # Lower precedence means less priority if role mappings were used
}

resource "aws_cognito_user_group" "admins" {
  name         = "${var.project_name}-Admins-${var.environment}" # Group name
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Administrators with elevated privileges (manual assignment)"
  precedence   = 1 # Higher precedence
}


# ===> NEW: Lambda Function for Post Confirmation Trigger <===

# IAM Role for the Lambda Function
resource "aws_iam_role" "cognito_group_adder_role" {
  name = "${var.project_name}-cognito-group-adder-role-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
  tags = var.common_tags
}

# IAM Policy for the Lambda Function
resource "aws_iam_policy" "cognito_group_adder_policy" {
  name        = "${var.project_name}-cognito-group-adder-policy-${var.environment}"
  description = "Allows Lambda to add users to Cognito groups and write logs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "cognito-idp:AdminAddUserToGroup"
        Effect = "Allow"
        # Restrict to the specific user pool for better security
        Resource = aws_cognito_user_pool.main.arn # Correct: Target the User Pool ARN
      },
      {
        # Basic Lambda logging permissions
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Attach Policy to Role
resource "aws_iam_role_policy_attachment" "cognito_group_adder_attach" {
  role       = aws_iam_role.cognito_group_adder_role.name
  policy_arn = aws_iam_policy.cognito_group_adder_policy.arn
}

# Package Lambda function code from a local file
data "archive_file" "lambda_zip" {
  type = "zip"
  # Assumes lambda_function.py is in the same directory as the terraform files
  source_file = "${path.module}/lambda_function.py"
  output_path = "${path.module}/post_confirmation_lambda.zip"
}

# Lambda Function Resource
resource "aws_lambda_function" "post_confirmation_trigger" {
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256 # Ensures updates when code changes

  function_name = "${var.project_name}-post-confirmation-trigger-${var.environment}"
  role          = aws_iam_role.cognito_group_adder_role.arn
  handler       = "lambda_function.lambda_handler" # Assumes lambda_function.py with handler named lambda_handler
  runtime       = "python3.9"                      # Choose a supported runtime
  timeout       = 15                               # Seconds
  architectures = ["arm64"]

  environment {
    variables = {
      GENERAL_USERS_GROUP_NAME = "${var.project_name}-GeneralUsers-${var.environment}"
    }
  }

  tags = var.common_tags

  # Ensure the role exists before creating the function
  depends_on = [
  ]
}

# Permission for Cognito to Invoke the Lambda Function
resource "aws_lambda_permission" "allow_cognito" {
  statement_id  = "AllowCognitoInvokePostConfirmationTrigger"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.post_confirmation_trigger.function_name
  principal     = "cognito-idp.amazonaws.com"
  # Source ARN must be the User Pool ARN
  source_arn = aws_cognito_user_pool.main.arn
}

data "aws_caller_identity" "current" {}
