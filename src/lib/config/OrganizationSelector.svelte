<script lang="ts">
  import { configService } from "$integrations/firebase";
  import type { Organization } from "$integrations/firebase";
  import { eventBus } from "$lib/stores/event-bus.store";
  import { onMount } from "svelte";
  
  let { selectedOrg = "", disabled = false, onChange } = $props();
  
  let organizations = $state<Organization[]>([]);
  let loading = $state(false);
  
  function updateOrganizations() {
    organizations = configService.getLocalOrganizations();
  }
  
  onMount(() => {
    loading = true;
    
    updateOrganizations();
    
    const unsubscribe = eventBus.subscribe((event) => {
      if (event === 'organizations-updated') {
        updateOrganizations();
        
        if (selectedOrg && !organizations.some(org => org.name === selectedOrg)) {
          onChange('');
        }
      }
    });
    
    loading = false;
    
    return unsubscribe;
  });
</script>

<div class="mb-4">
  <label for="organization-select" class="block text-sm font-medium mb-1">Organization</label>
  {#if organizations.length > 0}
    <select 
      id="organization-select"
      bind:value={selectedOrg}
      onchange={(e) => onChange(e.currentTarget.value)}
      class="w-full p-2 bg-gray-600 border border-gray-600 rounded text-white"
      aria-required="true"
      {disabled}
    >
      <option value="">Select an organization</option>
      {#each organizations as org}
        <option value={org.name}>{org.name}</option>
      {/each}
    </select>
  {:else}
    <p class="text-sm text-yellow-400">
      Please add an organization in the Organizations section above before configuring repositories.
    </p>
  {/if}
</div>