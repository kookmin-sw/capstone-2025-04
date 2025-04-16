# To-Do List: AI Chatbot Assistant Implementation (Lambda + CloudFront OAC v3.3)

This list breaks down the implementation of the AI Chatbot Assistant feature based on the updated PRD and Feature Specification, using an AWS Lambda function (with JWT auth) exposed via Function URL and secured by CloudFront OAC. Infrastructure is managed with Terraform using **Node.js** runtime, reusing the Lambda Layer pattern, leveraging **AWS Bedrock**, and responses are streamed via Server-Sent Events (SSE).

**Legend:**

- `[ ]` - To Do
- `[x]` - Done
- `[-]` - In Progress
- `[b]` - Blocked

---

## Phase 1: Planning & Setup (v3.3 Update)

- [x] **Architecture:** Finalize Lambda Function URL + CloudFront OAC architecture with JWT Auth and SSE Streaming.
- [x] **IaC Choice:** Confirm Terraform as the IaC tool for `infrastructure/chatbot/`.
- [x] **Runtime:** Confirm **Node.js** as the Lambda runtime.
- [x] **AI Service:** Confirm **AWS Bedrock** as the AI service (using IAM auth).
- [x] **Documentation:** Update Plan Summary (`chatbot-plan-summary.md`).
- [x] **Documentation:** Update Feature Specification (`chatbot-feature-spec.md`).
- [x] **Documentation:** Update Product Requirements Document (`chatbot-prd.md`).
- [x] **Documentation:** Update this To-Do List (`chatbot-todo.md`).
- [ ] **Secrets:** No separate AI API Key needed; Bedrock uses IAM role.

## Phase 2: Infrastructure Setup (`infrastructure/chatbot/` with Terraform)

- [x] **Directory:** Create `infrastructure/chatbot/` directory if it doesn't exist. _(Old code reviewed, will reuse patterns)_
- [ ] **Terraform Setup:**
  - [x] Initialize Terraform project (`main.tf`, `variables.tf`, `outputs.tf`, `providers.tf`, `backend.tf`).
  - [x] Configure S3 backend (`backend.tf`).
  - [x] Define AWS provider (`providers.tf`).
  - [x] Add `terraform_remote_state` data source (`main.tf`) for Cognito.
  - [x] Define standard variables (`variables.tf` - region, project, env, tags).
  - [x] Define `bedrock_model_id` variable (`variables.tf`).
  - [x] Define Lambda variables (`variables.tf` - runtime `nodejs20.x`, handler `index.handler`, code path `.../index.mjs`, layer path).
- [ ] **IAM (`iam.tf`):**
  - [x] Define Lambda Execution Role (`aws_iam_role`, `chatbot_lambda_role`).
  - [x] Attach `AWSLambdaBasicExecutionRole` managed policy.
  - [x] Define and attach policy for `bedrock:InvokeModelWithResponseStream` (`bedrock_invoke_policy`).
- [ ] **Lambda Layer (`layer.tf`):**
  - [x] Create `./layers/chatbot_deps/` directory structure (target: `./layers/chatbot_deps/nodejs/`). _(Requires manual/CI step to populate)_.
  - [x] Define `data "archive_file" "chatbot_deps_layer_zip"` pointing to `./layers/chatbot_deps/`.
  - [x] Define `aws_lambda_layer_version` resource (`chatbot_deps_layer`) compatible with Node.js runtime.
- [ ] **Lambda Function (`lambda.tf`):**
  - [x] Define `data "archive_file" "chatbot_lambda_function_zip"` pointing to the handler code (`index.mjs`).
  - [x] Define Lambda Function (`aws_lambda_function` resource `chatbot_query`) using role, **Node.js runtime**, and handler.
  - [x] Attach the Layer ARN.
  - [x] Point `filename` to the function code archive zip.
  - [x] Configure Function URL: `authorization_type = "AWS_IAM"`, `invoke_mode = "RESPONSE_STREAM"`.
  - [x] Pass Cognito details (User Pool ID, Client ID, JWKS URL, Issuer URL from remote state) as environment variables.
  - [x] Pass `BEDROCK_MODEL_ID = var.bedrock_model_id` as environment variable.
- [ ] **CloudFront OAC (`cloudfront.tf` or `main.tf`):**
  - [x] Define `aws_cloudfront_origin_access_control` resource.
- [ ] **CloudFront Distribution (`cloudfront.tf` or `main.tf`):**
  - [x] Define `aws_cloudfront_distribution` resource.
  - [x] Define origin pointing to Lambda Function URL Domain Name.
  - [x] Attach OAC ID.
  - [x] Configure Default Cache Behavior (POST, OPTIONS, CachingDisabled, **forward required headers including `Authorization`**).
- [ ] **Lambda Permission (`permissions.tf` or `main.tf`):**
  - [x] Define `aws_lambda_permission` resource allowing CloudFront invoke.
- [x] **Outputs (`outputs.tf`):**
  - [x] Define output for CloudFront Domain Name.
- [x] **Deployment:** Run `terraform init` and `terraform apply` _(after layer directory is populated)_. **(Completed)**
- [x] **Output:** Note down the deployed CloudFront Distribution Domain Name. (`d3e80rge8sdro7.cloudfront.net`) **(Done)**

## Phase 3: Backend Implementation (`backend/lambdas/chatbot-query/` - Node.js)

- [ ] **Directory:** Create/update `backend/lambdas/chatbot-query/` directory.
- [ ] **Dependencies:** Define dependencies in `package.json` (JWT lib - `jose`, AWS SDK v3 for Bedrock - `@aws-sdk/client-bedrock-runtime`).
- [ ] **Build/Layer Prep:** Ensure build step installs dependencies into `./infrastructure/chatbot/layers/chatbot_deps/nodejs/node_modules/`.
- [ ] **Handler Logic (`index.mjs`):**
  - [ ] Implement main handler (wrapped for streaming).
  - [ ] **JWT Validation:** (Use Cognito env vars).
  - [ ] **Parsing:** (No change).
  - [ ] **Bedrock Client:** Initialize Bedrock Runtime client (using AWS SDK v3 from layer, will use role credentials).
  - [ ] **AI Interaction:** Construct prompt, call Bedrock `InvokeModelWithResponseStreamCommand` using `BEDROCK_MODEL_ID` from env var.
  - [ ] **SSE Response:** (Format and stream).
  - [ ] **Error Handling:** (Catch errors).
- [ ] **Deployment:** Package `index.mjs` and ensure Terraform points to it. Deploy via `terraform apply`.

## Phase 4: Frontend Implementation (`frontend/`)

- [ ] **Environment:** Add `NEXT_PUBLIC_CHATBOT_API_ENDPOINT` to `.env.local` (and Vercel/deployment envs) with the CloudFront Distribution Domain Name (prepended with `https://`).
- [ ] **API Client (`src/api/chatbotApi.ts` - Recommended):**
  - [ ] Create/Update a function (e.g., `streamChatbotResponse`).
  - [ ] Accept context and callback functions (for `onData`, `onError`, `onComplete`) as input.
  - [ ] Inside, define an async function to get headers (JWT + SHA256):
    - [ ] Fetch JWT using Amplify Auth (`fetchAuthSession`). Return `Authorization` header.
    - [ ] Construct JSON payload string from context.
    - [ ] Calculate SHA256 hash of the payload string (convert ArrayBuffer to hex). Return `x-amz-content-sha256` header.
    - [ ] Return `Content-Type: application/json`.
  - [ ] **EventSource Setup:** Create a new `EventSource` instance pointing to the `NEXT_PUBLIC_CHATBOT_API_ENDPOINT`. Consider passing headers if `EventSource` polyfill/library allows, otherwise this might require a different approach or rely solely on cookies/session if headers aren't feasible with standard EventSource.
    - **Alternative if Headers Not Supported:** Use `fetch` with streaming response body instead of `EventSource`. Read the stream using `response.body.getReader()` and manually parse SSE formatted chunks.
  - [ ] Add event listeners to `EventSource` (or fetch stream reader):
    - `onmessage`: Parse `event.data`, check for completion signal, call `onData` callback.
    - `onerror`: Call `onError` callback.
    - `onopen` / stream completion: Call `onComplete` callback.
- [ ] **Component (`src/components/Chatbot.tsx`):**
  - [ ] Import and use the API client streaming function.
  - [ ] Remove any direct AI SDK/Langchain usage.
  - [ ] Update `handleSendMessage`:
    - [ ] Set `isLoading = true`.
    - [ ] Call the API client function, providing context and callbacks to update `streamingResponse` state (`onData`), handle errors (`onError`), and set `isLoading = false` (`onComplete`).
  - [ ] Implement error handling display (`toast`).
- [ ] **Dependencies:** Remove unused AI/Langchain dependencies (`@langchain/google-genai`). Run `npm install`.

## Phase 5: Testing & Cleanup

- [ ] **Backend Testing:** Test Lambda function (JWT validation, AI call, SSE format).
- [ ] **Infrastructure Testing:** Verify CloudFront forwards required headers (`Authorization` etc.) via CloudFront Logs or Lambda event logging.
- [ ] **Integration Testing:** Test the full flow from the frontend UI.
  - [ ] Ensure only logged-in users can interact.
  - [ ] Verify SSE streaming updates the UI correctly.
  - [ ] Test error scenarios (invalid JWT, Lambda errors, AI errors).
- [ ] **Security Testing:** Attempt direct Lambda Function URL access (should be 403 Forbidden).
- [ ] **Cleanup:** Remove unused code/dependencies.
- [ ] **Documentation:** Update `READMEs`, comments.
