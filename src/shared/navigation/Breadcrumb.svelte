<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { prNavigationList, getAdjacentPRs, type PRNavigationEntry } from '$features/pr-review/stores/pr-navigation.store';
  import { breadcrumbService, type BreadcrumbItem } from '../navigation/breadcrumb.service';

  // Generate breadcrumbs reactively based on current page
  let breadcrumbs = $derived(breadcrumbService.generateBreadcrumbs());

  function handleBreadcrumbClick(item: BreadcrumbItem) {
    breadcrumbService.navigateTo(item);
  }

  // Only show breadcrumbs if we're not on the home page
  let shouldShowBreadcrumbs = $derived(page.url.pathname !== '/');

  // PR navigation: detect if we're on a PR page and compute adjacent PRs
  const prMatch = $derived(page.url.pathname.match(/^\/pr\/([^/]+)\/([^/]+)\/(\d+)$/));
  const adjacentPRs = $derived.by(() => {
    if (!prMatch) return { prev: null, next: null };
    const [, owner, repo, number] = prMatch;
    return getAdjacentPRs($prNavigationList, owner, repo, parseInt(number));
  });
  const showPRNav = $derived(prMatch && (adjacentPRs.prev || adjacentPRs.next));

  function navigateToPR(entry: PRNavigationEntry) {
    goto(`/pr/${entry.owner}/${entry.repo}/${entry.number}`);
  }
</script>

{#if shouldShowBreadcrumbs}
  <nav class="breadcrumb-nav bg-gray-800 border-b border-gray-700 px-4 py-2" aria-label="Breadcrumb">
    <div class="flex items-center justify-between">
    <ol class="flex items-center space-x-2 text-sm">
      {#each breadcrumbs as item, index}
        <li class="flex items-center">
          {#if index > 0}
            <svg class="w-4 h-4 text-gray-500 mx-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
            </svg>
          {/if}

          {#if item.href}
            <button onclick={() => handleBreadcrumbClick(item)} class="breadcrumb-link flex items-center hover:text-blue-400 transition-colors" aria-label={`Navigate to ${item.label}`}>
              {#if item.icon}
                {#if item.iconType === 'svg'}
                  <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}></path>
                  </svg>
                {:else}
                  <span class="mr-1.5 text-base">{item.icon}</span>
                {/if}
              {/if}
              <span>{item.label}</span>
            </button>
          {:else}
            <span class="breadcrumb-current flex items-center text-gray-300 font-medium">
              {#if item.icon}
                {#if item.iconType === 'svg'}
                  <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}></path>
                  </svg>
                {:else}
                  <span class="mr-1.5 text-base">{item.icon}</span>
                {/if}
              {/if}
              <span>{item.label}</span>
            </span>
          {/if}
        </li>
      {/each}
    </ol>

    {#if showPRNav}
      <div class="flex items-center space-x-2 ml-4 flex-shrink-0">
        <button
          onclick={() => adjacentPRs.prev && navigateToPR(adjacentPRs.prev)}
          disabled={!adjacentPRs.prev}
          class="pr-nav-btn"
          title={adjacentPRs.prev ? `Previous: ${adjacentPRs.prev.title} (#${adjacentPRs.prev.number})` : 'No previous PR'}
          aria-label="Previous pull request"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Prev</span>
        </button>
        <button
          onclick={() => adjacentPRs.next && navigateToPR(adjacentPRs.next)}
          disabled={!adjacentPRs.next}
          class="pr-nav-btn"
          title={adjacentPRs.next ? `Next: ${adjacentPRs.next.title} (#${adjacentPRs.next.number})` : 'No next PR'}
          aria-label="Next pull request"
        >
          <span>Next</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    {/if}
    </div>
  </nav>
{/if}

<style>
  .breadcrumb-nav {
    background: linear-gradient(to right, #1f2937, #374151);
  }

  .breadcrumb-link {
    color: #9ca3af;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    transition: all 0.2s ease;
  }

  .breadcrumb-link:hover {
    background-color: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
  }

  .breadcrumb-link:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  }

  .breadcrumb-current {
    color: #d1d5db;
  }

  .pr-nav-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.625rem;
    border-radius: 0.375rem;
    border: 1px solid #4b5563;
    color: #d1d5db;
    font-size: 0.8125rem;
    font-weight: 500;
    transition: all 0.2s ease;
    background-color: rgba(55, 65, 81, 0.5);
  }

  .pr-nav-btn:hover:not(:disabled) {
    background-color: rgba(59, 130, 246, 0.15);
    border-color: #60a5fa;
    color: #60a5fa;
  }

  .pr-nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .pr-nav-btn:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  }
</style>
