<script lang="ts">
  import { actionsContainerService } from '$features/actions/services/actions-container.service';
  import { repositoryFacade } from '$shared/stores/repository.facade';
  import RepositoryCard from './RepositoryCard.svelte';
  import WorkflowStatusFilter from './WorkflowStatusFilter.svelte';

  const filteredWorkflowRuns = actionsContainerService.getFilteredWorkflowRuns();
  const filterHint = actionsContainerService.getFilterHint();
  const emptyStateMessage = actionsContainerService.getEmptyStateMessage();
  const hasConfiguredRepositories = actionsContainerService.hasConfiguredRepositories();
  const configuredRepositories = actionsContainerService.getConfiguredRepositories();
  const loadingStates = actionsContainerService.getLoadingStates();

  const showEmptyState = $derived($emptyStateMessage !== '');
  const showFilter = $derived($hasConfiguredRepositories);
  const runCount = $derived(
    $configuredRepositories.reduce((total, repo) => total + ($filteredWorkflowRuns[repositoryFacade.getRepoKey(repo)]?.length || 0), 0)
  );
</script>

<section class="hero-section mb-5">
  <div class="flex items-center justify-between gap-3 mb-5">
    <div class="flex items-baseline gap-2.5 min-w-0">
      <h2 class="hero-title">Actions</h2>
      {#if runCount > 0}
        <span class="section-count">{runCount}</span>
      {/if}
    </div>
    {#if showFilter}
      <WorkflowStatusFilter />
    {/if}
  </div>

  {#if showEmptyState}
    <div class="flex flex-col items-center justify-center px-6 py-12 text-center hero-card">
      <p class="text-[var(--text-dim)] max-w-[42ch]">{$emptyStateMessage}</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each $configuredRepositories as repo (repo.org + '/' + repo.repo)}
        {@const repoKey = repositoryFacade.getRepoKey(repo)}
        {@const filteredRuns = $filteredWorkflowRuns[repoKey] || []}
        {@const isLoaded = $loadingStates[repoKey] === 'loaded' || $loadingStates[repoKey] === 'empty'}
        {@const isLoading = $loadingStates[repoKey] === 'loading'}
        {@const shouldShow = isLoading || filteredRuns.length > 0}

        {#if shouldShow}
          <div class="stagger-item">
            <RepositoryCard org={repo.org} repo={repo.repo} {isLoaded} workflowRuns={filteredRuns} filterHint={$filterHint} />
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</section>

<style>
  .section-count {
    font-family: var(--font-display);
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--beacon);
  }
</style>
