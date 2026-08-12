<script lang="ts">
  import type { DetailedPullRequest } from '$integrations/github';
  import type { MergeMethod, PullRequestMergeContext } from '../services/pr-review.service';
  import { evaluateMergeStatus, formatApprovalSummary, hasMergeConflicts, mapRestMergeableStateToStatus } from '../utils/merge-status';

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

  const mergeStateStatus = $derived.by(() => {
    if (mergeContext?.mergeStateStatus) return mergeContext.mergeStateStatus;
    return mapRestMergeableStateToStatus((pullRequest as any)?.mergeable_state);
  });

  const viewerCanMerge = $derived.by(() => !!mergeContext?.viewerCanMerge);
  const viewerCanMergeAsAdmin = $derived.by(() => !!mergeContext?.viewerCanMergeAsAdmin);

  const mergeStatus = $derived.by(() =>
    evaluateMergeStatus({
      isOpen: (pullRequest.state ?? '').toLowerCase() === 'open',
      isMerged: !!pullRequest.merged,
      isDraft: !!pullRequest.draft,
      mergeStateStatus,
      reviewDecision: mergeContext?.reviewDecision ?? null,
      requiredReviewDecision: mergeContext?.requiredReviewDecision ?? null,
      hasConflicts: hasMergeConflicts(mergeContext, pullRequest),
      viewerCanMergeAsAdmin,
    })
  );

  const canMergeNormally = $derived.by(() => mergeStatus.canMergeNormally);
  const canBypass = $derived.by(() => mergeStatus.canBypass);
  const statusText = $derived.by(() => mergeStatus.statusText);
  const approvalText = $derived.by(() => formatApprovalSummary(mergeContext));

  const statusDotClass = $derived.by(() => {
    switch (mergeStatus.tone) {
      case 'ready':
        return 'bg-[#3fb950]';
      case 'warning':
        return 'bg-[#d29922]';
      case 'blocked':
        return 'bg-[#f85149]';
      default:
        return 'bg-[#8b949e]';
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
  {#if pullRequest.merged}
    <div class="flex items-center gap-2.5 rounded-lg bg-purple-900/20 border border-purple-800/40 px-4 py-3">
      <svg class="w-5 h-5 text-purple-400 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0 0 .005V3.25Z"/>
      </svg>
      <div>
        <span class="text-sm font-medium text-purple-300">Pull request merged</span>
        {#if pullRequest.merged_at}
          <span class="text-xs text-purple-400/70 ml-1.5">· {new Date(pullRequest.merged_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        {/if}
      </div>
    </div>
  {:else}
  <div class="flex items-start justify-between gap-3">
    <div class="min-w-0">
      <h4 class="text-xs font-medium text-[#8b949e] uppercase tracking-wide">Merge</h4>
      <div class="flex items-center gap-1.5 mt-1">
        <span class={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${statusDotClass}`} aria-hidden="true"></span>
        <span class="text-xs text-[#c9d1d9]">{statusText}</span>
      </div>
      {#if approvalText}
        <div class="text-xs text-[#8b949e] mt-1">{approvalText}</div>
      {/if}
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
  {/if}


</div>
