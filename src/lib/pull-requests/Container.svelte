<script lang="ts">
  import { allPullRequests, pullRequestConfigs, getRepoKey } from "$lib/stores/repository-service";
  import PullRequests from "./List.svelte";
</script>

<section id="pull-requests-section" class="bg-gray-800 p-5 rounded-lg">
  <div class="flex justify-between lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Pull Requests</h2>
  </div>
  {#if $pullRequestConfigs.length > 0}
    <ul>
      {#each $pullRequestConfigs as config (getRepoKey(config))}
        <PullRequests 
          org={config.org} 
          repo={config.repo} 
          pullRequests={$allPullRequests[getRepoKey(config)] || []} 
        />
      {/each}
    </ul>
  {:else}
    <p id="prs-not-found">No pull requests found. Configure repositories by clicking the pencil icon above.</p>
  {/if}
</section>
