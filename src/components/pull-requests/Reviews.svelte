<script lang="ts">
  import { onMount } from "svelte";
  import checkSVG from "../../assets/check.svg";
  import commentSVG from "../../assets/comment.svg";
  import { fetchReviews } from "../../services/github";
  import type { Review } from "../../services/models";

  let { org, repo, prNumber } = $props();

  let reviews: Review[] = $state([]);
  onMount(async () => {
    const fetchedReviews = await fetchReviews(org, repo, prNumber);
    reviews = Array.from(
      fetchedReviews
        .reduce((map: Map<string, any>, review: any) => {
          map.set(review.user.login, review);
          return map;
        }, new Map())
        .values(),
    ).slice(0, 3);
  });
</script>

<span class="reviews-container h-7 flex items-center overflow-hidden">
  {#each reviews as review}
    <div class="avatar-container mr-1">
      <img src={review.user.avatar_url} class="avatar" alt={review.user.login} />
      {#if review.state === "APPROVED"}
        <img class="review-state-icon approved" alt="approved" src={checkSVG} width="15" height="15" />
      {:else}
        <img class="review-state-icon not-approved" alt="not approved" src={commentSVG} width="15" height="15" />
      {/if}
    </div>
  {/each}
  {#if reviews.length > 3}
    <span class="more-approvers">+{reviews.length - 3}</span>
  {/if}
</span>
