<script lang="ts">
  import { type RepoConfig, firebase } from "$integrations/firebase";
  import { getStorageObject, setStorageObject } from "$integrations/storage";
  import EditActions from "$lib/config/EditActions.svelte";
  import EditPullRequests from "$lib/config/EditPullRequests.svelte";
  import { activeTab } from "$stores/active-tab.store";
  import { eventBus } from "$stores/event-bus.store";
  import { isMobile } from "$stores/mobile.store";
  import { onMount } from "svelte";
  let prConfigs: RepoConfig[] = $state([]);
  let actionsConfigs: RepoConfig[] = $state([]);
  onMount(async () => {
    await Promise.all([getPRConfigs(), getActionsConfigs()]);

    eventBus.subscribe(async (event) => {
      if (event !== "save-config") {
        return;
      }

      setStorageObject("pull-requests-configs", prConfigs);
      setStorageObject("action-configs", actionsConfigs);
      await firebase.saveConfigs(prConfigs, actionsConfigs);
      location.assign("/");
    });
  });

  async function getPRConfigs() {
    const storage = getStorageObject<RepoConfig[]>("pull-requests-configs");
    prConfigs = storage.data;
    if (storage.lastUpdated === 0) {
      const { pullRequests } = await firebase.getConfigs();
      prConfigs = pullRequests;
      setStorageObject("pull-requests-configs", prConfigs);
    }
  }

  async function getActionsConfigs() {
    const storage = getStorageObject<RepoConfig[]>("actions-configs");
    actionsConfigs = storage.data;
    if (storage.lastUpdated === 0) {
      const { actions } = await firebase.getConfigs();
      actionsConfigs = actions;
      setStorageObject("actions-configs", actionsConfigs);
    }
  }
</script>

{#if $isMobile}
  {#if $activeTab === "pull-requests"}
    <EditPullRequests bind:configs={prConfigs} />
  {:else}
    <EditActions bind:configs={actionsConfigs} />
  {/if}
{:else}
  <EditPullRequests bind:configs={prConfigs} />
  <EditActions bind:configs={actionsConfigs} />
{/if}
