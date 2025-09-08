<script lang="ts">
  import type { Review, ReviewComment } from '$integrations/github';

  interface Props {
    reviews: Review[];
    reviewComments: ReviewComment[];
    selectedFile: string | null;
    onCommentClick?: (filename: string, lineNumber: number) => void;
  }

  const { reviews, reviewComments, selectedFile, onCommentClick }: Props = $props();

  // Get approval/rejection reviews (reviews with states but not necessarily comments)
  const approvalReviews = $derived(reviews.filter((review) => ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)));

  // Separate overall comments (reviews with body content)
  const overallComments = $derived(reviews.filter((review) => review.body && review.body.trim() !== ''));

  // All individual line comments, sorted by file and line number
  const lineComments = $derived(
    reviewComments
      .filter((comment) => comment.line || comment.original_line)
      .sort((a, b) => {
        // First sort by file path
        const pathCompare = a.path.localeCompare(b.path);
        if (pathCompare !== 0) return pathCompare;

        // Then sort by line number
        const lineA = a.line || a.original_line || 0;
        const lineB = b.line || b.original_line || 0;
        return lineA - lineB;
      })
  );

  // Helper function to format dates
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Helper function to get status badge color
  function getStatusColor(state: string): string {
    switch (state.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'changes_requested':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'commented':
        return 'bg-blue-100 text-blue-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Check if a comment is resolved (simplified - you might need to enhance this based on GitHub's API)
  function isCommentResolved(comment: ReviewComment): boolean {
    // This is a basic implementation - GitHub's actual resolution status might be more complex
    return comment.subject_type === 'file' || false;
  }

  // Handle comment click to scroll to code
  function handleCommentClick(comment: ReviewComment) {
    if (onCommentClick) {
      const lineNumber = comment.line || comment.original_line || 0;
      onCommentClick(comment.path, lineNumber);
    }
  }

  // Get file name from path
  function getFileName(path: string): string {
    return path.split('/').pop() || path;
  }
</script>

<div class="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto">
  <div class="p-4 border-b border-gray-200">
    <h3 class="text-sm font-medium text-gray-900">Reviews & Comments</h3>
    <div class="text-xs text-gray-500 mt-1">
      {approvalReviews.length} approval{approvalReviews.length !== 1 ? 's' : ''} • {overallComments.length + lineComments.length} comment{overallComments.length + lineComments.length !== 1 ? 's' : ''}
    </div>
  </div>

  <div class="divide-y divide-gray-100">
    <!-- Approvals Section -->
    {#if approvalReviews.length > 0}
      <div class="p-4">
        <h4 class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Approvals</h4>
        <div class="space-y-2">
          {#each approvalReviews as review}
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div class="flex items-center">
                <img src={review.user.avatar_url} alt={review.user.login} class="w-6 h-6 rounded-full mr-2" />
                <div>
                  <div class="text-sm font-medium text-gray-900">{review.user.login}</div>
                  <div class="text-xs text-gray-500">{formatDate(review.submitted_at)}</div>
                </div>
              </div>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getStatusColor(review.state)}">
                {#if review.state === 'APPROVED'}
                  ✓ Approved
                {:else if review.state === 'CHANGES_REQUESTED'}
                  ✗ Changes requested
                {:else if review.state === 'DISMISSED'}
                  ⚪ Dismissed
                {:else}
                  {review.state.replace('_', ' ').toLowerCase()}
                {/if}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Overall Comments Section -->
    {#if overallComments.length > 0}
      <div class="p-4">
        <h4 class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Overall Review</h4>
        <div class="space-y-3">
          {#each overallComments as review}
            <div class="group border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center">
                  <img src={review.user.avatar_url} alt={review.user.login} class="w-6 h-6 rounded-full mr-2" />
                  <div>
                    <div class="text-sm font-medium text-gray-900">{review.user.login}</div>
                    <div class="text-xs text-gray-500">{formatDate(review.submitted_at)}</div>
                  </div>
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getStatusColor(review.state)}">
                  {review.state.replace('_', ' ').toLowerCase()}
                </span>
              </div>
              <div class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {review.body}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Individual Line Comments Section -->
    {#if lineComments.length > 0}
      <div class="p-4">
        <h4 class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Code Comments</h4>
        <div class="space-y-2">
          {#each lineComments as comment}
            {@const isResolved = isCommentResolved(comment)}
            {@const lineNumber = comment.line || comment.original_line || 0}
            <div
              class="group border border-gray-200 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:border-blue-300 hover:shadow-sm {isResolved
                ? 'opacity-50 bg-gray-50'
                : 'hover:bg-blue-50'}"
              onclick={() => handleCommentClick(comment)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && handleCommentClick(comment)}
            >
              <!-- File and line info -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center text-xs">
                  <svg class="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span class="font-medium text-gray-600">
                    {getFileName(comment.path)}
                  </span>
                  <span class="mx-1 text-gray-400">:</span>
                  <span class="text-blue-600 font-medium">
                    line {lineNumber}
                  </span>
                </div>
                {#if isResolved}
                  <div class="flex items-center text-xs text-gray-500">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                    resolved
                  </div>
                {/if}
              </div>

              <!-- Comment author and date -->
              <div class="flex items-center mb-2">
                <img src={comment.user.avatar_url} alt={comment.user.login} class="w-5 h-5 rounded-full mr-2" />
                <div class="flex items-center text-xs">
                  <span class="font-medium text-gray-900">{comment.user.login}</span>
                  <span class="mx-1 text-gray-400">•</span>
                  <span class="text-gray-500">{formatDate(comment.created_at)}</span>
                </div>
              </div>

              <!-- Comment body -->
              <div class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed {isResolved ? 'line-through' : ''}">
                {comment.body}
              </div>

              <!-- Hover indicator -->
              <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-2">
                <div class="flex items-center text-xs text-blue-600">
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  Click to view in code
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Empty state -->
    {#if approvalReviews.length === 0 && overallComments.length === 0 && lineComments.length === 0}
      <div class="p-8 text-center text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.13 8.13 0 01-2.939-.515l-5.637 1.879a1 1 0 01-1.26-1.26l1.879-5.637A8.13 8.13 0 713 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"
          />
        </svg>
        <p class="text-sm font-medium">No reviews or comments yet</p>
        <p class="text-xs text-gray-400 mt-1">Reviews and comments will appear here as they are added</p>
      </div>
    {/if}
  </div>
</div>
