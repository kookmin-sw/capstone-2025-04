# To-Do List: AI Chatbot Assistant Implementation (Client-Side Gemini v2.0)

This list breaks down the implementation of the AI Chatbot Assistant feature based on the updated PRD and Feature Specification, using a client-side Google Gemini approach.

**Legend:**

- `[ ]` - To Do
- `[x]` - Done
- `[-]` - In Progress
- `[b]` - Blocked

---

## Phase 1: Planning & Setup (v2.0 Update)

- [x] **Architecture:** Decide to switch to a client-side architecture using Google Gemini.
- [x] **Documentation:** Update Plan Summary (`chatbot-plan-summary.md`).
- [x] **Documentation:** Update Feature Specification (`chatbot-feature-spec.md`).
- [x] **Documentation:** Update Product Requirements Document (`chatbot-prd.md`).
- [x] **Documentation:** Update this To-Do List (`chatbot-todo.md`).
- [ ] **API Key:** Obtain a Google AI API Key for the Gemini API.
- [ ] **Frontend:** Configure the API key securely in the frontend environment (e.g., `NEXT_PUBLIC_GEMINI_API_KEY` in `.env.local`).
- [ ] **Frontend:** Add `@langchain/google-genai` dependency to `frontend/package.json` and run `npm install`.

## Phase 2: Client-Side Implementation

- [ ] **Frontend:** Remove the unused API client file (`frontend/src/api/chatbotApi.ts`).
- [ ] **Frontend (`Chatbot.tsx`):**
  - [ ] Import `ChatGoogleGenerativeAI` from `@langchain/google-genai` and necessary Langchain core messages.
  - [ ] Retrieve API Key from environment variables.
  - [ ] Initialize `ChatGoogleGenerativeAI` model with API key and `streaming: true`.
  - [ ] Update `handleSendMessage` function:
    - [ ] Construct prompt/history using Langchain messages (`SystemMessage`, `HumanMessage`, `AIMessage`).
    - [ ] Call the Langchain model's `.stream()` method with the messages.
    - [ ] Process the streamed `AIMessageChunk` response (iterate, extract `content`, update `streamingResponse` state).
    - [ ] Update `messages` state on stream completion (use `role: 'model'`).
    - [ ] Implement error handling for API key issues, SDK errors, and API errors.
- [ ] **Testing:** Perform initial client-side testing:
  - [ ] Verify UI updates correctly during streaming.
  - [ ] Verify final message assembly.
  - [ ] Test error handling (e.g., invalid API key).

## Phase 3: Cleanup & Finalization

- [ ] **Backend:** Delete the `backend/lambdas/chatbot-query/` directory.
- [ ] **Infrastructure:** Delete the `infrastructure/chatbot/` directory.
- [ ] **Deployment:** Remove the chatbot backend deployment job/workflow from GitHub Actions (e.g., `.github/workflows/deploy-chatbot.yml`).
- [ ] **Testing:** Conduct thorough end-to-end testing of the client-side chatbot within the application.
- [ ] **Documentation:** Ensure all documentation reflects the final client-side implementation.
