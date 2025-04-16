# Chatbot Infrastructure (`infrastructure/chatbot/`)

This directory contains the Terraform configuration for the AI Chatbot backend infrastructure deployed on AWS.

## Overview (v3 - Lambda Function URL + CloudFront OAC)

This infrastructure sets up the following core components:

- **AWS Lambda Function (`lambda.tf`):** The main backend logic for the chatbot, written in Node.js. Handles user authentication (JWT), Bedrock interaction, and SSE streaming.
- **AWS Lambda Layer (`layer.tf`):** Manages Node.js dependencies for the Lambda function (e.g., `@langchain/aws`, `jose`).
- **AWS Lambda Function URL (`lambda.tf`):** Provides a direct HTTPS endpoint for the Lambda function, configured for streaming responses (`RESPONSE_STREAM`) and IAM authorization (`AWS_IAM`).
- **AWS CloudFront Distribution (`cloudfront.tf`):** Acts as the public-facing endpoint. Secures the Lambda Function URL using Origin Access Control (OAC) and forwards necessary headers (including `Authorization` for JWT, `x-amz-content-sha256`).
- **AWS CloudFront OAC (`cloudfront.tf`):** Grants CloudFront permission to invoke the Lambda Function URL using SigV4.
- **IAM Role & Policies (`iam.tf`):** Defines permissions for the Lambda function (e.g., access to Bedrock via `bedrock:InvokeModelWithResponseStream`, CloudWatch Logs).
- **Lambda Permission (`permissions.tf`):** Allows the specific CloudFront distribution to invoke the Lambda Function URL.

Deployment can be automated via GitHub Actions or performed manually.

## Lambda Layer for Dependencies

Node.js dependencies required by the `chatbot-query` Lambda function (defined in [`backend/lambdas/chatbot-query/package.json`](../../backend/lambdas/chatbot-query/package.json)) are managed using an AWS Lambda Layer to keep the function deployment package small and improve deployment times.

- **Terraform Definition:** The Lambda Layer is defined in `layer.tf` using the `aws_lambda_layer_version` resource.
- **Directory Structure:** A build process (manual or CI/CD like GitHub Actions) must install dependencies into the `infrastructure/chatbot/layers/chatbot_deps/nodejs` directory before packaging. This structure (`nodejs/node_modules/...`) is required by the Lambda runtime.
- **Workflow Step:** A GitHub Actions workflow (e.g., `deploy-chatbot.yml`) should use a command like `npm install --prefix ./infrastructure/chatbot/layers/chatbot_deps/nodejs ./backend/lambdas/chatbot-query` to populate the layer directory.
- **Exclusions:** `layer.tf` uses `archive_file` data source with excludes to minimize layer size.

## Lambda Function Configuration

The `chatbot-query` Lambda function itself is defined in `lambda.tf`.

- **Runtime:** Node.js (`var.lambda_runtime`, e.g., `nodejs20.x`).
- **Architecture:** ARM64 (`arm64`).
- **Handler Code:** Only the handler code (e.g., `backend/lambdas/chatbot-query/index.mjs` specified by `var.lambda_code_path`) is included in the function's deployment package.
- **Dependencies:** Uses the `chatbot_deps_layer` ARN.
- **Function URL:** Configured with `authorization_type = "AWS_IAM"` and `invoke_mode = "RESPONSE_STREAM"`.
- **Environment Variables:** Key configurations like `BEDROCK_MODEL_ID`, `COGNITO_JWKS_URL`, `COGNITO_ISSUER_URL`, `COGNITO_APP_CLIENT_ID`, and `COGNITO_REGION` are passed as environment variables.

## CloudFront Configuration

- **OAC:** An `aws_cloudfront_origin_access_control` resource is created specifically for the Lambda origin.
- **Distribution:** An `aws_cloudfront_distribution` resource is defined:
  - Origin points to the Lambda Function URL domain name.
  - Origin uses the configured OAC ID.
  - Default cache behavior forwards necessary headers (e.g., `Authorization`, `Content-Type`, `x-amz-content-sha256`) using a suitable Origin Request Policy (like `Managed-AllViewerExceptHostHeader`).
  - Caching is disabled (`Managed-CachingDisabled`).
  - Response headers policy like `Managed-SimpleCORS` is used for streaming compatibility.

## Security

- **Endpoint Security:** The Lambda Function URL is not publicly accessible. Access is restricted to the CloudFront distribution via OAC (SigV4 signing) and Lambda resource policy.
- **User Authentication:** The Lambda function validates incoming JWTs (sent in the `Authorization` or custom header) against the Cognito User Pool before processing requests.
- **AI Credentials:** AWS Bedrock access is controlled via the Lambda execution role's IAM permissions (no long-lived keys in code).

## Deployment

Changes can be deployed via a GitHub Actions workflow or manually.

### Prerequisites (Manual/Workflow)

1.  **Layer Population:** Ensure the `./layers/chatbot_deps/nodejs/` directory is populated with the correct `node_modules` by running `npm install` targeting that directory *before* running `terraform apply`. (Typically done in CI/CD).
2.  **Terraform CLI installed.**
3.  **AWS Credentials configured:** Permissions needed for Lambda, Layers, CloudFront, IAM, and S3/DynamoDB for state.
4.  **Cognito Remote State:** The Cognito infrastructure (`infrastructure/cognito`) must be deployed, and its state file (`cognito/terraform.tfstate`) accessible.
5.  **Navigate to `infrastructure/chatbot/`.**

### Key Terraform Commands:

- **Initialize:** `terraform init` (Backend configuration is defined in `backend.tf`. Ensure bucket/key/table are correct or override via environment variables/CLI flags if needed, especially on first run).
- **Plan:** `terraform plan` (Review resources to be created/modified).
- **Apply:** `terraform apply` (Apply changes).

**Note:** Coordinate manual applies carefully if using a CI/CD pipeline.

## Next Steps (Post-Deployment)

- Record the **CloudFront Distribution endpoint** (`cloudfront_distribution_domain_name`) output by Terraform.
- Test the **CloudFront endpoint** using `curl` or Postman. For POST requests, ensure you include:
    - `Authorization: Bearer <YOUR_VALID_COGNITO_JWT_ID_TOKEN>` (or custom header if used)
    - `Content-Type: application/json`
    - `x-amz-content-sha256: <SHA256_HASH_OF_REQUEST_BODY>` (Required by SigV4 for POST)
- Update the frontend application's environment variable (`NEXT_PUBLIC_CHATBOT_API_ENDPOINT`) with the deployed CloudFront domain name.
- Ensure the frontend API client (`src/api/chatbotApi.ts`) correctly sends the `Authorization` and `x-amz-content-sha256` headers with requests.
```
