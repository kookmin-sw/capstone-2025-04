# Feature Specification: AI Chatbot Assistant (Lambda + CloudFront OAC)

**Version:** 3.1
**Date:** 2025-04-14
**Author:** pwh9882

## 1. Overview

This document provides the technical specification for the AI Chatbot Assistant feature integrated into the ALPACO coding test solve page. It details the implementation using an **AWS Lambda function with a Function URL, secured by CloudFront Origin Access Control (OAC)**. The Lambda function handles interaction with the AI model (e.g., Google Gemini) and validates user authentication using JWTs from the existing Cognito User Pool. Refer to `chatbot-prd.md` for user requirements and goals.

## 2. Architecture

The feature utilizes a backend-centric architecture for chatbot interactions:

1.  **Frontend:** A React component (`Chatbot.tsx`) handles UI, state, and gathers context. It sends **authenticated requests (with JWT)** to the CloudFront distribution endpoint.
2.  **Amazon CloudFront:** A distribution acts as the public-facing endpoint. It **forwards the `Authorization` header** and uses Origin Access Control (OAC) to securely forward requests to the Lambda Function URL origin.
3.  **AWS Lambda Function URL:** A specific HTTPS endpoint for the `chatbot-query` Lambda function, configured with `Auth type: AWS_IAM`.
4.  **AWS Lambda (`chatbot-query`):** A backend function (e.g., Python/Node.js) that receives the request from CloudFront.
    - **Validates the JWT** received in the `Authorization` header against the existing Cognito User Pool's JWKS endpoint.
    - Parses the user query and context (problem details, code, history) from the request body.
    - Retrieves the AI API key (e.g., Google AI Key) securely from its environment.
    - Interacts with the AI model (e.g., Gemini via SDK or Langchain).
    - Constructs a non-spoiling response.
    - Sends the response back, preferably using **Lambda response streaming formatted as Server-Sent Events (SSE - `text/event-stream`)**.
5.  **CloudFront OAC:** Grants the CloudFront distribution permission to invoke the Lambda Function URL using SigV4 signing.
6.  **Lambda Resource Policy:** Restricts `lambda:InvokeFunctionUrl` to only the specified CloudFront distribution.
7.  **AWS Cognito:** The existing User Pool (defined in `infrastructure/cognito/`) provides user authentication and JWTs.
8.  **AI Model API (e.g., Google Gemini):** External service called by the Lambda function.

```mermaid
sequenceDiagram
    participant User
    participant Frontend (Chatbot.tsx)
    participant Cognito
    participant CloudFront
    participant Lambda (chatbot-query)
    participant AI Model API (e.g., Gemini)

    User->>+Frontend: Interacts (already logged in)
    Frontend->>+Cognito: Gets valid JWT (Implicitly, via Amplify Auth)
    User->>+Frontend: Types message and clicks Send
    Frontend->>+CloudFront: POST /chatbot (Body: context, Headers: Auth JWT, x-amz-content-sha256)
    CloudFront->>+Lambda: Forward Request (Headers: Auth, OAC SigV4)
    Lambda->>Cognito: Get JWKS keys (for validation, cached)
    Lambda->>Lambda: Validate JWT Signature & Claims
    alt JWT Invalid
        Lambda-->>-CloudFront: 401/403 Unauthorized
        CloudFront-->>-Frontend: 401/403 Unauthorized
        Frontend->>-User: Show Auth Error
    else JWT Valid
        Lambda->>Lambda: Parse Request Body
        Lambda->>Lambda: Retrieve AI API Key (Env Var/SSM)
        Lambda->>+AI Model API: Send Prompt + API Key
        AI Model API-->>-Lambda: (Streamed) Response Tokens
        Lambda-->>-CloudFront: Streamed SSE Response (Content-Type: text/event-stream)
        CloudFront-->>-Frontend: Streamed SSE Response
        Frontend->>Frontend: Use EventSource to process SSE stream
        Frontend->>-User: Updates UI incrementally with response content
    end
```

## 3. Frontend Implementation (`frontend/`)

### 3.1 Component: `src/components/Chatbot.tsx`

- **Purpose:** Manages the chat UI and interaction logic. Sends authenticated user queries to the backend via the CloudFront endpoint.
- **State:** (Remains similar to v2.0 - `messages`, `userInput`, `isLoading`, `streamingResponse`)
- **Props:** (Remains similar to v2.0 - `problemDetails`, `userCode`)
- **Functionality:**
  - **API Endpoint:** Configured to point to the CloudFront distribution URL (`process.env.NEXT_PUBLIC_CHATBOT_API_ENDPOINT`).
  - **Request Construction:** On send, gathers context (`problemDetails`, `userCode`, `messages` history, `userInput`). Creates a JSON payload.
  - **API Call:** Uses `fetch` or a library (like an updated `chatbotApi.ts`).
    - **Authentication:** Retrieves the current user's JWT (ID token) using Amplify Auth (`fetchAuthSession`).
    - **Hashing:** Calculates the SHA256 hash of the JSON payload and includes it in the `x-amz-content-sha256` header.
    - Makes a **POST** request, including:
      - `Authorization: Bearer <idToken>` header.
      - `Content-Type: application/json` header.
      - `x-amz-content-sha256` header.
  - **Response Handling (SSE):**
    - Uses the `EventSource` API to connect to the chatbot endpoint for receiving the SSE stream.
    - Listens for `message` events, parses the `event.data` (which contains the response chunk), and updates the `streamingResponse` state incrementally.
    - Handles `error` and `open` events from `EventSource`.
  - **UI Update:** Renders chat history and the incremental `streamingResponse` (if streaming) or the full response.
  - **State Management:** Updates `messages` array upon response completion. Manages `isLoading` state.
  - **Error Handling:** Catches errors during API calls (JWT fetching, hashing, network errors, non-2xx responses including 401/403). Handles `EventSource` errors.

### 3.2 API Client (Recommended): `src/api/chatbotApi.ts`

- Update/Create a client function to:
  - Encapsulate fetching the JWT (`getAuthHeaders` logic).
  - Encapsulate payload hashing.
  - Optionally, encapsulate setting up and managing the `EventSource` connection for SSE.

### 3.3 Dependencies

- Ensure Amplify Auth libraries are configured and used correctly.
- No specific SSE client library is needed if using the native `EventSource` API.

## 4. Backend Implementation (`backend/lambdas/chatbot-query/`)

- **Location:** `backend/lambdas/chatbot-query/`
- **Runtime:** Node.js or Python (choose one)
- **Handler:** An entry point function (e.g., `index.handler` in Node.js, `lambda_function.lambda_handler` in Python).
- **Functionality:**
  - **JWT Validation:**
    - Extract the `Authorization: Bearer <token>` header.
    - Use a library (e.g., `jose` for Node.js, `python-jose` or `PyJWT` for Python) to validate the token.
    - Fetch the JWKS keys from the Cognito User Pool's JWKS endpoint (derived from `cognito_user_pool_provider_url` output from `infrastructure/cognito`). Cache the keys.
    - Verify the token's signature, expiration, issuer (`iss` claim should match provider URL), and audience (`aud` claim should match the User Pool Client ID from `infrastructure/cognito`).
    - Return 401/403 if validation fails.
  - **Parsing:** If JWT is valid, parse the event body (JSON payload).
  - **API Key Retrieval:** Gets the AI API Key (e.g., Google AI Key) securely from environment variables or SSM Parameter Store.
  - **AI Interaction:** Initializes the AI SDK (e.g., Google AI, Langchain) with the key. Constructs the prompt, ensuring the "no spoiler" rule. Calls the AI model API (potentially requesting streaming).
  - **Response Generation (SSE):**
    - Use Lambda response streaming wrapper/mechanism.
    - Set `Content-Type: text/event-stream` header.
    - Format each chunk of the AI response as an SSE message (e.g., `data: ${JSON.stringify({ chunk: '...' })}\n\n`).
    - Send a final marker if needed (e.g., `data: [DONE]\n\n`).
  - **Error Handling:** Implement robust error handling (JWT validation errors, parsing, key retrieval, AI API errors). Return appropriate HTTP status codes.
- **Dependencies:** Include JWT validation library, AI SDK/Langchain, AWS SDK (if needed) in `package.json` / `requirements.txt`.

## 5. Infrastructure (`infrastructure/chatbot/`)

- Define using **Terraform**:
  - **Terraform Setup:**
    - Configure S3 backend, similar to `infrastructure/cognito/backend.tf` but with a different key (e.g., `chatbot/terraform.tfstate`).
    - Define providers (AWS).
    - Use `terraform_remote_state` data source to fetch outputs from the Cognito state (e.g., `cognito_user_pool_provider_url`, `cognito_user_pool_client_id`).
  - **Lambda Function:**
    - Define `aws_lambda_function` resource (`chatbot-query`).
    - Configure Function URL: `authorization_type = "AWS_IAM"`, `invoke_mode = "RESPONSE_STREAM"`.
    - Pass Cognito User Pool details (Provider URL/JWKS URL, Client ID/Audience) needed for JWT validation as environment variables.
    - Configure runtime, handler, memory, timeout, and code location.
  - **Lambda Execution Role (`aws_iam_role`, `aws_iam_policy`, `aws_iam_role_policy_attachment`):** Grant permissions for logs, AI key secret access (if SSM), etc.
  - **CloudFront OAC:**
    - Define `aws_cloudfront_origin_access_control` resource (`origin_access_control_origin_type = "lambda"`).
  - **CloudFront Distribution (`aws_cloudfront_distribution`):**
    - Define the origin pointing to the Lambda Function URL **domain name**.
    - Set `origin_access_control_id` to the created OAC ID.
    - Configure the default cache behavior:
      - `allowed_methods = ["POST", "OPTIONS"]` (Include OPTIONS for potential CORS preflight).
      - `cached_methods = ["OPTIONS"]`.
      - `cache_policy_id` corresponding to `CachingDisabled`.
      - `origin_request_policy_id` corresponding to a policy that forwards necessary headers, **including `Authorization`, `Content-Type`, `x-amz-content-sha256`**. Use `AllViewerExceptHostHeader` or create a custom policy.
  - **Lambda Permission (`aws_lambda_permission`):**
    - Grant `lambda:InvokeFunctionUrl` permission to `cloudfront.amazonaws.com`, conditioned on the CloudFront distribution ARN (`source_arn`).

## 6. Deployment

- **Infrastructure:** Deploy the Terraform configuration (`terraform apply`) for the `infrastructure/chatbot/` module.
- **Backend:** Deploy the Lambda function code.
- **Frontend:** Deploy the updated frontend, ensuring `NEXT_PUBLIC_CHATBOT_API_ENDPOINT` points to the CloudFront domain name.
- **GitHub Actions:** Update/create workflow for Terraform apply and Lambda deployment for the chatbot.

## 7. Data Schema

- **Frontend -> Backend Request Body (JSON):**
  ```json
  {
    "problemDetails": { ... }, // ProblemDetail object
    "userCode": "...",        // String
    "history": [ { "role": "user" | "model", "content": "..." }, ... ],
    "query": "..."            // User's latest message
  }
  ```
- **Backend -> Frontend SSE Stream (`text/event-stream`):**

  ```
  data: {"chunk": "Hello"}

  data: {"chunk": ", how"}

  data: {"chunk": " can I"}

  data: {"chunk": " help?"}

  data: [DONE]

  ```

  (Exact format of `data` payload can be adjusted, e.g., simple string or JSON object)

## 8. Error Handling

- **Frontend:** Handle HTTP errors (401/403 for auth, 4xx, 5xx). Handle `EventSource` connection errors.
- **CloudFront:** Configuration errors (e.g., OAC mismatch) might result in 5xx errors.
- **Lambda:**
  - Return 401/403 specifically for JWT validation failures.
  - Return 400 for bad requests (e.g., invalid JSON payload).
  - Return 500 for internal errors (e.g., AI API issues, unhandled exceptions).
  - Log detailed errors to CloudWatch Logs.

## 9. Security Considerations

- **API Key Security:** The AI API Key is now securely stored in the Lambda environment, not exposed client-side. This is the primary security benefit of this architecture.
- **User Authentication:** All requests are validated using JWTs from the existing Cognito User Pool, ensuring only logged-in users can access the chatbot.
- **Endpoint Protection:** Lambda Function URL protected by IAM and OAC.
- **Request Signing:** CloudFront uses SigV4 via OAC.
- **Header Forwarding:** Ensure only necessary headers (`Authorization`, `Content-Type`, `x-amz-content-sha256`) are forwarded by CloudFront.
- **Payload Integrity:** The `x-amz-content-sha256` header, required by the frontend, helps ensure the payload hasn't been tampered with between the client and CloudFront (though CloudFront itself is trusted).
- **WAF:** Consider enabling AWS WAF on CloudFront for rate limiting, IP blocking, and protection against common attacks.
