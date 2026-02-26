import type {
  CheckRun,
  DetailedPullRequest,
  PullRequestCommit,
  PullRequestFile,
  Review,
  ReviewComment
} from '$integrations/github';

// Core PR Review Types
export interface PRReviewData {
  pullRequest: DetailedPullRequest | null;
  reviewComments: ReviewComment[];
  files: PullRequestFile[];
  commits: PullRequestCommit[];
  reviews: Review[];
  checks: CheckRun[];
}

// Line selection and commenting types
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
  selectedText?: string;
  isPartOfReview: boolean;
}

// UI State types
export interface UIState {
  activeTab: 'overview' | 'files' | 'commits' | 'checks';
  selectedFile: string | null;
  selectedCommit: string | null;
  showResolvedComments: boolean;
  expandedFiles: Set<string>;
  diffViewMode: 'inline' | 'side-by-side';
  expandFilesOnLoad: boolean;
}

// Comment form types
export interface CommentFormState {
  selectedLines: SelectedLine[];
  pendingComments: PendingComment[];
  isSelectingLines: boolean;
  activeCommentId: string | null;
  showGeneralCommentForm: boolean;
  showApproveForm: boolean;
  showRequestChangesForm: boolean;
}

// Individual comment form data
export interface CommentFormData {
  body: string;
  submitting: boolean;
  error: string | null;
}

// Loading and error states
export interface LoadingState {
  loading: boolean;
  error: string | null;
  submittingReview: boolean;
}

// Complete state interface
export interface PRReviewState extends PRReviewData, UIState, CommentFormState, LoadingState {
  preferencesLoaded: boolean;
}

// API operation results
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Review submission types
export interface ReviewSubmissionData {
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body?: string;
  comments?: Array<{
    path: string;
    line: number;
    body: string;
  }>;
}