<script lang="ts">
  import type { Review } from '$integrations/github';
  import { renderMarkdownToHtml } from '../utils/markdown';
  import { formatDate, getReviewStatusColor, formatReviewStateLabel } from '../utils/format';

  interface Props {
    reviews: Review[];
  }

  const { reviews }: Props = $props();
</script>

{#if reviews.length > 0}
  <div class="p-4">
    <h4 class="text-xs font-medium text-[#9dabc4] uppercase tracking-wide mb-3">Overall Review</h4>
    <div class="space-y-3">
      {#each reviews as review}
        <div class="group border border-[#243044] rounded-lg p-3 hover:border-[#3d444d] transition-colors bg-[#121826] text-[#e9eefb]">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center">
              <img src={review.user.avatar_url} alt={review.user.login} class="w-6 h-6 rounded-full mr-2" />
              <div>
                <div class="text-sm font-medium text-[#e9eefb]">{review.user.login}</div>
                <div class="text-xs text-[#9dabc4]">{formatDate(review.submitted_at)}</div>
              </div>
            </div>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getReviewStatusColor(review.state)}">
              {formatReviewStateLabel(review.state)}
            </span>
          </div>
          {#if review.body && review.body.trim() !== ''}
            <div class="gh-markdown text-sm prose prose-sm max-w-none prose-invert leading-relaxed overflow-x-auto">
              {@html renderMarkdownToHtml(review.body)}
            </div>
          {:else}
            <div class="text-xs text-[#9dabc4] italic">No comment.</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}
