<script lang="ts">
  import { fetchReviews, type Review } from "$lib/integrations/github";
  import createPollingStore from "$lib/stores/polling.store";
  import checkSVG from "../../assets/check.svg";
  import commentSVG from "../../assets/comment.svg";

  let { org, repo, prNumber } = $props();

  const fetchData = async () => {
    const fetchedReviews = await fetchReviews(org, repo, prNumber);
    return Array.from(
      fetchedReviews
        .reduce((map: Map<string, any>, review: any) => {
          map.set(review.user.login, review);
          return map;
        }, new Map())
        .values(),
    ).slice(0, 3);
  };
  const reviewsStore = createPollingStore<Review[]>(`${org}-${repo}-${prNumber}-reviews`, fetchData);
</script>

<span class="reviews-container h-7 flex items-center overflow-hidden">
  {#if $reviewsStore.length !== 0}
    {#each $reviewsStore as review}
      <div class="avatar-container mr-1">
        <img src={review.user.avatar_url} class="avatar" alt={review.user.login} />
        {#if review.state === "APPROVED"}
          <img class="review-state-icon approved" alt="approved" src={checkSVG} width="15" height="15" />
        {:else}
          <img class="review-state-icon not-approved" alt="not approved" src={commentSVG} width="15" height="15" />
        {/if}
      </div>
    {/each}
    {#if $reviewsStore.length > 3}
      <span class="more-approvers">+{$reviewsStore.length - 3}</span>
    {/if}
  {/if}
</span>
