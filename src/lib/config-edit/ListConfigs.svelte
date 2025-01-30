<script lang="ts">
  import Sortable from "sortablejs";
  import editSVG from "../../assets/edit.svg";
  import EditForm from "./EditForm.svelte";

  let { filterLabel, configs = $bindable([]) } = $props();
  let editingIndex = $state(-1);

  function sortable(list: any) {
    const sort = Sortable.create(list, {
      animation: 150,
      onUpdate: ({ newIndex, oldIndex }) => {
        // move the item in configs from the oldIndex to the newIndex and update the editingIndex if it's the same item
        if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) {
          return;
        }

        const updatedConfigs = [...configs];
        const [movedConfig] = updatedConfigs.splice(oldIndex, 1);
        updatedConfigs.splice(newIndex, 0, movedConfig);
        configs = updatedConfigs;
        if (editingIndex === oldIndex) {
          editingIndex = newIndex;
        } else if (oldIndex < editingIndex && editingIndex <= newIndex) {
          editingIndex--;
        } else if (newIndex <= editingIndex && editingIndex < oldIndex) {
          editingIndex++;
        }
      },
    });

    return {
      destroy() {
        sort.destroy();
      },
    };
  }

  function updateConfig(org: string, repo: string, filters: string[]) {
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

<div use:sortable class="mt-2">
  {#each configs as config, i (i)}
    <div class="p-2 px-4 bg-gray-700 rounded-md {editingIndex !== i ? 'hover:bg-gray-600' : ''} mb-2 sortable-handle cursor-move">
      {#if editingIndex === i}
        <EditForm org={config.org} repo={config.repo} filters={config.filters} {filterLabel} {updateConfig} {cancelConfig} />
      {:else}
        <div class="flex justify-between">
          <span>
            <span class="mr-2">☰</span>
            <strong>
              {config.org}/{config.repo}
            </strong>
            <button class="edit-repo-button text-white" aria-label="edit {config.org}/{config.repo} button" title="edit {config.org}/{config.repo}" onclick={() => editConfig(i)}>
              <img src={editSVG} alt="pencil" width="15" height="15" />
            </button>
          </span>
          <span>
            <button class="remove-repo-button text-white" title="remove repository" onclick={() => removeConfig(i)}>
              <span>&times;</span>
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
{#if editingIndex === -1}
  <EditForm {updateConfig} {filterLabel} isEditing={false} />
{/if}

<style>
</style>
