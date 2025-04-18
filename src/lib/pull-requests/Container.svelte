<script lang="ts">
  import { type RepoConfig, firebase } from "$integrations/firebase";
  import { fetchMultipleRepositoriesPullRequests, type PullRequest } from "$integrations/github";
  import { getStorageObject, setStorageObject } from "$integrations/storage";
  import createPollingStore from "$stores/polling.store";
  import { derived, type Readable } from "svelte/store";
  import { onMount } from "svelte";
  import PullRequests from "./List.svelte";

  let configs: RepoConfig[] = $state([]);
  let allPullRequests: Record<string, PullRequest[]> = $state({});
  
  onMount(async () => {
    const prConfigs = getStorageObject<RepoConfig[]>("pull-requests-configs");
    configs = prConfigs.data || [];
    
    if (prConfigs.lastUpdated === 0) {
      const { pullRequests } = await firebase.getConfigs();
      if (pullRequests.length > 0) {
        configs = pullRequests;
        setStorageObject("pull-requests-configs", configs);
      }
    }
    
    // Start polling for pull requests if we have configs
    if (configs.length > 0) {
      initializePullRequestsPolling(configs);
    }
  });
  
  function initializePullRequestsPolling(repoConfigs: RepoConfig[]) {
    // Create inputs for fetchMultipleRepositoriesPullRequests
    const pullRequestParams = repoConfigs.map(config => ({
      org: config.org,
      repo: config.repo,
      filters: config.filters || []
    }));
    
    // Create a polling store for all pull requests
    const pullRequestsStore = createPollingStore<Record<string, PullRequest[]>>(
      'all-pull-requests',
      () => fetchMultipleRepositoriesPullRequests(pullRequestParams)
    );
    
    // Subscribe to the store
    const unsubscribe = pullRequestsStore.subscribe(prs => {
      if (prs) {
        allPullRequests = prs;
      }
    });
    
    return () => unsubscribe();
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
          pullRequests={allPullRequests[`${config.org}/${config.repo}`] || []} 
        />
      {/each}
    </ul>
  {:else}
    <p id="prs-not-found">No pull requests found. Configure repositories by clicking the pencil icon above.</p>
  {/if}
</section>
