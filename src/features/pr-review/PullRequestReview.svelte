<script lang="ts">
  import CommentsSidebar from './CommentsSidebar.svelte';
  import CommitSelector from './CommitSelector.svelte';
  import DiffViewToggle from './DiffViewToggle.svelte';
  import FileDiff from './FileDiff.svelte';
  import FileTreeSidebar from './FileTreeSidebar.svelte';
  import PRDescription from './PRDescription.svelte';
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
    if (status !== 'completed') return 'bg-yellow-100 text-yellow-800 border-yellow-200';

    switch (conclusion) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failure':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'neutral':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'skipped':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getCheckIcon(conclusion: string | null, status: string): string {
    if (status !== 'completed') return '⏳';

    switch (conclusion) {
      case 'success':
        return '✓';
      case 'failure':
        return '✗';
      case 'neutral':
        return '○';
      case 'cancelled':
        return '⚪';
      case 'skipped':
        return '⏭';
      default:
        return '?';
    }
  }

  // Get currently selected file for display
  const selectedFileObj = $derived(() => {
    if (!prReview.state.selectedFile) return null;
    return prReview.state.files.find((f) => f.filename === prReview.state.selectedFile);
  });

  // Auto-select first file if none selected and files are loaded
  $effect(() => {
    if (prReview.state.files.length > 0 && !prReview.state.selectedFile) {
      prReview.selectFile(prReview.state.files[0].filename);
    }
  });
</script>

<div class="h-screen flex flex-col">
  {#if prReview.state.loading}
    <div class="flex items-center justify-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-lg">Loading pull request...</span>
    </div>
  {:else if prReview.state.error}
    <div class="bg-red-50 border border-red-200 rounded-md p-4 m-4">
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
    <!-- Compact Header -->
    <div class="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex-shrink-0">
      <div class="flex items-start justify-between">
        <!-- Left side: Title and meta -->
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold text-gray-900 truncate">
            {prReview.state.pullRequest.title}
            <span class="text-gray-500">#{prReview.state.pullRequest.number}</span>
          </h1>

          <div class="flex items-center space-x-4 mt-2 text-sm text-gray-600">
            <div class="flex items-center">
              <img src={prReview.state.pullRequest.user.avatar_url} alt={prReview.state.pullRequest.user.login} class="w-5 h-5 rounded-full mr-2" />
              <span>{prReview.state.pullRequest.user.login}</span>
            </div>
            <span>•</span>
            <span>created {formatDate(prReview.state.pullRequest.created_at)}</span>
            <span>•</span>
            <span>updated {formatDate(prReview.state.pullRequest.updated_at)}</span>
          </div>
        </div>

        <!-- Right side: Stats and status -->
        <div class="ml-6 flex items-center space-x-6">
          <!-- Compact stats -->
          {#if prReview.fileStats()}
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
                <span>{prReview.fileStats().totalFiles}</span>
              </div>
              <div class="flex items-center text-green-600">
                <span>+{prReview.fileStats().totalAdditions}</span>
              </div>
              <div class="flex items-center text-red-600">
                <span>-{prReview.fileStats().totalDeletions}</span>
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
                <span>{prReview.state.commits.length}</span>
              </div>
            </div>
          {/if}

          <!-- Status badges -->
          <div class="flex items-center space-x-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {prReview.state.pullRequest.state}
            </span>
            {#if prReview.state.pullRequest.draft}
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"> Draft </span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Description -->
      {#if prReview.state.pullRequest.body}
        <PRDescription body={prReview.state.pullRequest.body} title={prReview.state.pullRequest.title} />
      {/if}

      <!-- Checks Section -->
      {#if prReview.state.checks.length > 0}
        <div class="mt-3 pt-3 border-t border-gray-100">
          <div class="flex items-center space-x-2 flex-wrap gap-y-2">
            <span class="text-sm font-medium text-gray-600 mr-2">Checks:</span>
            {#each prReview.state.checks as check}
              <div
                class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border {getCheckColor(check.conclusion, check.status)} cursor-help"
                title="{check.name}: {check.conclusion || check.status}{check.output?.summary ? '\n' + check.output.summary : ''}"
              >
                <span class="mr-1 text-xs">{getCheckIcon(check.conclusion, check.status)}</span>
                <span class="truncate max-w-32">{check.name.replace(/^CI\//, '').replace(/^GitHub Actions\//, '')}</span>
              </div>
            {/each}
            {#if prReview.state.checks.length > 8}
              <span class="text-xs text-gray-500">
                +{prReview.state.checks.length - 8} more
              </span>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Controls Row -->
      <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <!-- Commit selector -->
        <CommitSelector commits={prReview.state.commits} selectedCommit={prReview.state.selectedCommit} onCommitChange={prReview.selectCommit} />

        <!-- View controls -->
        <div class="flex items-center space-x-4">
          <DiffViewToggle currentMode={prReview.state.diffViewMode} onModeChange={prReview.saveDiffViewMode} />
          <div class="flex space-x-2">
            <button onclick={() => prReview.expandAllFiles()} class="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md"> Expand All </button>
            <button onclick={() => prReview.collapseAllFiles()} class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md"> Collapse All </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex flex-1 min-h-0">
      <!-- Left Sidebar: File Tree -->
      <FileTreeSidebar files={prReview.state.files} selectedFile={prReview.state.selectedFile} onFileSelect={prReview.selectFile} />

      <!-- Center: File Diff -->
      <div class="flex-1 overflow-y-auto bg-gray-50">
        {#if selectedFileObj()}
          <div class="bg-white">
            <FileDiff file={selectedFileObj()} isExpanded={true} onToggle={() => {}} reviewComments={prReview.state.reviewComments} diffViewMode={prReview.state.diffViewMode} />
          </div>
        {:else}
          <div class="flex items-center justify-center h-full text-gray-500">
            <div class="text-center">
              <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p class="text-lg">Select a file to view changes</p>
            </div>
          </div>
        {/if}
      </div>

      <!-- Right Sidebar: Comments -->
      <CommentsSidebar reviews={prReview.state.reviews} reviewComments={prReview.state.reviewComments} selectedFile={prReview.state.selectedFile} />
    </div>
  {:else}
    <div class="text-center py-12">
      <div class="text-gray-500">No pull request data available</div>
    </div>
  {/if}
</div>
