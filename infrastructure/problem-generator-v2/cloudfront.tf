resource "aws_cloudfront_origin_access_control" "problem_generator_v2_oac" {
  name                              = "${var.project_name}-problem-generator-v2-oac-${var.environment}"
  description                       = "OAC for Problem Generator V2 Lambda Function URL"
  origin_access_control_origin_type  = "lambda"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "problem_generator_v2" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Problem Generator V2 SSE Distribution"
  default_root_object = ""

  origin {
    domain_name              = aws_lambda_function_url.problem_generator_v2_url.function_url
    origin_id                = "problem-generator-v2-lambda-url"
    origin_access_control_id = aws_cloudfront_origin_access_control.problem_generator_v2_oac.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "POST"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "problem-generator-v2-lambda-url"

    viewer_protocol_policy = "redirect-to-https"
    compress              = true

    cache_policy_id            = "413fdccd-16f7-4fd2-bb4c-1c4e4100b087" # Managed-CachingDisabled
    origin_request_policy_id   = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf" # Managed-AllViewerExceptHostHeader
    response_headers_policy_id = "60669651-455b-4ae9-85a4-c4c02393f86c" # Managed-SimpleCORS
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
