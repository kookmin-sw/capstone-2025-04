# PRD: AI Chatbot Assistant for Coding Test Solve Page

**Version:** 1.0
**Date:** 2025-04-13
**Author:** pwh9882

## 1. Introduction

This document outlines the requirements for an AI-powered chatbot assistant integrated into the coding test solving page (`/coding-test/solve`) of the ALPACO platform. The chatbot aims to provide helpful, non-spoiling guidance to users while they are working on coding problems.

## 2. Goals

- Enhance the user learning experience by providing contextual assistance during problem-solving.
- Reduce user frustration by offering hints and explanations without revealing the direct solution.
- Leverage AI (LLM) capabilities to understand user queries related to the problem and their code.
- Provide a seamless and interactive experience through real-time streaming responses.

## 3. User Stories

- **As a user solving a coding problem, I want to ask the chatbot clarifying questions about the problem description, so that I can better understand the requirements.** (e.g., "What does 'contiguous subarray' mean?", "Can the input array be empty?")
- **As a user debugging my code, I want to ask the chatbot for hints about potential issues or alternative approaches related to my current code, so that I can overcome roadblocks.** (e.g., "Why might my code be timing out?", "Is there a more efficient data structure I could use here?")
- **As a user learning a concept, I want to ask the chatbot for explanations of specific algorithms or data structures relevant to the problem, so that I can deepen my understanding.** (e.g., "Can you explain how Dijkstra's algorithm works?", "What are the time complexities of different sorting algorithms?")
- **As a user, I want the chatbot's responses to appear quickly and incrementally (streaming), so that the interaction feels natural and responsive.**
- **As a user, I want to be assured that the chatbot will not give me the direct answer or complete solution code, so that I still have the opportunity to solve the problem myself.**

## 4. Requirements

### 4.1 Functional Requirements

- **FR1: Chat Interface:**
  - Display a chat interface within the right sidebar panel of the `/coding-test/solve` page.
  - Include an input field for users to type questions.
  - Include a button to send the user's message.
  - Display the conversation history (user messages and chatbot responses).
  - Indicate when the chatbot is processing a request or generating a response.
- **FR2: Contextual Input:**
  - When the user sends a message, the frontend must gather and send the following context to the backend API:
    - Current problem details (ID, title, description, constraints, etc.).
    - User's current code from the editor.
    - Current chat history (list of previous user/assistant messages).
    - The user's latest message/question.
- **FR3: Backend Processing:**
  - The backend API (Lambda function) must receive the context and user message.
  - It must use Langchain and an appropriate LLM (e.g., AWS Bedrock Claude) to generate a response.
  - The prompt sent to the LLM must explicitly instruct it **not** to provide direct solutions or significant spoilers.
  - The backend must support and return a streaming response.
- **FR4: Streaming Response:**
  - The chatbot's response must be streamed back to the frontend token by token.
  - The frontend must display the incoming tokens incrementally in the chat UI.
- **FR5: Authentication:**
  - API requests to the chatbot backend must be authenticated using the user's Cognito session (JWT token).
- **FR6: Spoiler Prevention:**
  - The core logic (prompt engineering) must prioritize providing hints, explanations, and clarifications over direct answers or code solutions.

### 4.2 Non-Functional Requirements

- **NFR1: Performance:** Chatbot responses should begin streaming back to the user within a few seconds of the request.
- **NFR2: Scalability:** The backend infrastructure (API Gateway, Lambda) should scale automatically to handle varying user loads.
- **NFR3: Security:** API endpoints must be secured, and user data handled appropriately. Communication should use HTTPS.
- **NFR4: Maintainability:** Code (frontend, backend, infrastructure) should follow project conventions and be well-documented.

### 4.3 Infrastructure & Deployment

- **ID1:** Infrastructure (Lambda, API Gateway, IAM) must be defined using Terraform.
- **ID2:** Deployment of the backend Lambda and infrastructure updates must be automated using GitHub Actions.

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

## 6. Future Considerations (Out of Scope for v1.0)

- Persistent chat history storage (e.g., DynamoDB).
- Ability to reference specific lines of user code in questions.
- Integration with code execution results (once available).
- More sophisticated context management (summarization of long histories).
- User feedback mechanism for chatbot responses.

## 7. Success Metrics

- User engagement with the chatbot feature (e.g., number of messages sent per session).
- Qualitative user feedback on the helpfulness and non-spoiling nature of the responses.
- Reduction in user drop-off rate on the solve page (hypothesis).
