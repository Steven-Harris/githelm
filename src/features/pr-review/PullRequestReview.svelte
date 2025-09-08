<script lang="ts">
  import CommentsSidebar from './CommentsSidebar.svelte';
  import CommitSelector from './CommitSelector.svelte';
  import DiffViewToggle from './DiffViewToggle.svelte';
  import FileDiff from './FileDiff.svelte';
  import FileTreeSidebar from './FileTreeSidebar.svelte';
  import PRDescription from './PRDescription.svelte';
  import { submitPullRequestComment, submitPullRequestReview, canReviewPullRequest, type ReviewSubmission } from './services/review-api.service';
  import { isAuthenticated } from '$shared/auth/auth.state';
  import { createPRReviewState } from './stores/pr-review.store.svelte';

  interface Props {
    owner: string;
    repo: string;
    prNumber: number;
  }

  const { owner, repo, prNumber }: Props = $props();

  // Create the reactive state
  const prReview = createPRReviewState();

  // Refs for scroll synchronization
  let mainContentElement = $state<HTMLDivElement | undefined>(undefined);
  let isScrollingFromNavigation = $state(false);
  let scrollTimeout: NodeJS.Timeout | null = null;
  let isSubmittingReview = $state(false);

  // Load data when component mounts or params change
  $effect(() => {
    if (owner && repo && prNumber) {
      prReview.loadPullRequest(owner, repo, prNumber);
    }
  });

  // Handle intersection observer for automatic file selection during scroll
  $effect(() => {
    if (!mainContentElement) return;

    // Wait for files to be rendered in the DOM
    const setupObserver = () => {
      const fileSections = mainContentElement.querySelectorAll('[data-filename]');
      if (fileSections.length === 0) {
        // Files not rendered yet, try again after a short delay
        setTimeout(setupObserver, 100);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (isScrollingFromNavigation) {
            console.log('Skipping intersection update - scrolling from navigation');
            return;
          }

          // Filter to only entries that are intersecting
          const intersectingEntries = entries.filter((entry) => entry.isIntersecting);
          if (intersectingEntries.length === 0) return;

          // Find the entry with the highest intersection ratio
          let mostVisibleEntry = intersectingEntries[0];
          let maxIntersectionRatio = 0;

          for (const entry of intersectingEntries) {
            if (entry.intersectionRatio > maxIntersectionRatio) {
              maxIntersectionRatio = entry.intersectionRatio;
              mostVisibleEntry = entry;
            }
          }

          const filename = mostVisibleEntry.target.getAttribute('data-filename');
          if (filename && filename !== prReview.state.selectedFile) {
            console.log('Auto-selecting file:', filename, 'with ratio:', maxIntersectionRatio);
            prReview.selectFile(filename);
          }
        },
        {
          root: mainContentElement,
          rootMargin: '-10% 0px -80% 0px', // More permissive top margin
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1], // More granular thresholds
        }
      );

      // Observe all file sections
      fileSections.forEach((section) => {
        observer.observe(section);
      });

      return observer;
    };

    const observer = setupObserver();

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  });

  // Auto-select first file when files are loaded
  $effect(() => {
    if (prReview.state.files.length > 0 && !prReview.state.selectedFile) {
      prReview.selectFile(prReview.state.files[0].filename);
    }
  });

  // Function to scroll to a specific file and line
  function scrollToFileAndLine(filename: string, lineNumber: number) {
    if (!mainContentElement) return;

    isScrollingFromNavigation = true;

    // First scroll to the file
    const fileElement = mainContentElement.querySelector(`[data-filename="${filename}"]`);

    if (fileElement) {
      // Expand the file if it's collapsed
      if (!prReview.state.expandedFiles.has(filename)) {
        prReview.toggleFileExpanded(filename);
        // Wait a moment for the file to expand
        setTimeout(() => {
          scrollToSpecificLine(filename, lineNumber);
        }, 300);
      } else {
        scrollToSpecificLine(filename, lineNumber);
      }
    }

    // Reset the navigation flag
    setTimeout(() => {
      isScrollingFromNavigation = false;
    }, 1000);
  }

  // Function to scroll to a specific line within a file
  function scrollToSpecificLine(filename: string, lineNumber: number) {
    if (!mainContentElement) return;

    // Look for the line number in the file's diff table using data attributes
    const fileElement = mainContentElement.querySelector(`[data-filename="${filename}"]`);
    if (!fileElement) return;

    // Look for a row with the matching line number in either old or new line data attributes
    const targetRow = fileElement.querySelector(`tr[data-line-new="${lineNumber}"], tr[data-line-old="${lineNumber}"]`);

    if (targetRow) {
      // Scroll to the line with some offset for better visibility
      targetRow.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });

      // Add a highlight effect
      targetRow.classList.add('bg-yellow-200', 'ring-2', 'ring-yellow-400', 'transition-all', 'duration-300');
      setTimeout(() => {
        targetRow.classList.remove('bg-yellow-200', 'ring-2', 'ring-yellow-400');
        // Keep transition classes for smooth removal
        setTimeout(() => {
          targetRow.classList.remove('transition-all', 'duration-300');
        }, 300);
      }, 2000);
    } else {
      // Fallback: just scroll to the file if specific line not found
      fileElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }
  }

  // Handle comment click from sidebar
  function handleCommentClick(filename: string, lineNumber: number) {
    prReview.selectFile(filename);
    scrollToFileAndLine(filename, lineNumber);
  }

  // Handle PR review submissions
  async function handleApproveReview(comment?: string) {
    if (!prReview.state.pullRequest) return;

    isSubmittingReview = true;
    try {
      console.log('Approving PR:', { owner, repo, prNumber, comment });

      const review: ReviewSubmission = {
        event: 'APPROVE',
        body: comment || '',
      };

      const newReview = await submitPullRequestReview(owner, repo, prNumber, review);
      
      // Add the new review to the current state instead of full reload
      prReview.state.reviews = [...prReview.state.reviews, newReview];
      
    } catch (error) {
      console.error('Failed to approve PR:', error);
      // TODO: Show error notification to user
    } finally {
      isSubmittingReview = false;
    }
  }

  async function handleRequestChanges(reason: string) {
    if (!prReview.state.pullRequest) return;

    isSubmittingReview = true;
    try {
      console.log('Requesting changes for PR:', { owner, repo, prNumber, reason });

      const review: ReviewSubmission = {
        event: 'REQUEST_CHANGES',
        body: reason,
      };

      const newReview = await submitPullRequestReview(owner, repo, prNumber, review);
      
      // Add the new review to the current state instead of full reload
      prReview.state.reviews = [...prReview.state.reviews, newReview];
      
    } catch (error) {
      console.error('Failed to request changes:', error);
      // TODO: Show error notification to user
    } finally {
      isSubmittingReview = false;
    }
  }

  async function handleSubmitComment(comment: string) {
    if (!prReview.state.pullRequest) return;

    isSubmittingReview = true;
    try {
      console.log('Submitting comment for PR:', { owner, repo, prNumber, comment });

      const newComment = await submitPullRequestComment(owner, repo, prNumber, comment);
      
      // Add the new comment as a review to the current state instead of full reload
      const commentReview = {
        id: newComment.id,
        user: newComment.user,
        body: newComment.body,
        state: 'COMMENTED' as const,
        submitted_at: newComment.created_at,
        commit_id: prReview.state.pullRequest.head.sha,
      };
      
      prReview.state.reviews = [...prReview.state.reviews, commentReview];
      
    } catch (error) {
      console.error('Failed to submit comment:', error);
      // TODO: Show error notification to user
    } finally {
      isSubmittingReview = false;
    }
  }

  // Function to scroll to a specific file (for file tree navigation)
  function scrollToFile(filename: string) {
    if (!mainContentElement) return;

    isScrollingFromNavigation = true;
    const fileElement = mainContentElement.querySelector(`[data-filename="${filename}"]`);

    if (fileElement) {
      fileElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });

      // Reset the flag after scrolling completes
      setTimeout(() => {
        isScrollingFromNavigation = false;
      }, 1000);
    }
  }

  // Enhanced file select function that includes scrolling
  function handleFileSelect(filename: string) {
    prReview.selectFile(filename);
    scrollToFile(filename);
  }

  // Fallback scroll detection in case intersection observer isn't working
  function handleScroll() {
    if (isScrollingFromNavigation || !mainContentElement) return;

    const fileSections = mainContentElement.querySelectorAll('[data-filename]');
    const scrollTop = mainContentElement.scrollTop;
    const containerHeight = mainContentElement.clientHeight;
    const viewportCenter = scrollTop + containerHeight / 3; // Check top third of viewport

    let currentFile: string | null = null;
    let minDistance = Infinity;

    fileSections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const containerRect = mainContentElement.getBoundingClientRect();
      const sectionTop = rect.top - containerRect.top + scrollTop;
      const sectionHeight = rect.height;
      const sectionCenter = sectionTop + sectionHeight / 2;

      const distance = Math.abs(viewportCenter - sectionTop);

      if (distance < minDistance && sectionTop <= viewportCenter && sectionTop + sectionHeight >= viewportCenter - containerHeight / 3) {
        minDistance = distance;
        currentFile = section.getAttribute('data-filename');
      }
    });

    if (currentFile && currentFile !== prReview.state.selectedFile) {
      console.log('Scroll-based selection:', currentFile);
      prReview.selectFile(currentFile);
    }
  }

  // Throttled scroll handler
  function handleScrollThrottled() {
    if (scrollTimeout) return;

    scrollTimeout = setTimeout(() => {
      handleScroll();
      scrollTimeout = null;
    }, 100); // Throttle to every 100ms
  }

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
      <FileTreeSidebar files={prReview.state.files} selectedFile={prReview.state.selectedFile} onFileSelect={handleFileSelect} />

      <!-- Center: All File Diffs -->
      <div bind:this={mainContentElement} class="flex-1 overflow-y-auto bg-gray-50" onscroll={handleScrollThrottled}>
        {#if prReview.state.files.length > 0}
          <div class="space-y-1">
            {#each prReview.state.files as file (file.filename)}
              <div data-filename={file.filename} class="bg-white border-b border-gray-200 last:border-b-0 min-h-16" id="file-{file.filename.replace(/[^a-zA-Z0-9]/g, '-')}">
                <FileDiff
                  {file}
                  isExpanded={prReview.state.expandedFiles.has(file.filename)}
                  onToggle={() => prReview.toggleFileExpanded(file.filename)}
                  reviewComments={prReview.state.reviewComments}
                  diffViewMode={prReview.state.diffViewMode}
                  onLineClick={prReview.selectLine}
                  isLineSelected={prReview.isLineSelected}
                />
              </div>
            {/each}
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
              <p class="text-lg">No files to display</p>
            </div>
          </div>
        {/if}
      </div>

      <!-- Right Sidebar: Comments -->
      <CommentsSidebar
        reviews={prReview.state.reviews}
        reviewComments={prReview.state.reviewComments}
        selectedFile={prReview.state.selectedFile}
        onCommentClick={handleCommentClick}
        selectedLines={prReview.state.selectedLines}
        pendingComments={prReview.state.pendingComments}
        activeCommentId={prReview.state.activeCommentId}
        onStartComment={prReview.startCommentOnSelectedLines}
        onUpdateComment={prReview.updatePendingComment}
        onSubmitComment={prReview.submitPendingComment}
        onCancelComment={prReview.cancelPendingComment}
        onApproveReview={handleApproveReview}
        onRequestChanges={handleRequestChanges}
        onSubmitGeneralComment={handleSubmitComment}
        canReview={prReview.state.pullRequest ? canReviewPullRequest(prReview.state.pullRequest, prReview.state.currentUser) : false}
        isAuthenticated={$isAuthenticated}
      />
    </div>
  {:else}
    <div class="text-center py-12">
      <div class="text-gray-500">No pull request data available</div>
    </div>
  {/if}
</div>
