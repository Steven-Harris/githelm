<script lang="ts">
  import githubSVG from '$assets/github-logo.svg';

  let { org, repo } = $props();
</script>

<div class="hero-card">
  <!-- Repository header with loading animation -->
  <div class="py-3 px-4 bg-[#161b22] text-[#c9d1d9] border-b border-[#30363d] flex justify-between items-center">
    <h3 class="font-semibold">
      <a href={`https://github.com/${org}/${repo}/actions`} target="_blank" class="link hover:underline flex items-center gap-1" title={`${org}/${repo}`}>
        <img src={githubSVG} alt="GitHub" width="16" height="16" />
        <span class="text-[#58a6ff] pl-1">{repo}</span>
      </a>
    </h3>
    <div class="text-sm flex items-center gap-1 bg-[#21262d] py-1 px-2 rounded-full">
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="fill-[#8b949e]">
        <path
          d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"
        ></path>
      </svg>
      <div class="loading-pulse w-8 h-4 bg-[#30363d] rounded"></div>
    </div>
  </div>

  <!-- Loading skeleton for workflow runs -->
  <div class="divide-y divide-[#21262d]">
    {#each Array(3) as _, index}
      <div class="p-4 bg-[#0d1117]">
        <div class="flex items-center justify-between mb-3">
          <!-- Workflow name skeleton -->
          <div class="flex items-center space-x-2">
            <div class="loading-pulse w-4 h-4 bg-[#30363d] rounded-full"></div>
            <div class="loading-pulse w-32 h-4 bg-[#30363d] rounded"></div>
          </div>
          
          <!-- Status skeleton -->
          <div class="loading-pulse w-16 h-6 bg-[#30363d] rounded-full"></div>
        </div>
        
        <!-- Branch and commit info skeleton -->
        <div class="flex items-center space-x-4 text-sm">
          <div class="loading-pulse w-20 h-3 bg-[#30363d] rounded"></div>
          <div class="loading-pulse w-24 h-3 bg-[#30363d] rounded"></div>
          <div class="loading-pulse w-16 h-3 bg-[#30363d] rounded"></div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Loading indicator at bottom -->
  <div class="p-3 bg-[#0d1117] border-t border-[#21262d] flex items-center justify-center">
    <svg class="animate-spin h-4 w-4 text-[#58a6ff] mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span class="text-xs text-[#8b949e]">Loading actions...</span>
  </div>
</div>

<style>
  .loading-pulse {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.4;
    }
    50% {
      opacity: 0.8;
    }
  }
</style>
