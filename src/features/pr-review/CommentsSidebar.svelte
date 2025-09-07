<script lang="ts">
  import type { Review, ReviewComment } from '$integrations/github';

  interface Props {
    reviews: Review[];
    reviewComments: ReviewComment[];
    selectedFile: string | null;
  }

  const { reviews, reviewComments, selectedFile }: Props = $props();

  // Filter comments for the selected file
  const fileComments = $derived(() => {
    if (!selectedFile) return reviewComments;
    return reviewComments.filter((comment) => comment.path === selectedFile);
  });

  // Group comments by line number
  const commentsByLine = $derived(() => {
    const grouped: Record<number, ReviewComment[]> = {};
    const comments = fileComments();
    comments.forEach((comment) => {
      const line = comment.line || comment.original_line || 0;
      if (!grouped[line]) grouped[line] = [];
      grouped[line].push(comment);
    });
    return grouped;
  });

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
</script>

<div class="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto">
  <div class="p-4 border-b border-gray-200">
    <h3 class="text-sm font-medium text-gray-900">
      {#if selectedFile}
        Comments for {selectedFile.split('/').pop()}
      {:else}
        All Comments
      {/if}
    </h3>
  </div>

  <div class="p-4 space-y-4">
    <!-- Overall Reviews -->
    {#if reviews.length > 0}
      <div class="space-y-3">
        <h4 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Reviews</h4>
        {#each reviews as review}
          <div class="bg-gray-50 rounded-lg p-3">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center">
                <img src={review.user.avatar_url} alt={review.user.login} class="w-6 h-6 rounded-full mr-2" />
                <div>
                  <div class="text-sm font-medium text-gray-900">{review.user.login}</div>
                  <div class="text-xs text-gray-500">{formatDate(review.submitted_at)}</div>
                </div>
              </div>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getStatusColor(review.state)}">
                {review.state.replace('_', ' ')}
              </span>
            </div>
            {#if review.body}
              <div class="text-sm text-gray-700 whitespace-pre-wrap">{review.body}</div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Line-specific Comments -->
    {#if Object.keys(commentsByLine).length > 0}
      <div class="space-y-3">
        <h4 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Line Comments</h4>
        {#each Object.entries(commentsByLine).sort(([a], [b]) => Number(a) - Number(b)) as [lineNumber, comments]}
          <div class="bg-blue-50 rounded-lg p-3">
            <div class="text-xs font-medium text-blue-800 mb-2">
              Line {lineNumber}
              {#if selectedFile}
                <span class="text-blue-600">in {selectedFile.split('/').pop()}</span>
              {/if}
            </div>
            <div class="space-y-2">
              {#each comments as comment}
                <div class="bg-white rounded p-2">
                  <div class="flex items-start justify-between mb-1">
                    <div class="flex items-center">
                      <img src={comment.user.avatar_url} alt={comment.user.login} class="w-4 h-4 rounded-full mr-1" />
                      <span class="text-xs font-medium text-gray-900">{comment.user.login}</span>
                    </div>
                    <span class="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                  </div>
                  <div class="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- General file comments (not tied to specific lines) -->
    {#if !selectedFile && reviewComments.filter((c) => !c.line && !c.original_line).length > 0}
      <div class="space-y-3">
        <h4 class="text-xs font-medium text-gray-500 uppercase tracking-wide">General Comments</h4>
        {#each reviewComments.filter((c) => !c.line && !c.original_line) as comment}
          <div class="bg-gray-50 rounded-lg p-3">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center">
                <img src={comment.user.avatar_url} alt={comment.user.login} class="w-5 h-5 rounded-full mr-2" />
                <div>
                  <div class="text-sm font-medium text-gray-900">{comment.user.login}</div>
                  <div class="text-xs text-gray-500">{formatDate(comment.created_at)}</div>
                </div>
              </div>
            </div>
            <div class="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</div>
            {#if comment.path}
              <div class="text-xs text-gray-500 mt-1">on {comment.path}</div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if reviews.length === 0 && fileComments.length === 0}
      <div class="text-center py-8 text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.13 8.13 0 01-2.939-.515l-5.637 1.879a1 1 0 01-1.26-1.26l1.879-5.637A8.13 8.13 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"
          />
        </svg>
        <p class="text-sm">No comments yet</p>
      </div>
    {/if}
  </div>
</div>
