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
  }

  let { pullRequest, fileStats, commitCount, reviewDecision = null }: Props = $props();

  const reviewStatus = $derived.by(() => {
    if (pullRequest.merged) {
      return { label: 'Merged', color: 'bg-purple-900/30 text-purple-300 border-purple-800/50' };
    }
    if (pullRequest.state?.toLowerCase() === 'closed') {
      return { label: 'Closed', color: 'bg-red-900/30 text-red-300 border-red-800/50' };
    }
    if (reviewDecision === 'APPROVED') {
      return { label: 'Approved', color: 'bg-green-900/30 text-green-300 border-green-800/50' };
    }
    if (reviewDecision === 'CHANGES_REQUESTED') {
      return { label: 'Changes requested', color: 'bg-orange-900/30 text-orange-300 border-orange-800/50' };
    }
    if (reviewDecision === 'REVIEW_REQUIRED') {
      return { label: 'Needs review', color: 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50' };
    }
    // Default for open PRs with no explicit review decision
    return { label: 'Needs review', color: 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50' };
  });
</script>

<div class="bg-[#161b22] shadow-sm border-b border-[#30363d] px-6 py-4 flex-shrink-0">
  <div class="flex items-start justify-between">
    <!-- Left side: Title and meta -->
    <div class="flex-1 min-w-0">
      <h1 class="text-xl font-bold text-[#f0f6fc] truncate">
        {pullRequest.title}
        <a
          href={pullRequest.html_url}
          target="_blank"
          rel="noreferrer"
          class="text-[#8b949e] hover:text-[#c9d1d9] underline underline-offset-2"
          aria-label={`Open pull request #${pullRequest.number} on GitHub`}
        >
          #{pullRequest.number}
        </a>
      </h1>

      <div class="flex items-center space-x-4 mt-2 text-sm text-[#8b949e]">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border {reviewStatus.color}">
          {reviewStatus.label}
        </span>
        <span class="text-[#30363d]">•</span>
        <div class="flex items-center">
          <img src={pullRequest.user.avatar_url} alt={pullRequest.user.login} class="w-5 h-5 rounded-full mr-2" />
          <span class="text-[#c9d1d9]">{pullRequest.user.login}</span>
        </div>
        <span class="text-[#30363d]">•</span>
        <span>created {formatDateFull(pullRequest.created_at)}</span>
        <span class="text-[#30363d]">•</span>
        <span>updated {formatDateFull(pullRequest.updated_at)}</span>
      </div>
    </div>

    <!-- Right side: Stats and status -->
    <div class="ml-6 flex items-center space-x-6">
      <!-- Compact stats -->
      <div class="flex items-center space-x-4 text-sm">
        <div class="flex items-center text-[#8b949e]">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>{fileStats.totalFiles}</span>
        </div>
        <div class="flex items-center text-green-400">
          <span>+{fileStats.totalAdditions}</span>
        </div>
        <div class="flex items-center text-red-400">
          <span>-{fileStats.totalDeletions}</span>
        </div>
        <div class="flex items-center text-blue-400">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div class="flex items-center space-x-2">
        {#if pullRequest.merged}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-800/50">
            Merged
          </span>
        {:else if pullRequest.state?.toLowerCase() === 'closed'}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-300 border border-red-800/50">
            Closed
          </span>
        {:else}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-800/50">
            Open
          </span>
        {/if}
        {#if pullRequest.draft}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#30363d]/60 text-[#c9d1d9] border border-[#30363d]"> Draft </span>
        {/if}
      </div>
    </div>
  </div>
</div>
