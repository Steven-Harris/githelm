<script lang="ts">
  import type { DetailedPullRequest } from '$integrations/github';

  interface Props {
    pullRequest: DetailedPullRequest;
    fileStats: {
      totalFiles: number;
      totalAdditions: number;
      totalDeletions: number;
    };
    commitCount: number;
  }

  let { pullRequest, fileStats, commitCount }: Props = $props();

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

<div class="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex-shrink-0">
  <div class="flex items-start justify-between">
    <!-- Left side: Title and meta -->
    <div class="flex-1 min-w-0">
      <h1 class="text-xl font-bold text-gray-900 truncate">
        {pullRequest.title}
        <span class="text-gray-500">#{pullRequest.number}</span>
      </h1>

      <div class="flex items-center space-x-4 mt-2 text-sm text-gray-600">
        <div class="flex items-center">
          <img src={pullRequest.user.avatar_url} alt={pullRequest.user.login} class="w-5 h-5 rounded-full mr-2" />
          <span>{pullRequest.user.login}</span>
        </div>
        <span>•</span>
        <span>created {formatDate(pullRequest.created_at)}</span>
        <span>•</span>
        <span>updated {formatDate(pullRequest.updated_at)}</span>
      </div>
    </div>

    <!-- Right side: Stats and status -->
    <div class="ml-6 flex items-center space-x-6">
      <!-- Compact stats -->
      <div class="flex items-center space-x-4 text-sm">
        <div class="flex items-center text-gray-600">
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
        <div class="flex items-center text-green-600">
          <span>+{fileStats.totalAdditions}</span>
        </div>
        <div class="flex items-center text-red-600">
          <span>-{fileStats.totalDeletions}</span>
        </div>
        <div class="flex items-center text-blue-600">
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
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {pullRequest.state}
        </span>
        {#if pullRequest.draft}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"> Draft </span>
        {/if}
      </div>
    </div>
  </div>
</div>
