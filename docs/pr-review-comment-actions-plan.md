# PR Review Comments: Resolve / Reply / Edit / Delete / Resizable Sidebar

## Goals

- **Resolve/unresolve** a review thread updates the UI immediately and stays in sync with GitHub.
- **Reply** to a review comment from the sidebar.
- **Edit** your own comments (inline review comments).
- **Delete** only your own comments (UI + server-side guard in the store).
- **Resizable comments sidebar** so more text is readable at once; width persists between sessions.
- Improve **UX/UI** for resolve/delete/edit/reply actions (icon buttons, clearer affordances, less “link-like”).

## Non-goals (for this iteration)

- Editing/deleting **review summaries** (Review bodies) — different API surface than inline review comments.
- Rich editor, markdown preview, or reactions UI.

## Implementation Plan

### 1) Data + permissions

- Add `viewerLogin: string | null` to PR review store state.
- On `loadPullRequest()`, fetch current GitHub user login using the stored GitHub token (`GET https://api.github.com/user`).
- In the store, enforce that edit/delete operations check `comment.user.login === viewerLogin`.

### 2) GitHub API mutations (service layer)

- Reuse existing REST helpers in `review-api.service.ts`:
  - `replyToComment()` (POST reply)
  - `updateComment()` (PATCH)
  - `deleteComment()` (DELETE)
- Add a small helper `getViewerLogin()` to return the authenticated GitHub login.
- For resolve/unresolve, keep existing GraphQL `setReviewThreadResolved()`.

### 3) Store operations (optimistic + state sync)

- `setThreadResolved(threadId, resolved)`:
  - Optimistically set `is_resolved` for all comments with matching `thread_id`.
  - Call `setReviewThreadResolved()`.
  - On failure, revert and set `state.error`.
- `replyToSubmittedComment(parentCommentId, body)`:
  - Call `replyToComment()`.
  - Insert the returned comment into `state.reviewComments`.
  - Copy `thread_id` / `is_resolved` from the parent comment so the thread stays actionable.
- `updateSubmittedComment(commentId, body)`:
  - Enforce ownership.
  - Call `updateComment()` and update the local `state.reviewComments` entry.
- `deleteSubmittedComment(commentId)`:
  - Enforce ownership.
  - Call `deleteComment()` and refresh comments (fallback to local removal).

### 4) UI changes (sidebar)

- Update `LineCommentsSection.svelte` to:
  - Group comments into **threads** (by `thread_id` when available).
  - Show **thread header** with file/line + resolved badge + resolve/unresolve button.
  - For each comment, show **Reply / Edit / Delete** actions:
    - Reply: opens an inline composer.
    - Edit: toggles a textarea editor and submits via store.
    - Delete: confirmation + store call; hidden/disabled if not author.

### 5) Resizable CommentsSidebar

- Replace fixed `w-80` with a width controlled by component state.
- Add a left-edge drag handle (`cursor: col-resize`).
- Persist width to `localStorage` key `PR_REVIEW_SIDEBAR_WIDTH`.
- Constrain width (e.g. min 280px, max 720px).

### 6) Validation

- Update/extend existing Vitest tests for store behavior:
  - Deleting allowed only for own comment.
  - Edit blocked for non-author.
- Quick manual verification flows:
  - Resolve/unresolve toggles instantly and persists after refresh.
  - Reply appears in thread immediately.
  - Edit updates body.
  - Delete only available for own comments.
  - Sidebar resizes and persists.
