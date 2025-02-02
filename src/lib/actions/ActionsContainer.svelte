<script lang="ts">
  import { type RepoConfig, firebase } from "$integrations/firebase";
  import { getStorageObject, setStorageObject } from "$integrations/storage";
  import { onMount } from "svelte";
  import Actions from "./ViewActions.svelte";

  let configs: RepoConfig[] = $state([]);
  onMount(async () => {
    const actionConfigs = getStorageObject<RepoConfig[]>("actions-configs");
    configs = actionConfigs.data;
    if (actionConfigs.lastUpdated !== 0) {
      return;
    }

    configs = await firebase.getActionsConfig();
    if (configs.length > 0) {
      setStorageObject("actions-configs", configs);
    }
  });
</script>

<section id="actions-section" class="bg-gray-800 p-5 rounded-lg">
  <div class="flex justify-between lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Actions</h2>
  </div>
  {#if configs.length === 0}
    <p id="actions-not-found">No actions found. Configure repositories by clicking the pencil icon above.</p>
  {:else}
    {#each configs as config (config.repo)}
      <Actions {...config} />
    {/each}
  {/if}
</section>

<style>
</style>
