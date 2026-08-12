<script lang="ts">
  import type { DetailedPullRequest } from '$integrations/github';
  import { formatDateFull } from '../utils/format';

  interface Props {
    pullRequest: DetailedPullRequest;
    fileStats: {
      totalFiles: number;
      totalAdditions: number;
      totalDeletions: number;
    };
    commitCount: number;
    reviewDecision?: string | null;
    approvalCount?: number;
    changesRequestedCount?: number;
  }

  let { pullRequest, fileStats, commitCount, reviewDecision = null, approvalCount = 0, changesRequestedCount = 0 }: Props = $props();

  const reviewStatus = $derived.by(() => {
    if (pullRequest.merged) {
      return { label: 'Merged', color: 'bg-[rgba(169,139,255,0.30)] text-[#c4b0ff] border-[rgba(169,139,255,0.50)]' };
    }
    if (pullRequest.state?.toLowerCase() === 'closed') {
      return { label: 'Closed', color: 'bg-[rgba(255,107,98,0.30)] text-[#ffb3ae] border-[rgba(255,107,98,0.50)]' };
    }
    if (reviewDecision === 'CHANGES_REQUESTED') {
      const suffix = changesRequestedCount > 1 ? ` (${changesRequestedCount})` : '';
      return { label: `Changes requested${suffix}`, color: 'bg-[rgba(255,107,98,0.22)] text-[#ffb3ae] border-[rgba(255,107,98,0.45)]' };
    }
    if (reviewDecision === 'APPROVED') {
      const suffix = approvalCount > 1 ? ` (${approvalCount})` : '';
      return { label: `Approved${suffix}`, color: 'bg-[rgba(63,211,130,0.30)] text-[#8fe8b8] border-[rgba(63,211,130,0.50)]' };
    }
    if (reviewDecision === 'REVIEW_REQUIRED') {
      return { label: 'Review required', color: 'bg-[rgba(242,181,68,0.30)] text-[#f5d79b] border-[rgba(242,181,68,0.50)]' };
    }
    // Default for open PRs with no explicit review decision
    return { label: 'Needs review', color: 'bg-[rgba(242,181,68,0.30)] text-[#f5d79b] border-[rgba(242,181,68,0.50)]' };
  });
</script>

<div class="pr-header">
  <div class="flex items-start justify-between gap-6">
    <!-- Left side: Title and meta -->
    <div class="flex-1 min-w-0">
      <h1 class="pr-heading truncate">
        {pullRequest.title}
        <a href={pullRequest.html_url} target="_blank" rel="noreferrer" class="pr-number" aria-label={`Open pull request #${pullRequest.number} on GitHub`}>
          #{pullRequest.number}
        </a>
      </h1>

      <div class="flex items-center flex-wrap gap-x-3 gap-y-1.5 mt-2.5 text-sm text-[var(--text-faint)]">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border {reviewStatus.color}">
          {reviewStatus.label}
        </span>
        <div class="flex items-center gap-1.5">
          <img src={pullRequest.user.avatar_url} alt="" class="w-5 h-5 rounded-full" />
          <span class="text-[var(--text-dim)]">{pullRequest.user.login}</span>
        </div>
        <span aria-hidden="true">·</span>
        <span>opened {formatDateFull(pullRequest.created_at)}</span>
        <span aria-hidden="true">·</span>
        <span>updated {formatDateFull(pullRequest.updated_at)}</span>
      </div>
    </div>

    <!-- Right side: Stats and status -->
    <div class="flex items-center gap-5 flex-shrink-0">
      <div class="flex items-center gap-3.5 text-sm tabular-nums">
        <div class="flex items-center text-[var(--text-faint)]">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>{fileStats.totalFiles}</span>
        </div>
        <span class="text-[#3fd382]">+{fileStats.totalAdditions}</span>
        <span class="text-[#ff6b62]">-{fileStats.totalDeletions}</span>
        <div class="flex items-center text-[var(--text-faint)]">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <span>{commitCount}</span>
        </div>
      </div>

      <!-- Status badges -->
      <div class="flex items-center gap-2">
        {#if pullRequest.merged}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[rgba(169,139,255,0.30)] text-[#c4b0ff] border border-[rgba(169,139,255,0.50)]"> Merged </span>
        {:else if pullRequest.state?.toLowerCase() === 'closed'}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[rgba(255,107,98,0.30)] text-[#ffb3ae] border border-[rgba(255,107,98,0.50)]"> Closed </span>
        {:else}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[rgba(63,211,130,0.30)] text-[#8fe8b8] border border-[rgba(63,211,130,0.50)]"> Open </span>
        {/if}
        {#if pullRequest.draft}
          <span class="pill">Draft</span>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .pr-header {
    flex-shrink: 0;
    padding: 1rem 1.5rem;
    background: rgba(18, 24, 38, 0.85);
    border-bottom: 1px solid var(--line);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .pr-heading {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
  }

  .pr-number {
    color: var(--text-faint);
    font-weight: 400;
    transition: color 150ms var(--ease);
  }

  .pr-number:hover {
    color: var(--beacon-bright);
  }

  @media (max-width: 900px) {
    .pr-header {
      padding: 0.875rem 1rem;
    }
  }
</style>
