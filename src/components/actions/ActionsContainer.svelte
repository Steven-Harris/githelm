<script lang="ts">
  import { firebase, getStorageObject, setStorageObject, type RepoConfig } from "@integrations";
  import { onMount } from "svelte";
  import EditActions from "./EditActions.svelte";
  import Actions from "./ViewActions.svelte";

  let configs: RepoConfig[] = $state([]);
  let isLoading: boolean = $state(false);
  let isEditing: boolean = $state(true);
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

  function editActionsConfig() {
    isEditing = true;
  }

  async function saveActionsConfig() {
    isEditing = false;
    console.log(configs);
    await firebase.saveActionsConfig(configs);
    setStorageObject("actions-configs", configs);
  }

  function cancelActionsConfig() {
    isEditing = false;
    const actionConfigs = getStorageObject<RepoConfig[]>("actions-configs");
    configs = actionConfigs.data;
  }
</script>

<section id="actions-section" class="bg-gray-800 p-5 rounded-lg">
  <div class="flex justify-between lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Actions</h2>
    <div>
      {#if !isEditing}
        <button id="edit-actions-button" type="button" class="hover:underline" title="edit actions configuration" onclick={editActionsConfig}>
          <img alt="edit button" title="edit-actions-config" src="src/assets/edit.svg" width="20" height="20" class="-mb-1" />
        </button>
      {:else}
        <button id="save-actions-config-button" type="button" class="mb-1 px-2 py-1 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded" onclick={saveActionsConfig}
          >Save</button
        >
        <button id="cancel-actions-config-button" type="button" class="mb-1 px-2 py-1 bg-red-500 hover:bg-red-700 text-white font-bold rounded" onclick={cancelActionsConfig}
          >Cancel</button
        >
      {/if}
    </div>
  </div>
  {#if !isLoading}
    {#if isEditing}
      <EditActions bind:configs />
    {:else if configs.length === 0}
      <p id="actions-not-found">No actions found. Configure repositories by clicking the pencil icon above.</p>
    {:else}
      {#each configs as config (config.repo)}
        <Actions {...config} />
      {/each}
    {/if}
  {/if}
</section>

<style>
</style>
