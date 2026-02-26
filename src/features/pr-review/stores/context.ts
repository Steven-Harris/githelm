import { getContext, setContext } from 'svelte';
import type { PRReviewState } from '../stores/pr-review.store.svelte';
import type { ScrollManager } from '../composables/useScrollManager.svelte';

const PR_REVIEW_CONTEXT_KEY = Symbol('pr-review');

export interface PRReviewContext {
  prReview: PRReviewState;
  scrollManager: ScrollManager;
  canReview: boolean;
  isAuthenticated: boolean;
}

export function setPRReviewContext(ctx: PRReviewContext): void {
  setContext(PR_REVIEW_CONTEXT_KEY, ctx);
}

export function getPRReviewContext(): PRReviewContext {
  return getContext<PRReviewContext>(PR_REVIEW_CONTEXT_KEY);
}
