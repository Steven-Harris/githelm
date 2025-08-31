<script lang="ts">
  import { goto } from '$app/navigation';
  import OrganizationManager from './OrganizationManager.svelte';
  import ConfigList from './ConfigList.svelte';
  import { configPageService } from './services/config-page.service';
  import { configService } from './services/config.service';
  import { isMobile } from '$shared/stores/mobile.store';

  // Get all data from the service
  const configurations = configPageService.getConfigurations();
  const loadingState = configPageService.getLoadingState();
  const saveState = configPageService.getSaveState();
  const errorMessage = configPageService.getErrorMessage();

  // Simple derived values for presentation
  const isLoading = $derived($loadingState);
  const isSaving = $derived($saveState.isSaving);
  const hasError = $derived($errorMessage !== null);

  // Handle configuration updates
  function handleConfigUpdate(configs: any[]): void {
    configPageService.handleConfigUpdate(configs);
  }

  // Handle save operation
  async function handleSave(): Promise<void> {
    try {
      await configPageService.saveConfigurations($configurations);
      configService.disableKillSwitch();
      goto('/');
    } catch (error) {
      // Error is handled by the service
    }
  }
</script>

<div class={$isMobile ? 'px-2 py-3' : 'py-6'}>
  <section class="hero-section glass-effect">
    <div class="container mx-auto">
      <h1 class={$isMobile ? 'text-xl mb-2' : 'hero-title'}>Configuration</h1>

      {#if hasError}
        <div class="bg-[rgba(68,44,44,0.7)] text-[#ff7b72] p-3 rounded-md mb-3 border border-[#f85149] backdrop-blur-sm">
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-2 text-[#f85149] fill-current" viewBox="0 0 16 16">
              <path
                d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm10.28-1.72-4.5 4.5a.75.75 0 0 1-1.06 0l-2.25-2.25a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6.75 9.19l3.97-3.97a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"
              ></path>
            </svg>
            {$errorMessage}
          </div>
        </div>
      {/if}

      {#if isLoading}
        <div class="text-center py-8">
          <div class="animate-spin mx-auto w-8 h-8">
            <svg class="w-full h-full text-[#58a6ff] fill-current" viewBox="0 0 16 16">
              <path d="M8 16a8 8 0 1 1 0-16 8 8 0 0 1 0 16ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
              <path class="text-[#0d1117] fill-current" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Z"></path>
            </svg>
          </div>
          <p class="mt-2 text-[#8b949e] text-sm">Loading configurations...</p>
        </div>
      {:else if isSaving}
        <div class="text-center py-8">
          <div class="animate-spin mx-auto w-8 h-8">
            <svg class="w-full h-full text-[#3fb950] fill-current" viewBox="0 0 16 16">
              <path d="M8 16a8 8 0 1 1 0-16 8 8 0 0 1 0 16ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
              <path class="text-[#0d1117] fill-current" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Z"></path>
            </svg>
          </div>
          <p class="mt-2 text-[#8b949e] text-sm">Saving configurations...</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          <div class="lg:col-span-1 min-w-0">
            <div class="hero-card">
              <div class="card-header">
                <h2 class="{$isMobile ? 'text-base' : 'text-lg'} font-semibold">Organization Management</h2>
              </div>
              <div class="card-body">
                <OrganizationManager />
              </div>
            </div>
          </div>

          <div class="lg:col-span-2 min-w-0">
            <div class="hero-card h-full">
              <div class="card-header">
                <h2 class="{$isMobile ? 'text-base' : 'text-lg'} font-semibold">Repository Configurations</h2>
              </div>
              <div class="card-body flex-1">
                <ConfigList configs={$configurations} onUpdate={handleConfigUpdate} />
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </section>
</div>

<style>
  /* Glassmorphism styling matching the dashboard pattern */
  .glass-effect {
    position: relative;
    background: rgba(22, 27, 34, 0.25);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(99, 102, 106, 0.25);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  /* Single large glass glare covering the entire surface */
  .glass-effect::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 40%, rgba(255, 255, 255, 0.03) 60%, rgba(255, 255, 255, 0) 80%);
    pointer-events: none;
    z-index: 1;
  }

  /* Ensure content appears above the glare effect */
  .container {
    position: relative;
    z-index: 3;
    width: 100%;
    max-width: none;
  }

  .hero-card {
    background: rgba(13, 17, 23, 0.8);
    border: 1px solid rgba(48, 54, 61, 0.5);
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .card-header {
    background: rgba(22, 27, 34, 0.8);
    padding: 1rem 1.5rem;
    border-bottom: 1px solid rgba(48, 54, 61, 0.5);
    flex-shrink: 0;
  }

  .card-body {
    padding: 1.5rem;
    flex: 1;
    overflow: auto;
  }

  .hero-title {
    color: #f0f6fc;
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 1rem;
  }
</style>
