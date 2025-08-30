<script lang="ts">
  import List from './List.svelte';
  import PlaceholderHint from './PlaceholderHint.svelte';
  import RepositoryFilter from './RepositoryFilter.svelte';
  import { pullRequestsContainerService } from '$lib/services/pull-requests-container.service';
  import { repositoryFacade } from '$lib/stores/facades/repository.facade';

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
        {#if !$hasConfiguredRepositories}
          <div class="text-sm text-[#8b949e]">Add repositories in the configuration section to monitor pull requests</div>
        {/if}
      </div>
    {:else}
      <div class="space-y-4">
        {#each $filteredRepositories as { repo, isLoaded, hasPRs } (repo.org + '/' + repo.repo)}
          <div class="stagger-item">
            {#if isLoaded}
              {#if hasPRs}
                <List 
                  org={repo.org} 
                  repo={repo.repo} 
                  pullRequests={$allPullRequests[repositoryFacade.getRepoKey(repo)] || []} 
                />
              {:else}
                <div class="hero-card">
                  <div class="py-3 px-4 bg-[#161b22] text-[#c9d1d9] border-b border-[#30363d] flex justify-between items-center">
                    <h3 class="font-semibold">
                      <a href={`https://github.com/${repo.org}/${repo.repo}/pulls`} target="_blank" class="link hover:underline flex items-center gap-1" title={`${repo.org}/${repo.repo}`}>
                        <span class="text-[#58a6ff] pl-1">{repo.repo}</span>
                      </a>
                    </h3>
                  </div>
                  <div class="p-4 bg-[#0d1117] text-center">
                    <div class="text-sm text-[#8b949e]">No open pull requests</div>
                  </div>
                </div>
              {/if}
            {:else}
              <PlaceholderHint org={repo.org} repo={repo.repo} filterHint={$filterHint} />
            {/if}
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
