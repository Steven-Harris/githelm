// Event types for component communication
export interface LineSelectedEvent {
  filename: string;
  lineNumber: number;
  side: 'left' | 'right';
  content: string;
}

export interface CommentSubmittedEvent {
  commentId: string;
  type: 'standalone' | 'review';
  filename?: string;
  lineNumber?: number;
}

export interface ReviewSubmittedEvent {
  reviewId: string;
  type: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body?: string;
}

export interface FileExpandedEvent {
  filename: string;
  expanded: boolean;
}

export interface TabChangedEvent {
  tab: 'overview' | 'files' | 'commits' | 'checks';
}

// Event dispatcher types for type safety
export type PRReviewEventMap = {
  'line:selected': LineSelectedEvent;
  'comment:submitted': CommentSubmittedEvent;
  'review:submitted': ReviewSubmittedEvent;
  'file:expanded': FileExpandedEvent;
  'tab:changed': TabChangedEvent;
};

// Helper type for creating typed event dispatchers
export type EventDispatcher<T extends keyof PRReviewEventMap> = (
  type: T,
  detail: PRReviewEventMap[T]
) => void;