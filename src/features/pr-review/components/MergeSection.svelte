<script lang="ts">
  import type { DetailedPullRequest } from '$integrations/github';
  import type { MergeMethod, PullRequestMergeContext } from '../services/pr-review.service';

  interface Props {
    pullRequest: DetailedPullRequest;
    mergeContext: PullRequestMergeContext | null;
    isAuthenticated: boolean;
    isMerging: boolean;
    mergeError: string | null;
    onMerge: (method: MergeMethod, bypassReason?: string, commit?: { title?: string; message?: string }) => void;
  }

  const { pullRequest, mergeContext, isAuthenticated, isMerging, mergeError, onMerge }: Props = $props();

  const inferredAllowedMethods = $derived.by(() => {
    const prAny = pullRequest as any;
    const repoAny = prAny?.base?.repo ?? prAny?.head?.repo;
    if (!repoAny) return [] as MergeMethod[];

    const methods: MergeMethod[] = [];
    if (repoAny.allow_merge_commit) methods.push('merge');
    if (repoAny.allow_squash_merge) methods.push('squash');
    if (repoAny.allow_rebase_merge) methods.push('rebase');
    return methods;
  });

  const allowedMethods = $derived.by(() => {
    const fromContext = mergeContext?.allowedMergeMethods ?? [];
    const inferred = inferredAllowedMethods;
    if (fromContext.length) return fromContext;
    if (inferred.length) return inferred;
    // Fallback: if APIs omit method flags, still let the user try.
    // GitHub will enforce allowed methods server-side.
    return ['merge', 'squash', 'rebase'] as MergeMethod[];
  });

  let selectedMethod = $state<MergeMethod>('merge');
  let forceChecked = $state(false);
  let commitTitle = $state('');
  let commitMessage = $state('');

  $effect(() => {
    // Provide a sensible default headline like GitHub's UI.
    if (!commitTitle) {
      const prTitle = (pullRequest.title ?? '').trim();
      if (prTitle) {
        commitTitle = `${prTitle} (#${pullRequest.number})`;
      }
    }
  });

  $effect(() => {
    const methods = allowedMethods;
    if (methods.length > 0 && !methods.includes(selectedMethod)) {
      selectedMethod = methods[0];
    }
    if (methods.length > 0 && selectedMethod === 'merge' && !methods.includes('merge')) {
      selectedMethod = methods[0];
    }
  });

  const prIsOpen = $derived.by(() => {
    const state = (pullRequest.state ?? '').toLowerCase();
    return state === 'open' && !pullRequest.merged && !pullRequest.draft;
  });

  function mapRestMergeableStateToStatus(mergeableState: unknown): string | null {
    if (typeof mergeableState !== 'string') return null;
    switch (mergeableState.toLowerCase()) {
      case 'clean':
        return 'CLEAN';
      case 'blocked':
        return 'BLOCKED';
      case 'behind':
        return 'BEHIND';
      case 'dirty':
        return 'DIRTY';
      case 'unstable':
        return 'UNSTABLE';
      case 'draft':
        return 'DRAFT';
      case 'unknown':
        return 'UNKNOWN';
      default:
        return 'UNKNOWN';
    }
  }

  const mergeStateStatus = $derived.by(() => {
    if (mergeContext?.mergeStateStatus) return mergeContext.mergeStateStatus;
    const prAny = pullRequest as any;
    return mapRestMergeableStateToStatus(prAny?.mergeable_state);
  });
  const reviewDecision = $derived.by(() => mergeContext?.reviewDecision ?? null);

  const viewerCanMerge = $derived.by(() => !!mergeContext?.viewerCanMerge);
  const viewerCanMergeAsAdmin = $derived.by(() => !!mergeContext?.viewerCanMergeAsAdmin);

  const canMergeNormally = $derived.by(() => {
    const status = mergeStateStatus;
    // GitHub can report UNKNOWN while mergeability is still being computed.
    // Allow attempting a merge in that state; GitHub will enforce server-side rules.
    if (status && status !== 'CLEAN' && status !== 'UNKNOWN') return false;
    // If GitHub provides a review decision, require APPROVED to satisfy required approvals/codeowner rules.
    const decision = reviewDecision;
    if (!decision) return true;
    return decision === 'APPROVED';
  });

  const canBypass = $derived.by(() => {
    const status = mergeStateStatus;
    if (!viewerCanMergeAsAdmin) return false;
    if (!status) return false;
    // Admin bypass does not help if there are merge conflicts.
    if (status === 'DIRTY') return false;
    // Draft should not be mergeable.
    if (status === 'DRAFT') return false;
    return true;
  });

  const statusText = $derived.by(() => {
    if (!prIsOpen) {
      if (pullRequest.merged) return 'Already merged';
      return 'Not mergeable (closed/draft)';
    }

    // If we couldn't detect merge methods, show a softer warning.
    // (We still allow attempting merge; GitHub enforces server-side.)
    if ((mergeContext?.allowedMergeMethods?.length ?? 0) === 0 && inferredAllowedMethods.length === 0) {
      return 'Merge method availability unknown (API did not provide flags)';
    }

    const status = mergeStateStatus;
    const decision = reviewDecision;

    if (decision && decision !== 'APPROVED') {
      if (decision === 'REVIEW_REQUIRED') return 'Approvals required';
      if (decision === 'CHANGES_REQUESTED') return 'Changes requested';
      return `Review decision: ${decision}`;
    }

    switch (status) {
      case 'CLEAN':
        return 'Ready to merge';
      case 'UNKNOWN':
        return 'Mergeability still being calculated';
      case 'BLOCKED':
        return 'Blocked by required checks/branch rules';
      case 'UNSTABLE':
        return 'Checks failing or pending';
      case 'BEHIND':
        return 'Branch is behind base';
      case 'DIRTY':
        return 'Merge conflicts';
      case 'DRAFT':
        return 'Draft pull request';
      default:
        return status ? `Merge status: ${status}` : 'Merge status unavailable';
    }
  });

  function methodLabel(method: MergeMethod) {
    switch (method) {
      case 'merge':
        return 'Merge';
      case 'squash':
        return 'Squash';
      case 'rebase':
        return 'Rebase';
    }
  }

  const canMerge = $derived.by(() => {
    if (canMergeNormally) return true;
    if (canBypass && forceChecked) return true;
    return false;
  });

  const disableReason = $derived.by(() => {
    if (!isAuthenticated) return 'Login required';
    if (!prIsOpen) return statusText;
    // If we have explicit permission signals, honor them; otherwise let GitHub enforce on submit.
    if (mergeContext && !viewerCanMerge && !viewerCanMergeAsAdmin) return 'You do not have permission to merge';
    if (!canMerge) return statusText;
    return null;
  });

  function handleMergeClick() {
    if (disableReason) return;
    const bypass = !canMergeNormally && forceChecked ? 'Force merge via admin bypass' : undefined;
    onMerge(selectedMethod, bypass, {
      title: commitTitle.trim() || undefined,
      message: commitMessage.trim() || undefined,
    });
  }
</script>

<div class="mt-4 pt-4 border-t border-[#21262d]">
  <div class="flex items-center justify-between gap-3">
    <div>
      <h4 class="text-xs font-medium text-[#8b949e] uppercase tracking-wide">Merge</h4>
      <div class="text-xs text-[#8b949e] mt-1">{statusText}</div>
    </div>
  </div>

  {#if mergeError}
    <div class="mt-3 text-xs text-[#f85149] border border-red-800/40 bg-red-900/10 rounded px-3 py-2 max-w-sm">
      {mergeError}
    </div>
  {/if}

  {#if !pullRequest.merged}
  {#if allowedMethods.length === 0}
    <div class="mt-3 text-xs text-[#8b949e] border border-[#30363d] bg-[#161b22] rounded px-3 py-2">
      Merge methods unavailable.
    </div>
  {/if}

  {#if allowedMethods.length > 1}
    <div class="mt-3 inline-flex w-full rounded-lg border border-[#30363d] overflow-hidden">
      {#each allowedMethods as method}
        <button
          type="button"
          onclick={() => (selectedMethod = method)}
          class={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${selectedMethod === method ? 'bg-[#1f6feb] text-white' : 'bg-[#161b22] text-[#c9d1d9] hover:bg-[#21262d]'}`}
          aria-pressed={selectedMethod === method}
          disabled={!isAuthenticated || isMerging}
        >
          {methodLabel(method)}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Force merge checkbox (admin bypass) -->
  {#if isAuthenticated && prIsOpen && !canMergeNormally && canBypass && allowedMethods.length > 0}
    <label class="mt-3 flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        bind:checked={forceChecked}
        disabled={isMerging}
        class="accent-[#a37100] w-4 h-4 rounded cursor-pointer"
      />
      <span class="text-xs text-[#d29922]">Force merge (bypass requirements)</span>
    </label>
  {/if}

  <!-- Merge button -->
  <div class="mt-3">
    <button
      type="button"
      onclick={handleMergeClick}
      disabled={!!disableReason || isMerging}
      title={disableReason ?? 'Merge pull request'}
      class={`w-full text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
        !canMergeNormally && forceChecked
          ? 'bg-[#a37100] hover:bg-[#bb8009]'
          : 'bg-[#2ea043] hover:bg-[#3fb950]'
      }`}
    >
      {isMerging ? 'Merging…' : `${methodLabel(selectedMethod)} pull request`}
    </button>
  </div>

  <!-- Commit message (supported for merge/squash; ignored for rebase) -->
  {#if isAuthenticated && prIsOpen && (selectedMethod === 'merge' || selectedMethod === 'squash')}
    <div class="mt-3 border border-[#30363d] rounded-lg p-3 bg-[#161b22]">
      <div class="text-xs font-medium text-[#8b949e] mb-2">Commit message</div>

      <label class="block text-xs text-[#8b949e] mb-1" for="commit-title">Title</label>
      <input
        id="commit-title"
        value={commitTitle}
        oninput={(e) => (commitTitle = (e.target as HTMLInputElement).value)}
        class="w-full bg-[#0d1117] text-[#c9d1d9] placeholder:text-[#8b949e] border border-[#30363d] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
        placeholder="Commit title"
      />

      <label class="block text-xs text-[#8b949e] mb-1 mt-2" for="commit-message">Description</label>
      <textarea
        id="commit-message"
        value={commitMessage}
        oninput={(e) => (commitMessage = (e.target as HTMLTextAreaElement).value)}
        class="w-full bg-[#0d1117] text-[#c9d1d9] placeholder:text-[#8b949e] border border-[#30363d] rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
        placeholder="Optional commit message body"
        rows="3"
      ></textarea>
    </div>
  {/if}
  {/if}


</div>
