<script lang="ts">
  import { currentUser, isAuthenticated } from '$shared/services/auth.state';
  import CommentsSidebar from './CommentsSidebar.svelte';
  import { useScrollManager } from './composables/useScrollManager.svelte.js';
  import FileTreeSidebar from './FileTreeSidebar.svelte';
  import PRDescription from './PRDescription.svelte';
  import { createReviewActionsService } from './services/review-actions.service';
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

  // Review actions service
  const reviewActions = createReviewActionsService(
    owner,
    repo,
    prNumber,
    (review) => {
      prReview.state.reviews = [...prReview.state.reviews, review];
    },
    (comment) => {
      prReview.state.reviewComments = [...prReview.state.reviewComments, comment];
    }
  );

  // Load data when component mounts or params change
  $effect(() => {
    if (owner && repo && prNumber) {
      prReview.loadPullRequest(owner, repo, prNumber);
    }
  });

  // Setup intersection observer for file auto-selection
  $effect(() => {
    const observer = scrollManager.setupIntersectionObserver(prReview.selectFile, prReview.state.selectedFile);

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  });

  // Auto-select first file when files are loaded
  $effect(() => {
    if (prReview.state.files.length > 0 && !prReview.state.selectedFile) {
      prReview.selectFile(prReview.state.files[0].filename);
    }
  });

  // Auto-scroll to file when selected
  $effect(() => {
    if (prReview.state.selectedFile) {
      scrollManager.scrollToFile(prReview.state.selectedFile);
    }
  });

  // Handle comment click from sidebar
  function handleCommentClick(filename: string, lineNumber: number) {
    prReview.selectFile(filename);
    scrollManager.scrollToFileAndLine(filename, lineNumber, prReview.toggleFileExpanded);
  }
</script>

<div class="h-screen flex flex-col">
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

    <!-- Checks Section -->
    <ChecksDisplay checks={prReview.state.checks} />

    <!-- Controls Section -->
    <PRControls {prReview} />

    <!-- Main Content Area -->
    <div class="flex flex-1 min-h-0">
      <!-- Left Sidebar: File Tree -->
      <FileTreeSidebar files={prReview.state.files} selectedFile={prReview.state.selectedFile} onFileSelect={prReview.selectFile} />

      <!-- Center: File List -->
      <FilesList {prReview} {scrollManager} />

      <!-- Right Sidebar: Comments -->
      <!-- Right Sidebar: Comments -->
      <CommentsSidebar
        reviews={prReview.state.reviews}
        reviewComments={prReview.state.reviewComments}
        selectedFile={prReview.state.selectedFile}
        onCommentClick={handleCommentClick}
        selectedLines={prReview.state.selectedLines}
        pendingComments={prReview.state.pendingComments}
        activeCommentId={prReview.state.activeCommentId}
        reviewDraft={prReview.state.reviewDraft}
        onStartComment={prReview.startCommentOnSelectedLines}
        onAddToReview={prReview.addCommentToReview}
        onPostComment={prReview.postStandaloneComment}
        onUpdateComment={prReview.updatePendingComment}
        onSaveComment={prReview.savePendingComment}
        onCancelComment={prReview.cancelPendingComment}
        onClearSelection={prReview.clearLineSelection}
        onUpdateReviewDraft={prReview.updateReviewDraft}
        onSubmitReview={prReview.submitReview}
        onApproveReview={reviewActions.approveReview}
        onRequestChanges={reviewActions.requestChanges}
        onSubmitGeneralComment={reviewActions.submitComment}
        canReview={prReview.state.pullRequest ? canReviewPullRequest(prReview.state.pullRequest, $currentUser) : false}
        isAuthenticated={$isAuthenticated}
      />
    </div>
  {:else}
    <div class="text-center py-12">
      <div class="text-gray-500">No pull request data available</div>
    </div>
  {/if}
</div>
