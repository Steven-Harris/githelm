<script lang="ts">
  import List from './List.svelte';
  import PlaceholderHint from './PlaceholderHint.svelte';
  import WorkflowStatusFilter from './WorkflowStatusFilter.svelte';
  import { actionsContainerService } from '$lib/services/actions-container.service';
  import { repositoryFacade } from '$lib/stores/facades/repository.facade';

  const filteredWorkflowRuns = actionsContainerService.getFilteredWorkflowRuns();
  const filterHint = actionsContainerService.getFilterHint();
  const emptyStateMessage = actionsContainerService.getEmptyStateMessage();
  const hasConfiguredRepositories = actionsContainerService.hasConfiguredRepositories();
  const configuredRepositories = actionsContainerService.getConfiguredRepositories();
  const loadingStates = actionsContainerService.getLoadingStates();

  const showEmptyState = $derived($emptyStateMessage !== '');
  const showFilter = $derived($hasConfiguredRepositories);

  function shouldShowPlaceholder(repoKey: string): boolean {
    return $loadingStates[repoKey] === 'loading';
  }
</script>

<section class="hero-section mb-6 glass-effect">
  <div class="container mx-auto">
    <div class="flex justify-between items-center mb-4">
      <h2 class="hero-title">Actions</h2>
      <WorkflowStatusFilter />
    </div>
    
    {#if showEmptyState}
      <div class="flex flex-col items-center justify-center p-8 text-center hero-card">
        <div class="text-lg text-[#8b949e] mb-4">{$emptyStateMessage}</div>
        {#if !$hasConfiguredRepositories}
          <div class="text-sm text-[#8b949e]">Add repositories in the configuration section to monitor GitHub Actions</div>
        {/if}
      </div>
    {:else}
      <div class="space-y-4">
        {#each $configuredRepositories as repo (repo.org + '/' + repo.repo)}
          {@const repoKey = repositoryFacade.getRepoKey(repo)}
          {@const filteredRuns = $filteredWorkflowRuns[repoKey] || []}
          {@const hasLoadedData = $loadingStates[repoKey] === 'loaded' || $loadingStates[repoKey] === 'empty'}
          {@const showPlaceholder = shouldShowPlaceholder(repoKey)}

          {#if hasLoadedData}
            {#if filteredRuns.length > 0}
              <div class="stagger-item">
                <List org={repo.org} repo={repo.repo} workflowRuns={filteredRuns} />
              </div>
            {/if}
          {:else if showPlaceholder}
            <div class="stagger-item">
              <PlaceholderHint org={repo.org} repo={repo.repo} filterHint={$filterHint} />
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</section>

<style>
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
  }
</style>
