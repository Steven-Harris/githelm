<script lang="ts">
  import ListConfigs from "../config-edit/ListConfigs.svelte";

  let { configs = $bindable() } = $props();
</script>

<ListConfigs name="pull-requests" filterLabel="Label Filters" bind:configs />
