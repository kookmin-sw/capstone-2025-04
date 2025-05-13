# S3 버킷 생성 (정적 웹사이트 호스팅용이지만, CloudFront OAC를 통해 비공개 유지)
resource "aws_s3_bucket" "website_bucket" {
  # Bucket 이름은 전역적으로 고유해야 함
  bucket = "${var.project_name}-frontend-${var.environment}-${var.bucket_name_suffix}"

  tags = {
    Name        = "${var.project_name}-frontend-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}


# 모든 퍼블릭 액세스 차단 (CloudFront OAC 통해 접근)
resource "aws_s3_bucket_public_access_block" "website_bucket_pab" {
  bucket = aws_s3_bucket.website_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Control (OAC) 생성
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.project_name}-frontend-${var.environment}-oac"
  description                       = "OAC for ${aws_s3_bucket.website_bucket.id}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# --- Custom Domain Setup ---

# Get the Route 53 hosted zone for your custom domain
data "aws_route53_zone" "main" {
  name         = "${var.custom_domain_name}." # Note the trailing dot
  private_zone = false
}

# Request an ACM certificate in us-east-1
resource "aws_acm_certificate" "cert" {
  provider          = aws.us_east_1 # Must be in us-east-1 for CloudFront
  domain_name       = var.custom_domain_name
  subject_alternative_names = [
    "www.${var.custom_domain_name}",
    "auth.${var.custom_domain_name}"  # auth 서브도메인 추가
  ]
  validation_method = "DNS"

  tags = {
    Name        = "${var.project_name}-frontend-cert-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }

  lifecycle {
    create_before_destroy = true # Recommended for certificates
  }
}

# Create Route 53 records for ACM certificate validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true # Useful if records might already exist (e.g., from previous attempts)
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Validate the ACM certificate using the DNS records
resource "aws_acm_certificate_validation" "cert" {
  provider                = aws.us_east_1 # Must be in us-east-1
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# CloudFront Function 생성 (Viewer Request URL Rewrite)
# Next.js 정적 export 시 /path -> /path/index.html 과 같이 경로를 처리하여 새로고침 시 403/404 오류 방지
resource "aws_cloudfront_function" "url_rewrite_function" {
  name    = "${var.project_name}-url-rewrite-${var.environment}"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrites URI for Next.js static export (e.g., /path to /path/index.html)"
  publish = true # 즉시 게시
  code = <<-EOT
    function handler(event) {
        var request = event.request;
        var uri = request.uri;
        
        // Check whether the URI is missing a file name.
        if (uri.endsWith('/')) {
            request.uri += 'index.html';
        } 
        // Check whether the URI is missing a file extension.
        else if (!uri.includes('.')) {
            request.uri += '/index.html';
        }
        return request;
    }
  EOT
}

# CloudFront 배포 생성
resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name              = aws_s3_bucket.website_bucket.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
    origin_id                = "S3-${aws_s3_bucket.website_bucket.id}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  # S3 버킷 정책에서 CloudFront 접근 허용 필요
  # depends_on = [aws_s3_bucket_policy.cloudfront_access] # Cycle already handled by Terraform's implicit dependency on ARN

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.website_bucket.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600 # 1 hour
    max_ttl                = 86400 # 24 hours

    # CloudFront Function 연결 (Viewer Request)
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite_function.arn
    }
  }

  # 에러 발생 시 /index.html로 리다이렉트 (Next.js 정적 라우팅 처리 위임)
  custom_error_response {
    error_caching_min_ttl = 0
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
  }
  custom_error_response {
    error_caching_min_ttl = 0
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
  }

  price_class = "PriceClass_200" # 아시아, 미국, 유럽

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # --- Viewer Certificate Configuration for Custom Domain ---
  aliases = [var.custom_domain_name, "www.${var.custom_domain_name}"]

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cert.certificate_arn # Use validated certificate
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021" # Recommended
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Domain      = var.custom_domain_name
  }
}

# S3 버킷 정책: CloudFront OAC에서의 접근만 허용
data "aws_iam_policy_document" "cloudfront_access" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.website_bucket.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.s3_distribution.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "cloudfront_access" {
  bucket = aws_s3_bucket.website_bucket.id
  policy = data.aws_iam_policy_document.cloudfront_access.json
}


# --- Route 53 Alias Records for CloudFront ---
resource "aws_route53_record" "app_domain" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.custom_domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.s3_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.s3_distribution.hosted_zone_id # This is a special zone ID for CloudFront
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_app_domain" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.${var.custom_domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.s3_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.s3_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}


# --- GitHub Actions OIDC 연동을 위한 IAM 설정 (Terraform으로 관리할 경우) ---

# GitHub OIDC Provider (AWS 계정에 한 번만 생성)
resource "aws_iam_openid_connect_provider" "github" {
  # AWS 계정에 이미 존재하면 이 리소스 블록은 주석 처리하거나 import 하세요.
  url             = "https://${var.github_oidc_provider_url}"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"] # GitHub의 thumbprint (변경될 수 있음, AWS 문서 확인)
}

# GitHub Actions에서 AssumeRole 할 IAM Role
resource "aws_iam_role" "github_actions_deploy_role" {
  name = "${var.project_name}-github-actions-deploy-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          "StringEquals": {
            "${var.github_oidc_provider_url}:sub": "repo:${var.github_repository}:environment:${var.environment}"
          }
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# IAM Role에 필요한 정책 연결
resource "aws_iam_role_policy" "deploy_policy" {
  name = "${var.project_name}-deploy-policy-${var.environment}"
  role = aws_iam_role.github_actions_deploy_role.id

  # Policy Document: S3 파일 동기화 및 CloudFront 무효화 권한
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.website_bucket.arn,
          "${aws_s3_bucket.website_bucket.arn}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = "cloudfront:CreateInvalidation"
        Resource = aws_cloudfront_distribution.s3_distribution.arn
      }
    ]
  })
}