<script lang="ts">
  import { type PullRequest, fetchPullRequestsWithGraphQL } from "$integrations/github";
  import createPollingStore from "$stores/polling.store";
  import Reviews from "./Reviews.svelte";
  let { org, repo, filters } = $props();

  const pullRequestsStore = createPollingStore<PullRequest[]>(`${org}-${repo}-pull-requests`, () => fetchPullRequestsWithGraphQL(org, repo, filters));
</script>

<h3 class="text-lg font-semibold hover:underline">
  <a href={`https://github.com/${org}/${repo}/pulls`} target="_blank">{repo}</a>
</h3>
<ul>
  {#if $pullRequestsStore.length > 0}
    {#each $pullRequestsStore as pr (pr.number)}
      <li class="mb-2 flex flex-col">
        <a href={pr.html_url} target="_blank">
          <div id="pr-item" class="cursor-pointer p-2 bg-gray-700 rounded-md hover:bg-gray-600 flex-grow flex items-center">
            <img src={pr.user.avatar_url} class="avatar mr-1" alt={pr.user.login} />
            <span class="cursor-pointer flex-grow max-w-[70%] hover:underline">{pr.title}</span>
            <Reviews reviews={pr.reviews || []} />
          </div>
        </a>
      </li>
    {/each}
  {/if}
</ul>
