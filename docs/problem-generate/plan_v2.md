# Plan: Test-Driven Problem Generation with SSE Feedback (v2)

**Version:** 1.0
**Date:** 2025-04-16

## 1. Introduction

**Goal:** To revamp the existing coding problem generator (`problem-generator-aws`) to create novel, high-quality coding problems directly from user natural language prompts and difficulty levels. The primary focus is on ensuring the **correctness** of the generated solution code and its accompanying test cases.

**Problem:** The current generator relies on pre-existing templates, limiting its ability to create truly new problems based on user intent. Correctness guarantees are weak.

**Chosen Approach:** We will implement a **Test-Driven Generation (TDG)** pipeline. This approach prioritizes defining success criteria (tests) early in the process, which guides the generation of a correct solution. To mitigate the potentially longer generation time inherent in multi-step LLM pipelines and validation, we will provide **real-time feedback** to the user via **Server-Sent Events (SSE)**.

## 2. Pipeline Architecture

The generation process will follow these sequential steps, orchestrated by a backend service (likely a new Lambda function) and streamed to the frontend:

```mermaid
graph TD
    A[User Prompt + Difficulty] --> B{1. Intent Analysis & Test Case Design (LLM)};
    B -- Test Specs --> C{2. Solution Code Generation (LLM)};
    B -- Test Specs --> D{3. Test Case Generator Code Generation (LLM)};
    C -- Solution Code --> D;
    C -- Solution Code --> E{4. Validation};
    D -- Test Generator Code --> E;
    E -- Validation Result --> F{Decision};
    F -- Pass --> G{5. Constraints Derivation (LLM)};
    C -- Validated Solution --> G;
    D -- Validated Test Gen Code --> G;
    G -- Constraints --> H{6. Problem Description Generation (LLM)};
    B -- Analyzed Intent --> H;
    G -- Test Examples --> H;
    H -- Final Problem Details --> I[Save to DB & Send Final SSE];
    F -- Fail --> J[Send Error SSE & Log];

    subgraph SSE Streaming
        direction LR
        B --> S1[Status: Analyzing...];
        C --> S2[Status: Generating Solution...];
        D --> S3[Status: Generating Tests...];
        E --> S4[Status: Validating...];
        G --> S5[Status: Deriving Constraints...];
        H --> S6[Status: Writing Description...];
    end

    style S1,S2,S3,S4,S5,S6 fill:#eee,stroke:#333,stroke-dasharray: 5 5
```

## 3. Detailed Pipeline Steps

1. **Intent Analysis & Test Case Design:**

   - **Input:** User prompt (string), difficulty level (string: "Easy", "Medium", "Hard").
   - **Action (LLM):** Analyze prompt for core algorithm/concept, topic, constraints implied by difficulty. Design diverse test cases (inputs, expected outputs/logic) covering typical, edge, and performance scenarios.
   - **Output:** Structured analysis (JSON/text), Test case specifications (JSON/text).
   - **SSE Example:** `{"type": "status", "payload": "Analyzing prompt and designing test cases..."}`

2. **Solution Code Generation:**

   - **Input:** Analyzed intent, test case specifications.
   - **Action (LLM):** Generate solution code (target language, e.g., Python 3.12) aiming to pass the designed tests. Emphasize correctness and efficiency.
   - **Output:** Solution code (string).
   - **SSE Example:** `{"type": "status", "payload": "Generating solution code..."}`

3. **Test Case Generator Code Generation:**

   - **Input:** Test case specifications, generated solution code.
   - **Action (LLM):** Generate runnable Python 3.12 code for the test case generator, producing inputs/outputs from Step 1, potentially using the solution logic for verification.
   - **Output:** Test generator code (Python string).
   - **SSE Example:** `{"type": "status", "payload": "Generating test case code..."}`

4. **Validation:**

   - **Input:** Solution code, Test generator code.
   - **Action (Sandbox Execution - Recommended):**
     1. Execute the test generator to get actual test data (`inputs`, `expected_outputs`).
     2. Execute the solution code against each `input` in a secure sandbox (e.g., separate Lambda, Docker via AWS Batch/Fargate, Judge0, all using Python 3.12).
     3. Compare `actual_output` vs `expected_output`.
   - **Output:** Validation result (Pass/Fail + details).
   - **SSE Example:** `{"type": "status", "payload": "Validating generated code (Executing tests)..."}` -> `{"type": "status", "payload": "Validation successful!" or "Validation failed: Test case 3 mismatch"}`
   - **Failure Handling (v1):** Terminate generation, send error SSE, log details. (v2 could attempt LLM-based fixing).

5. **Constraints Derivation:**

   - **Input:** _Validated_ solution code, test cases/specifications.
   - **Action (LLM):** Analyze code complexity, data structures, test ranges to infer constraints (input size, time/memory limits, value ranges).
   - **Output:** Constraints description (string or structured JSON).
   - **SSE Example:** `{"type": "status", "payload": "Deriving problem constraints..."}`

6. **Problem Description Generation:**

   - **Input:** Analyzed intent, derived constraints, test case examples.
   - **Action (LLM):** Generate user-facing problem description (narrative, input/output format, constraints, examples), matching difficulty and style.
   - **Output:** Problem description (string).
   - **SSE Example:** `{"type": "status", "payload": "Generating final problem description..."}`

7. **Finalization:**
   - **Action:** Assemble all artifacts into the final `ProblemDetailAPI` structure. Save to DynamoDB (status: `completed`).
   - **SSE Example:** `{"type": "result", "payload": { ...ProblemDetailAPI... }}` or `{"type": "status", "payload": "✅ Generation complete!"}`. On failure: `{"type": "error", "payload": "Generation failed during [Step Name]: [Reason]"}`.

## 4. Backend Implementation

- **Service:** New AWS Lambda function (`problem-generator-streaming-v2`).
- **Runtime:** Python 3.12 (using LangChain Python) or Node.js (using LangChain JS/TS). Node.js might integrate better with frontend SSE handling via `EventSource`.
- **Orchestration:** LangChain `SequentialChain` or custom async functions calling `LLMChain` for each step.
- **Streaming:** Lambda Function URL with `invoke_mode = "RESPONSE_STREAM"`. Handler needs to write SSE formatted messages to the response stream.
- **LLM:** AWS Bedrock (e.g., Claude 3 Haiku/Sonnet) or Google AI (Gemini). Use appropriate LangChain integrations (`@langchain/aws`, `@langchain/google-genai`).
- **Validation Sandbox:** Requires a separate secure execution environment. Options:
  - Another Lambda function (potentially with increased memory/timeout, using `child_process` carefully or dedicated libraries, with Python 3.12 runtime).
  - AWS Batch or Fargate for Docker-based execution (more complex setup, ensure Python 3.12 image).
  - Third-party secure code execution API (e.g., Judge0 with Python 3.12 selected).
  - _Initial implementation might use LLM simulation (Option A) for faster development, clearly marking it as less reliable._
- **Database:** DynamoDB (`Problems` table) - Add `generationStatus`, `errorMessage` fields. Update status during pipeline execution.
- **API Endpoint:** CloudFront distribution proxying to the Lambda Function URL, secured with OAC (Origin Access Control) using IAM authorization (`AWS_IAM`) for the Lambda URL. CloudFront handles public access and forwards necessary headers.

## 5. Frontend Implementation

- **Page:** `/generate-problem` (`GenerateProblemClient.tsx`).
- **UI:**
  - Input textarea, difficulty selector, generate button.
  - Real-time status display area (receives SSE messages).
  - Result display area (shows final problem details).
- **SSE Client:** Use browser's built-in `EventSource` API to connect to the CloudFront endpoint.
- **State Management:** Use `useState` or Zustand/Context to manage loading state, status messages, errors, and final results.
- **API Call:** Function in `api/problemGeneratorApi.ts` (or similar) to initiate the generation (POST to CloudFront endpoint). This call might return immediately (202 Accepted) or the initial SSE connection details. The main feedback comes via the separate `EventSource` connection.

## 6. Validation Strategy Detail

- **Recommended (v1.1 / v2): Sandbox Execution.** Provides the highest confidence in correctness. Requires setting up the execution environment and handling its invocation/results securely.
- **Alternative (v1.0): LLM Simulation/Review.** Faster to implement, uses only LLM calls. Less reliable as LLMs can hallucinate or miss subtle bugs during review. Clearly communicate this limitation if used.

## 7. Future Considerations

- **Iterative Refinement:** Implement looping logic for the LLM to fix code based on validation failures.
- **Advanced Validation:** Static analysis, fuzz testing within the sandbox.
- **Multi-Language Support:** Allow users to specify the desired solution language; generate solution and potentially test harness in that language.
- **Cost/Latency Optimization:** Experiment with different LLMs per step, prompt optimization, caching strategies (if applicable).
- **User Feedback Loop:** Allow users to rate generated problems or report issues.

## 8. High-Level TODO List

- [ ] **Infra:** Define Terraform for new Lambda, Layer, IAM, Function URL, CloudFront+OAC.
- [ ] **Backend:** Implement Lambda handler with SSE streaming setup.
- [ ] **Backend:** Implement LangChain pipeline for the 6/7 steps (choose Validation Option A or B).
- [ ] **Backend:** Design and implement LLM prompts for each step.
- [ ] **Backend:** Update DynamoDB interactions (status tracking).
- [ ] **Frontend:** Update `/generate-problem` UI for status display and results.
- [ ] **Frontend:** Implement `EventSource` logic to handle SSE messages.
- [ ] **Frontend:** Implement API call to trigger generation.
- [ ] **Integration:** Deploy backend & infra, connect frontend, end-to-end testing.
- [ ] **Docs:** Update API specifications and documentation.

## 9. To-Do & Progress Tracking

- **Detailed To-Do File:** All implementation progress, blockers, and sub-tasks for this plan should be tracked in `docs/problem-generate/todo.md`.
- **Usage:**
  - Before starting a task, mark it as `[ ]` (to do).
  - When starting, mark as `[-]` (in progress).
  - On completion, mark as `[x]` (done).
  - If blocked, mark as `[b]` and add a note.
  - Add new sub-tasks as needed during implementation.
- **Reference:** See `docs/problem-generate/todo.md` for the current state and history of progress for this plan.

- **Rule Update:** The project implementation rules in `docs/problem-generate/project-rule.md` (to be created/updated) are tailored for this plan and should be followed for all progress tracking and planning.

## 10. References and Inspirations within the Project

This plan builds upon existing components and infrastructure within the `capstone-2025-04` repository. Developers should refer to the following resources during implementation:

**A. Infrastructure (`infrastructure/`):**

- **Path:** `capstone-2025-04/infrastructure/chatbot/`
- **Relevance:** **Highly relevant.** This Terraform module implements a very similar architecture: **Lambda Function URL (Streaming) + CloudFront + OAC + IAM Auth**. It serves as a direct blueprint for the V2 problem generator's infrastructure.
- **Key Files/Aspects:**
  - `lambda.tf`: Example of defining a Lambda function (`nodejs20.x` runtime) with a **Function URL** configured for `RESPONSE_STREAM` and `AWS_IAM` auth. V2 will adapt this for Python 3.12.
  - `cloudfront.tf`: Defines the **CloudFront distribution** proxying to the Lambda URL, including **OAC setup** and appropriate Cache/Origin Request policies (like `Managed-AllViewerExceptHostHeader` or similar).
  - `permissions.tf`: Shows the necessary `aws_lambda_permission` to allow CloudFront to invoke the Function URL.
  - `layer.tf` & `layers/chatbot_deps/nodejs/`: Demonstrates how to define a Lambda Layer using `archive_file` and the expected `nodejs/node_modules` structure. V2 will adapt this for Python dependencies (`python/lib/python3.12/site-packages`).
  - `iam.tf`: Example Lambda execution role and relevant policies (Bedrock access). V2 will need similar Bedrock/LLM permissions.
  - `backend.tf`: Uses the S3 backend defined in `backend-setup`. V2 will use the same bucket/table but with a different `key` (e.g., `problem-generator-v2/terraform.tfstate`).
  - `README.md`: Explains the Chatbot infrastructure architecture in detail.
- **Path:** `capstone-2025-04/infrastructure/backend-setup/`
- **Relevance:** **Prerequisite.** Defines the shared S3 bucket and DynamoDB table used for Terraform state management by all other infrastructure modules (`chatbot`, `api`, `app`, and the new `problem-generator-v2`). Must be applied first.
- **Key Files/Aspects:** `main.tf`, `outputs.tf`, `readme.md`.
- **Path:** `capstone-2025-04/infrastructure/api/`
- **Relevance:** Provides examples of Terraform for defining multiple Lambdas (`lambdas.tf`), DynamoDB (`dynamodb.tf`), IAM roles (`iam.tf`), and another Layer (`layer.tf`). While it uses API Gateway REST API instead of Function URL/CloudFront, the resource definition patterns are useful references.
- **Path:** `capstone-2025-04/infrastructure/cognito/`
- **Relevance:** Defines the Cognito setup used for user authentication. The V2 API (like the Chatbot API) will likely need to integrate with this for validating user tokens if protected endpoints are needed (though the generation endpoint itself might be protected by IAM via CloudFront/OAC initially). Outputs from this module (`cognito_user_pool_id`, etc.) are used by the Chatbot Lambda's environment variables.

**B Frontend (`frontend/`):**

- **Path:** `capstone-2025-04/frontend/src/app/generate-problem/GenerateProblemClient.tsx`
- **Relevance:** The UI component that will consume the V2 SSE stream. Contains the existing input elements and logic for displaying status/results (currently using a dummy stream). Needs significant updates to use the real `EventSource` API.
- **Path:** `capstone-2025-04/frontend/src/api/chatbotApi.ts`
- **Relevance:** **Crucial reference.** Implements a real SSE client using `fetch` (for streaming) and the `EventSource` API is implied although `fetch` is used directly here. Shows how to handle JWT (`Authorization` header via `fetchAuthSession`) and `x-amz-content-sha256` headers when calling a CloudFront endpoint backed by a Lambda Function URL.
- **Path:** `capstone-2025-04/frontend/src/components/Chatbot.tsx`
- **Relevance:** Demonstrates a UI pattern for displaying streamed text content and managing chat history, which can inform the status/result display in the V2 generator UI.
- **Path:** `capstone-2025-04/frontend/src/api/dummy/generateProblemApi.ts`
- **Relevance:** Defines the `ProblemDetailAPI` TypeScript interface, which represents the **target output structure** for the V2 generator pipeline. Also contains the _existing_ (non-streaming) API call functions (`createProblemAPI`, `getProblemDetailAPI`) which might still be relevant for fetching results _after_ generation if the SSE only returns the ID, or for listing generated problems.

**C. Design & Process (`docs/problem-generate/`):**

- **Path:** `capstone-2025-04/docs/problem-generate/research2.md`
- **Relevance:** The analysis document justifying the TDG approach and comparing pipeline alternatives. Provides the theoretical foundation for this plan.
- **Path:** `capstone-2025-04/docs/problem-generate/todo.md` (To be created based on this plan)
- **Relevance:** The detailed task list for implementing this V2 plan. Should be updated regularly according to `research1.md` rules.

By leveraging these existing implementations and documentation, especially the **Chatbot infrastructure pattern (CloudFront + OAC + Lambda URL)** and the **Chatbot API client (SSE + Auth headers)**, the development of the V2 Problem Generator can be significantly accelerated while maintaining consistency with the project's architecture. Remember to adapt patterns for Python where applicable (Lambda runtime, layer structure, SDKs).
