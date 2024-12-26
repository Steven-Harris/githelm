<script lang="ts">
  import ListConfigs from "../config-edit/ListConfigs.svelte";

  let { configs } = $props();
</script>

<ListConfigs name="actions" {configs} />
