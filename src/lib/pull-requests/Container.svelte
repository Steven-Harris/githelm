<script lang="ts">
  import List from './List.svelte';
  import PlaceholderHint from './PlaceholderHint.svelte';
  import RepositoryFilter from './RepositoryFilter.svelte';
  import { repositoryFacade } from '$lib/stores/facades/repository.facade';
  import { repositoryFilters } from '$lib/stores/repository-filter.store';
  import { derived } from 'svelte/store';
  import type { RepoConfig } from '$integrations/firebase';

  // Track loading states for each repository
  let loadingStates = $state<Record<string, 'loading' | 'loaded' | 'empty'>>({}); 

  // Process repositories and determine their loading states
  let reposToShow = $state<Array<{repo: RepoConfig, isLoaded: boolean, hasPRs: boolean}>>([]);

  // Create derived stores for the facade
  const pullRequestConfigs = derived(repositoryFacade.getPullRequestConfigsStore(), ($configs) => $configs);
  const allPullRequests = derived(repositoryFacade.getPullRequestsStore(), ($prs) => $prs);

  $effect(() => {
    reposToShow = $pullRequestConfigs.map(repo => {
      const repoKey = repositoryFacade.getRepoKey(repo);
      const pullRequests = $allPullRequests[repoKey] || [];
      const hasPRs = pullRequests.length > 0;
      
      // Initialize loading state if not set
      if (!loadingStates[repoKey]) {
        loadingStates[repoKey] = 'loading';
      }
      
      // Update loading state based on data availability
      if (repoKey in $allPullRequests) {
        loadingStates[repoKey] = hasPRs ? 'loaded' : 'empty';
      }
      
      const isLoaded = loadingStates[repoKey] === 'loaded' || loadingStates[repoKey] === 'empty';
      
      return { repo, isLoaded, hasPRs };
    });
  });

  // Determine if a repository should show a placeholder based on current filters
  function shouldShowPlaceholder(repo: RepoConfig, isLoaded: boolean): boolean {
    // If it's loaded, we'll show real data or nothing
    if (isLoaded) {
      return false;
    }
    
    // For loading repos, only show placeholder if filters suggest we might show content
    // If both with_prs and without_prs are disabled, don't show any placeholders
    const hasAnyFilterEnabled = $repositoryFilters.with_prs || $repositoryFilters.without_prs;
    return hasAnyFilterEnabled;
  }

  // Get a hint about what we're looking for based on current filters
  function getFilterHint(): string {
    if ($repositoryFilters.with_prs && $repositoryFilters.without_prs) {
      return 'pull requests and empty repositories';
    } else if ($repositoryFilters.with_prs) {
      return 'repositories with pull requests';
    } else if ($repositoryFilters.without_prs) {
      return 'repositories without pull requests';
    } else {
      return 'repositories';
    }
  }

  // Filter repositories for display
  let filteredRepos = $derived(
    reposToShow.filter(({ repo, isLoaded, hasPRs }) => {
      if (!isLoaded) {
        // Show placeholder only if filters suggest we might show this repo
        return shouldShowPlaceholder(repo, isLoaded);
      }
      
      // For loaded repos, apply filters
      return (hasPRs && $repositoryFilters.with_prs) || (!hasPRs && $repositoryFilters.without_prs);
    })
  );
</script>

<section class="hero-section mb-6 glass-effect">
  <div class="container mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h2 class="hero-title">Pull Requests</h2>
      {#if $pullRequestConfigs.length > 0}
        <RepositoryFilter />
      {/if}
    </div>

    {#if $pullRequestConfigs.length === 0}
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
        {#each filteredRepos as { repo, isLoaded, hasPRs } (repo.org + '/' + repo.repo)}
          <div class="stagger-item">
            {#if isLoaded}
              <!-- Show real data when loaded -->
              {#if hasPRs && $repositoryFilters.with_prs}
                <List org={repo.org} repo={repo.repo} pullRequests={$allPullRequests[repositoryFacade.getRepoKey(repo)] || []} />
              {:else if !hasPRs && $repositoryFilters.without_prs}
                <!-- Show empty state for this repo -->
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
              <!-- Show smart loading placeholder until data loads -->
              <PlaceholderHint org={repo.org} repo={repo.repo} filterHint={getFilterHint()} />
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
