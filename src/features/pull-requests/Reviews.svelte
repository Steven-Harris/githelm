<script lang="ts">
  import checkSVG from '$assets/check.svg';
  import commentSVG from '$assets/comment.svg';
  import type { Review } from '$integrations/github';

  let { reviews = [] } = $props<{ reviews: Review[] }>();

  function getUniqueKey(review: Review, index: number): string {
    return review?.id ? `${review.id}-${index}` : `review-${index}`;
  }
</script>

<span class="reviews-container">
  {#if reviews.length !== 0}
    {#each reviews.slice(0, 3) as review, index (getUniqueKey(review, index))}
      <div class="avatar-container">
        <img src={review.user.avatar_url} class="avatar" alt={review.user.login} title={review.user.login} />
        {#if review.state === 'APPROVED'}
          <span class="review-state-icon approved" title="Approved">
            <img alt="Approved" src={checkSVG} width="10" height="10" />
          </span>
        {:else}
          <span class="review-state-icon not-approved" title="Commented">
            <img alt="Commented" src={commentSVG} width="10" height="10" />
          </span>
        {/if}
      </div>
    {/each}
    {#if reviews.length > 3}
      <span class="more-approvers">+{reviews.length - 3}</span>
    {/if}
  {/if}
</span>
