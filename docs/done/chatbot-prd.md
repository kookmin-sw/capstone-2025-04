# PRD: AI Chatbot Assistant for Coding Test Solve Page (Lambda + CloudFront OAC)

**Version:** 3.0
**Date:** 2025-04-14
**Author:** pwh9882

## 1. Introduction

This document outlines the requirements for an AI-powered chatbot assistant integrated into the coding test solving page (`/coding-test/solve`) of the ALPACO platform. The chatbot aims to provide helpful, non-spoiling guidance to users while they are working on coding problems, **using a backend AWS Lambda function exposed via a Function URL and secured by Amazon CloudFront with Origin Access Control (OAC).** Interaction with the AI model (e.g., Google Gemini) will happen within the Lambda function.

## 2. Goals

- Enhance the user learning experience by providing contextual assistance during problem-solving.
- Reduce user frustration by offering hints and explanations without revealing the direct solution.
- Leverage AI (e.g., Gemini LLM) capabilities securely on the backend to understand user queries related to the problem and their code.
- Provide a seamless and interactive experience through real-time streaming responses (leveraging Lambda response streaming if possible).
- Secure the backend endpoint effectively using CloudFront OAC.

## 3. User Stories

- **As a user solving a coding problem, I want to ask the chatbot clarifying questions about the problem description, so that I can better understand the requirements.** (e.g., "What does 'contiguous subarray' mean?", "Can the input array be empty?")
- **As a user debugging my code, I want to ask the chatbot for hints about potential issues or alternative approaches related to my current code, so that I can overcome roadblocks.** (e.g., "Why might my code be timing out?", "Is there a more efficient data structure I could use here?")
- **As a user learning a concept, I want to ask the chatbot for explanations of specific algorithms or data structures relevant to the problem, so that I can deepen my understanding.** (e.g., "Can you explain how Dijkstra's algorithm works?", "What are the time complexities of different sorting algorithms?")
- **As a user, I want the chatbot's responses to appear quickly and potentially incrementally (streaming), so that the interaction feels natural and responsive.**
- **As a user, I want to be assured that the chatbot will not give me the direct answer or complete solution code, so that I still have the opportunity to solve the problem myself.**

## 4. Requirements

### 4.1 Functional Requirements

- **FR1: Chat Interface:**
  - Display a chat interface within the right sidebar panel of the `/coding-test/solve` page.
  - Include an input field for users to type questions.
  - Include a button to send the user's message.
  - Display the conversation history (user messages and chatbot responses).
  - Indicate when the chatbot is processing a request or generating a response.
- **FR2: Contextual Input & Frontend Request:**
  - When the user sends a message, the **frontend (`Chatbot.tsx`)** must gather the following context:
    - Current problem details (ID, title, description, constraints, etc.).
    - User's current code from the editor.
    - Current chat history (list of previous user/model messages).
    - The user's latest message/question.
  - The frontend must send this context in the body of a **POST request** to the **CloudFront distribution endpoint**.
  - The frontend **must** include the `x-amz-content-sha256` header in the POST request, containing the SHA256 hash of the request payload, as required by Lambda Function URLs secured by SigV4 (via OAC).
- **FR3: Backend Processing & LLM Interaction:**
  - The **backend Lambda function (`chatbot-query`)** receives the request forwarded by CloudFront.
  - It parses the request body containing the context.
  - It securely retrieves the necessary **AI API key** (e.g., Google AI API Key) from its environment (e.g., Lambda environment variables, SSM Parameter Store).
  - It interacts with the AI model (e.g., using a Google AI SDK or Langchain) to generate a response based on the context and the **strict "no spoilers" rule**.
- **FR4: Streaming Response (Optional but Recommended):**
  - If feasible, the Lambda function should leverage **Lambda response streaming** to send the AI model's response back incrementally.
  - CloudFront supports streaming responses.
  - The frontend must be able to handle the streamed response and display the incoming text incrementally in the chat UI. If streaming is not implemented, the full response is sent once generated.
- **FR5: Security & Access Control:**
  - The Lambda Function URL must be configured with **`Auth type: AWS_IAM`**.
  - A **CloudFront Origin Access Control (OAC)** must be configured for the Lambda Function URL origin type.
  - The CloudFront distribution must use this OAC to access the Lambda origin.
  - The Lambda function's **resource-based policy** must be updated to only allow `lambda:InvokeFunctionUrl` calls from the specific CloudFront distribution ARN, ensuring the Function URL is not publicly accessible directly.
- **FR6: Spoiler Prevention:**
  - The core logic in the **backend Lambda function** (prompt engineering) must prioritize providing hints, explanations, and clarifications over direct answers or code solutions.

### 4.2 Non-Functional Requirements

- **NFR1: Performance:** Chatbot responses should ideally begin streaming back to the user within a reasonable time (a few seconds) after the request is sent. End-to-end latency through CloudFront and Lambda should be acceptable.
- **NFR2: Scalability:** Scalability is handled by AWS Lambda and the underlying AI API service. CloudFront enhances global delivery performance.
- **NFR3: Security:**
  - The AI API key must be stored securely in the backend Lambda environment, not exposed client-side.
  - Access to the Lambda Function URL must be strictly limited to the CloudFront distribution via OAC and IAM policies.
  - AWS WAF can be enabled on the CloudFront distribution for additional protection against common web exploits.
  - **API Key:** The AI API key must be stored securely in the backend Lambda environment (e.g., Env Var, SSM), not exposed client-side.
  - **Endpoint Protection:** Access to the Lambda Function URL must be strictly limited to the CloudFront distribution via OAC and IAM policies.
  - **User Authentication:** Requests to the CloudFront endpoint must include a valid user JWT (`Authorization: Bearer <token>`) obtained via the application's authentication mechanism (e.g., Cognito). The backend Lambda function must validate this JWT before processing the request.
  - **WAF:** AWS WAF can be enabled on the CloudFront distribution for additional protection (rate limiting, common exploits).
- **NFR4: Maintainability:** Backend Lambda code (including JWT validation) and any Infrastructure as Code (IaC) should follow project conventions and be well-documented. Frontend code (`Chatbot.tsx`) should be updated accordingly.

### 4.3 Infrastructure & Deployment

- **ID1:** Backend infrastructure consisting of AWS Lambda, Function URL, IAM Role, CloudFront OAC, and CloudFront Distribution is required.
- **ID2:** Deployment involves deploying/updating the backend Lambda function code, deploying/updating the necessary AWS infrastructure (ideally via IaC), and updating the frontend application to point to the CloudFront endpoint.

## 5. Design & UI Mockup (Conceptual)

- The right sidebar (`RightSidebar` component) will be replaced/updated with a `Chatbot` component.
- **Layout:**
  - Top: Header "AI Assistant"
  - Middle: Scrollable chat history area (alternating user/assistant messages).
  - Bottom: Text input area and Send button.
- **Styling:** Match the existing ALPACO theme (Tailwind CSS).

```
+-----------------------------+
| AI Assistant                |
+-----------------------------+
|                             |
|  [User]: Can you explain...?|
|                             |
|  [AI]: Sure, Dijkstra's...  |
|                             |
|                             |
|                             |
|                             |
+-----------------------------+
| [____________________] [Send]|
+-----------------------------+
```

## 6. Future Considerations (Out of Scope for v2.0 Client-Side)

- Persistent chat history storage (would require backend changes if needed beyond session storage).
- API key management using a backend proxy for improved security.
- Integration with code execution results.
- More sophisticated context management (summarization).
- User feedback mechanism.

## 7. Success Metrics

- User engagement with the chatbot feature (e.g., number of messages sent per session).
- Qualitative user feedback on the helpfulness and non-spoiling nature of the responses.
- Reduction in user drop-off rate on the solve page (hypothesis).
