<script lang="ts">
  import { PullRequestReview } from '$features/pr-review';
  import type { PageData } from './$types';

  // Using proper Svelte 5 syntax with page data
  let { data }: { data: PageData } = $props();

  const { owner, repo, prNumber } = data;
</script>

<svelte:head>
  <title>PR #{prNumber} - {owner}/{repo} | GitHelm</title>
  <meta name="description" content="Review pull request #{prNumber} in {owner}/{repo}" />
</svelte:head>

{#if owner && repo && prNumber}
  <PullRequestReview {owner} {repo} {prNumber} />
{:else}
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <div class="text-gray-400 text-6xl mb-4">⚠️</div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Invalid Parameters</h2>
      <p class="text-gray-600">Invalid owner, repository, or pull request number.</p>
    </div>
  </div>
{/if}
