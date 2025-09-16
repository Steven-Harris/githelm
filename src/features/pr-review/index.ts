// Legacy components (to be migrated)
export { default as CommentsSidebar } from './CommentsSidebar.svelte';
export { default as CommitSelector } from './CommitSelector.svelte';
export { default as DiffViewToggle } from './DiffViewToggle.svelte';
export { default as FileDiff } from './FileDiff.svelte';
export { default as FileTreeNavigation } from './FileTreeNavigation.svelte';
export { default as FileTreeNode } from './FileTreeNode.svelte';
export { default as FileTreeSidebar } from './FileTreeSidebar.svelte';
export { default as InlineComments } from './InlineComments.svelte';
export { default as PRDescription } from './PRDescription.svelte';
export { default as PullRequestReview } from './PullRequestReview.svelte';
export * from './services/pr-review.service';
export * from './stores/pr-review.store.svelte';

// New architecture - Composable-first approach
// Main composable - orchestrates all functionality
export { usePRReview } from './composables/usePRReview.svelte.js';

// Individual composables for granular usage
export { useCommentForms } from './composables/useCommentForms.svelte.js';
export { useLineSelection } from './composables/useLineSelection.svelte.js';
export { usePRData } from './composables/usePRData.svelte.js';
export { useReviewActions } from './composables/useReviewActions.svelte.js';
export { useUIState } from './composables/useUIState.svelte.js';

// New UI Components
export * from './components/index.js';
export * from './ui/index.js';

// New Types (avoiding conflicts with legacy exports)
export type * from './types/events.types.js';
export type {
  CommentFormData, CommentFormState, PendingComment as NewPendingComment, SelectedLine as NewSelectedLine, PRReviewData, UIState
} from './types/pr-review.types.js';
export type * from './types/ui.types.js';

// Utilities
export * from './utils/index.js';

