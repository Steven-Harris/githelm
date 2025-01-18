<script lang="ts">
  let { saveConfig, cancelConfig = null, filterLabel, org = "", repo = "", filters = [], isEditing = true } = $props();
  let filter: string = $state("");

  function onSubmit(e: Event) {
    e.preventDefault();
    console.log(org, repo, filters);
    saveConfig(org, repo, filters);
    org = "";
    repo = "";
    filters = [];
  }

  function handleLabel(event: { key: string; preventDefault: () => void }) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      addLabel();
    }
  }

  function addLabel() {
    if (filter.trim() !== "") {
      filters = [...filters, filter.trim()];
      filter = "";
    }
  }

  function removeLabel(index: number) {
    filters = filters.filter((_, i) => i !== index);
  }
</script>

<form id="repo-form" onsubmit={onSubmit} class="{isEditing ? '' : 'p-4'} bg-gray-700 rounded-md space-y-4">
  <div>
    <label for="org-input" class="block text-sm font-medium text-white">Organization</label>
    <input
      id="org-input"
      type="text"
      bind:value={org}
      class="mt-1 block w-full p-2 rounded-md bg-gray-600 text-white border-gray-600 focus:border-white focus:ring-white"
      required
    />
  </div>
  <div>
    <label for="repo-input" class="block text-sm font-medium text-white">Repository</label>
    <input
      id="repo-input"
      type="text"
      bind:value={repo}
      class="mt-1 block w-full p-2 rounded-md bg-gray-600 text-white border-gray-600 focus:border-white focus:ring-white"
      required
    />
  </div>
  <div>
    <label for="repo-labels-input" class="block text-sm font-medium text-white">{filterLabel}</label>
    <div class="w-full p-2 rounded bg-gray-600 text-white mb-2 flex flex-wrap items-center border border-gray-600 focus-within:border-white">
      {#each filters as label, index}
        <div class="chip p-0">
          {label}
          <button type="button" onclick={() => removeLabel(index)}>&times;</button>
        </div>
      {/each}
      <input
        id="repo-labels-input"
        type="text"
        bind:value={filter}
        onkeydown={handleLabel}
        class="block w-full p-2 rounded-md bg-gray-600 text-white border-gray-600 focus:border-white focus:ring-white"
      />
    </div>
  </div>
  <button type="submit" class="submit-button">{isEditing ? "Save" : "Add"}</button>
  {#if isEditing}
    <button type="button" class="cancel-button" onclick={cancelConfig}>Cancel</button>
  {/if}

  <style>
    .submit-button {
      background-color: var(--secondary-accent-color);
    }
    .cancel-button {
      background-color: var(--secondary-color);
    }
    button {
      color: white;
      font-weight: bold;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      transition: background-color 0.3s;
    }

    .submit-button:hover {
      background-color: var(--secondary-accent-hover-color);
    }

    .submit-button:disabled {
      pointer-events: none;
      opacity: 0.3;
    }

    .chip > button {
      padding: 0;
    }
  </style>
</form>
