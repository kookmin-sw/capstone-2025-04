# 1. Define CloudFront Origin Access Control (OAC) for Lambda
resource "aws_cloudfront_origin_access_control" "chatbot_lambda_oac" {
  name                              = "${var.project_name}-${var.environment}-chatbot-lambda-oac"
  description                       = "OAC for Chatbot Lambda Function URL"
  origin_access_control_origin_type = "lambda"
  signing_behavior                  = "always" # Always sign requests to the Lambda URL
  signing_protocol                  = "sigv4"  # Use Signature Version 4
}

# 2. Define the CloudFront Distribution
resource "aws_cloudfront_distribution" "chatbot_distribution" {
  enabled             = true
  comment             = "CloudFront distribution for Chatbot Lambda Function URL"
  # Use default certificate for now, can add custom domain/ACM cert later
  # viewer_certificate { cloudfront_default_certificate = true }

  origin {
    domain_name = split("/", replace(aws_lambda_function_url.chatbot_url.function_url, "https://", ""))[0] # Extract only the domain part
    origin_id   = "chatbot-lambda-origin"

    custom_origin_config {
      http_port                = 80 # Not used for https_only
      https_port               = 443
      origin_protocol_policy   = "https-only"
      origin_ssl_protocols     = ["TLSv1.2"]
    }

    # Attach the OAC to this origin
    origin_access_control_id = aws_cloudfront_origin_access_control.chatbot_lambda_oac.id
  }

  default_cache_behavior {
    target_origin_id = "chatbot-lambda-origin"

    # Use the full set of methods as required by CloudFront API when POST is needed
    allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    # Cache GET, HEAD, and OPTIONS requests. POST etc. will not be cached due to policy.
    cached_methods  = ["GET", "HEAD", "OPTIONS"]

    viewer_protocol_policy = "redirect-to-https"

    # Disable caching for dynamic Lambda responses
    cache_policy_id = data.aws_cloudfront_cache_policy.caching_disabled.id

    # Forward necessary headers for OAC signing and JWT auth
    # Use AWS managed "AllViewerExceptHostHeader" or create a custom policy
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host_header.id

    # Recommended for Lambda streaming
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.simple_cors.id

    # Minimum TTL settings for non-cached content (doesn't really apply here)
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # Restrict viewer access if needed (e.g., Geo restrictions)
  restrictions {
    geo_restriction {
      restriction_type = "none" # No geo restrictions by default
    }
  }

  # Default viewer certificate
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  # Price class (adjust if needed)
  price_class = "PriceClass_All"

  # Optional: Enable logging
  # logging_config { ... }

  # Optional: Associate WAF Web ACL
  # web_acl_id = ...

  tags = var.common_tags
}

# Data sources for managed policies (avoids creating custom ones if suitable)
data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host_header" {
  name = "Managed-AllViewerExceptHostHeader"
}

data "aws_cloudfront_response_headers_policy" "simple_cors" {
  name = "Managed-SimpleCORS"
} 