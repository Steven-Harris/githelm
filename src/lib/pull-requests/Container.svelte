<script lang="ts">
  import List from "./List.svelte";
  import { pullRequestConfigs, getRepoKey, allPullRequests } from "$lib/stores/repository-service";
  
  // State to track if the empty repositories section is expanded or collapsed
  let showEmptyRepos = $state(false);
  
  // Computed property to separate repos with PRs from empty repos
  let reposWithPRs = $derived($pullRequestConfigs.filter(repo => {
    const repoKey = getRepoKey(repo);
    return ($allPullRequests[repoKey] || []).length > 0;
  }));
  
  let reposWithoutPRs = $derived($pullRequestConfigs.filter(repo => {
    const repoKey = getRepoKey(repo);
    return ($allPullRequests[repoKey] || []).length === 0;
  }));

  // Toggle function for the empty repositories section
  function toggleEmptyRepos() {
    showEmptyRepos = !showEmptyRepos;
  }
</script>

<section class="hero-section mb-6 glass-effect">
  <div class="container mx-auto">
    <h2 class="hero-title">Pull Requests</h2>
    
    {#if $pullRequestConfigs.length === 0}
      <div class="flex flex-col items-center justify-center p-8 text-center hero-card">
        <div class="text-lg text-[#8b949e] mb-4">
          No repositories configured for pull requests monitoring
        </div>
        <div class="text-sm text-[#8b949e]">
          Add repositories in the configuration section to monitor pull requests
        </div>
      </div>
    {:else}
      <div class="space-y-4">
        <!-- Repositories with Pull Requests -->
        {#each reposWithPRs as repo (repo.org + '/' + repo.repo)}
          <div class="stagger-item">
            <List 
              org={repo.org} 
              repo={repo.repo} 
              pullRequests={$allPullRequests[getRepoKey(repo)] || []} 
            />
          </div>
        {/each}

        <!-- Empty repositories section -->
        {#if reposWithoutPRs.length > 0}
          <div class="mt-6 border-t border-[#30363d] pt-4">
            <button 
              class="flex items-center justify-between w-full text-left px-4 py-3 bg-[#161b22] text-[#c9d1d9] rounded mb-2 hover:bg-[#21262d] transition-colors"
              onclick={toggleEmptyRepos}
              aria-expanded={showEmptyRepos}
            >
              <span class="font-medium">Repositories without PRs ({reposWithoutPRs.length})</span>
              <svg 
                class="w-5 h-5 transition-transform duration-200" 
                class:transform={true} 
                class:rotate-180={showEmptyRepos}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            
            {#if showEmptyRepos}
              <div class="space-y-2">
                {#each reposWithoutPRs as repo (repo.org + '/' + repo.repo)}
                  <div class="stagger-item">
                    <List 
                      org={repo.org} 
                      repo={repo.repo} 
                      pullRequests={$allPullRequests[getRepoKey(repo)] || []} 
                    />
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
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
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.15) 0%,
      rgba(255, 255, 255, 0.08) 40%, 
      rgba(255, 255, 255, 0.03) 60%,
      rgba(255, 255, 255, 0) 80%
    );
    pointer-events: none;
    z-index: 1;
  }
  
  /* Ensure content appears above the glare effect */
  .container {
    position: relative;
    z-index: 3;
  }
</style>
