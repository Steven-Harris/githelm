<script lang="ts">
  import type { RepoConfig } from '$integrations/firebase';
  import { getStorageObject } from '$shared/services/storage.service';
  import { isMobile } from '$shared/stores/mobile.store';
  import { repositoryFacade } from '$shared/stores/repository.facade';
  import { onMount } from 'svelte';
  import ConfigList from './ConfigList.svelte';
  import OrganizationManager from './OrganizationManager.svelte';
  import type { CombinedConfig } from './stores/config.store';

  let configurations = $state<CombinedConfig[]>([]);
  let isLoading = $state(false);

  onMount(async () => {
    await loadConfigurations();
  });

  async function loadConfigurations(): Promise<void> {
    isLoading = true;
    try {
      const prConfigs = getStorageObject<RepoConfig[]>('pull-requests-configs').data || [];
      const actionConfigs = getStorageObject<RepoConfig[]>('actions-configs').data || [];

      const combined = new Map<string, CombinedConfig>();

      for (const config of prConfigs) {
        const key = `${config.org}/${config.repo}`;
        if (!combined.has(key)) {
          combined.set(key, {
            org: config.org,
            repo: config.repo,
          });
        }
        const combinedConfig = combined.get(key)!;
        combinedConfig.pullRequests = config.filters || [];
      }

      for (const config of actionConfigs) {
        const key = `${config.org}/${config.repo}`;
        if (!combined.has(key)) {
          combined.set(key, {
            org: config.org,
            repo: config.repo,
          });
        }
        const combinedConfig = combined.get(key)!;
        combinedConfig.actions = config.filters && config.filters.length > 0 ? config.filters : null;
      }

      configurations = Array.from(combined.values());
    } catch (error) {
      console.error('Error loading configurations:', error);
    } finally {
      isLoading = false;
    }
  }

  async function handleConfigUpdate(configs: CombinedConfig[]): Promise<void> {
    // Always update the local state immediately for a responsive UI
    configurations = configs;

    // Save to backend in the background without blocking the UI
    try {
      await repositoryFacade.updateConfigurations(configs);
    } catch (error) {
      console.error('Error saving configurations:', error);
      // Optionally, you could show a toast notification here
    }
  }
</script>

<div class={$isMobile ? 'px-2 py-3' : 'py-6'}>
  <section class="hero-section glass-effect">
    <div class="container mx-auto">
      <h1 class={$isMobile ? 'text-xl mb-2' : 'hero-title'}>Configuration</h1>

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
      {:else}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          <div class="lg:col-span-1 min-w-0">
            <div class="hero-card">
              <div class="card-header">
                <h2 class="{$isMobile ? 'text-base' : 'text-lg'} font-semibold">Organizations</h2>
              </div>
              <div class="card-body">
                <OrganizationManager />
              </div>
            </div>
          </div>

          <div class="lg:col-span-2 min-w-0">
            <div class="hero-card h-full">
              <div class="card-header">
                <h2 class="{$isMobile ? 'text-base' : 'text-lg'} font-semibold">Repositories</h2>
              </div>
              <div class="card-body flex-1">
                <ConfigList configs={configurations} onUpdate={handleConfigUpdate} />
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </section>
</div>

<style>
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
