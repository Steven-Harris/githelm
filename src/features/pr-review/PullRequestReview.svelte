<script lang="ts">
  import FileDiff from './FileDiff.svelte';
  import { createPRReviewState } from './stores/pr-review.store.svelte';

  interface Props {
    owner: string;
    repo: string;
    prNumber: number;
  }

  const { owner, repo, prNumber }: Props = $props();

  // Create the reactive state
  const prReview = createPRReviewState();

  // Load data when component mounts or params change
  $effect(() => {
    if (owner && repo && prNumber) {
      prReview.loadPullRequest(owner, repo, prNumber);
    }
  });

  // Helper function to format dates
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Helper function to get status badge color
  function getStatusColor(state: string): string {
    switch (state.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'changes_requested':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'commented':
        return 'bg-blue-100 text-blue-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Helper function to get check status color
  function getCheckColor(conclusion: string | null, status: string): string {
    if (status !== 'completed') return 'bg-yellow-100 text-yellow-800';

    switch (conclusion) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failure':
        return 'bg-red-100 text-red-800';
      case 'neutral':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'skipped':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {#if prReview.state.loading}
    <div class="flex items-center justify-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-lg">Loading pull request...</span>
    </div>
  {:else if prReview.state.error}
    <div class="bg-red-50 border border-red-200 rounded-md p-4">
      <div class="flex">
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Error loading pull request</h3>
          <div class="mt-2 text-sm text-red-700">
            {prReview.state.error}
          </div>
          <div class="mt-4">
            <button onclick={() => prReview.loadPullRequest(owner, repo, prNumber)} class="bg-red-100 px-3 py-2 text-sm font-medium text-red-800 rounded-md hover:bg-red-200"> Try Again </button>
          </div>
        </div>
      </div>
    </div>
  {:else if prReview.state.pullRequest}
    <!-- Header -->
    <div class="bg-white shadow rounded-lg mb-6">
      <div class="px-6 py-4">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h1 class="text-2xl font-bold text-gray-900 mb-2">
              {prReview.state.pullRequest.title}
              <span class="text-gray-500">#{prReview.state.pullRequest.number}</span>
            </h1>

            <div class="flex items-center space-x-4 text-sm text-gray-600">
              <div class="flex items-center">
                <img src={prReview.state.pullRequest.user.avatar_url} alt={prReview.state.pullRequest.user.login} class="w-6 h-6 rounded-full mr-2" />
                <span>{prReview.state.pullRequest.user.login}</span>
              </div>
              <span>•</span>
              <span>created {formatDate(prReview.state.pullRequest.created_at)}</span>
              <span>•</span>
              <span>updated {formatDate(prReview.state.pullRequest.updated_at)}</span>
            </div>

            {#if prReview.state.pullRequest.body}
              <div class="mt-4 prose prose-sm max-w-none text-gray-700">
                {prReview.state.pullRequest.body}
              </div>
            {/if}
          </div>

          <div class="ml-6 flex flex-col space-y-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {prReview.state.pullRequest.state}
            </span>
            {#if prReview.state.pullRequest.draft}
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"> Draft </span>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {#if prReview.fileStats()}
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Files Changed</dt>
                  <dd class="text-lg font-medium text-gray-900">{prReview.fileStats().totalFiles}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if prReview.fileStats()}
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Additions</dt>
                  <dd class="text-lg font-medium text-green-600">+{prReview.fileStats().totalAdditions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if prReview.fileStats()}
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Deletions</dt>
                  <dd class="text-lg font-medium text-red-600">-{prReview.fileStats().totalDeletions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if prReview.state.commits.length > 0}
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Commits</dt>
                  <dd class="text-lg font-medium text-gray-900">{prReview.state.commits.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Tabs -->
    <div class="bg-white shadow rounded-lg">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            onclick={() => prReview.setActiveTab('overview')}
            class="py-4 px-1 border-b-2 font-medium text-sm {prReview.state.activeTab === 'overview'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          >
            Overview
          </button>
          <button
            onclick={() => prReview.setActiveTab('files')}
            class="py-4 px-1 border-b-2 font-medium text-sm {prReview.state.activeTab === 'files'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          >
            Files ({prReview.state.files.length})
          </button>
          <button
            onclick={() => prReview.setActiveTab('commits')}
            class="py-4 px-1 border-b-2 font-medium text-sm {prReview.state.activeTab === 'commits'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          >
            Commits ({prReview.state.commits.length})
          </button>
          <button
            onclick={() => prReview.setActiveTab('checks')}
            class="py-4 px-1 border-b-2 font-medium text-sm {prReview.state.activeTab === 'checks'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          >
            Checks ({prReview.state.checks.length})
          </button>
        </nav>
      </div>

      <div class="p-6">
        {#if prReview.state.activeTab === 'overview'}
          <!-- Reviews Section -->
          {#if prReview.state.reviews.length > 0}
            <div class="mb-8">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Reviews</h3>
              <div class="space-y-4">
                {#each prReview.state.reviews as review}
                  <div class="border border-gray-200 rounded-lg p-4">
                    <div class="flex items-start justify-between">
                      <div class="flex items-center">
                        <img src={review.user.avatar_url} alt={review.user.login} class="w-8 h-8 rounded-full mr-3" />
                        <div>
                          <div class="font-medium text-gray-900">{review.user.login}</div>
                          <div class="text-sm text-gray-500">{formatDate(review.submitted_at)}</div>
                        </div>
                      </div>
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(review.state)}">
                        {review.state.replace('_', ' ')}
                      </span>
                    </div>
                    {#if review.body}
                      <div class="mt-3 text-gray-700">{review.body}</div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {:else if prReview.state.activeTab === 'files'}
          <!-- Files Section with Diff Viewer -->
          <div class="space-y-4">
            <!-- Controls -->
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-medium text-gray-900">Changed Files</h3>
              <div class="flex space-x-2">
                <button onclick={() => prReview.expandAllFiles()} class="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md"> Expand All </button>
                <button onclick={() => prReview.collapseAllFiles()} class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md"> Collapse All </button>
              </div>
            </div>

            <!-- File diffs -->
            {#each prReview.state.files as file}
              <FileDiff {file} isExpanded={prReview.state.expandedFiles?.has(file.filename) ?? false} onToggle={prReview.toggleFileExpanded} reviewComments={prReview.state.reviewComments} />
            {/each}
          </div>
        {:else if prReview.state.activeTab === 'commits'}
          <!-- Commits Section -->
          <div class="space-y-4">
            {#each prReview.state.commits as commit}
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="font-medium text-gray-900 mb-1">{commit.commit.message.split('\n')[0]}</div>
                    <div class="flex items-center text-sm text-gray-500">
                      {#if commit.author}
                        <img src={commit.author.avatar_url} alt={commit.author.login} class="w-5 h-5 rounded-full mr-2" />
                        <span>{commit.author.login}</span>
                      {:else}
                        <span>{commit.commit.author.name}</span>
                      {/if}
                      <span class="mx-2">•</span>
                      <span>{formatDate(commit.commit.author.date)}</span>
                    </div>
                  </div>
                  <code class="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{commit.sha.substring(0, 7)}</code>
                </div>
              </div>
            {/each}
          </div>
        {:else if prReview.state.activeTab === 'checks'}
          <!-- Checks Section -->
          <div class="space-y-4">
            {#each prReview.state.checks as check}
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getCheckColor(check.conclusion, check.status)}">
                      {check.conclusion || check.status}
                    </span>
                    <span class="ml-3 font-medium">{check.name}</span>
                  </div>
                  <div class="text-sm text-gray-500">
                    {formatDate(check.started_at)}
                  </div>
                </div>
                {#if check.output.summary}
                  <div class="mt-2 text-sm text-gray-600">{check.output.summary}</div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="text-center py-12">
      <div class="text-gray-500">No pull request data available</div>
    </div>
  {/if}
</div>
