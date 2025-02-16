<script lang="ts">
  import { type RepoConfig, firebase } from "$integrations/firebase";
  import { getStorageObject, setStorageObject } from "$integrations/storage";
  import { onMount } from "svelte";
  import PullRequests from "./List.svelte";

  let configs: RepoConfig[] = $state([]);
  onMount(async () => {
    const prConfigs = getStorageObject<RepoConfig[]>("pull-requests-configs");
    configs = prConfigs.data;
    if (prConfigs.lastUpdated !== 0) {
      return;
    }

    const { pullRequests } = await firebase.getConfigs();
    if (pullRequests.length > 0) {
      configs = pullRequests;
      setStorageObject("pull-requests-configs", configs);
    }
  });
</script>

<section id="pull-requests-section" class="bg-gray-800 p-5 rounded-lg">
  <div class="flex justify-between lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Pull Requests</h2>
  </div>
  {#if configs.length > 0}
    <ul>
      {#each configs as config (config.repo)}
        <PullRequests {...config} />
      {/each}
    </ul>
  {:else}
    <p id="prs-not-found">No pull requests found. Configure repositories by clicking the pencil icon above.</p>
  {/if}
</section>
