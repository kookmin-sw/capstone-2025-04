# To-Do List: AI Chatbot Assistant Implementation

This list breaks down the implementation of the AI Chatbot Assistant feature based on the PRD and Feature Specification.

**Legend:**

- `[ ]` - To Do
- `[x]` - Done
- `[-]` - In Progress
- `[b]` - Blocked

---

## Phase 1: Setup & Initial Backend

- [ ] **Infrastructure:** Create `infrastructure/chatbot/` directory.
- [ ] **Infrastructure:** Define basic Terraform files (`providers.tf`, `variables.tf`, `backend.tf`).
  - [ ] Configure S3 backend with key `chatbot/terraform.tfstate`.
- [ ] **Infrastructure:** Define IAM Role and Policy (`iam.tf`) for Lambda execution, including `AWSLambdaBasicExecutionRole` and `bedrock:InvokeModelWithResponseStream` permissions.
- [ ] **Backend:** Create `backend/lambdas/chatbot-query/` directory.
- [ ] **Backend:** Create initial `lambda_function.py` with basic handler structure.
- [ ] **Backend:** Create `requirements.txt` with `boto3`, `langchain`, `langchain_aws`.
- [ ] **Infrastructure:** Define Lambda function resource (`lambda.tf`) using `archive_file` data source. Include environment variables (`BEDROCK_MODEL_ID`, `AWS_REGION`).
- [ ] **Infrastructure:** Define basic API Gateway resources (`apigateway.tf`): `/chatbot/query` POST method, `AWS_PROXY` integration, Lambda permission. (Defer Cognito auth & CORS for now).
- [ ] **Infrastructure:** Define outputs (`outputs.tf`) for the API Gateway invoke URL.
- [ ] **Deployment:** Create initial `deploy-chatbot.yml` GitHub Actions workflow to run `terraform init/plan/apply` for the `infrastructure/chatbot/` directory. Configure necessary secrets (`AWS_IAM_ROLE_ARN_CHATBOT`, etc.).
- [ ] **Testing:** Manually invoke the deployed Lambda (via AWS Console or `aws lambda invoke`) or the basic API Gateway endpoint (e.g., using `curl` or Postman) to ensure basic setup is working (expecting placeholder response or error initially).

## Phase 2: Core Backend Logic (LLM Interaction)

- [ ] **Backend:** Implement prompt construction logic in `lambda_function.py`.
  - [ ] Include system prompt with "no spoiler" rule.
  - [ ] Format chat history, user message, problem details, and user code into the prompt context (handle potential length limits).
- [ ] **Backend:** Initialize Langchain `ChatBedrock` client with `streaming=True`.
- [ ] **Backend:** Implement LLM stream invocation (`llm.stream(...)`).
- [ ] **Backend:** Implement response streaming logic.
  - [ ] **Decision:** Choose streaming method (Lambda Function URL, API Gateway HTTP API, or REST API workaround). Start with Function URL or standard REST API response as fallback.
  - [ ] Format and yield/return response chunks (e.g., `{"token": "..."}\n`).
- [ ] **Backend:** Add error handling for LLM interaction and processing.
- [ ] **Testing:** Update tests (manual or automated) to send sample context and verify streamed/full response from the backend. Check CloudWatch logs for errors.

## Phase 3: Frontend Implementation

- [ ] **Frontend:** Create `src/components/Chatbot.tsx` component.
- [ ] **Frontend:** Implement basic UI layout (header, message list, input, send button) using Tailwind CSS.
- [ ] **Frontend:** Implement state management (`messages`, `userInput`, `isLoading`, `streamingResponse`).
- [ ] **Frontend:** Integrate `Chatbot.tsx` into `src/app/coding-test/solve/page.tsx`, replacing `RightSidebar` and passing `problemDetails` and `userCode` as props.
- [ ] **Frontend:** Create `src/api/chatbotApi.ts` with `sendChatMessage` function structure.
- [ ] **Frontend:** Implement JWT token retrieval using `fetchAuthSession` in `sendChatMessage`.
- [ ] **Frontend:** Implement `fetch` call to the backend API endpoint (using the URL from Terraform output, likely via an environment variable `NEXT_PUBLIC_CHATBOT_API_URL`). Include `Authorization` header.
- [ ] **Frontend:** Implement response stream processing logic in `sendChatMessage` (using `ReadableStream`, `TextDecoder`, yielding tokens).
- [ ] **Frontend:** Connect `Chatbot.tsx` send action to call `sendChatMessage` and update UI state based on the yielded tokens and stream completion/errors.
- [ ] **Frontend:** Add loading indicators and error message display in the UI.
- [ ] **Testing:** Test UI interaction, message sending, and incremental display of streamed responses. Test error states.

## Phase 4: Authentication & CORS

- [ ] **Infrastructure:** Add Cognito Authorizer configuration to the `POST /chatbot/query` method in `apigateway.tf`. Use `data "terraform_remote_state"` to get Cognito User Pool ARN from the `cognito` state.
- [ ] **Infrastructure:** Add `OPTIONS` method and necessary CORS response headers (using MOCK integration) for `/chatbot/query` in `apigateway.tf` to allow requests from the frontend domain (`NEXT_PUBLIC_APP_BASE_URL`).
- [ ] **Deployment:** Ensure Terraform apply updates API Gateway correctly.
- [ ] **Testing:** Verify that authenticated requests succeed and unauthenticated requests fail. Verify CORS preflight requests are handled correctly from the browser.

## Phase 5: Refinement & Finalization

- [ ] **Backend:** Refine prompt engineering for better response quality and spoiler avoidance.
- [ ] **Frontend:** Polish UI/UX based on testing.
- [ ] **Documentation:** Update `README.md` files in relevant directories (`infrastructure/chatbot/`, `backend/lambdas/chatbot-query/`).
- [ ] **Testing:** Conduct thorough end-to-end testing across different scenarios.
- [ ] **Code Review:** Review frontend, backend, infrastructure, and workflow code.

---
