<script lang="ts">
  import CommitSelector from '../CommitSelector.svelte';
  import DiffViewToggle from '../DiffViewToggle.svelte';
  import type { PRReviewState } from '../stores/pr-review.store.svelte';

  interface Props {
    prReview: PRReviewState;
  }

  let { prReview }: Props = $props();
</script>

<div class="flex items-center justify-between mt-4 pt-4 border-t border-[#30363d]">
  <!-- Commit selector -->
  <CommitSelector commits={prReview.state.commits} selectedCommit={prReview.state.selectedCommit} onCommitChange={prReview.selectCommit} />

  <!-- View controls -->
  <div class="flex items-center space-x-4">
    <DiffViewToggle currentMode={prReview.state.diffViewMode} onModeChange={prReview.saveDiffViewMode} />
    <div class="flex space-x-2">
      <button
        onclick={() => prReview.expandAllFiles()}
        class="px-3 py-1 text-sm bg-[#1f6feb]/20 hover:bg-[#1f6feb]/30 text-[#58a6ff] border border-[#1f6feb]/30 rounded-md transition-colors"
        aria-label="Expand all files"
      >
        Expand All
      </button>
      <button
        onclick={() => prReview.collapseAllFiles()}
        class="px-3 py-1 text-sm bg-[#30363d]/30 hover:bg-[#30363d]/50 text-[#c9d1d9] border border-[#30363d] rounded-md transition-colors"
        aria-label="Collapse all files"
      >
        Collapse All
      </button>
    </div>
  </div>
</div>
