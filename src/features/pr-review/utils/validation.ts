/**
 * Validates comment form input
 */
export function validateComment(body: string): string | null {
  const trimmed = body.trim();

  if (!trimmed) {
    return 'Comment cannot be empty';
  }

  if (trimmed.length < 1) {
    return 'Comment must be at least 1 character';
  }

  if (trimmed.length > 65536) {
    return 'Comment cannot exceed 65,536 characters';
  }

  return null;
}

/**
 * Validates review submission
 */
export function validateReview(body: string, event: string): string | null {
  const trimmed = body.trim();

  if (event === 'REQUEST_CHANGES' && !trimmed) {
    return 'Request changes requires a comment explaining what needs to be changed';
  }

  if (trimmed.length > 65536) {
    return 'Review comment cannot exceed 65,536 characters';
  }

  return null;
}

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}