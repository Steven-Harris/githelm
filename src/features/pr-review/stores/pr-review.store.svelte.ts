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

  // Line selection and commenting methods
  const selectLine = (filename: string, lineNumber: number, side: 'left' | 'right', content: string) => {
    // Start new selection or extend existing selection
    const newSelection: SelectedLine = { filename, lineNumber, side, content };

    // If selecting on the same file and side, check for multi-line selection
    const existingSelection = state.selectedLines.find(
      line => line.filename === filename && line.side === side
    );

    if (existingSelection) {
      // Extend selection to include range
      const startLine = Math.min(existingSelection.lineNumber, lineNumber);
      const endLine = Math.max(existingSelection.lineNumber, lineNumber);

      state.selectedLines = [];
      for (let i = startLine; i <= endLine; i++) {
        state.selectedLines.push({
          filename,
          lineNumber: i,
          side,
          content: i === lineNumber ? content : `Line ${i}` // We'd need actual content here
        });
      }
    } else {
      // New selection
      state.selectedLines = [newSelection];
    }
  };

  const clearLineSelection = () => {
    state.selectedLines = [];
    state.isSelectingLines = false;
  };

  const startCommentOnSelectedLines = () => {
    if (state.selectedLines.length === 0) return;

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
      isPartOfReview: false
    };

    state.pendingComments.push(pendingComment);
    state.activeCommentId = commentId;
    // Don't clear selection yet - we'll clear it when comment is submitted or cancelled
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

  const submitPendingComment = async (commentId: string) => {
    const comment = state.pendingComments.find(c => c.id === commentId);
    if (!comment || !comment.body.trim()) return;

    // TODO: Implement actual API call to submit comment
    console.log('Submitting comment:', comment);

    // Remove from pending comments
    state.pendingComments = state.pendingComments.filter(c => c.id !== commentId);
    state.activeCommentId = null;
    clearLineSelection();

    // TODO: Refresh PR data to show new comment
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
    clearLineSelection,
    startCommentOnSelectedLines,
    updatePendingComment,
    submitPendingComment,
    cancelPendingComment,
    isLineSelected
  };
}

export type PRReviewState = ReturnType<typeof createPRReviewState>;
