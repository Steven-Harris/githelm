<script lang="ts">
  import { type RepoConfig, firebase, getStorageObject, setStorageObject } from "$lib/integrations";
  import { onMount } from "svelte";
  import EditPullRequests from "./EditPullRequests.svelte";
  import PullRequest from "./ViewPullRequest.svelte";

  let configs: RepoConfig[] = $state([]);
  let isLoading: boolean = $state(false);
  let isEditing: boolean = $state(true);
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

  async function savePullRequestsConfig() {
    isEditing = false;
    await firebase.savePRConfig(configs);
    setStorageObject("pull-requests-configs", configs);
  }

  function cancelPullRequestsConfig() {
    isEditing = false;
    const prConfigs = getStorageObject<RepoConfig[]>("pull-requests-configs");
    configs = prConfigs.data;
  }
</script>

<section id="pull-requests-section" class="bg-gray-800 p-5 rounded-lg">
  <div class="flex justify-between lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Pull Requests</h2>
    <div>
      <button id="save-pull-requests-config-button" type="button" class="mb-1 px-2 py-1 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded" onclick={savePullRequestsConfig}
        >Save</button
      >
      <button
        id="cancel-pull-requests-config-button"
        type="button"
        class="mb-1 px-2 py-1 bg-red-500 hover:bg-red-700 text-white font-bold rounded"
        onclick={cancelPullRequestsConfig}>Cancel</button
      >
    </div>
  </div>
  {#if !isLoading}
    {#if isEditing}
      <EditPullRequests bind:configs />
    {:else if configs.length > 0}
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
