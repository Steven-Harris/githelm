import type {
  CheckRun,
  DetailedPullRequest,
  PullRequestCommit,
  PullRequestFile,
  Review,
  ReviewComment
} from '$integrations/github';

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
    toggleFileExpanded
  };
}
