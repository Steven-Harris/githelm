<script lang="ts">
  import type { ScrollManager } from '../composables/useScrollManager.svelte';
  import FileDiff from '../FileDiff.svelte';
  import type { PRReviewState } from '../stores/pr-review.store.svelte';

  interface Props {
    prReview: PRReviewState;
    scrollManager: ScrollManager;
  }

  let { prReview, scrollManager }: Props = $props();

  let mainContentElement = $state<HTMLDivElement | undefined>(undefined);

  const visibleFiles = $derived(() => {
    if (prReview.state.focusSelectedFileOnly && prReview.state.selectedFile) {
      return prReview.state.files.filter((f) => f.filename === prReview.state.selectedFile);
    }

    return prReview.state.files;
  });

  // Forward the element reference to scroll manager
  $effect(() => {
    if (mainContentElement) {
      scrollManager.setMainContentElement(mainContentElement);

      const handleScroll = () => scrollManager.handleScrollThrottled(prReview.selectFile, prReview.state.selectedFile);
      mainContentElement.addEventListener('scroll', handleScroll);

      return () => {
        mainContentElement?.removeEventListener('scroll', handleScroll);
      };
    }
  });
</script>

<div bind:this={mainContentElement} class="flex-1 overflow-y-auto bg-[#0d1117]">
  {#if visibleFiles().length > 0}
    <div class="space-y-1">
      {#each visibleFiles() as file (file.filename)}
        <div data-filename={file.filename} class="bg-[#161b22] border-b border-[#30363d] last:border-b-0 min-h-16" id="file-{file.filename.replace(/[^a-zA-Z0-9]/g, '-')}">
          <FileDiff
            {file}
            isExpanded={prReview.state.expandedFiles.has(file.filename)}
            onToggle={() => prReview.toggleFileExpanded(file.filename)}
            reviewComments={prReview.state.reviewComments}
            diffViewMode={prReview.state.diffViewMode}
            onLineClick={(filename, lineNumber, side, content, isExtending = false) => {
              prReview.selectLine(filename, lineNumber, side, content, isExtending);
            }}
            isLineSelected={(filename, lineNumber, side) => prReview.isLineSelected(filename, lineNumber, side)}
            pendingComments={prReview.state.pendingComments.filter((c) => c.filename === file.filename)}
            onUpdateComment={prReview.updatePendingComment}
            onSubmitComment={prReview.submitPendingComment}
            onCancelComment={prReview.cancelPendingComment}
          />
        </div>
      {/each}
    </div>
  {:else}
    <div class="flex items-center justify-center h-full text-[#8b949e]">
      <div class="text-center">
        <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p class="text-lg">No files to display</p>
      </div>
    </div>
  {/if}
</div>
