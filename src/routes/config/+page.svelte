<script lang="ts">
  import EditActions from "$lib/actions/EditActions.svelte";
  import { firebase, getStorageObject, type RepoConfig, setStorageObject } from "$lib/integrations";
  import EditPullRequests from "$lib/pull-requests/EditPullRequests.svelte";
  import { eventBus } from "$lib/services/event-bus";
  import { isMobile } from "$lib/services/mobile.state";
  import { onMount } from "svelte";
  let activeTab = $state("pull-requests");
  let prConfigs: RepoConfig[] = $state([]);
  let actionsConfigs: RepoConfig[] = $state([]);
  onMount(async () => {
    await Promise.all([getPRConfigs(), getActionsConfigs()]);

    eventBus.subscribe(async (event) => {
      if (event === "save-config") {
        setStorageObject("action-configs", actionsConfigs);
        await firebase.saveConfigs(prConfigs, actionsConfigs);
        location.assign("/");
      }
    });
  });

  async function getPRConfigs() {
    const storage = getStorageObject<RepoConfig[]>("pull-requests-configs");
    prConfigs = storage.data;
    if (storage.lastUpdated === 0) {
      prConfigs = await firebase.getPRsConfig();
      setStorageObject("pull-requests-configs", prConfigs);
    }
  }

  async function getActionsConfigs() {
    const storage = getStorageObject<RepoConfig[]>("actions-configs");
    actionsConfigs = storage.data;
    if (storage.lastUpdated === 0) {
      actionsConfigs = await firebase.getActionsConfig();
      setStorageObject("actions-configs", actionsConfigs);
    }
  }
</script>

{#if $isMobile}
  {#if activeTab === "pull-requests"}
    <EditPullRequests bind:configs={prConfigs} />
  {:else}
    <EditActions bind:configs={actionsConfigs} />
  {/if}
{:else}
  <EditPullRequests bind:configs={prConfigs} />
  <EditActions bind:configs={actionsConfigs} />
{/if}
