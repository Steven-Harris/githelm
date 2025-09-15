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
      </div>
    {:else}
      <div class="space-y-4">
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
  </div>
</section>
