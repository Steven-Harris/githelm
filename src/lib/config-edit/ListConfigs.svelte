<script lang="ts">
  import Sortable from "sortablejs";
  import { onDestroy, onMount } from "svelte";
  import EditForm from "./EditForm.svelte";

  let { name, filterLabel, configs = $bindable([]) } = $props();
  let sortable: Sortable | null = null;
  let editingIndex = $state(-1);
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

  function saveConfig(org: string, repo: string, filters: string[]) {
    if (editingIndex !== -1) {
      configs[editingIndex] = { org, repo, filters };
      configs = [...configs];
      editingIndex = -1;
      return;
    }
    configs = [...configs, { org, repo, filters }];
  }

  function editConfig(index: number) {
    editingIndex = index;
  }

  function removeConfig(index: number) {
    configs = configs.filter((_, i) => i !== index);
  }

  function cancelConfig() {
    editingIndex = -1;
  }
</script>

{#if editingIndex === -1}
  <EditForm {saveConfig} {filterLabel} isEditing={false} />
{/if}

<div id="{name}-config-list" class="mt-2">
  {#each configs as config, i (i)}
    <div class="p-2 px-4 bg-gray-700 rounded-md {editingIndex !== i ? 'hover:bg-gray-600' : ''} mb-2 sortable-handle cursor-move">
      {#if editingIndex === i}
        <EditForm org={config.org} repo={config.repo} filters={config.filters} {filterLabel} {saveConfig} {cancelConfig} />
      {:else}
        <div class="flex justify-between">
          <span>
            <span class="mr-2">☰</span>
            <strong>
              {config.org}/{config.repo}
            </strong>
            <button class="edit-repo-button text-white" title="edit repository" onclick={() => editConfig(i)}>
              <span class="hover:font-boldi">🖉</span>
            </button>
          </span>
          <span>
            <button class="remove-repo-button text-white" title="remove repository" onclick={() => removeConfig(i)}>
              <span class="hover:font-bold">&times;</span>
            </button>
          </span>
        </div>
        {#each config.filters as filter}
          <span class="chip">
            {filter}
          </span>
        {/each}
      {/if}
    </div>
  {/each}
</div>

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
