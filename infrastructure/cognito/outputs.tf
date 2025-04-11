output "cognito_user_pool_id" {
  description = "The ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  description = "The ID of the Cognito User Pool Client for the application"
  value       = aws_cognito_user_pool_client.app_client.id
}

output "cognito_user_pool_domain" {
  description = "The domain name for the Cognito User Pool (if configured)"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "cognito_user_pool_endpoint" {
  description = "The endpoint URL for the Cognito User Pool"
  value       = aws_cognito_user_pool.main.endpoint
}

output "cognito_user_pool_provider_url" {
  description = "The provider URL for the Cognito User Pool (useful for OIDC)"
  # OIDC Provider URL 형식: https://cognito-idp.{region}.amazonaws.com/{userPoolId}
  value = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}
# ===> NEW: Group Outputs <===
output "cognito_general_users_group_name" {
  description = "Name of the General Users group"
  value       = aws_cognito_user_group.general_users.name
}

output "cognito_admins_group_name" {
  description = "Name of the Admins group"
  value       = aws_cognito_user_group.admins.name
}

output "cognito_user_pool_arn" {
  description = "The ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.arn
}
