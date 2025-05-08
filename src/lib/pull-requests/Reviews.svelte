<script lang="ts">
  import checkSVG from '$assets/check.svg';
  import commentSVG from '$assets/comment.svg';
  import type { Review } from '$integrations/github';

  let { reviews = [] } = $props<{ reviews: Review[] }>();

  function getUniqueKey(review: Review, index: number): string {
    return review?.id ? `${review.id}-${index}` : `review-${index}`;
  }
</script>

<span class="reviews-container h-7 flex items-center overflow-hidden">
  {#if reviews.length !== 0}
    {#each reviews.slice(0, 3) as review, index (getUniqueKey(review, index))}
      <div class="avatar-container mr-1">
        <img src={review.user.avatar_url} class="avatar" alt={review.user.login} />
        {#if review.state === 'APPROVED'}
          <img class="review-state-icon approved" alt="approved" src={checkSVG} width="15" height="15" />
        {:else}
          <img class="review-state-icon not-approved" alt="not approved" src={commentSVG} width="15" height="15" />
        {/if}
      </div>
    {/each}
    {#if reviews.length > 3}
      <span class="more-approvers">+{reviews.length - 3}</span>
    {/if}
  {/if}
</span>
