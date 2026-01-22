<script lang="ts">
  import type { DetailedPullRequest } from '$integrations/github';
  import type { MergeMethod, PullRequestMergeContext } from '../services/pr-review.service';

  interface Props {
    pullRequest: DetailedPullRequest;
    mergeContext: PullRequestMergeContext | null;
    isAuthenticated: boolean;
    isMerging: boolean;
    mergeError: string | null;
    onMerge: (method: MergeMethod, bypassReason?: string) => void;
  }

  const { pullRequest, mergeContext, isAuthenticated, isMerging, mergeError, onMerge }: Props = $props();

  const inferredAllowedMethods = $derived(() => {
    const prAny = pullRequest as any;
    const repoAny = prAny?.base?.repo ?? prAny?.head?.repo;
    if (!repoAny) return [] as MergeMethod[];

    const methods: MergeMethod[] = [];
    if (repoAny.allow_merge_commit) methods.push('merge');
    if (repoAny.allow_squash_merge) methods.push('squash');
    if (repoAny.allow_rebase_merge) methods.push('rebase');
    return methods;
  });

  const allowedMethods = $derived(() => {
    const fromContext = mergeContext?.allowedMergeMethods ?? [];
    return fromContext.length ? fromContext : inferredAllowedMethods();
  });

  let selectedMethod = $state<MergeMethod>('merge');
  let bypassReason = $state('');

  $effect(() => {
    const methods = allowedMethods();
    if (methods.length > 0 && !methods.includes(selectedMethod)) {
      selectedMethod = methods[0];
    }
    if (methods.length > 0 && selectedMethod === 'merge' && !methods.includes('merge')) {
      selectedMethod = methods[0];
    }
  });

  const prIsOpen = $derived(() => {
    const state = (pullRequest.state ?? '').toLowerCase();
    return state === 'open' && !pullRequest.merged && !pullRequest.draft;
  });

  const mergeStateStatus = $derived(() => mergeContext?.mergeStateStatus ?? null);
  const reviewDecision = $derived(() => mergeContext?.reviewDecision ?? null);

  const viewerCanMerge = $derived(() => !!mergeContext?.viewerCanMerge);
  const viewerCanMergeAsAdmin = $derived(() => !!mergeContext?.viewerCanMergeAsAdmin);

  const canMergeNormally = $derived(() => {
    const status = mergeStateStatus();
    // GitHub can report UNKNOWN while mergeability is still being computed.
    // Allow attempting a merge in that state; GitHub will enforce server-side rules.
    if (status !== 'CLEAN' && status !== 'UNKNOWN') return false;
    // If GitHub provides a review decision, require APPROVED to satisfy required approvals/codeowner rules.
    const decision = reviewDecision();
    if (!decision) return true;
    return decision === 'APPROVED';
  });

  const canBypass = $derived(() => {
    const status = mergeStateStatus();
    if (!viewerCanMergeAsAdmin()) return false;
    if (!status) return false;
    // Admin bypass does not help if there are merge conflicts.
    if (status === 'DIRTY') return false;
    // Draft should not be mergeable.
    if (status === 'DRAFT') return false;
    return true;
  });

  const statusText = $derived(() => {
    if (!prIsOpen()) {
      if (pullRequest.merged) return 'Already merged';
      return 'Not mergeable (closed/draft)';
    }

    if (!mergeContext) {
      return 'Merge info unavailable';
    }

    const status = mergeStateStatus();
    const decision = reviewDecision();

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

  const disableReason = $derived(() => {
    if (!isAuthenticated) return 'Login required';
    if (!prIsOpen()) return statusText();
    if (!mergeContext) return 'Merge info unavailable';
    if (allowedMethods().length === 0) return 'Merge method info unavailable';
    if (!viewerCanMerge() && !viewerCanMergeAsAdmin()) return 'You do not have permission to merge';
    if (!canMergeNormally() && !canBypass()) return statusText();
    return null;
  });

  function handleMergeClick() {
    if (disableReason()) return;
    onMerge(selectedMethod, undefined);
  }

  function handleBypassMergeClick() {
    if (disableReason()) return;
    const reason = bypassReason.trim();
    if (!reason) return;
    onMerge(selectedMethod, reason);
  }
</script>

<div class="p-4 bg-[#0d1117]">
  <div class="flex items-center justify-between gap-3">
    <div>
      <h4 class="text-xs font-medium text-[#8b949e] uppercase tracking-wide">Merge</h4>
      <div class="text-xs text-[#8b949e] mt-1">{statusText()}</div>
    </div>
  </div>

  {#if mergeError}
    <div class="mt-3 text-xs text-[#f85149] border border-red-800/40 bg-red-900/10 rounded px-3 py-2">
      {mergeError}
    </div>
  {/if}

  {#if allowedMethods().length > 1}
    <div class="mt-3 inline-flex w-full rounded-lg border border-[#30363d] overflow-hidden">
      {#each allowedMethods() as method}
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

  <!-- Normal merge (all requirements satisfied) -->
  <div class="mt-3">
    <button
      type="button"
      onclick={handleMergeClick}
      disabled={!!disableReason() || isMerging || !canMergeNormally()}
      title={disableReason() ?? (canMergeNormally() ? 'Merge pull request' : statusText())}
      class="w-full bg-[#2ea043] text-white px-3 py-2 rounded text-sm font-medium hover:bg-[#3fb950] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isMerging ? 'Merging…' : `${methodLabel(selectedMethod)} pull request`}
    </button>
  </div>

  <!-- Bypass flow (admin) -->
  {#if isAuthenticated && prIsOpen() && !canMergeNormally() && canBypass() && allowedMethods().length > 0}
    <div class="mt-3 border border-[#30363d] rounded-lg p-3 bg-[#161b22]">
      <label class="block text-xs font-medium text-[#8b949e] mb-2" for="bypass-reason">
        Bypass reason (required)
      </label>
      <textarea
        id="bypass-reason"
        value={bypassReason}
        oninput={(e) => (bypassReason = (e.target as HTMLTextAreaElement).value)}
        placeholder="Why are you bypassing required checks/reviews?"
        class="w-full bg-[#0d1117] text-[#c9d1d9] placeholder:text-[#8b949e] border border-[#30363d] rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
        rows="3"
      ></textarea>

      <button
        type="button"
        onclick={handleBypassMergeClick}
        disabled={!!disableReason() || isMerging || !bypassReason.trim()}
        class="mt-2 w-full bg-[#a37100] text-white px-3 py-2 rounded text-sm font-medium hover:bg-[#bb8009] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Merge even if requirements are not satisfied"
      >
        {isMerging ? 'Merging…' : 'Merge anyway (admin)'}
      </button>
    </div>
  {/if}
</div>
