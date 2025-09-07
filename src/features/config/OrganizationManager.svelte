<script lang="ts">
  import deleteSVG from '$assets/delete.svg';
  import { organizationManagerService, type OrganizationManagerState } from '$features/config/services/organization-manager.service';
  import { isMobile } from '$shared/stores/mobile.store';
  import { onMount } from 'svelte';

  let state = $state<OrganizationManagerState>(organizationManagerService.createInitialState());
  let isAdding = $state(false);
  let newOrgName = $state('');

  onMount(async () => {
    await organizationManagerService.loadOrganizations((updates) => {
      Object.assign(state, updates);
    });
  });

  async function addOrganization(): Promise<void> {
    if (!newOrgName.trim()) return;

    await organizationManagerService.addOrganization(newOrgName, state.organizations, (updates) => {
      Object.assign(state, updates);
    });

    // Reset form
    newOrgName = '';
    isAdding = false;
  }

  async function deleteOrganization(index: number): Promise<void> {
    await organizationManagerService.deleteOrganization(index, state.organizations, (updates) => {
      Object.assign(state, updates);
    });
  }

  function startAdding(): void {
    isAdding = true;
  }

  function cancelAdding(): void {
    isAdding = false;
    newOrgName = '';
  }
</script>

<div>
  {#if state.loading}
    <div class="text-center py-3 flex flex-col items-center">
      <div class="animate-spin w-6 h-6 mb-2">
        <svg class="w-full h-full text-[#58a6ff] fill-current" viewBox="0 0 16 16">
          <path d="M8 16a8 8 0 1 1 0-16 8 8 0 0 1 0 16ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
          <path class="text-[#0d1117] fill-current" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Z"></path>
        </svg>
      </div>
      <span class="text-sm text-[#8b949e]">Loading organizations...</span>
    </div>
  {:else}
    <div class="space-y-2">
      {#if state.organizations.length > 0}
        {#each state.organizations as org, i (i)}
          <div class="flex items-center justify-between p-2 bg-[rgba(22,27,34,0.5)] border border-[#30363d] rounded-md hover:border-[#388bfd44] transition-colors">
            <span class="text-[#c9d1d9] font-medium">{org.name}</span>
            <button
              class="text-[#8b949e] hover:text-[#f85149] transition-colors duration-200 cursor-pointer flex items-center justify-center w-6 h-6"
              title="Remove organization"
              aria-label="delete {org.name}"
              onclick={() => deleteOrganization(i)}
            >
              <img src={deleteSVG} alt="Delete" width="14" height="14" />
            </button>
          </div>
        {/each}
      {:else}
        <p class="text-[#8b949e] text-center py-3">No organizations added yet.</p>
      {/if}
    </div>

    {#if !isAdding}
      <button class="flex items-center {$isMobile ? 'p-2 px-3' : 'p-3 px-4'} glass-container hover:border-[#388bfd44] w-full mt-4 transition-all duration-200" onclick={startAdding}>
        <span class="text-xl mr-1 text-[#3fb950]">+</span>
        <span>Add Organization</span>
      </button>
    {:else}
      <div class="mt-4 p-3 bg-[rgba(22,27,34,0.5)] border border-[#30363d] rounded-md">
        <div class="flex flex-wrap gap-3">
          <div class="flex-grow">
            <input
              type="text"
              bind:value={newOrgName}
              placeholder="Enter organization name..."
              class="w-full px-3 py-2 bg-[rgba(13,17,23,0.6)] border border-[#30363d] text-[#c9d1d9] rounded-md focus:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff] backdrop-blur-sm transition-colors placeholder-[#484f58]"
              onkeydown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOrganization();
                } else if (e.key === 'Escape') {
                  cancelAdding();
                }
              }}
            />
          </div>
          <div class="flex gap-2">
            <button
              class="bg-[#238636] text-white px-4 py-2 rounded-md border border-[#2ea043] transition-colors duration-200
              {newOrgName.trim() ? 'hover:bg-[#2ea043]' : 'opacity-50 cursor-not-allowed'}"
              disabled={!newOrgName.trim()}
              onclick={addOrganization}
            >
              Add
            </button>
            <button class="bg-[rgba(33,38,45,0.8)] text-[#c9d1d9] px-4 py-2 rounded-md border border-[#30363d] transition-colors duration-200 hover:bg-[rgba(48,54,61,0.8)]" onclick={cancelAdding}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
