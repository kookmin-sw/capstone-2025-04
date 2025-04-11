# Coding Test Progress Page - Dynamic Problem Loading TODO

**Goal:** Modify the coding test progress page (`/coding-test/progress`) to fetch and display problem details dynamically based on the `?id=` query parameter, using a mock API for testing.

---

## Tasks

- [x] **1. Define API Types:**

  - [x] Create TypeScript interfaces for the Problem Detail API response structure (title, description, constraints, examples, etc.) in `frontend/src/api/codingTestApi.ts`.

- [x] **2. Create Mock API Endpoint:**

  - [x] Create `api/coding-test/mock-server.js` running on port 3002.
  - [x] Add a route handler for `GET /coding-test/problem/:id`.
  - [x] Implement logic to return mock problem data matching the defined structure based on the requested `:id`.

- [x] **3. Create API Client Function:**

  - [x] Add `getProblemById(id: string)` function to `frontend/src/api/codingTestApi.ts`.
  - [x] Implement the function to fetch data from the mock API endpoint (`http://localhost:3002/coding-test/problem/:id`).

- [x] **4. Modify Frontend Page (`/coding-test/solve/page.tsx`):** _(Corrected path)_

  - [x] Ensure the page uses `useSearchParams` (within `CodingTestContent`).
  - [x] Add state variables for `problemDetails`, `isLoadingProblem`, `errorProblem`.
  - [x] Use `useEffect` to call the `getProblemById` API function when the `id` from `useSearchParams` is available.
  - [x] Update the rendering logic in `CodingTestContent` to:
    - [x] Display loading state while fetching.
    - [x] Display error state if fetching fails.
    - [x] Display the fetched `problemDetails` (title, description, constraints, input/output format, examples) instead of the current static content.

- [x] **5. Testing:**
  - [x] Run the mock server and frontend dev server.
  - [x] Navigate to `/coding-test/progress?id=...` with different mock IDs and verify the correct problem details are displayed.
