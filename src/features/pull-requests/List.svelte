<script lang="ts">
  import Reviews from './Reviews.svelte';
  import githubSVG from '$assets/github-logo.svg';
  import { repositoryCollapseStore } from '$shared/stores/repository-collapse.store';

  let { org, repo, pullRequests } = $props();
  
  const repoKey = `${org}/${repo}`;
  
  function toggleCollapse() {
    repositoryCollapseStore.toggle(repoKey);
  }
</script>

<div>
  <div class="mb-4 hero-card">
    <div class="py-3 px-4 bg-[#161b22] text-[#c9d1d9] border-b border-[#30363d] flex justify-between items-center">
      <div class="flex items-center gap-3">
        <button 
          onclick={toggleCollapse}
          class="text-[#8b949e] hover:text-[#c9d1d9] transition-colors p-1 rounded hover:bg-[#21262d]"
          title={repositoryCollapseStore.isCollapsed(repoKey, $repositoryCollapseStore) ? 'Expand repository' : 'Collapse repository'}
        >
          {#if repositoryCollapseStore.isCollapsed(repoKey, $repositoryCollapseStore)}
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
            <span class="text-[#58a6ff]">{repo}</span>
          </a>
        </h3>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm flex items-center gap-1 bg-[#21262d] py-1 px-2 rounded-full">
          <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="18" class="fill-[#8b949e]">
            <path
              d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854v4.792a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854v4.792a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 10.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm3.75.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z"
            ></path>
          </svg>
          <span class="text-[#8b949e]">{pullRequests.length} {pullRequests.length === 1 ? 'PR' : 'PRs'}</span>
        </span>
      </div>
    </div>

    {#if !repositoryCollapseStore.isCollapsed(repoKey, $repositoryCollapseStore)}
      {#if pullRequests?.length > 0}
        <div class="divide-y divide-[#21262d]">
          {#each pullRequests as pr, index (index)}
            <div class="p-4 bg-[#0d1117] hover:bg-[#161b22] transition-colors stagger-item" style="animation-delay: {0.05 + index * 0.05}s">
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                  <div class="flex items">
                    <img src={pr.user.avatar_url} class="avatar mt-1 mr-2" alt={`Avatar of ${pr.user.login}`} />
                    <a href={pr.html_url} target="_blank" class="text-[#58a6ff] hover:text-[#79c0ff] text-lg font-medium hover:underline block truncate">
                      {pr.title}
                    </a>
                  </div>
                  <div class="text-sm text-[#8b949e] mt-1">
                    #{pr.number} opened {pr.createdAt} by
                    <a href={`https://github.com/${pr.user.login}`} target="_blank" class="text-[#7d8590] hover:text-[#58a6ff]">
                      {pr.user.login}
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
        <div class="p-4 bg-[#0d1117] text-center">
          <div class="text-sm text-[#8b949e]">No open pull requests</div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  /* Styles are handled by global classes and Tailwind */
</style>
