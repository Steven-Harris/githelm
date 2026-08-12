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
  const openCount = $derived($filteredRepositories.reduce((total, { repo }) => total + ($allPullRequests[repositoryFacade.getRepoKey(repo)]?.length || 0), 0));
</script>

<section class="hero-section mb-5">
  <div class="flex items-center justify-between gap-3 mb-5">
    <div class="flex items-baseline gap-2.5 min-w-0">
      <h2 class="hero-title">Pull Requests</h2>
      {#if openCount > 0}
        <span class="section-count">{openCount}</span>
      {/if}
    </div>
    {#if showFilter}
      <RepositoryFilter />
    {/if}
  </div>

  {#if showEmptyState}
    <div class="flex flex-col items-center justify-center px-6 py-12 text-center hero-card">
      <p class="text-[var(--text-dim)] max-w-[42ch]">{$emptyStateMessage}</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each $filteredRepositories as { repo, isLoaded, hasPRs } (repo.org + '/' + repo.repo)}
        <div class="stagger-item">
          <RepositoryCard org={repo.org} repo={repo.repo} {isLoaded} {hasPRs} pullRequests={$allPullRequests[repositoryFacade.getRepoKey(repo)] || []} filterHint={$filterHint} />
        </div>
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
