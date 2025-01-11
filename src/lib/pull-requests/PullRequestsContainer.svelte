<script lang="ts">
  import { type RepoConfig, firebase, getStorageObject, setStorageObject } from "$lib/integrations";
  import { onMount } from "svelte";
  import PullRequest from "./ViewPullRequest.svelte";

  let configs: RepoConfig[] = $state([]);
  let isLoading: boolean = $state(false);
  onMount(async () => {
    firebase.loading.subscribe((loading) => {
      isLoading = loading;
    });
    const prConfigs = getStorageObject<RepoConfig[]>("pull-requests-configs");
    configs = prConfigs.data;
    if (prConfigs.lastUpdated === 0) {
      configs = await firebase.getPRsConfig();
      setStorageObject("pull-requests-configs", configs);
    }
  });
</script>

<section id="pull-requests-section" class="bg-gray-800 p-5 rounded-lg">
  <div class="flex justify-between lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Pull Requests</h2>
  </div>
  {#if !isLoading}
    {#if configs.length > 0}
      <ul>
        {#each configs as config (config.repo)}
          <PullRequest {...config} />
        {/each}
      </ul>
    {:else}
      <p id="prs-not-found">No pull requests found. Configure repositories by clicking the pencil icon above.</p>
    {/if}
  {/if}
</section>
