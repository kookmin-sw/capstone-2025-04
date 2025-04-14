# PRD: AI Chatbot Assistant for Coding Test Solve Page (Client-Side Gemini)

**Version:** 2.0
**Date:** 2025-04-13
**Author:** pwh9882

## 1. Introduction

This document outlines the requirements for an AI-powered chatbot assistant integrated into the coding test solving page (`/coding-test/solve`) of the ALPACO platform. The chatbot aims to provide helpful, non-spoiling guidance to users while they are working on coding problems, **using a client-side implementation powered by the Google Gemini API.**

## 2. Goals

- Enhance the user learning experience by providing contextual assistance during problem-solving.
- Reduce user frustration by offering hints and explanations without revealing the direct solution.
- Leverage AI (Gemini LLM) capabilities to understand user queries related to the problem and their code.
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
  - When the user sends a message, the **frontend (`Chatbot.tsx`)** must gather the following context:
    - Current problem details (ID, title, description, constraints, etc.).
    - User's current code from the editor.
    - Current chat history (list of previous user/model messages).
    - The user's latest message/question.
- **FR3: Client-Side Processing & LLM Interaction:**
  - The **frontend (`Chatbot.tsx`)** must use the **`@langchain/google-genai`** SDK (and potentially `langchain` core) to interact with the Gemini API.
  - It must construct a prompt suitable for Gemini using **Langchain messages**, incorporating the gathered context and the **strict "no spoilers" rule**.
  - It must call the Langchain Gemini model's `.stream()` method using a configured API key.
- **FR4: Streaming Response:**
  - The chatbot's response from the Gemini API, processed via the Langchain SDK, must be streamed back to the frontend as chunks (e.g., `AIMessageChunk`).
  - The frontend must process the stream, extract the content from chunks, and display the incoming text incrementally in the chat UI.
- **FR5: Authentication (API Key):**
  - Requests to the Gemini API must be authenticated using a **Google AI API key** configured in the frontend environment.
- **FR6: Spoiler Prevention:**
  - The core logic (prompt engineering) must prioritize providing hints, explanations, and clarifications over direct answers or code solutions.

### 4.2 Non-Functional Requirements

- **NFR1: Performance:** Chatbot responses should begin streaming back to the user within a reasonable time (a few seconds) after the request is sent to the Gemini API.
- **NFR2: Scalability:** Scalability is primarily handled by the Google Gemini API service.
- **NFR3: Security:** The primary security concern is the **exposure of the Google AI API key** in the client-side code. Appropriate key restrictions (if available) or alternative key management strategies should be considered for production.
- **NFR4: Maintainability:** Frontend code (`Chatbot.tsx`) should follow project conventions and be well-documented.

### 4.3 Infrastructure & Deployment

- **ID1:** No dedicated backend infrastructure is required.
- **ID2:** Deployment involves only updating the frontend application. The Google AI API key must be configured in the deployment environment.

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
