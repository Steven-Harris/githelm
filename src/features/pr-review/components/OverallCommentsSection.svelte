<script lang="ts">
  import type { Review } from '$integrations/github';

  interface Props {
    reviews: Review[];
  }

  const { reviews }: Props = $props();

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

{#if reviews.length > 0}
  <div class="p-4">
    <h4 class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Overall Review</h4>
    <div class="space-y-3">
      {#each reviews as review}
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
