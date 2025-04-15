# Plan Summary: AI Chatbot Assistant (Lambda + CloudFront OAC)

**Version:** 3.1
**Date:** 2025-04-14
**Author:** pwh9882

## 1. Objective

Implement an AI-powered chatbot assistant within the coding test solving page (`/coding-test/solve`) using a secure backend architecture. The feature will leverage an **AWS Lambda function** invoked via its **Function URL**, with access restricted exclusively through an **Amazon CloudFront distribution using Origin Access Control (OAC)**. The Lambda function will **validate user JWTs** from the existing Cognito User Pool and interact with the AI model (e.g., Google Gemini), protecting API keys. Responses will be streamed back using **Server-Sent Events (SSE)**.

## 2. High-Level Plan

1.  **Documentation:** Update Feature Specification, PRD, and To-Do list to reflect the Lambda + CloudFront OAC architecture with Terraform, JWT auth, and SSE. (In Progress)
2.  **Infrastructure Setup (`infrastructure/chatbot/` using Terraform):**
    - Configure Terraform S3 backend and provider.
    - Use `terraform_remote_state` to get Cognito outputs (User Pool ID/Provider URL, Client ID).
    - Define resources:
      - Lambda Function (`chatbot-query`) with IAM Role (passing Cognito details as env vars).
      - Lambda Function URL (IAM Auth, Response Streaming).
      - CloudFront OAC (for Lambda).
      - CloudFront Distribution (using OAC, **forwarding Auth header**, CachingDisabled, POST allowed).
      - Lambda Resource Policy granting invoke permission _only_ to the CloudFront distribution.
3.  **Backend Implementation (`backend/lambdas/chatbot-query/`):**
    - Develop the Lambda function handler (Node.js/Python).
    - Implement logic to:
      - **Validate incoming JWT** (using Cognito User Pool details from env vars).
      - Parse request body if JWT is valid.
      - Securely retrieve AI API Key.
      - Interact with the AI Model API.
      - **Stream response back using SSE format (`text/event-stream`)**.
4.  **Frontend Implementation (`Chatbot.tsx`):**
    - Update the `Chatbot.tsx` component.
    - Configure the CloudFront distribution URL.
    - Implement logic to:
      - Get user JWT from Amplify Auth.
      - Construct JSON payload.
      - **Calculate SHA256 hash of the payload and add `x-amz-content-sha256` header.**
      - Make the **POST request with `Authorization: Bearer <jwt>` header.**
      - **Use `EventSource` API to handle the SSE response stream.**
    - Update API client (`chatbotApi.ts`).
5.  **Deployment:**
    - Deploy backend Lambda code.
    - Apply Terraform changes (`terraform apply`).
    - Deploy updated frontend.
    - Update GitHub Actions workflow for Terraform & Lambda deployment.
6.  **Testing:** End-to-end testing including JWT auth, OAC security, SSE streaming, and error handling.

## 3. Data Flow Diagram

```mermaid
graph TD
    A[User @ Browser] --> B{Frontend (Chatbot.tsx)};
    B -- "1. Get JWT (Amplify Auth)" --> Cognito[(Existing Cognito User Pool)];
    Cognito -- "JWT" --> B;
    B -- "2. POST /chatbot\nBody: {context...}\nHeaders: Auth JWT, x-amz-content-sha256" --> C[CloudFront Distribution];
    C -- "3. OAC (SigV4) + Fwd Headers" --> D[Lambda Function URL];
    D -- "4. Invoke" --> E[Lambda: chatbot-query];
    subgraph "Lambda Execution"
        E -- "5. Validate JWT" --> Cognito_Validate{Cognito JWKS};
        Cognito_Validate -- "Valid/Invalid" --> E;
        E -- "6. Get AI Key" --> F(Secure Store: Env Var/SSM);
        E -- "7. Send Prompt" --> G[AI Model API (e.g., Gemini)];
        G -- "8. (Streamed) Response" --> E;
        E -- "9. Format as SSE" --> E_SSE_Format;
    end
    E_SSE_Format -- "10. Stream SSE Chunks" --> D;
    D -- "11. Response" --> C;
    C -- "12. Stream SSE Chunks" --> B;
    B -- "13. Process SSE (EventSource) & Update UI" --> A;

    subgraph "AWS Cloud (Chatbot Infra - Terraform)"
        C
        D
        E
        F
        E_SSE_Format
    end
    subgraph "AWS Cloud (Existing Infra)"
        Cognito
        Cognito_Validate
    end

    style Frontend fill:#f9f,stroke:#333,stroke-width:2px
```

## 4. Key Considerations

- **Security:** API Key secured backend. User auth via Cognito JWT validation. Lambda endpoint protected by CloudFront OAC.
- **IaC:** Use **Terraform** for chatbot infrastructure, integrating with existing remote state (Cognito).
- **Streaming:** Use **Server-Sent Events (SSE)** for better user experience.
- **`x-amz-content-sha256` Header:** Mandatory for frontend.
- **JWT Validation:** Lambda needs Cognito User Pool details (Provider URL/JWKS URL, Audience/Client ID) and a validation library.
- **Header Forwarding:** CloudFront must forward `Authorization` and other necessary headers.
- **Cold Starts:** Lambda cold starts might impact initial response time. Consider provisioned concurrency if latency is critical (though likely overkill initially).
- **Cost:** Introduces costs for Lambda execution, data transfer, and CloudFront requests (though often within free tiers for moderate usage).

## 5. Next Steps

Rewrite the To-Do list (`chatbot-todo.md`) based on this updated plan (Terraform, JWT, SSE). Then, proceed with Infrastructure Setup.
