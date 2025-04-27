<script lang="ts">
  import { onMount } from "svelte";
  import { configService } from "$integrations/firebase";
  import type { Organization } from "$integrations/firebase";
  import { eventBus } from "$lib/stores/event-bus.store";
  
  let organizations: Organization[] = $state([]);
  let newOrgName = $state("");
  let editingOrgIndex = $state(-1);
  let editOrgName = $state("");
  let loading = $state(false);
  
  onMount(async () => {
    loading = true;
    
    try {
      const localOrgs = configService.getLocalOrganizations();
      if (localOrgs.length > 0) {
        organizations = localOrgs;
      } else {
        const configs = await configService.getConfigs();
        organizations = configs.organizations || [];
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
    } finally {
      loading = false;
    }
  });
  
  function addOrganization() {
    if (!newOrgName.trim()) return;
    
    const orgName = newOrgName.trim();
    
    if (organizations.some(org => org.name.toLowerCase() === orgName.toLowerCase())) {
      alert("This organization is already added.");
      return;
    }
    
    try {
      organizations = [...organizations, { name: orgName }];
      
      configService.updateLocalOrganizations(organizations);
      
      newOrgName = "";
      
      eventBus.set('organizations-updated');
    } catch (error) {
      console.error("Error adding organization:", error);
    }
  }
  
  function startEditing(index: number) {
    editingOrgIndex = index;
    editOrgName = organizations[index].name;
  }
  
  function cancelEditing() {
    editingOrgIndex = -1;
    editOrgName = "";
  }
  
  function saveEditedOrg() {
    if (!editOrgName.trim()) return;
    
    const orgName = editOrgName.trim();
    
    if (organizations.some((org, i) => i !== editingOrgIndex && org.name.toLowerCase() === orgName.toLowerCase())) {
      alert("An organization with this name already exists.");
      return;
    }
    
    try {
      const updatedOrgs = [...organizations];
      updatedOrgs[editingOrgIndex].name = orgName;
      organizations = updatedOrgs;
      
      configService.updateLocalOrganizations(organizations);
      
      cancelEditing();
      
      eventBus.set('organizations-updated');
    } catch (error) {
      console.error("Error updating organization:", error);
    }
  }
  
  function deleteOrganization(index: number) {
    if (!confirm("Are you sure you want to delete this organization? This may affect your repository configurations.")) {
      return;
    }
    
    try {
      // Update local state
      const updatedOrgs = [...organizations];
      updatedOrgs.splice(index, 1);
      organizations = updatedOrgs;
      
      // Update local orgs in the service (don't save to Firebase yet)
      configService.updateLocalOrganizations(organizations);
      
      // Notify others about the change
      eventBus.set('organizations-updated');
    } catch (error) {
      console.error("Error deleting organization:", error);
    }
  }
</script>

<div class="bg-gray-800 p-5 rounded-lg mb-4">
  <h2 class="text-xl font-bold mb-4">Organizations</h2>
  
  {#if loading}
    <p class="text-sm text-gray-400">Loading organizations...</p>
  {:else}
    <div class="mb-4">
      {#if organizations.length > 0}
        <div class="space-y-2">
          {#each organizations as org, i}
            <div class="p-2 px-4 bg-gray-700 rounded-md flex justify-between items-center">
              {#if editingOrgIndex === i}
                <div class="flex-grow">
                  <input 
                    type="text" 
                    bind:value={editOrgName} 
                    class="w-full p-1 bg-gray-600 border border-gray-600 rounded text-white"
                    placeholder="GitHub organization name"
                    onkeypress={(e) => e.key === 'Enter' && saveEditedOrg()}
                  />
                </div>
                <div class="flex gap-2 ml-2">
                  <button 
                    class="text-gray-400 hover:text-white"
                    onclick={cancelEditing}
                    title="Cancel"
                  >
                    Cancel
                  </button>
                  <button 
                    class="text-blue-400 hover:text-blue-300"
                    onclick={saveEditedOrg}
                    title="Save"
                  >
                    Save
                  </button>
                </div>
              {:else}
                <span>{org.name}</span>
                <div class="flex gap-2">
                  <button 
                    class="text-gray-400 hover:text-white"
                    onclick={() => startEditing(i)}
                    title="Edit organization"
                  >
                    <img src="/src/assets/edit.svg" alt="Edit" class="w-4 h-4" />
                  </button>
                  <button 
                    class="text-red-400 hover:text-red-300"
                    onclick={() => deleteOrganization(i)}
                    title="Delete organization"
                  >
                    <span class="text-sm">×</span>
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-sm text-gray-400 mb-4">No organizations added. Add one below to get started.</p>
      {/if}
    </div>
    
    <div class="flex gap-2">
      <input 
        type="text" 
        bind:value={newOrgName} 
        class="flex-grow p-2 bg-gray-600 border border-gray-600 rounded text-white"
        placeholder="Add GitHub organization"
        onkeypress={(e) => e.key === 'Enter' && addOrganization()}
      />
      <button 
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        onclick={addOrganization}
        disabled={!newOrgName.trim()}
      >
        Add
      </button>
    </div>

    {#if configService.hasUnsavedOrganizationChanges()}
      <div class="mt-3 text-amber-400 text-sm">
        <i>* Organization changes will be saved when you save all configurations</i>
      </div>
    {/if}
  {/if}
</div>