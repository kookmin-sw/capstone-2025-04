# Problem Generator V2: Implementation To-Do List

- [x] **Infra:** Define Terraform for new Lambda, Layer, IAM, Function URL, CloudFront+OAC.
- [x] **Backend:** Implement Lambda handler with SSE streaming setup.
- [x] **Backend:** Implement LangChain pipeline (Refined: LLM validation added, error handling improved).
- [x] **Backend:** Design and implement LLM prompts for each step (Refined).
- [x] **Backend:** Update DynamoDB interactions (status tracking & final save implemented).
- [-] **Frontend:** Update `/generate-problem` UI for status display and results.
- [ ] **Frontend:** Implement `EventSource` logic to handle SSE messages.
- [ ] **Frontend:** Implement API call to trigger generation.
- [ ] **Integration:** Deploy backend & infra, connect frontend, end-to-end testing.
- [ ] **Docs:** Update API specifications and documentation.

**Notes:**

- _Backend:_ LLM-based validation added as an interim step. Sandbox execution is still recommended for full reliability.
