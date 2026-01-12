<script lang="ts">
  import { currentUser, isAuthenticated } from '$shared/services/auth.state';
  import CommentsSidebar from './CommentsSidebar.svelte';
  import { useScrollManager } from './composables/useScrollManager.svelte.js';
  import FileTreeSidebar from './FileTreeSidebar.svelte';
  import PRDescription from './PRDescription.svelte';
  import { canReviewPullRequest } from './services/review-api.service';
  import { createPRReviewState } from './stores/pr-review.store.svelte';
  // New components
  import { ChecksDisplay, ErrorState, FilesList, LoadingState, PRControls, PRHeader } from './components/index.js';

  interface Props {
    owner: string;
    repo: string;
    prNumber: number;
  }

  const { owner, repo, prNumber }: Props = $props();

  // Create the reactive state
  const prReview = createPRReviewState();

  // Scroll management
  const scrollManager = useScrollManager();

  $effect(() => {
    if (owner && repo && prNumber) {
      prReview.loadPullRequest(owner, repo, prNumber);
    }
  });

  $effect(() => {
    const observer = scrollManager.setupIntersectionObserver(prReview.selectFile, prReview.state.selectedFile);

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  });

  $effect(() => {
    if (prReview.state.files.length > 0 && !prReview.state.selectedFile) {
      prReview.selectFile(prReview.state.files[0].filename);
    }
  });

  $effect(() => {
    if (prReview.state.selectedFile) {
      scrollManager.scrollToFile(prReview.state.selectedFile);
    }
  });

  function handleCommentClick(filename: string, lineNumber: number) {
    prReview.selectFile(filename);
    scrollManager.scrollToFileAndLine(filename, lineNumber, prReview.toggleFileExpanded);
  }
</script>

<div class="flex flex-col min-h-0">
  {#if prReview.state.loading}
    <LoadingState />
  {:else if prReview.state.error}
    <ErrorState error={prReview.state.error} onRetry={() => prReview.loadPullRequest(owner, repo, prNumber)} />
  {:else if prReview.state.pullRequest}
    <!-- Header -->
    <PRHeader pullRequest={prReview.state.pullRequest} commitCount={prReview.state.commits.length} fileStats={prReview.fileStats()} />

    <!-- Description -->
    {#if prReview.state.pullRequest.body}
      <PRDescription body={prReview.state.pullRequest.body} title={prReview.state.pullRequest.title} />
    {/if}

    <ChecksDisplay checks={prReview.state.checks} />

    <PRControls {prReview} />

    <div class="flex flex-1 min-h-0">
      <FileTreeSidebar files={prReview.state.files} selectedFile={prReview.state.selectedFile} onFileSelect={prReview.selectFile} />

      <FilesList {prReview} {scrollManager} />

      <CommentsSidebar
        reviews={prReview.state.reviews}
        reviewComments={prReview.state.reviewComments}
        onCommentClick={handleCommentClick}
        selectedLines={prReview.state.selectedLines}
        pendingComments={prReview.state.pendingComments}
        activeCommentId={prReview.state.activeCommentId}
        reviewDraft={prReview.state.reviewDraft}
        onStartComment={prReview.startCommentOnSelectedLines}
        onAddToReview={prReview.addCommentToReview}
        onPostComment={prReview.postStandaloneComment}
        onUpdateComment={prReview.updatePendingComment}
        onCancelComment={prReview.cancelPendingComment}
        onClearSelection={prReview.clearLineSelection}
        onUpdateReviewDraft={prReview.updateReviewDraft}
        onSubmitReview={prReview.submitReview}
        onDeleteSubmittedComment={prReview.deleteSubmittedComment}
        canReview={prReview.state.pullRequest ? canReviewPullRequest(prReview.state.pullRequest, $currentUser) : false}
        isAuthenticated={$isAuthenticated}
      />
    </div>
  {:else}
    <div class="text-center py-12">
      <div class="text-[#8b949e]">No pull request data available</div>
    </div>
  {/if}
</div>
