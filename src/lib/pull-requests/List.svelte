<script lang="ts">
  import Reviews from "./Reviews.svelte";
  import githubSVG from "$assets/github-logo.svg";
  
  let { org, repo, pullRequests} = $props();
  
</script>

<div>
  <div class="mb-4 hero-card">
    <div class="py-3 px-4 bg-[#161b22] text-[#c9d1d9] border-b border-[#30363d] flex justify-between items-center">
      <h3 class="font-semibold">
        <a 
          href={`https://github.com/${org}/${repo}/pulls`} 
          target="_blank" 
          class="link hover:underline flex items-center gap-1"
          title={`${org}/${repo}`}
        >
          <img src={githubSVG} alt="GitHub" width="16" height="16" />
          <span class="text-[#58a6ff]">{repo}</span>
        </a>
      </h3>
      <span class="text-sm flex items-center gap-1 bg-[#21262d] py-1 px-2 rounded-full">
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="18" class="fill-[#8b949e]">
          <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854v4.792a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854v4.792a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 10.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm3.75.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z"></path>
        </svg>
        <span class="text-[#8b949e]">{pullRequests.length} {pullRequests.length === 1 ? 'PR' : 'PRs'}</span>
      </span>
    </div>

    {#if pullRequests?.length > 0}
      <div class="divide-y divide-[#21262d]">
        {#each pullRequests as pr, index}
          <div class="p-4 bg-[#0d1117] hover:bg-[#161b22] transition-colors stagger-item" style="animation-delay: {0.05 + (index * 0.05)}s">
            <div class="flex justify-between items-start">
              <div class="flex-1 min-w-0">
                <a 
                  href={pr.html_url} 
                  target="_blank" 
                  class="text-[#58a6ff] hover:text-[#79c0ff] text-lg font-medium hover:underline block truncate"
                >
                  {pr.title}
                </a>
                <div class="text-sm text-[#8b949e] mt-1">
                  #{pr.number} opened {pr.createdAt} by 
                  <a 
                    href={`https://github.com/${pr.user.login}`} 
                    target="_blank" 
                    class="text-[#7d8590] hover:text-[#58a6ff]"
                  >
                    {pr.user.login}
                  </a>
                </div>
                {#if pr.labels?.length > 0}
                  <div class="mt-2 flex flex-wrap gap-1">
                    {#each pr.labels as label}
                      <span 
                        class="px-2 py-0.5 text-xs rounded-full"
                        style="background-color: #{label.color}26; color: #{label.color}; border: 1px solid #{label.color}40;"
                      >
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
              <span class="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#21262d] text-[#8b949e]">
                Draft
              </span>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="p-4 bg-[#0d1117] text-center">
        <div class="text-sm text-[#8b949e]">No open pull requests</div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Styles are handled by global classes and Tailwind */
</style>
