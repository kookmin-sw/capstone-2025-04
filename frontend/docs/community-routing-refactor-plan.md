# Community Routing Refactor Plan (`[id]` to `?id=`)

**Goal:** Refactor the community feature routing from using dynamic route segments (`/community/[id]`) to using query parameters (`/community?id=...`) to ensure compatibility with Next.js static export (`output: 'export'`) for S3 deployment.

**Reason:** Static export requires `generateStaticParams` for dynamic routes. Handling dynamically created post IDs (unknown at build time) with this setup is problematic. Using query parameters on a single page (`/community`) is the standard solution for static sites needing dynamic content display based on URL parameters.

---

## Refactoring Tasks

- [x] **1. Modify `/community/page.tsx`:**

  - [x] Ensure it's a Client Component (`"use client"`).
  - [x] Import `useSearchParams` and wrap content in `<Suspense>`.
  - [x] Read the `id` query parameter using `useSearchParams`.
  - [x] Import `CommunityDetail` component (adjust path later if moved).
  - [x] Conditionally render `CommunityDetail` (if `id` exists) or `CommunityList` (if `id` does not exist).
  - [x] Extract list fetching/rendering logic into a `CommunityList` sub-component within the file.

- [x] **2. Update Internal Links to use `?id=`:**

  - [x] `frontend/src/app/community/page.tsx` (in `CommunityList` map loop): Update `<Link href>` to `/community?id=${post.postId}`.
  - [x] `frontend/src/app/community/create/page.tsx` (in `handleSubmit`): Update `router.push` to `/community?id=${newPostId}` on success.
  - [x] `frontend/src/app/community/[id]/edit/page.tsx` (in `handleSubmit`): Update `router.push` to `/community?id=${postId}` on success. (Path updated in Step 3)
  - [x] `frontend/src/app/community/[id]/edit/page.tsx` (in `handleCancel`): Update `router.push` to `/community?id=${postId}`. (Path updated in Step 3)
  - [x] `frontend/src/app/community/[id]/CommunityDetail.tsx`: Update "Back" link to `/community`. (Path updated in Step 4)
  - [x] `frontend/src/app/community/[id]/CommunityDetail.tsx`: Update "Edit" link to `/community/edit?id=${postId}`. (Path updated in Step 4)

- [x] **3. Refactor Edit Page:**

  - [x] Move `frontend/src/app/community/[id]/edit/page.tsx` to `frontend/src/app/community/edit/page.tsx`.
  - [x] Update `EditPageContent` in `edit/page.tsx` to use `useSearchParams` instead of `useParams` to get the `id`.

- [x] **4. Relocate `CommunityDetail.tsx`:**

  - [x] Move `frontend/src/app/community/[id]/CommunityDetail.tsx` to `frontend/src/components/community/CommunityDetail.tsx` (or similar shared location).
  - [x] Update import path in `frontend/src/app/community/page.tsx`.

- [x] **5. Cleanup:**
  - [x] Delete the `frontend/src/app/community/[id]` directory.
