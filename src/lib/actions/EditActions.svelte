<script lang="ts">
  import ListConfigs from "../config-edit/ListConfigs.svelte";

  let { configs = $bindable([]) } = $props();
</script>

<section id="actions-section" class="bg-gray-800 p-5 rounded-lg">
  <div class="flex justify-between lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Actions</h2>
  </div>
  <ListConfigs filterLabel="Action Filters" bind:configs />
</section>
