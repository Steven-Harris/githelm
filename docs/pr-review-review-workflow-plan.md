# PR Review Workflow Redesign (GitHub-like)

## Goal

Replace the current review submission flow with a GitHub-like “single review composer” that supports:

- Always-visible overall comment box
- Three explicit actions: **Request changes**, **Comment**, **Approve**
- Optional overall comment for approve/comment
- Required overall comment for request changes
- Multiple inline (line) comments bundled into the same submitted review

This flow should replace the existing review workflow in the application.

## UX Requirements (Acceptance Criteria)

### Review composer

Always show an overall comment textarea in the “Reviews & Comments” sidebar, followed by three buttons:

1. **Approve**
   - Can be clicked with no overall comment.
   - If an overall comment is present, it becomes the review body.
   - If there are pending inline comments, they are submitted as part of this review.

2. **Comment**
   - If an overall comment is present, submit a review with event `COMMENT` and that body.
   - If there are pending inline comments, they are submitted as part of this review.
   - If there is neither an overall comment nor pending inline comments, do nothing (disabled).

3. **Request changes**
   - Requires an overall comment (cannot be clicked without one).
   - Submits a review with event `REQUEST_CHANGES`.
   - Pending inline comments are included in the review submission.

### Inline comments

- Reviewers can add inline comments on multiple lines/files.
- Inline comments are added to a single “pending review” bundle.
- Submitting via Approve/Comment/Request changes posts the entire bundle in one review.

## State Model

### Draft review

Use a single draft object:

- `reviewDraft.body: string` — overall message
- `reviewDraft.event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'` — last selected event (optional convenience)

### Pending inline comments

Use `pendingComments[]` entries where `isPartOfReview === true` means “include in review submission”.

## API Behavior

Submit via GitHub REST:

- `POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews`
- Payload:
  - `event`: `APPROVE` | `COMMENT` | `REQUEST_CHANGES`
  - `body`: overall body (may be empty for `APPROVE`)
  - `comments`: inline review comments with calculated `position`

## Implementation Checklist

Files likely to change:

- UI:
  - `src/features/pr-review/components/ReviewSubmissionSection.svelte`
  - `src/features/pr-review/components/PendingCommentsSection.svelte`
  - `src/features/pr-review/CommentsSidebar.svelte`

- Store:
  - `src/features/pr-review/stores/pr-review.store.svelte.ts`
  - `src/features/pr-review/stores/pr-review.store.svelte.test.ts`

## Edge Cases

- Not authenticated / cannot review:
  - Composer remains visible but buttons disabled.
- Approve with no body and no pending comments:
  - Allowed (creates an approval review).
- Request changes with only inline comments:
  - Blocked unless overall comment is present (per requirement).
