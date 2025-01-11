<script lang="ts">
  import { type RepoConfig, firebase, getStorageObject, setStorageObject } from "$lib/integrations";
  import { onMount } from "svelte";
  import ListConfigs from "../config-edit/ListConfigs.svelte";
  import { eventBus } from "../services/event-bus";

  let configs: RepoConfig[] = $state([]);
  let isLoading: boolean = $state(false);
  onMount(async () => {
    firebase.loading.subscribe((loading) => {
      isLoading = loading;
    });

    const storage = getStorageObject<RepoConfig[]>("actions-configs");
    configs = storage.data;
    if (storage.lastUpdated === 0) {
      configs = await firebase.getActionsConfig();
      setStorageObject("actions-configs", configs);
    }

    eventBus.subscribe((event) => {
      if (event === "save-config") {
        saveConfig();
        eventBus.set("action-saved");
      }
    });
  });

  async function saveConfig() {
    await firebase.saveActionsConfig(configs);
    setStorageObject("action-configs", configs);
  }
</script>

<section id="actions-section" class="bg-gray-800 p-5 rounded-lg">
  <div class="flex justify-between lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Actions</h2>
  </div>
  {#if !isLoading}
    <ListConfigs name="actions" filterLabel="Action Filters" bind:configs />
  {/if}
</section>
