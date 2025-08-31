<script lang="ts">
  import { onMount } from 'svelte';
  import deleteSVG from '$assets/delete.svg';
  import { organizationManagerService, type OrganizationManagerState } from '$features/config/services/organization-manager.service';

  let state = $state<OrganizationManagerState>(organizationManagerService.createInitialState());

  onMount(async () => {
    await organizationManagerService.loadOrganizations((updates) => {
      Object.assign(state, updates);
    });
  });

  function addOrganization(): void {
    organizationManagerService.addOrganization(
      state.newOrgName,
      state.organizations,
      (updates) => {
        Object.assign(state, updates);
      }
    );
  }

  function deleteOrganization(index: number): void {
    organizationManagerService.deleteOrganization(
      index,
      state.organizations,
      (updates) => {
        Object.assign(state, updates);
      }
    );
  }
</script>

<div>
  {#if state.loading}
    <div class="text-center py-3 flex flex-col items-center">
      <div class="animate-spin mx-auto w-5 h-5">
        <svg class="w-full h-full text-[#58a6ff] fill-current" viewBox="0 0 16 16">
          <path d="M8 16a8 8 0 1 1 0-16 8 8 0 0 1 0 16ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
          <path class="text-[#0d1117] fill-current" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Z"></path>
        </svg>
      </div>
      <p class="mt-2 text-sm text-[#8b949e]">Loading organizations...</p>
    </div>
  {:else}
    <div class="mb-4">
      {#if organizationManagerService.hasOrganizations(state.organizations)}
        <div class="space-y-2">
          {#each state.organizations as org, i (i)}
            <div class="p-2 px-4 bg-[rgba(22,27,34,0.5)] border border-[#30363d] rounded-md flex justify-between items-center backdrop-blur-sm">
              <span class="text-[#c9d1d9]">{org.name}</span>
              <div class="flex gap-2">
                <button
                  class="text-[#f85149] hover:text-[#f85149] p-1 rounded-full hover:bg-[rgba(248,81,73,0.15)] transition-colors duration-200 cursor-pointer"
                  onclick={() => deleteOrganization(i)}
                  title="Delete organization"
                  aria-label="Delete organization"
                >
                  <img src={deleteSVG} alt="Delete" width="14" height="14" />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="p-4 text-sm text-[#8b949e] bg-[rgba(22,27,34,0.4)] backdrop-blur-sm rounded-md border border-[#30363d]">No organizations added. Add one below to get started.</div>
      {/if}
    </div>

    <form class="mt-4 flex flex-wrap gap-3" onsubmit={addOrganization}>
      <div class="flex-grow">
        <input
          type="text"
          bind:value={state.newOrgName}
          placeholder="Enter organization name..."
          class="w-full px-3 py-2 bg-[rgba(13,17,23,0.6)] border border-[#30363d] text-[#c9d1d9] rounded-md focus:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff] backdrop-blur-sm transition-colors placeholder-[#484f58]"
        />
      </div>
      <button
        type="submit"
        class="bg-[#238636] text-white px-4 py-2 rounded-md border border-[#2ea043] transition-colors duration-200
        {state.newOrgName.trim() ? 'hover:bg-[#2ea043]' : 'opacity-50 cursor-not-allowed'}"
        disabled={!state.newOrgName.trim()}
      >
        Add Organization
      </button>
    </form>
  {/if}
</div>

<style>
  /* Glassmorphism hover effects */
  input:focus {
    box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.3);
  }

  button[type='submit'] {
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  button[type='submit']:hover:not(:disabled) {
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
  }
</style>
