# Chatbot Infrastructure (`infrastructure/chatbot/`)

This directory contains the Terraform configuration for the AI Chatbot backend infrastructure deployed on AWS.

## Overview

This infrastructure sets up the following core components:

- **AWS Lambda Function (`lambda.tf`):** The main backend logic for the chatbot, written in Node.js.
- **AWS Lambda Layer (`layer.tf`):** Manages Node.js dependencies for the Lambda function.
- **API Gateway (`apigateway.tf`):** Provides an HTTP endpoint (`/chatbot/query`) to invoke the Lambda function.
- **IAM Role & Policies (`iam.tf`):** Defines permissions for the Lambda function (e.g., access to Bedrock, CloudWatch Logs).

Deployment is automated via the [`.github/workflows/deploy-chatbot.yml`](../../.github/workflows/deploy-chatbot.yml) GitHub Actions workflow.

## Lambda Layer for Dependencies

Node.js dependencies required by the `chatbot-query` Lambda function (defined in [`backend/lambdas/chatbot-query/package.json`](../../backend/lambdas/chatbot-query/package.json)) are managed using an AWS Lambda Layer to keep the function deployment package small and improve deployment times.

- **Terraform Definition:** The Lambda Layer is defined in `layer.tf` using the `aws_lambda_layer_version` resource.
- **Directory Structure:** The GitHub Actions workflow installs dependencies into the `infrastructure/chatbot/layers/chatbot_deps/nodejs` directory before packaging. This structure (`nodejs/node_modules/...`) is required by the Lambda runtime to find the libraries.
- **Workflow Step:** The `deploy-chatbot.yml` workflow uses `npm install --prefix ./infrastructure/chatbot/layers/chatbot_deps/nodejs ./backend/lambdas/chatbot-query` to populate the layer directory during the build process.
- **Exclusions:** `layer.tf` includes an `excludes` list in the `archive_file` data source to minimize the layer size by removing unnecessary files (e.g., documentation, unnecessary metadata) before zipping.

## Lambda Function Configuration

The `chatbot-query` Lambda function itself is defined in `lambda.tf`.

- **Runtime:** Node.js 22.x (`nodejs22.x`)
- **Architecture:** ARM64 (`arm64`) for better performance and cost-efficiency.
- **Handler Code:** Only the handler code (`backend/lambdas/chatbot-query/index.mjs`) is included in the function's deployment package, created using the `archive_file` data source (`chatbot_lambda_function_zip`).
- **Dependencies:** The function is configured to use the `chatbot_deps_layer` defined in `layer.tf` by referencing its ARN in the `layers` argument.
- **Environment Variables:** Key configurations like `BEDROCK_MODEL_ID` and `AWS_REGION` are passed as environment variables (defined in `variables.tf`).

## Deployment

Changes pushed to the `main` branch that affect files within `infrastructure/chatbot/`, `backend/lambdas/chatbot-query/`, or the workflow file itself will automatically trigger the `deploy-chatbot.yml` workflow.

### Manual Deployment (Local Environment)

While the primary deployment method is via the GitHub Actions workflow, you can also apply changes manually from your local development environment. Ensure you have:

1. **Terraform CLI installed.**
2. **AWS Credentials configured:** Your environment needs valid AWS credentials with permissions to manage the resources defined in this configuration (Lambda, Layers, API Gateway, IAM, S3/DynamoDB for state).
3. **Navigated to the correct directory:** Run commands from within `infrastructure/chatbot/`.

Key commands:

- **Initialize:** `terraform init -backend-config="chatbot.s3.tfbackend"` (This uses the `chatbot.s3.tfbackend` file for configuration. Ensure the values within that file are correct for your environment, or override specific values using additional `-backend-config="key=value"` arguments if needed).
- **Plan:** `terraform plan` (Review the planned changes carefully).
- **Apply:** `terraform apply` (Apply the changes to your AWS account).

**Note:** Manual applies should be done cautiously, especially in shared environments, to avoid conflicts with automated deployments or other manual changes.

## Next Steps (Post-Deployment)

- Manually test the deployed API Gateway endpoint (invoke URL output by the workflow) using `curl` or Postman to ensure the basic setup is working.
- Proceed with implementing the core backend logic in `backend/lambdas/chatbot-query/index.mjs` (Phase 2 in `docs/chatbot-todo.md`).
