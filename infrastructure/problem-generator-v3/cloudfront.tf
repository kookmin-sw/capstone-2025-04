resource "aws_cloudfront_origin_access_control" "problem_generator_v3_oac" {
  name                              = "${var.project_name}-problem-generator-v3-oac-${var.environment}" # Updated to v3
  description                       = "OAC for Problem Generator V3 Lambda Function URL"                # Updated to v3
  origin_access_control_origin_type = "lambda"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "problem_generator_v3" {
  enabled = true
  comment = "Problem Generator V3 SSE Distribution" # Updated to v3


  origin {
    domain_name = split("/", replace(aws_lambda_function_url.problem_generator_v3_url.function_url, "https://", ""))[0]
    origin_id   = "problem-generator-v3-lambda-url" # Updated to v3

    custom_origin_config {
      http_port              = 80 # Not actually used with https_only
      https_port             = 443
      origin_protocol_policy = "https-only" # Lambda Function URLs are HTTPS only
      origin_ssl_protocols   = ["TLSv1.2"]  # Use secure TLS protocols
    }

    origin_access_control_id = aws_cloudfront_origin_access_control.problem_generator_v3_oac.id
  }

  default_cache_behavior {
    target_origin_id = "problem-generator-v3-lambda-url" # Updated to v3

    allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods  = ["GET", "HEAD", "OPTIONS"]

    viewer_protocol_policy = "redirect-to-https"


    # Use data sources to look up managed policy IDs
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.all_viewer_except_host_header.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.simple_cors.id
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = var.common_tags
}

# Data sources for managed policies
data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host_header" {
  name = "Managed-AllViewerExceptHostHeader"
}

data "aws_cloudfront_response_headers_policy" "simple_cors" {
  name = "Managed-SimpleCORS"
}
