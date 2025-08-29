<script lang="ts">
  import githubSVG from '$assets/github-logo.svg';

  let { org, repo, filterHint = '' } = $props();
</script>

<div class="hero-card">
  <!-- Repository header -->
  <div class="py-3 px-4 bg-[#161b22] text-[#c9d1d9] border-b border-[#30363d] flex justify-between items-center">
    <h3 class="font-semibold">
      <a href={`https://github.com/${org}/${repo}/pulls`} target="_blank" class="link hover:underline flex items-center gap-1" title={`${org}/${repo}`}>
        <img src={githubSVG} alt="GitHub" width="16" height="16" />
        <span class="text-[#58a6ff] pl-1">{repo}</span>
      </a>
    </h3>
    <div class="text-sm flex items-center gap-1 bg-[#21262d] py-1 px-2 rounded-full">
      <svg class="fill-[#8b949e]" height="16" viewBox="0 0 16 16" version="1.1" width="16">
        <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"></path>
      </svg>
      <span class="text-[#8b949e]">Loading...</span>
    </div>
  </div>

  <!-- Hint about what we're looking for -->
  <div class="p-4 bg-[#0d1117] text-center">
    <div class="flex items-center justify-center mb-2">
      <svg class="animate-spin h-4 w-4 text-[#58a6ff] mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="text-xs text-[#8b949e]">Checking for {filterHint || 'pull requests'}...</span>
    </div>
  </div>
</div>
