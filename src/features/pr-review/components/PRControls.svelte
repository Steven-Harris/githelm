<script lang="ts">
  import CommitSelector from '../CommitSelector.svelte';
  import DiffViewToggle from '../DiffViewToggle.svelte';
  import type { PRReviewState } from '../stores/pr-review.store.svelte';

  interface Props {
    prReview: PRReviewState;
  }

  let { prReview }: Props = $props();
</script>

<div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
  <!-- Commit selector -->
  <CommitSelector commits={prReview.state.commits} selectedCommit={prReview.state.selectedCommit} onCommitChange={prReview.selectCommit} />

  <!-- View controls -->
  <div class="flex items-center space-x-4">
    <DiffViewToggle currentMode={prReview.state.diffViewMode} onModeChange={prReview.saveDiffViewMode} />
    <div class="flex space-x-2">
      <button onclick={() => prReview.expandAllFiles()} class="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md" aria-label="Expand all files"> Expand All </button>
      <button onclick={() => prReview.collapseAllFiles()} class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md" aria-label="Collapse all files"> Collapse All </button>
    </div>
  </div>
</div>
