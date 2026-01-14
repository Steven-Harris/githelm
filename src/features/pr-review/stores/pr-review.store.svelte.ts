import type {
  CheckRun,
  DetailedPullRequest,
  PullRequestCommit,
  PullRequestFile,
  Review,
  ReviewComment
} from '$integrations/github';

export interface SelectedLine {
  filename: string;
  lineNumber: number;
  side: 'left' | 'right'; 
  content: string;
}

export interface PendingComment {
  id: string;
  filename: string;
  startLine: number;
  endLine?: number;
  side: 'left' | 'right';
  body: string;
  isPartOfReview: boolean;
}

export interface ReviewDraft {
  body: string; 
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
  viewerLogin: string | null;
  viewerCanResolveThreads: boolean;
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
  focusSelectedFileOnly: boolean;
  selectedLines: SelectedLine[];
  pendingComments: PendingComment[];
  isSelectingLines: boolean;
  activeCommentId: string | null; 
  reviewDraft: ReviewDraft;
}

export function createPRReviewState() {
  const state = $state<PullRequestReviewState>({
    pullRequest: null,
    reviewComments: [],
    files: [],
    commits: [],
    reviews: [],
    checks: [],
    viewerLogin: null,
    viewerCanResolveThreads: false,
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
    focusSelectedFileOnly: false,
    selectedLines: [],
    pendingComments: [],
    isSelectingLines: false,
    activeCommentId: null,
    reviewDraft: {
      body: '',
      event: 'COMMENT'
    },
  });

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

  const getApiRepo = () => {
    const pr: any = state.pullRequest;
    const fullName: string | undefined = pr?.base?.repo?.full_name ?? pr?.head?.repo?.full_name;
    const repoName: string | undefined = pr?.base?.repo?.name ?? pr?.head?.repo?.name;
    const owner = fullName?.split('/')?.[0] ?? pr?.base?.user?.login ?? pr?.head?.user?.login ?? pr?.user?.login ?? '';
    const repo = repoName ?? '';
    return { owner, repo };
  };

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

    // Best-effort: capture viewer login for UI permissions.
    // This is non-fatal if it fails; ownership checks will fall back to disallow.
    const viewerLoginPromise = (async () => {
      try {
        const { getViewerLogin } = await import('../services/review-api.service');
        return await getViewerLogin();
      } catch {
        return null;
      }
    })();

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

      state.viewerLogin = await viewerLoginPromise;

      // PR authors can typically resolve conversations even if they can't "review".
      const isAuthor = !!(state.viewerLogin && state.pullRequest?.user?.login && state.viewerLogin === state.pullRequest.user.login);
      state.viewerCanResolveThreads = !!(state.viewerCanResolveThreads || isAuthor);

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

  const setThreadResolved = async (threadId: string, resolved: boolean): Promise<void> => {
    if (!threadId) return;

    const previous = state.reviewComments;

    // Optimistic UI update.
    state.reviewComments = state.reviewComments.map((c) => {
      if (c.thread_id === threadId) {
        return { ...c, is_resolved: resolved };
      }
      return c;
    });

    try {
      const { setReviewThreadResolved } = await import('../services/review-api.service');
      const ok = await setReviewThreadResolved(threadId, resolved);

      if (!ok) {
        state.reviewComments = previous;
        throw new Error('Failed to update thread resolution');
      }
    } catch (error) {
      state.reviewComments = previous;
      console.warn('Failed to update thread resolution:', error);
      throw error instanceof Error ? error : new Error('Failed to update thread resolution');
    }
  };

  const replyToSubmittedComment = async (inReplyToId: number, body: string): Promise<void> => {
    if (!state.pullRequest) {
      console.error('No pull request loaded');
      throw new Error('No pull request loaded');
    }

    const trimmed = body.trim();
    if (!trimmed) return;

    try {
      const parent = state.reviewComments.find((c: any) => c.id === inReplyToId);
      if (!parent) {
        throw new Error('Parent comment not found');
      }

      const { replyToComment } = await import('../services/review-api.service');

      const { owner, repo } = getApiRepo();

      const newReply = await replyToComment(owner, repo, state.pullRequest.number, inReplyToId, trimmed);

      // Ensure thread metadata is preserved for UI actions.
      if (parent.thread_id && !newReply.thread_id) {
        newReply.thread_id = parent.thread_id;
      }
      if (typeof parent.is_resolved === 'boolean' && typeof newReply.is_resolved !== 'boolean') {
        newReply.is_resolved = parent.is_resolved;
      }

      state.reviewComments.push(newReply);
    } catch (error) {
      console.error('Failed to reply to comment:', error);
      throw error instanceof Error ? error : new Error('Failed to reply to comment');
    }
  };

  const updateSubmittedComment = async (commentId: number, body: string): Promise<void> => {
    if (!state.pullRequest) {
      console.error('No pull request loaded');
      throw new Error('No pull request loaded');
    }

    const trimmed = body.trim();
    if (!trimmed) return;

    try {
      const existing = state.reviewComments.find((c: any) => c.id === commentId);
      if (!existing) {
        throw new Error('Comment not found');
      }

      if (!state.viewerLogin || existing.user?.login !== state.viewerLogin) {
        throw new Error('You can only edit your own comments');
      }

      const { updateComment } = await import('../services/review-api.service');

      const { owner, repo } = getApiRepo();

      const updated = await updateComment(owner, repo, commentId, trimmed);

      // Preserve thread metadata that REST may not include.
      updated.thread_id = existing.thread_id;
      updated.is_resolved = existing.is_resolved;

      state.reviewComments = state.reviewComments.map((c: any) => (c.id === commentId ? { ...c, ...updated } : c));
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error instanceof Error ? error : new Error('Failed to update comment');
    }
  };

  const selectFile = (fileName: string | null) => {
    state.selectedFile = fileName;

    if (state.focusSelectedFileOnly && fileName) {
      // In focus mode, ensure the selected file is expanded.
      const newExpanded = new Set(state.expandedFiles);
      newExpanded.add(fileName);
      state.expandedFiles = newExpanded;
    }
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
      viewerLogin: null,
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

  const toggleFocusSelectedFileOnly = () => {
    state.focusSelectedFileOnly = !state.focusSelectedFileOnly;

    if (state.focusSelectedFileOnly && state.selectedFile) {
      // Ensure the focused file is visible/expanded.
      const newExpanded = new Set(state.expandedFiles);
      newExpanded.add(state.selectedFile);
      state.expandedFiles = newExpanded;
    }
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

  const findFirstRightSideLineFromPatch = (patch?: string | null): number | null => {
    if (!patch) return null;

    const lines = patch.split('\n');
    let newLineNumber = 0;
    let inHunk = false;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          newLineNumber = parseInt(match[1], 10) - 1;
          inHunk = true;
        }
        continue;
      }

      if (!inHunk) continue;

      // Right-side lines are represented by context (' ') and additions ('+').
      if (line.startsWith(' ') || line.startsWith('+')) {
        newLineNumber++;
        return newLineNumber;
      }

      // Deletions only advance old line, so we ignore them.
      if (line.startsWith('-')) {
        continue;
      }
    }

    return null;
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

  const startCommentOnSelectedLines = (isPartOfReview: boolean = true) => {
    if (state.selectedLines.length === 0) return;

    // GitHub does not allow review comments/reviews on your own PR.
    if (state.viewerLogin && state.pullRequest?.user?.login && state.viewerLogin === state.pullRequest.user.login) {
      state.error = "You can't add file comments on your own pull request.";
      return;
    }

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

  const startCommentOnFile = (filename: string, isPartOfReview: boolean = false) => {
    // GitHub does not allow review comments/reviews on your own PR.
    if (state.viewerLogin && state.pullRequest?.user?.login && state.viewerLogin === state.pullRequest.user.login) {
      state.error = "You can't add file comments on your own pull request.";
      return;
    }

    const file = state.files.find(f => f.filename === filename);
    if (!file) {
      state.error = `File not found: ${filename}`;
      return;
    }

    // Ensure file is expanded so the inline form is visible.
    const newExpanded = new Set(state.expandedFiles);
    newExpanded.add(filename);
    state.expandedFiles = newExpanded;

    const firstLine = findFirstRightSideLineFromPatch(file.patch);

    if (!firstLine) {
      state.error = 'Cannot start a file comment (no diff available for this file).';
      return;
    }

    selectLine(filename, firstLine, 'right', '', false);
    startCommentOnSelectedLines(isPartOfReview);
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

    // Ensure we know who the viewer is (GitHub login) so we can enforce
    // GitHub's rule: you cannot add review comments on your own PR.
    if (!state.viewerLogin) {
      try {
        const { getViewerLogin } = await import('../services/review-api.service');
        state.viewerLogin = await getViewerLogin();
      } catch {
        // If we can't determine viewer login, be conservative.
        state.error = 'Unable to determine current GitHub user.';
        return;
      }
    }

    if (state.viewerLogin && state.pullRequest.user?.login && state.viewerLogin === state.pullRequest.user.login) {
      state.error = "You can't add file comments on your own pull request.";
      return;
    }

    try {
      // Import the API service dynamically
      const { submitLineComment } = await import('../services/review-api.service');

      // Get owner and repo from the PR data
      const { owner, repo } = getApiRepo();
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

  // Backwards-compatible alias used by some components.
  // In this store implementation a "pending comment" is posted as a standalone
  // review comment unless it has been explicitly added to the review.
  const submitPendingComment = async (commentId: string) => {
    return postStandaloneComment(commentId);
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

  const submitReview = async (eventOverride?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') => {
    if (!state.pullRequest) {
      console.error('No pull request loaded');
      return;
    }

    // Ensure we know who the viewer is (GitHub login) so we can enforce
    // GitHub's rule: you cannot submit a review on your own PR.
    if (!state.viewerLogin) {
      try {
        const { getViewerLogin } = await import('../services/review-api.service');
        state.viewerLogin = await getViewerLogin();
      } catch {
        // If we can't determine viewer login, fall through; the UI should
        // already disable review submission, but we won't hard-block here.
      }
    }

    if (state.viewerLogin && state.pullRequest.user?.login && state.viewerLogin === state.pullRequest.user.login) {
      state.error = "You can't submit a review on your own pull request.";
      return;
    }

    const reviewCommentsPending = state.pendingComments.filter(c => c.isPartOfReview && c.body.trim());

    const event = eventOverride ?? state.reviewDraft.event;
    const body = state.reviewDraft.body?.trim() ?? '';

    // Validation rules (match GitHub-like behavior + product requirements)
    // - APPROVE: allowed with empty body and no inline comments
    // - COMMENT: requires either an overall body or at least one inline comment
    // - REQUEST_CHANGES: requires an overall body (cannot submit without)
    if (event === 'REQUEST_CHANGES' && body.length === 0) {
      state.error = 'Requesting changes requires an overall comment.';
      return;
    }

    if (event === 'COMMENT' && reviewCommentsPending.length === 0 && body.length === 0) {
      // Nothing to submit
      return;
    }

    try {
      // Import the API service dynamically
      const { submitPullRequestReview, preparePendingCommentsForReview } = await import('../services/review-api.service');

      // Get owner and repo from the PR data
      const { owner, repo } = getApiRepo();

      // Prepare pending comments for the review API
      const pendingReviewComments = reviewCommentsPending
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
          event,
          body,
          comments: reviewComments
        }
      );

      // Add the new review to our state
      state.reviews.push(newReview);

      // Refresh server truth: the review creation response does not reliably include
      // the newly-created inline comments, so we refetch them.
      try {
        const { fetchReviewComments, fetchPullRequestReviews } = await import('../services/pr-review.service');
        const [freshComments, freshReviews] = await Promise.all([
          fetchReviewComments(owner, repo, state.pullRequest.number),
          fetchPullRequestReviews(owner, repo, state.pullRequest.number)
        ]);
        state.reviewComments = freshComments;
        state.reviews = freshReviews;
      } catch (refreshError) {
        // If refresh fails, we still keep the optimistic review push above.
        console.warn('Failed to refresh review data after submit:', refreshError);
      }

      // Clear pending state
      state.pendingComments = [];
      state.activeCommentId = null;
      state.reviewDraft = {
        body: '',
        event: 'COMMENT'
      };
      clearLineSelection();

      // Success
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

  const deleteSubmittedComment = async (commentId: number): Promise<void> => {
    if (!state.pullRequest) {
      console.error('No pull request loaded');
      throw new Error('No pull request loaded');
    }

    try {
      const existing = state.reviewComments.find((c: any) => c.id === commentId);
      if (!existing) {
        throw new Error('Comment not found');
      }

      if (!state.viewerLogin || existing.user?.login !== state.viewerLogin) {
        throw new Error('You can only delete your own comments');
      }

      const { deleteComment } = await import('../services/review-api.service');

      const { owner, repo } = getApiRepo();

      await deleteComment(owner, repo, commentId);

      // Refresh comments so the UI matches GitHub without a full page reload.
      try {
        const { fetchReviewComments } = await import('../services/pr-review.service');
        state.reviewComments = await fetchReviewComments(owner, repo, state.pullRequest.number);
      } catch (refreshError) {
        // Fall back to local removal if refresh fails.
        state.reviewComments = state.reviewComments.filter((c: any) => c.id !== commentId);
        console.warn('Failed to refresh comments after delete:', refreshError);
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error instanceof Error ? error : new Error('Failed to delete comment');
    }
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
    setThreadResolved,
    selectFile,
    selectCommit,
    toggleResolvedComments,
    reset,
    clearError,
    expandAllFiles,
    collapseAllFiles,
    toggleFileExpanded,
    toggleFocusSelectedFileOnly,

    // New comment and line selection actions
    selectLine,
    extendSelection,
    clearLineSelection,
    startCommentOnSelectedLines,
    startCommentOnFile,
    addCommentToReview,
    postStandaloneComment,
    submitPendingComment,
    updatePendingComment,
    savePendingComment,
    submitReview,
    updateReviewDraft,
    cancelPendingComment,
    deleteSubmittedComment,
    updateSubmittedComment,
    replyToSubmittedComment,
    isLineSelected
  };
}

export type PRReviewState = ReturnType<typeof createPRReviewState>;
