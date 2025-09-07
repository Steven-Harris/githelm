<script lang="ts">
  import Reviews from './Reviews.svelte';
  import { repositoryCollapseStore } from '$shared/stores/repository-collapse.store';
  import CountBadge from '$shared/ui/CountBadge.svelte';

  let { org, repo, isLoaded, hasPRs, pullRequests = [], filterHint = '' } = $props();
  
  const repoKey = `${org}/${repo}`;
  
  function toggleCollapse() {
    repositoryCollapseStore.toggle(repoKey);
  }

  const isCollapsed = $derived(repositoryCollapseStore.isCollapsed(repoKey, $repositoryCollapseStore));
</script>

<div class="hero-card">
  <div class="py-3 px-4 bg-[#161b22] text-[#c9d1d9] border-b border-[#30363d] flex justify-between items-center">
    <div class="flex items-center gap-3">
      <button 
        onclick={toggleCollapse}
        class="text-[#8b949e] hover:text-[#c9d1d9] transition-colors p-1 rounded hover:bg-[#21262d]"
        title={isCollapsed ? 'Expand repository' : 'Collapse repository'}
      >
        {#if isCollapsed}
          <!-- Expand icon (chevron right) -->
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"/>
          </svg>
        {:else}
          <!-- Collapse icon (chevron down) -->
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
          </svg>
        {/if}
      </button>
      <h3 class="font-semibold">
        <a href={`https://github.com/${org}/${repo}/pulls`} target="_blank" class="link hover:underline flex items-center gap-1" title={`${org}/${repo}`}>
          <span class="text-[#58a6ff] pl-1">{repo}</span>
        </a>
      </h3>
    </div>
    <div class="flex items-center gap-3">
      {#if isLoaded}
        <CountBadge 
          repoKey={repoKey}
          type="pullRequests"
          count={pullRequests.length}
          iconType="pullRequest"
          label="PR"
        />
      {:else}
        <div class="text-sm flex items-center gap-1 bg-[#21262d] py-1 px-2 rounded-full">
          <svg class="fill-[#8b949e]" height="16" viewBox="0 0 16 16" version="1.1" width="16">
            <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"></path>
          </svg>
          <span class="text-[#8b949e]">Loading...</span>
        </div>
      {/if}
    </div>
  </div>

  {#if !isCollapsed}
    {#if !isLoaded}
      <!-- Loading state -->
      <div class="p-4 bg-[#0d1117] text-center">
        <div class="flex items-center justify-center mb-2">
          <svg class="animate-spin h-4 w-4 text-[#58a6ff] mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-xs text-[#8b949e]">Checking for {filterHint || 'pull requests'}...</span>
        </div>
      </div>
    {:else if pullRequests.length > 0}
      <!-- Pull requests list -->
      <div class="divide-y divide-[#21262d]">
        {#each pullRequests as pr, index (index)}
          <div class="p-4 bg-[#0d1117] hover:bg-[#161b22] transition-colors stagger-item" style="animation-delay: {0.05 + index * 0.05}s">
            <div class="flex justify-between items-start">
              <div class="flex-1 min-w-0">
                <div class="flex items">
                  {#if pr.user?.avatar_url}
                    <img src={pr.user.avatar_url} class="avatar mt-1 mr-2" alt={`Avatar of ${pr.user.login || 'User'}`} />
                  {:else}
                    <div class="avatar mt-1 mr-2 bg-[#30363d] flex items-center justify-center">
                      <svg class="w-4 h-4 text-[#8b949e]" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                      </svg>
                    </div>
                  {/if}
                  <a href={pr.html_url} target="_blank" class="text-[#58a6ff] hover:text-[#79c0ff] text-lg font-medium hover:underline block truncate">
                    {pr.title}
                  </a>
                </div>
                <div class="text-sm text-[#8b949e] mt-1">
                  #{pr.number} opened {pr.createdAt} by
                  <a href={`https://github.com/${pr.user?.login || 'unknown'}`} target="_blank" class="text-[#7d8590] hover:text-[#58a6ff]">
                    {pr.user?.login || 'Unknown User'}
                  </a>
                </div>
                {#if pr.labels?.length > 0}
                  <div class="mt-2 flex flex-wrap gap-1">
                    {#each pr.labels as label, index (index)}
                      <span class="px-2 py-0.5 text-xs rounded-full" style="background-color: #{label.color}26; color: #{label.color}; border: 1px solid #{label.color}40;">
                        {label.name}
                      </span>
                    {/each}
                  </div>
                {/if}
              </div>

              <div>
                <Reviews reviews={pr.reviews || []} />
              </div>
            </div>

            {#if pr.isDraft}
              <span class="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#21262d] text-[#8b949e]"> Draft </span>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <!-- No pull requests state -->
      <div class="p-4 bg-[#0d1117] text-center">
        <div class="text-sm text-[#8b949e]">No open pull requests</div>
      </div>
    {/if}
  {/if}
</div>
