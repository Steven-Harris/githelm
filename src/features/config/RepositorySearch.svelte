<script lang="ts">
  import { repositorySearchService, type ExistingRepo, type SearchState } from '$features/config/services/repository-search.service';
  import { useDropdown } from './directives/useDropdown';
  import { useKeyboardNavigation } from './directives/useKeyboardNavigation';

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

  let searchState = $state<SearchState>(repositorySearchService.createInitialState());
  let containerRef = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (!orgName) {
      repositorySearchService.resetSearchState((updates) => {
        Object.assign(searchState, updates);
      });
    }
  });

  async function handleInputChange(): Promise<void> {
    if (!orgName) {
      repositorySearchService.resetSearchState((updates) => {
        Object.assign(searchState, updates);
      });
      return;
    }

    searchState.searchTimeout = repositorySearchService.debouncedSearch(orgName, repoName.trim(), existingRepos, searchState.searchTimeout, (updates) => {
      Object.assign(searchState, updates);
    });
  }

  function selectRepository(repo: string): void {
    const isAlreadyConfigured = repositorySearchService.isRepositoryAlreadyConfigured(orgName, repo, existingRepos);

    if (!isAlreadyConfigured) {
      onChange(repo);
      searchState.showResults = false;
      searchState.searchResults = [];
    }
  }

  function handleResultSelection(index: number): void {
    const repo = searchState.searchResults[index];
    if (repo && !repo.alreadyConfigured) {
      selectRepository(repo.name);
    }
  }

  function closeDropdown(): void {
    searchState.showResults = false;
    const inputElement = document.getElementById('repository-input');
    if (inputElement) {
      inputElement.focus();
    }
  }
</script>

<div class="mb-4">
  <div class="flex items-center gap-2 mb-2">
    <label for="repository-input" class="field-label">
      Repository
      {#if disabled}
        <span id="repository-input" class="field-value">{repoName}</span>
      {:else}
        <span class="required" aria-hidden="true">*</span>
      {/if}
    </label>
    {#if !orgName}
      <span class="tooltip">
        <span class="tooltip-mark" aria-hidden="true">?</span>
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
          if (orgName) {
            searchState.showResults = true;
            handleInputChange();
          }
        }}
        class="w-full"
        placeholder={orgName ? 'Search repositories…' : 'Pick an organization first'}
        disabled={!orgName}
        aria-required="true"
      />

      {#if searchState.showResults && orgName && searchState.searchResults.length > 0}
        <div use:useDropdown={{ isOpen: searchState.showResults }} class="menu-surface absolute w-full mt-1.5 p-1 z-30 max-h-72 overflow-auto">
          {#if searchState.isLoading}
            <div class="p-3 text-sm text-[var(--text-faint)]">Searching…</div>
          {:else}
            {#each searchState.searchResults as repo, i (i)}
              <button type="button" class="repo-result" class:taken={repo.alreadyConfigured} onclick={() => !repo.alreadyConfigured && selectRepository(repo.name)} tabindex={repo.alreadyConfigured ? -1 : 0} disabled={repo.alreadyConfigured}>
                <div class="flex justify-between items-center gap-2">
                  <span class="repo-result-name">{repo.name}</span>
                  {#if repo.alreadyConfigured}
                    <span class="pill flex-shrink-0">Added</span>
                  {/if}
                </div>
                {#if repo.description}
                  <div class="repo-result-desc">{repo.description}</div>
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
  .field-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .required {
    color: var(--danger);
  }

  .field-value {
    margin-left: 0.375rem;
    font-family: var(--font-display);
    font-size: 0.875rem;
    letter-spacing: 0;
    text-transform: none;
    color: var(--text);
  }

  .repo-result {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 0.625rem;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--text);
    cursor: pointer;
    transition: background-color 140ms var(--ease);
  }

  .repo-result:hover:not(.taken),
  .repo-result:focus-visible:not(.taken) {
    background: rgba(47, 212, 193, 0.1);
  }

  .repo-result.taken {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .repo-result-name {
    font-weight: 500;
    font-size: 0.875rem;
  }

  .repo-result-desc {
    margin-top: 0.125rem;
    font-size: 0.75rem;
    color: var(--text-faint);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tooltip {
    position: relative;
    display: inline-flex;
  }

  .tooltip-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    border: 1px solid var(--line-strong);
    color: var(--text-faint);
    font-size: 0.625rem;
    cursor: help;
  }

  .tooltip-text {
    position: absolute;
    visibility: hidden;
    width: 170px;
    background-color: var(--panel-raised);
    color: var(--text);
    text-align: center;
    padding: 6px 8px;
    border-radius: 7px;
    border: 1px solid var(--line-strong);
    box-shadow: var(--shadow-pop);
    z-index: 40;
    bottom: 150%;
    left: 50%;
    margin-left: -85px;
    opacity: 0;
    transition: opacity 0.2s var(--ease);
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
    border-color: var(--line-strong) transparent transparent transparent;
  }
</style>
