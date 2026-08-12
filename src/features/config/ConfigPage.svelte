<script lang="ts">
  import type { RepoConfig } from '$integrations/firebase';
  import { configService } from '$integrations/firebase';
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
      const configs = await configService.getConfigs();
      const prConfigs = configs.pullRequests || [];
      const actionConfigs = configs.actions || [];

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

<div class={$isMobile ? 'px-1 py-3' : 'py-6'}>
  <div class="mx-auto w-full max-w-6xl">
    <h1 class="page-title">Configuration</h1>
    <p class="page-sub">Choose which organizations and repositories GitHelm keeps on the bridge.</p>

    {#if isLoading}
      <div class="hero-section mt-6 py-12 text-center">
        <div class="animate-spin mx-auto w-7 h-7 mb-4" aria-hidden="true">
          <svg class="w-full h-full" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="rgba(148,168,205,0.18)" stroke-width="1.5" />
            <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="var(--beacon)" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>
        <p class="text-sm text-[var(--text-dim)]">Loading your configuration…</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full mt-6 items-start">
        <section class="hero-section flush lg:col-span-1 min-w-0">
          <div class="card-header">
            <h2 class="hero-title">Organizations</h2>
          </div>
          <div class="card-body">
            <OrganizationManager />
          </div>
        </section>

        <section class="hero-section flush lg:col-span-2 min-w-0">
          <div class="card-header">
            <h2 class="hero-title">Repositories</h2>
          </div>
          <div class="card-body">
            <ConfigList configs={configurations} onUpdate={handleConfigUpdate} />
          </div>
        </section>
      </div>
    {/if}
  </div>
</div>

<style>
  .page-title {
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.025em;
    color: #fff;
  }

  .page-sub {
    margin-top: 0.375rem;
    font-size: 0.875rem;
    color: var(--text-dim);
    max-width: 46ch;
  }

  .card-header {
    padding: 0.875rem 1.25rem;
    background: rgba(148, 168, 205, 0.045);
    border-bottom: 1px solid var(--line);
  }

  .card-body {
    padding: 1.25rem;
  }
</style>
