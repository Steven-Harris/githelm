<script lang="ts">
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
  import { killSwitch } from "$stores/kill-switch.store";
  import { isMobile } from "$lib/stores/mobile.store";
  import { captureException } from "$integrations/sentry";

  // State with proper types
  let combinedConfigs = $state<CombinedConfig[]>([]);
  let loading = $state<boolean>(true);
  let saveInProgress = $state<boolean>(false);
  let errorMessage = $state<string | null>(null);

  $effect(() => {
    loadConfigs();
    if ($eventBus === 'save-config') {
      saveChanges();
      eventBus.set('');
    }
  });

  async function loadConfigs(): Promise<void> {
    try {
      await loadRepositoryConfigs();
      combinedConfigs = await getCombinedConfigs();
    } catch (error) {
      captureException(error);
      throw error;
    } finally {
      loading = false;
    }
  }
  
  function handleConfigUpdate(configs: CombinedConfig[]): void {
    combinedConfigs = configs;
  }
  
  async function saveChanges(): Promise<void> {
    if (saveInProgress) return;
    
    saveInProgress = true;
    errorMessage = null;
    
    try {
      await updateRepositoryConfigs(combinedConfigs);
      killSwitch.set(false);
      goto("/");
    } catch (error) {
      captureException(error);
    } finally {
      saveInProgress = false;
    }
  }
</script>

<div class="{$isMobile ? 'px-2 py-3' : 'px-5 py-6'}">
  <section class="hero-section glass-effect">
    <div class="h-full">
      <h1 class="{$isMobile ? 'text-xl mb-2' : 'hero-title'}">Configuration</h1>
      
      {#if errorMessage}
        <div class="bg-[rgba(68,44,44,0.7)] text-[#ff7b72] p-3 rounded-md mb-3 border border-[#f85149] backdrop-blur-sm">
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-2 text-[#f85149] fill-current" viewBox="0 0 16 16">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm10.28-1.72-4.5 4.5a.75.75 0 0 1-1.06 0l-2.25-2.25a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6.75 9.19l3.97-3.97a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"></path>
            </svg>
            {errorMessage}
          </div>
        </div>
      {/if}
      
      {#if loading}
        <div class="text-center py-8">
          <div class="animate-spin mx-auto w-8 h-8">
            <svg class="w-full h-full text-[#58a6ff] fill-current" viewBox="0 0 16 16">
              <path d="M8 16a8 8 0 1 1 0-16 8 8 0 0 1 0 16ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
              <path class="text-[#0d1117] fill-current" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Z"></path>
            </svg>
          </div>
          <p class="mt-2 text-[#8b949e] text-sm">Loading configurations...</p>
        </div>
      {:else}
        <div class="config-card mb-4">
          <div class="card-header">
            <h2 class="{$isMobile ? 'text-base' : 'text-lg'} font-semibold">Organization Management</h2>
          </div>
          <div class="card-body">
            <OrganizationManager />
          </div>
        </div>
        
        <div class="config-card">
          <div class="card-header">
            <h2 class="{$isMobile ? 'text-base' : 'text-lg'} font-semibold">Repository Configurations</h2>
          </div>
          <div class="card-body">
            <ConfigList 
              configs={combinedConfigs} 
              onUpdate={handleConfigUpdate} 
            />
          </div>
        </div>
      {/if}
    </div>
  </section>
</div>

<style>
  /* Enhanced glassmorphism styling for the config page */
  .config-card {
    background: rgba(13, 17, 23, 0.6);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 8px;
    border: 1px solid rgba(48, 54, 61, 0.8);
    margin-bottom: 1.5rem;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
  }
  
  .config-card:hover {
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
    border-color: rgba(58, 65, 73, 0.9);
  }
  
  .card-header {
    padding: 0.75rem 1rem;
    background-color: rgba(22, 27, 34, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: #c9d1d9;
    border-bottom: 1px solid rgba(48, 54, 61, 0.8);
  }
  
  .card-body {
    padding: 1rem;
    background-color: rgba(13, 17, 23, 0.7);
  }
  
  /* Mobile optimizations */
  @media (max-width: 768px) {
    .config-card {
      margin-bottom: 1rem;
    }
    
    .card-header {
      padding: 0.5rem 0.75rem;
    }
    
    .card-body {
      padding: 0.75rem;
    }
    
    :global(.config-item) {
      padding: 0.75rem !important;
    }
    
    :global(.glass-container) {
      padding: 0.75rem !important;
    }
    
    :global(.config-card .nav-button) {
      font-size: 0.85rem;
      padding: 0.35rem 0.7rem;
    }
    
    :global(.config-card input[type="text"]) {
      font-size: 0.9rem !important;
      padding: 0.35rem 0.5rem !important;
    }
  }
</style>
