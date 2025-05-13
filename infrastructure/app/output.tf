output "s3_bucket_id" {
  description = "The name of the S3 bucket"
  value       = aws_s3_bucket.website_bucket.id
}

output "s3_bucket_regional_domain_name" {
  description = "The regional domain name of the S3 bucket"
  value       = aws_s3_bucket.website_bucket.bucket_regional_domain_name
}

output "cloudfront_distribution_id" {
  description = "The ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.s3_distribution.id
}

output "cloudfront_distribution_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.s3_distribution.domain_name
}

output "github_actions_deploy_role_arn" {
  description = "ARN of the IAM Role for GitHub Actions deployment"
  value       = aws_iam_role.github_actions_deploy_role.arn
}

# --- New Output for Custom Domain ---
output "application_url" {
  description = "The custom domain URL for the application"
  value       = "https://www.${var.custom_domain_name}" # Or just var.custom_domain_name if you prefer the apex
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate_validation.cert.certificate_arn
}