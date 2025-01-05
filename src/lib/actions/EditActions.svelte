<script lang="ts">
  import ListConfigs from "../config-edit/ListConfigs.svelte";

  let { configs = $bindable() } = $props();
</script>

<ListConfigs name="actions" filterLabel="Action Filters" bind:configs />
