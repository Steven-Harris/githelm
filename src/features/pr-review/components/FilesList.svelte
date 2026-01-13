<script lang="ts">
  import type { ScrollManager } from '../composables/useScrollManager.svelte';
  import DiffViewToggle from '../DiffViewToggle.svelte';
  import FileDiff from '../FileDiff.svelte';
  import type { PRReviewState } from '../stores/pr-review.store.svelte';

  interface Props {
    prReview: PRReviewState;
    scrollManager: ScrollManager;
    canReview?: boolean;
    isAuthenticated?: boolean;
  }

  let { prReview, scrollManager, canReview = false, isAuthenticated = false }: Props = $props();

  let mainContentElement = $state<HTMLDivElement | undefined>(undefined);

  const visibleFiles = $derived(() => {
    if (prReview.state.focusSelectedFileOnly && prReview.state.selectedFile) {
      return prReview.state.files.filter((f) => f.filename === prReview.state.selectedFile);
    }

    return prReview.state.files;
  });

  // Forward the element reference to scroll manager
  $effect(() => {
    if (!mainContentElement) return;

    const scrollRoot = typeof document !== 'undefined' ? (document.querySelector('main') as HTMLElement | null) : null;
    const scrollContainer = scrollRoot ?? mainContentElement;

    scrollManager.setMainContentElement(scrollContainer);

    const handleScroll = () => scrollManager.handleScrollThrottled(prReview.selectFile, prReview.state.selectedFile);
    scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  });
</script>

<div bind:this={mainContentElement} class="flex-1 min-w-0 bg-[#0d1117] overflow-x-hidden">
  <div class="sticky top-0 z-20 bg-[#161b22] border-b border-[#30363d] px-4 py-3">
    <div class="flex items-center justify-between gap-3">
      <div class="flex flex-col min-w-0">
        <div class="text-xs font-medium text-[#8b949e] uppercase tracking-wide">View</div>
        <div class="text-sm text-[#c9d1d9] truncate">
          {#if prReview.state.focusSelectedFileOnly && prReview.state.selectedFile}
            Focused: {prReview.state.selectedFile.split('/').pop()}
          {:else}
            All files
          {/if}
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap justify-end">
        <DiffViewToggle currentMode={prReview.state.diffViewMode} onModeChange={prReview.saveDiffViewMode} />

        <button
          onclick={() => prReview.toggleFocusSelectedFileOnly()}
          class="px-3 py-1.5 text-sm bg-[#30363d]/30 hover:bg-[#30363d]/50 text-[#c9d1d9] border border-[#30363d] rounded-md transition-colors"
          aria-label={prReview.state.focusSelectedFileOnly ? 'Show all files' : 'Focus on selected file'}
          title={prReview.state.focusSelectedFileOnly ? 'Show all files' : 'Focus on selected file'}
        >
          {prReview.state.focusSelectedFileOnly ? 'Show All' : 'Focus File'}
        </button>

        <button
          onclick={() => prReview.expandAllFiles()}
          class="px-3 py-1.5 text-sm bg-[#1f6feb]/20 hover:bg-[#1f6feb]/30 text-[#58a6ff] border border-[#1f6feb]/30 rounded-md transition-colors"
          aria-label="Expand all files"
          title="Expand all files"
        >
          Expand All
        </button>
        <button
          onclick={() => prReview.collapseAllFiles()}
          class="px-3 py-1.5 text-sm bg-[#30363d]/30 hover:bg-[#30363d]/50 text-[#c9d1d9] border border-[#30363d] rounded-md transition-colors"
          aria-label="Collapse all files"
          title="Collapse all files"
        >
          Collapse All
        </button>
      </div>
    </div>
  </div>

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
            viewerLogin={prReview.state.viewerLogin}
            canResolve={prReview.state.viewerCanResolveThreads && isAuthenticated}
            canInteract={isAuthenticated}
            onSetThreadResolved={prReview.setThreadResolved}
            onDeleteSubmittedComment={prReview.deleteSubmittedComment}
            onUpdateSubmittedComment={prReview.updateSubmittedComment}
            onReplyToSubmittedComment={prReview.replyToSubmittedComment}
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
