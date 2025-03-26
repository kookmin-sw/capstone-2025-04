```
/infrastructure
  /backend-setup      # 백엔드 S3, DynamoDB 생성용 Terraform 코드
    main.tf
    variables.tf
    terraform.tfstate # (로컬 상태 파일 - Git에 커밋하거나 .gitignore 처리)
  /app                # 애플리케이션 인프라 (S3, CloudFront, IAM Role 등) Terraform 코드
    main.tf
    variables.tf
    outputs.tf
    # (backend "s3" 블록 포함)
.github/workflows/deploy.yml
/frontend
...

```
