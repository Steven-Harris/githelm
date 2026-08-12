<script lang="ts">
  import { repositoryCollapseStore } from '$shared/stores/repository-collapse.store';
  import CountBadge from '$shared/ui/CountBadge.svelte';
  import Reviews from './Reviews.svelte';

  let { org, repo, isLoaded, hasPRs, pullRequests = [], filterHint = '' } = $props();

  const repoKey = $derived(`${org}/${repo}`);

  function toggleCollapse() {
    repositoryCollapseStore.toggle(repoKey);
  }

  const isCollapsed = $derived(repositoryCollapseStore.isCollapsed(repoKey, $repositoryCollapseStore));
</script>

<div class="hero-card">
  <div class="repo-head">
    <button onclick={toggleCollapse} class="disclosure" title={isCollapsed ? 'Expand repository' : 'Collapse repository'} aria-label={isCollapsed ? 'Expand repository' : 'Collapse repository'} aria-pressed={!isCollapsed}>
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="chevron" class:collapsed={isCollapsed} aria-hidden="true">
        <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
      </svg>
    </button>
    <h3 class="repo-name">
      <a href={`https://github.com/${org}/${repo}/pulls`} target="_blank" rel="noopener" class="link" title={`${org}/${repo}`}>
        <span class="repo-org">{org}/</span>{repo}
      </a>
    </h3>
    <div class="ml-auto flex items-center gap-3">
      {#if isLoaded}
        <CountBadge {repoKey} type="pullRequests" count={pullRequests.length} iconType="pullRequest" label="PR" />
      {:else}
        <span class="pill"><span class="status-dot beacon-live" style="color: var(--beacon)"></span>Loading</span>
      {/if}
    </div>
  </div>

  {#if !isCollapsed}
    {#if !isLoaded}
      <div class="px-4 py-5 text-center text-sm text-[var(--text-faint)]">
        Checking for {filterHint || 'pull requests'}…
      </div>
    {:else if pullRequests.length > 0}
      <ul class="row-list">
        {#each pullRequests as pr, index (index)}
          <li class="pr-row">
            <div class="flex justify-between items-start gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-start gap-2.5">
                  {#if pr.user?.avatar_url}
                    <img src={pr.user.avatar_url} class="avatar mt-0.5" alt="" />
                  {:else}
                    <div class="avatar mt-0.5 flex items-center justify-center">
                      <svg class="w-3.5 h-3.5 text-[var(--text-faint)]" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                        <path
                          d="M8 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"
                        />
                      </svg>
                    </div>
                  {/if}
                  <div class="flex flex-col min-w-0 flex-1">
                    <a href={`/pr/${org}/${repo}/${pr.number}`} data-sveltekit-preload-data class="pr-title">
                      {pr.title}
                    </a>
                    <div class="pr-meta">
                      <span>#{pr.number}</span>
                      <span aria-hidden="true">·</span>
                      <span>{pr.createdAt} by {pr.user?.login || 'unknown'}</span>
                      {#if pr.isDraft}
                        <span class="pill" style="padding: 0 0.4375rem">Draft</span>
                      {/if}
                      <a href={pr.html_url} target="_blank" rel="noopener" class="pr-meta-link">GitHub ↗</a>
                    </div>
                  </div>
                </div>
                {#if pr.labels?.length > 0}
                  <div class="mt-2 ml-8 flex flex-wrap gap-1.5">
                    {#each pr.labels as label, index (index)}
                      <span class="label-chip" style="--label: #{label.color}">
                        {label.name}
                      </span>
                    {/each}
                  </div>
                {/if}
              </div>

              <Reviews reviews={pr.reviews || []} />
            </div>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="px-4 py-5 text-center text-sm text-[var(--text-faint)]">No open pull requests</div>
    {/if}
  {/if}
</div>

<style>
  .pr-row {
    padding: 0.875rem;
    transition: background-color 160ms var(--ease);
  }

  .pr-row:hover {
    background: rgba(148, 168, 205, 0.045);
  }

  .pr-title {
    color: var(--text);
    font-size: 0.9375rem;
    font-weight: 500;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color 150ms var(--ease);
  }

  .pr-title:hover {
    color: var(--beacon-bright);
  }

  .pr-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: var(--text-faint);
  }

  .pr-meta-link {
    color: var(--text-faint);
    transition: color 150ms var(--ease);
  }

  .pr-meta-link:hover {
    color: var(--link);
  }

  .label-chip {
    padding: 0.0625rem 0.5rem;
    font-size: 0.6875rem;
    border-radius: 999px;
    color: color-mix(in srgb, var(--label) 70%, white);
    background: color-mix(in srgb, var(--label) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--label) 32%, transparent);
  }
</style>
