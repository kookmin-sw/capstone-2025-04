# Project Implementation Rules & Guidelines

This document outlines rules for referencing planning documents and managing the To-Do list during the implementation phase of features.

## 1. Referencing Planning Documents

When implementing features, consistently refer back to the relevant planning documents created during the Architect phase. For the AI Chatbot feature, these are:

- **`docs/chatbot-prd.md`:** Contains user stories, requirements, and overall goals. Use this to ensure the implementation meets the user needs.
- **`docs/chatbot-feature-spec.md`:** Provides technical details, architecture, API design, and data flow. Use this as the technical blueprint for implementation.
- **`docs/chatbot-plan-summary.md`:** Offers a high-level overview and data flow diagram for quick reference.

Before starting a specific implementation task, briefly review the corresponding sections in the PRD and Feature Spec to ensure alignment.

## 2. Updating the To-Do List (`docs/chatbot-todo.md`)

The To-Do list is the primary tool for tracking implementation progress. Follow these steps:

- **Before Starting a Task:** Identify the next logical task(s) from the To-Do list (`[ ]`).
- **Mark Task as In Progress:** When you begin working on a task, update its status marker to `[-]`.
  - Example: `[-] **Backend:** Create`backend/lambdas/chatbot-query/`directory.`
- **Upon Completing a Task:** Once a task is successfully completed and verified (e.g., code written, infrastructure applied, tested locally), update its status marker to `[x]`.
  - Example: `[x] **Backend:** Create`backend/lambdas/chatbot-query/`directory.`
- **If Blocked:** If a task cannot proceed due to external dependencies or unresolved issues, mark it as `[b]` and add a brief note explaining the blocker.
  - Example: `[b] **Infrastructure:** Add Cognito Authorizer configuration... (Blocked by Cognito infrastructure setup)`
- **Adding New Tasks:** If implementation reveals necessary sub-tasks not originally listed, add them to the appropriate phase in the To-Do list with the `[ ]` marker.
- **Regular Updates:** Aim to update the To-Do list after completing each significant step or tool use.

## 3. Communication

When switching modes or presenting results (`attempt_completion`), briefly mention which task(s) from the To-Do list were addressed or are about to be addressed. This helps maintain context and track progress against the plan.
