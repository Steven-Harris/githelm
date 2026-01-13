<script lang="ts">
  import CommitSelector from '../CommitSelector.svelte';
  import type { PRReviewState } from '../stores/pr-review.store.svelte';

  interface Props {
    prReview: PRReviewState;
  }

  let { prReview }: Props = $props();
</script>

<div class="flex items-center pt-4 pb-4 pr-1">
  <CommitSelector commits={prReview.state.commits} selectedCommit={prReview.state.selectedCommit} onCommitChange={prReview.selectCommit} />
</div>
