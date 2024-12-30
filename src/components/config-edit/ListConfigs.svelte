<script lang="ts">
  import Sortable from "sortablejs";
  import { onDestroy, onMount } from "svelte";
  import EditForm from "./EditForm.svelte";

  let { name, filterLabel, configs = $bindable([]) } = $props();
  let sortable: Sortable | null = null;
  onMount(() => {
    const CONFIG_LIST = document.getElementById(`${name}-config-list`)!;
    sortable = Sortable.create(CONFIG_LIST, {
      animation: 150,
      ghostClass: "sortable-ghost",
      handle: ".sortable-handle",
    });
  });

  onDestroy(() => {
    if (sortable) sortable.destroy();
  });

  function addConfig(org: string, repo: string, filters: string[]) {
    configs = [...configs, { org, repo, filters }];
  }
</script>

<div id="{name}-config-list">
  {#each configs as config, i (i)}
    <div class="p-2 px-4 bg-gray-700 rounded-md hover:bg-gray-600 mb-2 sortable-handle cursor-move">
      <div class="flex justify-between">
        <span>
          <span class="mr-2">☰</span>
          <strong>
            {config.org}/{config.repo}
          </strong>
        </span>
        <button class="remove-repo-button text-white" title="remove repository">
          <span class="hover:font-bold">&times;</span>
        </button>
      </div>
      {#each config.filters as filter}
        <span class="chip">
          {filter}
        </span>
      {/each}
    </div>
  {/each}
</div>
<EditForm {addConfig} {filterLabel} />

<style>
  .chip {
    display: inline-block;
    padding: 0.5rem;
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
    margin-right: 0.25rem;
    background-color: var(--tertiary-accent-color);
    color: var(--secondary-text-color);
    border-radius: 0.25rem;
    cursor: pointer;
  }
</style>
