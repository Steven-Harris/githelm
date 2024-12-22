<script lang="ts">
  import { onMount } from "svelte";
  import { firebase } from "../../services/firebase";
  import type { RepoConfig } from "../../services/models";
  import { getStorageObject, setStorageObject } from "../../services/storage";
  import Actions from "./ViewActions.svelte";

  let configs: RepoConfig[] = $state([]);
  let isLoading: boolean = $state(false);
  onMount(async () => {
    firebase.loading.subscribe((loading) => {
      isLoading = loading;
    });
    const actionConfigs = getStorageObject<RepoConfig[]>("actions-configs");
    configs = actionConfigs.data;
    if (actionConfigs.lastUpdated === 0) {
      configs = await firebase.getActionsConfig();
      setStorageObject("actions-configs", configs);
    }
  });
</script>

<section id="actions-section" class="glow bg-gray-800 p-5 rounded-lg">
  <div class="flex justify-between lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Actions</h2>
    <div>
      <button id="edit-actions-button" type="button" class="hover:underline" title="edit actions configuration">
        <img alt="edit button" title="edit-actions-config" src="src/assets/edit.svg" width="20" height="20" class="-mb-1" />
      </button>
      <button id="save-actions-config-button" type="button" class="hidden px-2 py-1 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded">Save</button>
      <button id="cancel-actions-config-button" type="button" class="hidden px-2 py-1 bg-red-500 hover:bg-red-700 text-white font-bold rounded">Cancel</button>
    </div>
  </div>
  {#if !isLoading}
    {#if configs.length === 0}
      <p id="actions-not-found">No actions found. Configure repositories by clicking the pencil icon above.</p>
    {/if}
    {#if configs.length > 0}
      {#each configs as config (config.repo)}
        <Actions {...config} />
      {/each}
    {/if}
  {/if}
</section>
