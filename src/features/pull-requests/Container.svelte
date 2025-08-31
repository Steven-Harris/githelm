<script lang="ts">
  import RepositoryCard from './RepositoryCard.svelte';
  import RepositoryFilter from './RepositoryFilter.svelte';
  import { pullRequestsContainerService } from '$features/pull-requests/services/pull-requests-container.service';
  import { repositoryFacade } from '$shared/stores/facades/repository.facade';

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
            <RepositoryCard 
              org={repo.org} 
              repo={repo.repo} 
              isLoaded={isLoaded}
              hasPRs={hasPRs}
              pullRequests={$allPullRequests[repositoryFacade.getRepoKey(repo)] || []}
              filterHint={$filterHint}
            />
          </div>
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
