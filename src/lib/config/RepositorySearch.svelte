<script lang="ts">
  import { searchRepositories } from "$integrations/github";
  import type { SearchRepositoryResult } from "$lib/stores/repository-service";
  
  let { orgName = "", repoName = "", disabled = false, onChange } = $props();
  
  let searchResults = $state<SearchRepositoryResult[]>([]);
  let isLoading = $state<boolean>(false);
  let showResults = $state<boolean>(false);
  let searchTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
  
  async function handleInputChange(): Promise<void> {
    if (!orgName || !repoName.trim()) {
      searchResults = [];
      return;
    }
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    searchTimeout = setTimeout(async () => {
      isLoading = true;
      showResults = true;
      
      try {
        searchResults = await searchRepositories(orgName, repoName);
      } catch (error) {
        console.error("Error searching repositories:", error);
        searchResults = [];
      } finally {
        isLoading = false;
      }
    }, 300);
  }
  
  function selectRepository(repo: string): void {
    onChange(repo);
    showResults = false;
    searchResults = [];
  }
  
  function handleInputKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      showResults = false;
    } else if (e.key === 'ArrowDown' && searchResults.length > 0) {
      const firstResult = document.querySelector('.repo-result') as HTMLElement;
      if (firstResult) {
        firstResult.focus();
      }
    }
  }
  
  function handleSearchResultKeydown(e: KeyboardEvent, repoName: string, index: number): void {
    if (e.key === 'Enter') {
      selectRepository(repoName);
    } else if (e.key === 'Escape') {
      showResults = false;
      const repoInput = document.getElementById('repository-input') as HTMLElement;
      if (repoInput) {
        repoInput.focus();
      }
    } else if (e.key === 'ArrowDown') {
      // Move focus to the next search result
      const nextResult = document.querySelector(`.repo-result:nth-child(${index + 2})`) as HTMLElement;
      if (nextResult) {
        nextResult.focus();
      }
    } else if (e.key === 'ArrowUp') {
      if (index === 0) {
        const repoInput = document.getElementById('repository-input') as HTMLElement;
        if (repoInput) {
          repoInput.focus();
        }
      } else {
        const prevResult = document.querySelector(`.repo-result:nth-child(${index})`) as HTMLElement;
        if (prevResult) {
          prevResult.focus();
        }
      }
    }
  }
  
  $effect(() => {
    // Reset when organization changes
    if (orgName) {
      searchResults = [];
      showResults = false;
    }
  });
</script>

<div class="mb-4">
  <div class="flex items-center mb-1">
    <label for="repository-input" class="block text-sm font-medium">Repository</label>
    {#if !orgName}
      <span class="tooltip ml-2">
        <span class="text-gray-400 text-xs">ⓘ</span>
        <span class="tooltip-text">Select an organization first</span>
      </span>
    {/if}
  </div>
  
  <div class="relative">
    <input 
      id="repository-input"
      type="text" 
      bind:value={repoName}
      oninput={handleInputChange}
      onkeydown={handleInputKeydown}
      onfocus={() => { if (repoName && orgName) showResults = true; }}
      class="w-full p-2 bg-gray-600 border border-gray-600 rounded text-white {!orgName ? 'opacity-50 cursor-not-allowed' : ''}"
      placeholder="Type to search repositories..."
      disabled={disabled || !orgName}
      aria-required="true"
    />
    
    {#if showResults && orgName && searchResults.length > 0}
      <div class="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
        {#if isLoading}
          <div class="p-3 text-gray-400">Searching repositories...</div>
        {:else}
          {#each searchResults as repo, i}
            <button 
              type="button"
              class="repo-result w-full text-left p-2 hover:bg-gray-700 focus:bg-gray-700 focus:outline-none rounded-md"
              onclick={() => selectRepository(repo.name)}
              onkeydown={(e) => handleSearchResultKeydown(e, repo.name, i)}
              tabindex="0"
            >
              <div class="font-medium">{repo.name}</div>
              {#if repo.description}
                <div class="text-sm text-gray-400">{repo.description}</div>
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .tooltip {
    position: relative;
    display: inline-block;
  }
  
  .tooltip-text {
    position: absolute;
    visibility: hidden;
    width: 170px;
    background-color: #333;
    color: white;
    text-align: center;
    padding: 5px;
    border-radius: 6px;
    z-index: 1;
    bottom: 125%;
    left: 50%;
    margin-left: -85px;
    opacity: 0;
    transition: opacity 0.3s;
  }
  
  .tooltip:hover .tooltip-text {
    visibility: visible;
    opacity: 1;
  }
  
  .tooltip-text::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #333 transparent transparent transparent;
  }
</style>