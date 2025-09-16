import type {
  CheckRun,
  DetailedPullRequest,
  PullRequestCommit,
  PullRequestFile,
  Review,
  ReviewComment
} from '$integrations/github';

// Types for line selection and pending comments
export interface SelectedLine {
  filename: string;
  lineNumber: number;
  side: 'left' | 'right'; // For side-by-side diff view
  content: string;
}

export interface PendingComment {
  id: string;
  filename: string;
  startLine: number;
  endLine?: number; // For multi-line comments
  side: 'left' | 'right';
  body: string;
  isPartOfReview: boolean; // true if part of review, false for standalone comment
}

export interface ReviewDraft {
  body: string; // Overall review comment
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
}

// Types for our store state
export interface PullRequestReviewState {
  pullRequest: DetailedPullRequest | null;
  reviewComments: ReviewComment[];
  files: PullRequestFile[];
  commits: PullRequestCommit[];
  reviews: Review[];
  checks: CheckRun[];
  loading: boolean;
  error: string | null;
  activeTab: 'overview' | 'files' | 'commits' | 'checks';
  selectedFile: string | null;
  selectedCommit: string | null;
  showResolvedComments: boolean;
  expandedFiles: Set<string>;
  diffViewMode: 'inline' | 'side-by-side';
  expandFilesOnLoad: boolean;
  preferencesLoaded: boolean;
  // New properties for line selection and commenting
  selectedLines: SelectedLine[];
  pendingComments: PendingComment[];
  isSelectingLines: boolean;
  activeCommentId: string | null; // ID of comment currently being edited
  reviewDraft: ReviewDraft;
}

// Create a reactive state using Svelte 5 runes
export function createPRReviewState() {
  const state = $state<PullRequestReviewState>({
    pullRequest: null,
    reviewComments: [],
    files: [],
    commits: [],
    reviews: [],
    checks: [],
    loading: false,
    error: null,
    activeTab: 'overview',
    selectedFile: null,
    selectedCommit: null,
    showResolvedComments: false,
    expandedFiles: new Set<string>(),
    diffViewMode: 'side-by-side',
    expandFilesOnLoad: true,
    preferencesLoaded: false,
    // Initialize new properties
    selectedLines: [],
    pendingComments: [],
    isSelectingLines: false,
    activeCommentId: null,
    reviewDraft: {
      body: '',
      event: 'COMMENT'
    },
  });

  // Derived values using $derived
  const fileStats = $derived(() => {
    if (!state.files.length) return null;

    return {
      totalFiles: state.files.length,
      totalAdditions: state.files.reduce((sum, file) => sum + file.additions, 0),
      totalDeletions: state.files.reduce((sum, file) => sum + file.deletions, 0),
      filesByStatus: state.files.reduce((acc, file) => {
        acc[file.status] = (acc[file.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  });

  const reviewSummary = $derived(() => {
    if (!state.reviews.length) return null;

    const summary = {
      approved: 0,
      changesRequested: 0,
      commented: 0,
      pending: 0,
      dismissed: 0
    };

    state.reviews.forEach(review => {
      switch (review.state) {
        case 'APPROVED':
          summary.approved++;
          break;
        case 'CHANGES_REQUESTED':
          summary.changesRequested++;
          break;
        case 'COMMENTED':
          summary.commented++;
          break;
        case 'PENDING':
          summary.pending++;
          break;
        case 'DISMISSED':
          summary.dismissed++;
          break;
      }
    });

    return summary;
  });

  const checksSummary = $derived(() => {
    if (!state.checks.length) return null;

    const summary = {
      success: 0,
      failure: 0,
      pending: 0,
      neutral: 0,
      cancelled: 0,
      skipped: 0,
      timedOut: 0,
      actionRequired: 0
    };

    state.checks.forEach(check => {
      if (check.status !== 'completed') {
        summary.pending++;
        return;
      }

      switch (check.conclusion) {
        case 'success':
          summary.success++;
          break;
        case 'failure':
          summary.failure++;
          break;
        case 'neutral':
          summary.neutral++;
          break;
        case 'cancelled':
          summary.cancelled++;
          break;
        case 'skipped':
          summary.skipped++;
          break;
        case 'timed_out':
          summary.timedOut++;
          break;
        case 'action_required':
          summary.actionRequired++;
          break;
      }
    });

    return summary;
  });

  const commentsByFile = $derived(() => {
    const comments = state.showResolvedComments
      ? state.reviewComments
      : state.reviewComments; // TODO: filter resolved comments

    return comments.reduce((acc, comment) => {
      const fileName = comment.path;
      if (!acc[fileName]) {
        acc[fileName] = [];
      }
      acc[fileName].push(comment);
      return acc;
    }, {} as Record<string, ReviewComment[]>);
  });

  // Actions
  const loadPreferences = async () => {
    try {
      const { configService } = await import('$integrations/firebase');
      const preferences = await configService.getPreferences();

      if (preferences?.diffView) {
        state.diffViewMode = preferences.diffView.viewMode || 'side-by-side';
        state.expandFilesOnLoad = preferences.diffView.expandFilesOnLoad ?? true;
      } else {
        // Set defaults if no preferences exist
        state.diffViewMode = 'side-by-side';
        state.expandFilesOnLoad = true;
      }

      state.preferencesLoaded = true;
    } catch (error) {
      console.warn('Failed to load preferences:', error);
      // Use defaults
      state.diffViewMode = 'side-by-side';
      state.expandFilesOnLoad = true;
      state.preferencesLoaded = true;
    }
  };

  const saveDiffViewMode = async (mode: 'inline' | 'side-by-side') => {
    state.diffViewMode = mode;

    try {
      const { configService } = await import('$integrations/firebase');
      const preferences = await configService.getPreferences() || {
        repositoryFilters: { with_prs: true, without_prs: true },
        workflowStatusFilters: { success: true, failure: true, in_progress: true, queued: true, pending: true },
        diffView: { viewMode: 'side-by-side', expandFilesOnLoad: true }
      };

      preferences.diffView = {
        ...preferences.diffView,
        viewMode: mode
      };

      await configService.savePreferences(preferences);
    } catch (error) {
      console.warn('Failed to save diff view preference:', error);
    }
  };

  const loadPullRequest = async (owner: string, repo: string, prNumber: number) => {
    state.loading = true;
    state.error = null;

    try {
      // Load preferences first if not already loaded
      if (!state.preferencesLoaded) {
        await loadPreferences();
      }

      const { fetchAllPullRequestData } = await import('../services/pr-review.service');
      const data = await fetchAllPullRequestData(owner, repo, prNumber);

      Object.assign(state, {
        ...data,
        loading: false,
        error: null
      });

      // Auto-expand files based on preferences (default to true)
      const { configService } = await import('$integrations/firebase');
      const preferences = await configService.getPreferences();
      const shouldExpandFiles = preferences?.diffView?.expandFilesOnLoad ?? true;

      if (shouldExpandFiles) {
        state.expandedFiles = new Set(state.files.map(file => file.filename));
      }
    } catch (error) {
      state.loading = false;
      state.error = error instanceof Error ? error.message : 'Failed to load pull request';
    }
  };

  const setActiveTab = (tab: PullRequestReviewState['activeTab']) => {
    state.activeTab = tab;
  };

  const selectFile = (fileName: string | null) => {
    state.selectedFile = fileName;
  };

  const selectCommit = (commitSha: string | null) => {
    state.selectedCommit = commitSha;
  };

  const toggleResolvedComments = () => {
    state.showResolvedComments = !state.showResolvedComments;
  };

  const reset = () => {
    Object.assign(state, {
      pullRequest: null,
      reviewComments: [],
      files: [],
      commits: [],
      reviews: [],
      checks: [],
      loading: false,
      error: null,
      activeTab: 'overview' as const,
      selectedFile: null,
      showResolvedComments: false,
      expandedFiles: new Set<string>(),
      diffViewMode: 'side-by-side' as const,
      preferencesLoaded: false,
    });
  };

  const clearError = () => {
    state.error = null;
  };

  const expandAllFiles = () => {
    state.expandedFiles = new Set(state.files.map(file => file.filename));
  };

  const collapseAllFiles = () => {
    state.expandedFiles = new Set<string>();
  };

  const toggleFileExpanded = (filename: string) => {
    const newExpanded = new Set(state.expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    state.expandedFiles = newExpanded;
  };

  // Line selection and commenting methods with drag support
  const selectLine = (filename: string, lineNumber: number, side: 'left' | 'right', content: string, isExtending: boolean = false) => {
    if (isExtending && state.selectedLines.length > 0) {
      const firstSelection = state.selectedLines[0];

      // Only extend if same file and side
      if (firstSelection.filename === filename && firstSelection.side === side) {
        const startLine = Math.min(firstSelection.lineNumber, lineNumber);
        const endLine = Math.max(firstSelection.lineNumber, lineNumber);

        // Create range selection
        state.selectedLines = [];
        for (let i = startLine; i <= endLine; i++) {
          state.selectedLines.push({
            filename,
            lineNumber: i,
            side,
            content: i === lineNumber ? content : `Line ${i}`
          });
        }
      } else {
        // Different file/side, start new selection
        state.selectedLines = [{ filename, lineNumber, side, content }];
      }
    } else {
      // Start new selection - only clear abandoned comments, not those that are part of review
      if (!state.activeCommentId) {
        // Only clear pending comments that are NOT part of a review (keep review comments)
        state.pendingComments = state.pendingComments.filter(c => c.isPartOfReview);
      }

      state.selectedLines = [{ filename, lineNumber, side, content }];
    }

    state.isSelectingLines = true;
  };

  const extendSelection = (filename: string, lineNumber: number, side: 'left' | 'right', content: string) => {
    selectLine(filename, lineNumber, side, content, true);
  };

  const clearLineSelection = () => {
    state.selectedLines = [];
    state.isSelectingLines = false;
    // Only clear pending comments that are not part of a review and haven't been started
    if (!state.activeCommentId) {
      // Keep comments that are part of review, only remove unfinished standalone comments
      state.pendingComments = state.pendingComments.filter(c => c.isPartOfReview);
    }
  };

  const startCommentOnSelectedLines = (isPartOfReview: boolean = false) => {
    if (state.selectedLines.length === 0) return;

    // Create a new comment immediately when lines are selected
    const firstLine = state.selectedLines[0];
    const lastLine = state.selectedLines[state.selectedLines.length - 1];

    const commentId = `pending-${Date.now()}`;
    const pendingComment: PendingComment = {
      id: commentId,
      filename: firstLine.filename,
      startLine: firstLine.lineNumber,
      endLine: state.selectedLines.length > 1 ? lastLine.lineNumber : undefined,
      side: firstLine.side,
      body: '',
      isPartOfReview
    };

    state.pendingComments.push(pendingComment);
    state.activeCommentId = commentId;
  };

  const addCommentToReview = (commentId: string) => {
    const comment = state.pendingComments.find(c => c.id === commentId);
    console.log('addCommentToReview called:', {
      commentId,
      comment: comment ? { id: comment.id, isPartOfReview: comment.isPartOfReview, hasBody: !!comment.body.trim() } : null,
      allPendingComments: state.pendingComments.map(c => ({ id: c.id, isPartOfReview: c.isPartOfReview, hasBody: !!c.body.trim() }))
    });

    if (!comment || !comment.body.trim()) {
      console.log('Early return - no comment or empty body');
      return;
    }

    // Mark as part of review and clear active state
    comment.isPartOfReview = true;
    state.activeCommentId = null;

    console.log('Comment marked as part of review:', { id: comment.id, isPartOfReview: comment.isPartOfReview });

    // Clear line selection so user can select new lines for next comment
    clearLineSelection();

    console.log('After clearLineSelection - Updated pending comments:', state.pendingComments.map(c => ({
      id: c.id,
      isPartOfReview: c.isPartOfReview,
      hasBody: !!c.body.trim()
    })));
  };

  const postStandaloneComment = async (commentId: string) => {
    const comment = state.pendingComments.find(c => c.id === commentId);
    if (!comment || !comment.body.trim()) return;

    if (!state.pullRequest) {
      console.error('No pull request loaded');
      return;
    }

    try {
      // Import the API service dynamically
      const { submitLineComment } = await import('../services/review-api.service');

      // Get owner and repo from the PR data
      const owner = state.pullRequest.head.repo?.full_name?.split('/')[0] || state.pullRequest.user.login;
      const repo = state.pullRequest.head.repo?.name || '';
      const commitSha = state.pullRequest.head.sha;

      // Submit the individual comment to GitHub
      const newComment = await submitLineComment(
        owner,
        repo,
        state.pullRequest.number,
        comment.filename,
        comment.startLine,
        comment.body,
        comment.side === 'left' ? 'LEFT' : 'RIGHT',
        commitSha
      );

      // Add the new comment to our state
      state.reviewComments.push(newComment);

      // Remove from pending comments
      state.pendingComments = state.pendingComments.filter(c => c.id !== commentId);
      state.activeCommentId = null;
      clearLineSelection();

      console.log('Standalone comment posted successfully:', newComment);
    } catch (error) {
      console.error('Failed to post comment:', error);
      state.error = error instanceof Error ? error.message : 'Failed to post comment';
    }
  };

  const updatePendingComment = (commentId: string, body: string, isPartOfReview?: boolean) => {
    const comment = state.pendingComments.find(c => c.id === commentId);
    if (comment) {
      comment.body = body;
      if (isPartOfReview !== undefined) {
        comment.isPartOfReview = isPartOfReview;
      }
    }
  };

  const savePendingComment = (commentId: string) => {
    const comment = state.pendingComments.find(c => c.id === commentId);
    if (!comment || !comment.body.trim()) return;

    // Mark the comment as saved (part of review)
    comment.isPartOfReview = true;
    state.activeCommentId = null;
    // Don't clear line selection - user might want to add another comment on same lines

    console.log('Comment saved to pending review:', comment);
  };

  const submitReview = async () => {
    if (!state.pullRequest) {
      console.error('No pull request loaded');
      return;
    }

    if (state.pendingComments.length === 0 && !state.reviewDraft.body.trim()) {
      console.error('No comments or review body to submit');
      return;
    }

    try {
      // Import the API service dynamically
      const { submitPullRequestReview, preparePendingCommentsForReview } = await import('../services/review-api.service');

      // Get owner and repo from the PR data
      const owner = state.pullRequest.head.repo?.full_name?.split('/')[0] || state.pullRequest.user.login;
      const repo = state.pullRequest.head.repo?.name || '';

      // Prepare pending comments for the review API
      const pendingReviewComments = state.pendingComments
        .filter(c => c.isPartOfReview && c.body.trim())
        .map(c => ({
          path: c.filename,
          line: c.startLine,
          side: c.side === 'left' ? 'LEFT' as const : 'RIGHT' as const,
          body: c.body
        }));

      // Calculate positions for all pending comments
      const reviewComments = await preparePendingCommentsForReview(
        owner,
        repo,
        state.pullRequest.number,
        pendingReviewComments
      );

      // Submit the entire review
      const newReview = await submitPullRequestReview(
        owner,
        repo,
        state.pullRequest.number,
        {
          event: state.reviewDraft.event,
          body: state.reviewDraft.body,
          comments: reviewComments
        }
      );

      // Add the new review to our state
      state.reviews.push(newReview);

      // Add individual comments to reviewComments if they were created
      if (newReview.comments) {
        state.reviewComments.push(...newReview.comments);
      }

      // Clear pending state
      state.pendingComments = [];
      state.activeCommentId = null;
      state.reviewDraft = {
        body: '',
        event: 'COMMENT'
      };
      clearLineSelection();

      console.log('Review submitted successfully:', newReview);
    } catch (error) {
      console.error('Failed to submit review:', error);
      state.error = error instanceof Error ? error.message : 'Failed to submit review';
    }
  };

  const updateReviewDraft = (body: string, event?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') => {
    state.reviewDraft.body = body;
    if (event) {
      state.reviewDraft.event = event;
    }
  };

  const cancelPendingComment = (commentId: string) => {
    state.pendingComments = state.pendingComments.filter(c => c.id !== commentId);
    if (state.activeCommentId === commentId) {
      state.activeCommentId = null;
    }
    clearLineSelection();
  };

  const isLineSelected = (filename: string, lineNumber: number, side: 'left' | 'right'): boolean => {
    return state.selectedLines.some(
      line => line.filename === filename && line.lineNumber === lineNumber && line.side === side
    );
  };

  return {
    // State
    state,

    // Derived values (wrapped in getters to avoid capture warnings)
    get fileStats() { return fileStats; },
    get reviewSummary() { return reviewSummary; },
    get checksSummary() { return checksSummary; },
    get commentsByFile() { return commentsByFile; },

    // Actions
    loadPreferences,
    saveDiffViewMode,
    loadPullRequest,
    setActiveTab,
    selectFile,
    selectCommit,
    toggleResolvedComments,
    reset,
    clearError,
    expandAllFiles,
    collapseAllFiles,
    toggleFileExpanded,

    // New comment and line selection actions
    selectLine,
    extendSelection,
    clearLineSelection,
    startCommentOnSelectedLines,
    addCommentToReview,
    postStandaloneComment,
    updatePendingComment,
    savePendingComment,
    submitReview,
    updateReviewDraft,
    cancelPendingComment,
    isLineSelected
  };
}

export type PRReviewState = ReturnType<typeof createPRReviewState>;
