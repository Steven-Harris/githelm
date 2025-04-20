<script lang="ts">
  import { type RepoConfig } from "$integrations/firebase";
  import { onMount } from "svelte";
  import { 
    loadRepositoryConfigs, 
    initializePullRequestsPolling, 
    allPullRequests 
  } from "$lib/stores/repository-service";
  import PullRequests from "./List.svelte";

  let configs: RepoConfig[] = $state([]);
  let unsubscribe: (() => void) | undefined;

  onMount(() => {
    loadData();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });

  async function loadData() {
    configs = await loadRepositoryConfigs('pull-requests');
    if (configs.length > 0) {
      unsubscribe = initializePullRequestsPolling(configs);
    }
  }
</script>

<section id="pull-requests-section" class="bg-gray-800 p-5 rounded-lg">
  <div class="flex justify-between lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Pull Requests</h2>
  </div>
  {#if configs.length > 0}
    <ul>
      {#each configs as config (config.repo)}
        <PullRequests 
          org={config.org} 
          repo={config.repo} 
          pullRequests={$allPullRequests[`${config.org}/${config.repo}`] || []} 
        />
      {/each}
    </ul>
  {:else}
    <p id="prs-not-found">No pull requests found. Configure repositories by clicking the pencil icon above.</p>
  {/if}
</section>
