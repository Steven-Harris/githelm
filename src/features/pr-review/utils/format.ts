/**
 * Shared formatting and display helpers for the PR review feature.
 */

/**
 * Format a date string to a human-readable short format.
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date string with year included.
 */
export function formatDateFull(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get Tailwind classes for a review state badge.
 */
export function getReviewStatusColor(state: string): string {
  switch (state.toLowerCase()) {
    case 'approved':
      return 'bg-green-900/30 text-green-200 border border-green-800/50';
    case 'changes_requested':
      return 'bg-red-900/30 text-red-200 border border-red-800/50';
    case 'pending':
      return 'bg-yellow-900/30 text-yellow-200 border border-yellow-800/50';
    case 'commented':
      return 'bg-blue-900/30 text-blue-200 border border-blue-800/50';
    case 'dismissed':
      return 'bg-[#30363d]/60 text-[#c9d1d9] border border-[#30363d]';
    default:
      return 'bg-[#30363d]/60 text-[#c9d1d9] border border-[#30363d]';
  }
}

/**
 * Get Tailwind classes for a file status indicator.
 */
export function getFileStatusColor(status: string): string {
  switch (status) {
    case 'added':
      return 'text-green-300 bg-green-900/20 border-green-800/50';
    case 'removed':
      return 'text-red-300 bg-red-900/20 border-red-800/50';
    case 'modified':
      return 'text-yellow-300 bg-yellow-900/20 border-yellow-800/50';
    case 'renamed':
      return 'text-blue-300 bg-blue-900/20 border-blue-800/50';
    default:
      return 'text-[#8b949e] bg-[#0d1117] border-[#30363d]';
  }
}

/**
 * Get a single-character icon for a file status.
 */
export function getFileStatusIcon(status: string): string {
  switch (status) {
    case 'added':
      return '+';
    case 'removed':
      return '-';
    case 'modified':
      return '~';
    case 'renamed':
      return '→';
    default:
      return '?';
  }
}

/**
 * Format a review state label with icon.
 */
export function formatReviewStateLabel(state: string): string {
  switch (state) {
    case 'APPROVED':
      return '✓ Approved';
    case 'CHANGES_REQUESTED':
      return '✗ Changes requested';
    case 'DISMISSED':
      return '⚪ Dismissed';
    default:
      return state.replaceAll('_', ' ').toLowerCase();
  }
}
