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

<div bind:this={mainContentElement} class="flex-1 overflow-y-auto bg-gray-50">
  {#if prReview.state.files.length > 0}
    <div class="space-y-1">
      {#each prReview.state.files as file (file.filename)}
        <div data-filename={file.filename} class="bg-white border-b border-gray-200 last:border-b-0 min-h-16" id="file-{file.filename.replace(/[^a-zA-Z0-9]/g, '-')}">
          <FileDiff
            {file}
            isExpanded={prReview.state.expandedFiles.has(file.filename)}
            onToggle={() => prReview.toggleFileExpanded(file.filename)}
            reviewComments={prReview.state.reviewComments}
            diffViewMode={prReview.state.diffViewMode}
            onLineClick={(filename, lineNumber, side, event) => {
              // For now, use empty content - the component should handle extracting the line content
              prReview.selectLine(filename, lineNumber, side, '');
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
    <div class="flex items-center justify-center h-full text-gray-500">
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
