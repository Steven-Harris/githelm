<script lang="ts">
  import ListConfigs from "./ListConfigs.svelte";

  let { configs = $bindable([]) } = $props();
</script>

<section id="pull-requests-section" class="bg-gray-800 p-5 rounded-lg">
  <div class="flex justify-between lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Pull Requests</h2>
  </div>
  <ListConfigs filterLabel="Label Filters" bind:configs />
</section>
