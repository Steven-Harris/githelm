<script lang="ts">
  import { pullRequestsContainerService } from '$features/pull-requests/services/pull-requests-container.service';
  import { repositoryFacade } from '$shared/stores/repository.facade';
  import RepositoryCard from './RepositoryCard.svelte';
  import RepositoryFilter from './RepositoryFilter.svelte';

  const filteredRepositories = pullRequestsContainerService.getFilteredRepositories();
  const filterHint = pullRequestsContainerService.getFilterHint();
  const emptyStateMessage = pullRequestsContainerService.getEmptyStateMessage();
  const hasConfiguredRepositories = pullRequestsContainerService.hasConfiguredRepositories();
  const allPullRequests = repositoryFacade.getPullRequestsStore();

  const showEmptyState = $derived($emptyStateMessage !== '');
  const showFilter = $derived($hasConfiguredRepositories);
</script>

<section class="hero-section mb-6 glass-effect">
  <div class="container mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h2 class="hero-title">Pull Requests</h2>
      {#if showFilter}
        <RepositoryFilter />
      {/if}
    </div>

    {#if showEmptyState}
      <div class="flex flex-col items-center justify-center p-8 text-center hero-card">
        <div class="text-lg text-[#8b949e] mb-4">{$emptyStateMessage}</div>
      </div>
    {:else}
      <div class="space-y-4">
        {#each $filteredRepositories as { repo, isLoaded, hasPRs } (repo.org + '/' + repo.repo)}
          <div class="stagger-item">
            <RepositoryCard org={repo.org} repo={repo.repo} {isLoaded} {hasPRs} pullRequests={$allPullRequests[repositoryFacade.getRepoKey(repo)] || []} filterHint={$filterHint} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>
