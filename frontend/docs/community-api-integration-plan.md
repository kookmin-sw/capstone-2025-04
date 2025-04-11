# Frontend API Integration Plan: Community Feature

**Goal:** Replace dummy data and placeholder logic in the frontend community components with actual API calls to the backend specified in the API 명세서, handling authentication correctly using AWS Amplify.

## 1. API Client Setup

- **Create API Utility:** Create `frontend/src/api/communityApi.ts`. This file will contain functions to interact with the 9 specified community API endpoints using `fetch` or `axios`.
- **Authentication Handling:**
  - Implement a helper function (`getAuthHeaders`) in `communityApi.ts` using `fetchAuthSession` from `aws-amplify/auth` to get the JWT ID token.
  - Return `Authorization: Bearer <token>` header for authenticated requests.
  - Remove the top-level `await fetchAuthSession` from `Header.tsx`.
- **Define Types:** Create TypeScript interfaces in `communityApi.ts` (or a separate types file) for request bodies (e.g., `CreatePostPayload`, `CreateCommentPayload`, `UpdatePostPayload`) and response data structures (e.g., `PostSummary`, `PostDetail`, `Comment`, `LikeResponse`) based on the API 명세서.
- **API Functions:** Implement functions for each endpoint:
  - `getPosts(): Promise<PostSummary[]>` (GET /community)
  - `getPostById(postId: string): Promise<PostDetail>` (GET /community/{postId})
  - `createPost(payload: CreatePostPayload): Promise<any>` (POST /community) - _Auth Required_
  - `updatePost(postId: string, payload: UpdatePostPayload): Promise<any>` (PATCH /community/{postId}) - _Auth Required_
  - `deletePost(postId: string): Promise<any>` (DELETE /community/{postId}) - _Auth Required_
  - `likePost(postId: string): Promise<LikeResponse>` (POST /community/{postId}/like) - _Auth Required_
  - `getComments(postId: string): Promise<{ comments: Comment[], commentCount: number }>` (GET /community/{postId}/comment)
  - `createComment(postId: string, payload: CreateCommentPayload): Promise<any>` (POST /community/{postId}/comment) - _Auth Required_
  - `deleteComment(postId: string, commentId: string): Promise<any>` (DELETE /community/{postId}/comment/{commentId}) - _Auth Required_

## 2. Component Integration

- **List Page (`/community/page.tsx`):**
  - Convert to Client Component (`"use client"`).
  - Use `useState` for `posts`, `isLoading`, `error`.
  - Use `useEffect` to call `api.getPosts()` on mount.
  - Update state based on API response.
  - Map fetched `posts` data to the UI.
  - Remove static dummy data.
- **Detail Page (`/community/[id]/CommunityDetail.tsx`):**
  - Use `useState` for `post`, `comments`, `isLoading`, `error`, `newComment`, `isLiked`.
  - Use `useEffect` to call `api.getPostById(id)` and `api.getComments(id)`.
  - Display fetched data.
  - Implement Like Button: Check auth, call `api.likePost(id)`, update state.
  - Implement Comment Submission: Check auth, call `api.createComment(id, { content: newComment })`, update state/refetch.
  - Implement Edit/Delete Buttons (Post): Conditionally render based on auth & authorship (`post.author === user.username`). Edit links to `/community/[id]/edit`. Delete calls `api.deletePost(id)` with confirmation.
  - Implement Delete Button (Comment): Conditionally render based on auth & authorship. Delete calls `api.deleteComment(id, commentId)` with confirmation.
  - Remove dummy `getPost` function.
- **Create Page (`/community/create/page.tsx`):**
  - Implement `handleSubmit`: Check auth, call `api.createPost({ title, content, problemId: ... })`, navigate on success.
- **Edit Page (`/community/[id]/edit/page.tsx` - New):**
  - Create this page.
  - Fetch existing post data using `api.getPostById(id)` in `useEffect`.
  - Add author authorization check (`post.author === user.username`).
  - Implement `handleSubmit` to call `api.updatePost(id, { title, content })`.
  - Navigate back to detail page on success.

## 3. Refinements

- **Loading States:** Use spinners or skeleton loaders during API calls.
- **Error Handling (Refined):**
  - **API Client:** Parse backend error messages (`{ message: "..." }`) or generate standard network error messages. Return/throw errors with a user-friendly `message` property.
  - **UI Components:**
    - Integrate a toast notification library (e.g., `sonner`).
    - Display specific error messages from caught API errors using toast notifications.
    - Log full error objects to the console for debugging.
- **Optimistic Updates:** Consider for actions like liking or deleting comments (optional).

## Mermaid Diagram (Plan Overview)

```mermaid
graph TD
    A[Start: User Request] --> B{Identify Component};
    B --> C[Community List Page];
    B --> D[Community Detail Page];
    B --> E[Community Create Page];
    B --> F[Community Edit Page (New)];

    subgraph API Interaction
        G[API Client Utility (communityApi.ts)]
        H[Amplify Auth (fetchAuthSession)]
        I[Backend API (Lambda)]
        G --> H;
        G --> I;
    end

    subgraph Component Logic
        C --> |Fetch Data| G;
        C --> |Render List| J[Display Posts];

        D --> |Fetch Data| G;
        D --> |Render Details| K[Display Post & Comments];
        D --> |Like Post| G;
        D --> |Create Comment| G;
        D --> |Delete Comment| G;
        D --> |Delete Post| G;
        D --> |Navigate to Edit| F;

        E --> |Submit Form| G;
        E --> |Render Form| L[Display Create Form];

        F --> |Fetch Data| G;
        F --> |Submit Form| G;
        F --> |Render Form| M[Display Edit Form];
    end

    J --> A;
    K --> A;
    L --> A;
    M --> A;

    style G fill:#f9f,stroke:#333,stroke-width:2px
    style H fill:#ccf,stroke:#333,stroke-width:2px
    style I fill:#cfc,stroke:#333,stroke-width:2px
```
