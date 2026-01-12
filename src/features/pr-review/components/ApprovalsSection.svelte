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
</script>

{#if reviews.length > 0}
  <div class="p-4">
    <h4 class="text-xs font-medium text-[#8b949e] uppercase tracking-wide mb-3">Approvals</h4>
    <div class="space-y-2">
      {#each reviews as review}
        <div class="flex items-center justify-between p-2 bg-[#0d1117] border border-[#30363d] rounded-lg">
          <div class="flex items-center">
            <img src={review.user.avatar_url} alt={review.user.login} class="w-6 h-6 rounded-full mr-2" />
            <div>
              <div class="text-sm font-medium text-[#f0f6fc]">{review.user.login}</div>
              <div class="text-xs text-[#8b949e]">{formatDate(review.submitted_at)}</div>
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
