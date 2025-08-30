<script lang="ts">
  import { searchRepositories } from '$integrations/github';
  import { captureException } from '$integrations/sentry';
  import type { SearchRepositoryResult } from '$integrations/github';
  import { useDropdown } from './useDropdown';
  import { useKeyboardNavigation } from './useKeyboardNavigation';

  interface ExistingRepo {
    org: string;
    repo: string;
  }

  let {
    orgName = '',
    repoName = '',
    disabled = false,
    onChange,
    existingRepos = [],
  } = $props<{
    orgName: string;
    repoName: string;
    disabled?: boolean;
    onChange: (repo: string) => void;
    existingRepos?: ExistingRepo[];
  }>();

  let searchResults = $state<(SearchRepositoryResult & { alreadyConfigured?: boolean })[]>([]);
  let isLoading = $state<boolean>(false);
  let showResults = $state<boolean>(false);
  let searchTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
  let containerRef = $state<HTMLDivElement | null>(null);

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
        const results = await searchRepositories(orgName, repoName);

        // Mark repositories that are already configured
        searchResults = results.map((repo) => ({
          ...repo,
          alreadyConfigured: existingRepos.some((existing: { org: any; repo: string }) => existing.org === orgName && existing.repo === repo.name),
        }));
      } catch (error) {
        captureException(error);
        searchResults = [];
      } finally {
        isLoading = false;
      }
    }, 300);
  }

  function selectRepository(repo: string): void {
    // Check if repository is already configured
    const isAlreadyConfigured = existingRepos.some((existing) => existing.org === orgName && existing.repo === repo);

    if (!isAlreadyConfigured) {
      onChange(repo);
      showResults = false;
      searchResults = [];
    }
  }

  // New keyboard navigation handler for dropdown
  function handleResultSelection(index: number): void {
    const repo = searchResults[index];
    if (repo && !repo.alreadyConfigured) {
      selectRepository(repo.name);
    }
  }

  function closeDropdown(): void {
    showResults = false;
    const inputElement = document.getElementById('repository-input');
    if (inputElement) {
      inputElement.focus();
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
    <label for="repository-input" class="{disabled ? '' : 'block'} text-sm font-medium text-[#c9d1d9]">
      Repository
      {#if disabled}
        <span id="repository-input" class="text-sm font-medium text-white">- {repoName}</span>
      {:else}
        <span class="text-red-700">*</span>
      {/if}
    </label>
    {#if !orgName}
      <span class="tooltip ml-2">
        <span class="text-[#8b949e] text-xs">ⓘ</span>
        <span class="tooltip-text">Select an organization first</span>
      </span>
    {/if}
  </div>

  {#if !disabled}
    <div
      class="relative"
      bind:this={containerRef}
      use:useKeyboardNavigation={{
        inputId: 'repository-input',
        itemSelector: '.repo-result',
        onSelect: handleResultSelection,
        onEscape: closeDropdown,
      }}
    >
      <input
        id="repository-input"
        type="text"
        bind:value={repoName}
        oninput={handleInputChange}
        onfocus={() => {
          if (repoName && orgName) showResults = true;
        }}
        class="w-full p-2 bg-[rgba(22,27,34,0.5)] border border-[#30363d] rounded text-[#c9d1d9] focus:border-[#58a6ff] focus:outline-none transition-colors duration-200 {!orgName
          ? 'opacity-50 cursor-not-allowed'
          : ''}"
        placeholder="Type to search repositories..."
        disabled={!orgName}
        aria-required="true"
      />

      {#if showResults && orgName && searchResults.length > 0}
        <div use:useDropdown={{ isOpen: showResults }} class="absolute w-full mt-1 bg-[rgba(22,27,34,0.9)] border border-[#30363d] rounded-md shadow-lg backdrop-blur-sm">
          {#if isLoading}
            <div class="p-3 text-[#8b949e]">Searching repositories...</div>
          {:else}
            {#each searchResults as repo, i (i)}
              <button
                type="button"
                class="repo-result w-full text-left p-2 hover:bg-[rgba(48,54,61,0.5)] focus:bg-[rgba(48,54,61,0.5)] focus:outline-none rounded-md text-[#c9d1d9] {repo.alreadyConfigured
                  ? 'opacity-60 cursor-not-allowed'
                  : ''}"
                onclick={() => !repo.alreadyConfigured && selectRepository(repo.name)}
                tabindex={repo.alreadyConfigured ? -1 : 0}
                disabled={repo.alreadyConfigured}
              >
                <div class="flex justify-between items-center">
                  <div class="font-medium">{repo.name}</div>
                  {#if repo.alreadyConfigured}
                    <span class="text-xs bg-[rgba(48,54,61,0.8)] px-2 py-0.5 rounded-full text-[#8b949e] border border-[#30363d]">Already configured</span>
                  {/if}
                </div>
                {#if repo.description}
                  <div class="text-sm text-[#8b949e] truncate">{repo.description}</div>
                {/if}
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  {/if}
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
    background-color: #161b22;
    color: #c9d1d9;
    text-align: center;
    padding: 5px;
    border-radius: 6px;
    border: 1px solid #30363d;
    z-index: 1;
    bottom: 125%;
    left: 50%;
    margin-left: -85px;
    opacity: 0;
    transition: opacity 0.3s;
    font-size: 0.75rem;
  }

  .tooltip:hover .tooltip-text {
    visibility: visible;
    opacity: 1;
  }

  .tooltip-text::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #30363d transparent transparent transparent;
  }
</style>
