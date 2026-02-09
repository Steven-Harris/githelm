<script lang="ts">
  import { onDestroy } from 'svelte';
  import { currentUser, isAuthenticated } from '$shared/services/auth.state';
  import CommentsSidebar from './CommentsSidebar.svelte';
  import { useScrollManager } from './composables/useScrollManager.svelte.js';
  import FileTreeSidebar from './FileTreeSidebar.svelte';
  import PRDescription from './PRDescription.svelte';
  import { canReviewPullRequest } from './services/review-api.service';
  import { createPRReviewState } from './stores/pr-review.store.svelte';
  import { setPRReviewContext } from './stores/context';
  import { ChecksDisplay, ErrorState, FilesList, LoadingState, PRControls, PRHeader } from './components/index.js';

  interface Props {
    owner: string;
    repo: string;
    prNumber: number;
  }

  const { owner, repo, prNumber }: Props = $props();
  const prReview = createPRReviewState();
  const scrollManager = useScrollManager();

  const canSubmitReview = $derived.by(() => {
    if (!prReview.state.pullRequest) return false;
    return canReviewPullRequest(prReview.state.pullRequest, prReview.state.viewerLogin ?? $currentUser);
  });

  // Provide store and shared state to all descendants via context
  setPRReviewContext({
    get prReview() { return prReview; },
    get scrollManager() { return scrollManager; },
    get canReview() { return canSubmitReview; },
    get isAuthenticated() { return $isAuthenticated; },
  });

  $effect(() => {
    if (owner && repo && prNumber) {
      prReview.loadPullRequest(owner, repo, prNumber);
    }
  });

  $effect(() => {
    if (owner && repo && prNumber && $isAuthenticated) {
      prReview.startReviewCommentsPolling(owner, repo, prNumber);
      return () => prReview.stopReviewCommentsPolling();
    }
  });

  onDestroy(() => {
    prReview.stopReviewCommentsPolling();
  });

  $effect(() => {
    const observer = scrollManager.setupIntersectionObserver(prReview.selectFile, prReview.state.selectedFile);
    return () => { if (observer) observer.disconnect(); };
  });

  $effect(() => {
    if (prReview.state.files.length > 0 && !prReview.state.selectedFile) {
      prReview.selectFile(prReview.state.files[0].filename);
    }
  });

  function handleFileSelect(filename: string) {
    prReview.selectFile(filename);
    scrollManager.scrollToFile(filename);
  }

  function handleCommentClick(filename: string, lineNumber: number) {
    prReview.selectFile(filename);
    scrollManager.scrollToFileAndLine(filename, lineNumber, prReview.toggleFileExpanded);
  }
</script>

<section class="mt-5 px-2 md:px-0">
  <div class="mx-auto w-full max-w-none">
    <div class="hero-card w-full flex flex-col min-h-0" style="overflow: visible;">
      {#if prReview.state.loading}
        <div class="p-6">
          <LoadingState />
        </div>
      {:else if prReview.state.error}
        <div class="p-6">
          <ErrorState error={prReview.state.error} onRetry={() => prReview.loadPullRequest(owner, repo, prNumber)} />
        </div>
      {:else if prReview.state.pullRequest}
        <PRHeader pullRequest={prReview.state.pullRequest} commitCount={prReview.state.commits.length} fileStats={prReview.fileStats} />

        {#if prReview.state.pullRequest.body}
          <div class="px-6 pt-4">
            <PRDescription body={prReview.state.pullRequest.body} title={prReview.state.pullRequest.title} />
          </div>
        {/if}

        <div class="px-6">
          <ChecksDisplay checks={prReview.state.checks} />
          <PRControls {prReview} />
        </div>

        <div class="flex flex-1 min-h-0 min-w-0 border-t border-[#30363d] items-start">
          <FileTreeSidebar files={prReview.state.files} selectedFile={prReview.state.selectedFile} onFileSelect={handleFileSelect} />
          <FilesList />
          <CommentsSidebar onCommentClick={handleCommentClick} />
        </div>
      {:else}
        <div class="p-6 text-center">
          <div class="text-[#8b949e]">No pull request data available</div>
        </div>
      {/if}
    </div>
  </div>
</section>
