# Feature Specification: AI Chatbot Assistant (Client-Side Gemini)

**Version:** 2.0
**Date:** 2025-04-13
**Author:** pwh9882

## 1. Overview

This document provides the technical specification for the AI Chatbot Assistant feature integrated into the ALPACO coding test solve page. It details the **client-side implementation** using the Google Generative AI SDK to interact directly with a Gemini model. Refer to `chatbot-prd.md` for user requirements and goals.

## 2. Architecture

The feature utilizes a **purely client-side architecture** for chatbot interactions:

1.  **Frontend:** A React component (`Chatbot.tsx`) within the existing `/coding-test/solve` page handles UI, state, context gathering, prompt construction, and communication with the Google Gemini API.
2.  **Google AI SDK:** The `@google/generative-ai` SDK, running in the browser, facilitates interaction with the Gemini API.
3.  **Gemini API:** Google's generative AI service (e.g., `gemini-pro`) processes the prompts and returns streamed responses.
4.  **API Key:** A Google AI API key, configured via a frontend environment variable (e.g., `NEXT_PUBLIC_GEMINI_API_KEY`), is used to authenticate requests to the Gemini API.

```mermaid
sequenceDiagram
    participant User
    participant Frontend (Chatbot.tsx)
    participant Langchain SDK (@langchain/google-genai)
    participant Google Gemini API

    User->>+Frontend: Types message and clicks Send
    Frontend->>+Langchain SDK: Initializes ChatGoogleGenerativeAI with API Key
    Frontend->>+Langchain SDK: Calls model.stream(messages)
    Langchain SDK->>+Google Gemini API: Sends API Request (Prompt + API Key)
    Google Gemini API-->>-Langchain SDK: Streams response tokens
    Langchain SDK-->>-Frontend: Yields AIMessageChunk objects
    Frontend->>-User: Updates UI incrementally with response content
```

## 3. Frontend Implementation (`frontend/`)

### 3.1 Component: `src/components/Chatbot.tsx`

- **Purpose:** Replaces the placeholder `RightSidebar` in `solve/page.tsx`. Manages the chat UI and interaction logic, including direct communication with the Gemini API.
- **State:**
  - `messages`: Array of chat messages (`{ role: 'user' | 'model', content: string }[]`). Note: Role might change to 'model' for Gemini.
  - `userInput`: Current content of the input field.
  - `isLoading`: Boolean indicating if waiting for a response.
  - `streamingResponse`: String holding the currently streaming response part.
- **Props:**
  - `problemDetails`: `ProblemDetail` object (passed down from `CodingTestContent`).
  - `userCode`: Current code string (passed down from `CodingTestContent`).
- **Functionality:**
  - **API Key:** Retrieves the Google AI API key from `process.env.NEXT_PUBLIC_GEMINI_API_KEY`.
  - **Initialization:** Initializes the **`ChatGoogleGenerativeAI`** model from `@langchain/google-genai` with the API key and `streaming: true`.
  - **Prompt Construction:** On send, gathers `problemDetails`, `userCode`, `messages` history, and `userInput`. Constructs a prompt using **Langchain messages** (`SystemMessage`, `HumanMessage`, `AIMessage`) including context and the "no spoiler" rule.
  - **API Call:** Calls the Langchain model's `.stream()` method with the constructed messages array.
  - **Stream Processing:** Iterates through the response stream of **`AIMessageChunk`** objects provided by the SDK.
    - Extracts the `content` property from each chunk.
  - **UI Update:** Renders chat history and the incremental `streamingResponse`.
  - **State Management:** Updates `messages` array upon stream completion. Manages `isLoading` state.
  - **Error Handling:** Catches errors during SDK initialization or API calls and displays them (e.g., using `toast`).

### 3.3 Dependencies

- Add `@langchain/google-genai` (and potentially `langchain`) to `frontend/package.json`.

## 4. Backend Implementation

- **REMOVED:** No backend Lambda function (`backend/lambdas/chatbot-query/`) is required for this client-side architecture.

## 5. Infrastructure

- **REMOVED:** No dedicated chatbot infrastructure (`infrastructure/chatbot/`) is required (No API Gateway, Lambda Role, etc.).

## 6. Deployment

- **Simplified:** No separate backend/infrastructure deployment is needed. Frontend deployment remains the same.
- **Environment Variable:** Ensure `NEXT_PUBLIC_GEMINI_API_KEY` is set in the Vercel/deployment environment.
- **GitHub Actions:** Remove the `deploy-chatbot.yml` workflow or the job responsible for deploying the chatbot backend/infra.

## 7. Data Schema

- **Chat History:** Array of objects: `{ role: 'user' | 'model', content: string }` (Langchain roles may differ slightly, e.g., 'human', 'ai', adapt as needed).
- **Langchain/Gemini API Request/Response:** Follows the schema defined by the `@langchain/google-genai` SDK interactions.

## 8. Error Handling

- **Frontend (`Chatbot.tsx`):** Display user-friendly messages for:
  - Missing API Key.
  - Errors during SDK initialization.
  - Errors returned by the Gemini API (e.g., rate limits, invalid requests, content filtering).
  - Network errors during the API call.
  - Errors during stream processing.
  - Use `toast` notifications for clarity.

## 9. Security Considerations

- **API Key Exposure:** Using `NEXT_PUBLIC_` makes the API key publicly visible in the browser's JavaScript bundles. This is a significant security risk for production applications. Consider implementing restrictions on the API key (e.g., HTTP referrer restrictions) if supported by Google AI, or using a backend proxy for key management in a real-world scenario. For this project's current phase, we accept this risk.
