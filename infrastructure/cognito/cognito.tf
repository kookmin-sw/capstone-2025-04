# Configure the AWS Provider (main.tf 또는 별도 파일에 있을 수 있음)
provider "aws" {
  region = var.aws_region
}

# 1. Cognito User Pool 생성
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

  tags = var.common_tags
}

# 2. Google Identity Provider 설정
resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = data.aws_secretsmanager_secret_version.google_client_secret.secret_string # Secrets Manager에서 가져온 값 사용
    authorize_scopes = "profile email openid"                                                    # 표준 Google 스코프
  }

  # Google 속성을 Cognito 표준 속성에 매핑
  attribute_mapping = {
    email       = "email"
    family_name = "family_name"
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

  callback_urls = var.app_callback_urls # Google 로그인 후 리디렉션될 앱 URL
  logout_urls   = var.app_logout_urls   # 로그아웃 후 리디렉션될 앱 URL

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
