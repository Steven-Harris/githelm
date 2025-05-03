<script lang="ts">
  import List from "./List.svelte";
  import { pullRequestConfigs, getRepoKey, allPullRequests } from "$lib/stores/repository-service";
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
        {#each $pullRequestConfigs as repo (repo.org + '/' + repo.repo)}
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
