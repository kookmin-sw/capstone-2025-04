# 🚀 Community API Infrastructure & Deployment Plan

This document outlines the plan for setting up the AWS infrastructure and automated deployment pipeline for the ALPACO Community API using Terraform and GitHub Actions.

**Objective:** Create a robust and automated deployment pipeline for the community backend API using Terraform for infrastructure definition and GitHub Actions for CI/CD.

**Phase 1: Information Gathering & Verification (Completed)**

- Confirmed Lambda source code location (`backend/lambdas/community/`).
- Identified primary dependency (`uuid`) for the Lambda Layer.
- Verified DynamoDB schema requirements (PK/SK, `postOnlyIndex` GSI).
- Confirmed API endpoint authentication needs (Create/Update/Delete/Like Post, Create/Delete Comment require auth; Gets are public).

**Phase 2: Detailed Implementation Plan**

1. **Setup Terraform Project (`infrastructure/api`):**
   - Create the directory and standard Terraform files (`providers.tf`, `variables.tf`, `backend.tf`, `outputs.tf`, `iam.tf`, `dynamodb.tf`, `layer.tf`, `lambdas.tf`, `apigateway.tf`).
   - Configure the S3 backend using the bucket/table from `backend-setup`, but with a unique key (e.g., `key = "api/community/terraform.tfstate"`).
2. **Define Core AWS Resources:**
   - **IAM (`iam.tf`):** Create Lambda execution role with basic execution and specific DynamoDB permissions for the `Community` table and its GSI.
   - **DynamoDB (`dynamodb.tf`):** Define the `Community` table with PK/SK attributes, define the `postOnlyIndex` GSI (Hash: `GSI1PK`, Range: `GSI1SK`, Projection: INCLUDE/ALL), and define necessary attributes (`PK`, `SK`, `GSI1PK`, `GSI1SK`). _Note: `createPost` Lambda needs updating to write GSI attributes._
   - **Lambda Layer (`layer.tf`):** Define resources to package and create a layer containing the `uuid` dependency from `infrastructure/api/layers/common-deps/nodejs/`.
3. **Define Lambda Functions (`lambdas.tf`):**
   - For each `.js` file in `backend/lambdas/community/**`, create `data "archive_file"` and `aws_lambda_function` resources, linking them to the execution role, the layer, and setting the `COMMUNITY_TABLE_NAME` environment variable.
4. **Define API Gateway (`apigateway.tf`):**
   - Create the REST API, resources (`/community`, `/{postId}`, etc.), and methods (GET, POST, PUT, DELETE).
   - Define `data "terraform_remote_state" "cognito"` to access Cognito outputs.
   - Create a `COGNITO_USER_POOLS` authorizer referencing the User Pool ARN from the remote state.
   - Configure integrations (`AWS_PROXY`) linking methods to Lambdas.
   - Apply the Cognito authorizer to protected methods (POSTs, PUTs, DELETEs). Leave public GETs with `authorization = "NONE"`.
   - Define `aws_lambda_permission` for each integration.
   - Set up API Gateway deployment and stage.
   - Output the API invoke URL.
5. **Setup GitHub Actions Workflow (`.github/workflows/deploy-api.yml`):**
   - Trigger on pushes to `main` affecting `backend/lambdas/community/**` or `infrastructure/api/**`.
   - Grant OIDC permissions.
   - Checkout code, setup Node.js.
   - **Run `npm install` for the layer source.**
   - Configure AWS credentials via OIDC using a dedicated role ARN (`secrets.AWS_IAM_ROLE_ARN_API`).
   - Run `terraform init` (with backend config), `terraform plan`, and `terraform apply` within the `infrastructure/api` directory.
   - _(Requires secrets: `AWS_IAM_ROLE_ARN_API`, `AWS_REGION`, `TF_STATE_BUCKET`, `TF_STATE_LOCK_TABLE`)_.
6. **Frontend Integration (Manual Step After Deployment):**
   - Update API client (`communityApi.ts`) to include the `Authorization` header with the JWT token obtained via Amplify `fetchAuthSession`.
   - Use the deployed API Gateway URL via an environment variable (`NEXT_PUBLIC_API_ENDPOINT`).

**Phase 3: Implementation**

- Proceed with implementing the Terraform files and GitHub Actions workflow as outlined above.
