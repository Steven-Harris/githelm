import { useCommentForms } from './useCommentForms.svelte';
import { useLineSelection } from './useLineSelection.svelte';
import { usePRData } from './usePRData.svelte';
import { useReviewActions } from './useReviewActions.svelte';
import { useUIState } from './useUIState.svelte';

/**
 * Main composable that orchestrates all PR review functionality
 * This is the primary entry point for components
 */
export function usePRReview(owner: string, repo: string, prNumber: number) {
  // Compose all the individual composables
  const prData = usePRData();
  const uiState = useUIState();
  const reviewActions = useReviewActions();
  const lineSelection = useLineSelection();
  const commentForms = useCommentForms();

  // Initialize data loading
  $effect(() => {
    if (owner && repo && prNumber) {
      prData.loadAllData(owner, repo, prNumber);
    }
  });

  // Auto-expand files when data loads
  $effect(() => {
    if (prData.data.files.length > 0 && uiState.preferencesLoaded) {
      uiState.autoExpandFiles(prData.data.files.map(f => f.filename));
    }
  });

  // Enhanced review actions with optimistic updates
  async function handleApproveReview(comment?: string) {
    const result = await reviewActions.approveReview(owner, repo, prNumber, comment);

    if (result.success && result.data) {
      // Optimistic update - add review immediately
      prData.addReview(result.data);
    }

    return result;
  }

  async function handleRequestChanges(reason: string) {
    const result = await reviewActions.requestChanges(owner, repo, prNumber, reason);

    if (result.success && result.data) {
      // Optimistic update - add review immediately
      prData.addReview(result.data);
    }

    return result;
  }

  async function handleSubmitComment(comment: string) {
    const result = await reviewActions.submitGeneralComment(owner, repo, prNumber, comment);

    if (result.success && result.data) {
      // Create a comment review for display - use minimal required fields
      const commentReview = {
        ...result.data,
        state: 'COMMENTED' as const,
        submitted_at: result.data.created_at,
        commit_id: prData.data.pullRequest?.head.sha || '',
        // Add required Review fields
        node_id: result.data.node_id || '',
        html_url: result.data.html_url || '',
        pull_request_url: `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
        author_association: result.data.author_association || 'NONE',
        _links: result.data._links || { html: { href: result.data.html_url || '' } }
      };

      prData.addReview(commentReview);
    }

    return result;
  }

  // Enhanced line comment handling
  async function handleSubmitLineComment(commentId: string) {
    const pendingComment = commentForms.state.pendingComments.find(c => c.id === commentId);
    if (!pendingComment || !pendingComment.body.trim()) return;

    try {
      // TODO: Implement line-specific comment API call
      console.log('Submitting line comment:', pendingComment);

      // For now, just remove from pending
      commentForms.removePendingComment(commentId);
      lineSelection.clearSelection();

    } catch (error) {
      console.error('Failed to submit line comment:', error);
    }
  }

  // Enhanced file operations
  function handleFileClick(filename: string) {
    uiState.selectFile(filename);
    uiState.setActiveTab('files');
  }

  function handleLineClick(filename: string, lineNumber: number, side: 'left' | 'right', content: string) {
    lineSelection.selectLine(filename, lineNumber, side, content);
  }

  function handleCommentClick(filename: string, lineNumber: number) {
    // Scroll to line and highlight
    const element = document.querySelector(`[data-line-${lineNumber}]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-comment');
      setTimeout(() => element.classList.remove('highlight-comment'), 2000);
    }
  }

  // Combined loading state
  const isLoading = $derived(
    prData.isLoading || reviewActions.isLoading
  );

  // Combined error state
  const hasErrors = $derived(
    prData.hasErrors || reviewActions.errors.lastError !== null
  );

  // Check if user can review this PR
  const canReview = $derived(() => {
    return reviewActions.canReview &&
      prData.data.pullRequest &&
      reviewActions.canReviewPullRequest(prData.data.pullRequest, null); // TODO: Add current user
  });

  // Reset everything
  function reset() {
    prData.reset();
    uiState.reset();
    lineSelection.reset();
    commentForms.reset();
    reviewActions.clearError();
  }

  return {
    // Data
    data: prData.data,
    loading: {
      ...prData.loading,
      ...reviewActions.loading,
      get isLoading() { return isLoading; }
    },
    errors: {
      ...prData.errors,
      ...reviewActions.errors,
      get hasErrors() { return hasErrors; }
    },

    // UI State
    uiState: uiState.state,
    get preferencesLoaded() { return uiState.preferencesLoaded; },

    // Line Selection
    selectedLines: lineSelection.state.selectedLines,
    isLineSelected: lineSelection.isLineSelected,

    // Comment Forms
    commentForms: commentForms.state,

    // Computed values
    get fileStats() { return prData.fileStats; },
    get reviewSummary() { return prData.reviewSummary; },
    get checksSummary() { return prData.checksSummary; },
    get canReview() { return canReview; },

    // Data actions
    loadAllData: (o: string, r: string, pr: number) => prData.loadAllData(o, r, pr),

    // UI actions
    setActiveTab: uiState.setActiveTab,
    selectFile: uiState.selectFile,
    toggleFileExpanded: uiState.toggleFileExpanded,
    expandAllFiles: uiState.expandAllFiles,
    collapseAllFiles: uiState.collapseAllFiles,
    setDiffViewMode: uiState.setDiffViewMode,
    toggleResolvedComments: uiState.toggleResolvedComments,

    // Line selection actions
    selectLine: lineSelection.selectLine,
    clearLineSelection: lineSelection.clearSelection,

    // Comment actions
    startCommentOnSelectedLines: commentForms.startCommentOnSelectedLines,
    updatePendingComment: commentForms.updatePendingComment,
    submitPendingComment: handleSubmitLineComment,
    cancelPendingComment: commentForms.cancelPendingComment,

    // Review actions
    handleApproveReview,
    handleRequestChanges,
    handleSubmitComment,

    // Event handlers
    handleFileClick,
    handleLineClick,
    handleCommentClick,

    // Utilities
    reset
  };
}