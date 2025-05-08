<script lang="ts">
  import List from './List.svelte';
  import RepositoryFilter from './RepositoryFilter.svelte';
  import { pullRequestConfigs, getRepoKey, allPullRequests } from '$lib/stores/repository-service';
  import { repositoryFilters } from '$lib/stores/repository-filter.store';
  import type { RepoConfig } from '$integrations/firebase';
  import { isLoading } from '$stores/loading.store';

  // Process repositories at render time to preserve original order
  let filteredRepos = $state<RepoConfig[]>([]);
  let firstLoad = $state<boolean>(true);

  $effect(() => {
    filteredRepos = $pullRequestConfigs.filter((repo) => {
      const repoKey = getRepoKey(repo);
      const hasPRs = ($allPullRequests[repoKey] || []).length > 0;

      firstLoad = false;

      // Only include if the corresponding filter is enabled
      return (hasPRs && $repositoryFilters.with_prs) || (!hasPRs && $repositoryFilters.without_prs);
    });
  });
</script>

<section class="hero-section mb-6 glass-effect">
  <div class="container mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h2 class="hero-title">Pull Requests</h2>
      {#if $pullRequestConfigs.length > 0}
        <RepositoryFilter />
      {/if}
    </div>

    {#if ($isLoading && filteredRepos.length == 0) || firstLoad}
      <div class="flex items-center justify-center p-8 text-center hero-card">Loading pull requests...</div>
    {:else if $pullRequestConfigs.length === 0}
      <div class="flex flex-col items-center justify-center p-8 text-center hero-card">
        <div class="text-lg text-[#8b949e] mb-4">No repositories configured for pull requests monitoring</div>
        <div class="text-sm text-[#8b949e]">Add repositories in the configuration section to monitor pull requests</div>
      </div>
    {:else if filteredRepos.length === 0}
      <div class="flex flex-col items-center justify-center p-8 text-center hero-card">
        <div class="text-md text-[#8b949e]">No repositories match the current filters</div>
      </div>
    {:else}
      <div class="space-y-4">
        {#each filteredRepos as repo (repo.org + '/' + repo.repo)}
          <div class="stagger-item">
            <List org={repo.org} repo={repo.repo} pullRequests={$allPullRequests[getRepoKey(repo)] || []} />
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
