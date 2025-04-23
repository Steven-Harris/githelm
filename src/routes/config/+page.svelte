<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import OrganizationManager from "$lib/config/OrganizationManager.svelte";
  import ConfigList from "$lib/config/ConfigList.svelte";
  import { eventBus } from "$lib/stores/event-bus.store";
  import { 
    loadRepositoryConfigs, 
    updateRepositoryConfigs,
    getCombinedConfigs,
    type CombinedConfig
  } from "$lib/stores/repository-service";

  // State with proper types
  let combinedConfigs = $state<CombinedConfig[]>([]);
  let loading = $state<boolean>(true);
  let saveInProgress = $state<boolean>(false);
  let errorMessage = $state<string | null>(null);

  // Load configs on component mount
  onMount(() => {
    try {
      loadConfigs();
      
      // Subscribe to the event bus for save actions from the Header button
      const unsubscribe = eventBus.subscribe((event) => {
        if (event === 'save-config') {
          saveChanges();
          // Reset the event bus after handling
          eventBus.set('');
        }
      });
      
      return () => {
        unsubscribe();
      };
    } catch (error) {
      errorMessage = "Failed to load configurations";
      console.error("Error loading configurations:", error);
    } finally {
      loading = false;
    }
  });

  async function loadConfigs(): Promise<void> {
    try {
      // First load the repository configs to ensure data is available
      await loadRepositoryConfigs();
      
      // Then get the combined configs from the repository service
      combinedConfigs = await getCombinedConfigs();
    } catch (error) {
      console.error("Error loading configurations:", error);
      throw error;
    }
  }
  
  // Handle config updates from the ConfigList component
  function handleConfigUpdate(configs: CombinedConfig[]): void {
    combinedConfigs = configs;
  }
  
  // Save changes when triggered by the header save button via event bus
  async function saveChanges(): Promise<void> {
    if (saveInProgress) return;
    
    saveInProgress = true;
    errorMessage = null;
    
    try {
      // Use the repository service to save the combined configs
      await updateRepositoryConfigs(combinedConfigs);
      
      // Navigate back to home page on success
      goto("/");
    } catch (error) {
      errorMessage = "Failed to save configurations";
      console.error("Error saving configurations:", error);
    } finally {
      saveInProgress = false;
    }
  }
</script>

<div class="container mx-auto px-4 py-6">
  <h1 class="text-2xl font-bold mb-4">Configuration</h1>
  
  {#if errorMessage}
    <div class="bg-red-500 text-white p-4 rounded-md mb-4">
      {errorMessage}
    </div>
  {/if}
  
  {#if loading}
    <div class="text-center py-10">
      <p>Loading configurations...</p>
    </div>
  {:else}
    <OrganizationManager />
    
    <div class="bg-gray-800 p-5 rounded-lg mb-4">
      <h2 class="text-xl font-bold mb-4">Repository Configurations</h2>
      <ConfigList 
        configs={combinedConfigs} 
        onUpdate={handleConfigUpdate} 
      />
    </div>
  {/if}
</div>
