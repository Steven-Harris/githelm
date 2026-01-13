<script lang="ts">
  import type { ReviewComment } from '$integrations/github';
  import { renderMarkdownToHtml } from './utils/markdown';

  interface Props {
    comments: ReviewComment[];
    fileName: string;
    lineNumber: number;
    colspan?: number;

    viewerLogin?: string | null;
    canResolve?: boolean;
    canInteract?: boolean;
    onSetThreadResolved?: (threadId: string, resolved: boolean) => void | Promise<void>;
    onDeleteComment?: (commentId: number) => void | Promise<void>;
    onUpdateComment?: (commentId: number, body: string) => void | Promise<void>;
    onReplyToComment?: (inReplyToId: number, body: string) => void | Promise<void>;
  }

  let {
    comments,
    fileName,
    lineNumber,
    colspan = 4,
    viewerLogin = null,
    canResolve = false,
    canInteract = false,
    onSetThreadResolved,
    onDeleteComment,
    onUpdateComment,
    onReplyToComment,
  }: Props = $props();

  type ThreadGroup = {
    key: string;
    threadId: string | null;
    isResolved: boolean;
    comments: ReviewComment[];
    root: ReviewComment;
  };

  // Filter comments for this specific file and line
  const relevantComments = $derived(comments.filter((comment) => comment.path === fileName && (comment.line === lineNumber || comment.original_line === lineNumber)));

  const threads = $derived.by<ThreadGroup[]>(() => {
    const map = new Map<string, ReviewComment[]>();

    for (const c of relevantComments) {
      const key = c.thread_id ? `thread:${c.thread_id}` : `comment:${c.id}`;
      const list = map.get(key);
      if (list) list.push(c);
      else map.set(key, [c]);
    }

    const groups: ThreadGroup[] = [];
    for (const [key, list] of map.entries()) {
      const sorted = [...list].sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        if (ta !== tb) return ta - tb;
        return a.id - b.id;
      });
      const root = sorted.find((c) => !c.in_reply_to_id) ?? sorted[0];
      groups.push({
        key,
        threadId: root.thread_id ?? null,
        isResolved: root.is_resolved === true,
        comments: sorted,
        root,
      });
    }
    return groups;
  });

  let replyToId = $state<number | null>(null);
  let replyBody = $state('');
  let editingId = $state<number | null>(null);
  let editBody = $state('');
  let busyId = $state<number | null>(null);
  let actionError = $state<string | null>(null);

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function isOwnComment(comment: ReviewComment): boolean {
    return !!viewerLogin && comment.user?.login === viewerLogin;
  }

  async function toggleResolved(e: Event, threadId: string, isResolved: boolean) {
    e.preventDefault();
    e.stopPropagation();
    if (!onSetThreadResolved) return;
    actionError = null;
    try {
      await onSetThreadResolved(threadId, !isResolved);
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'Failed to update resolution';
    }
  }

  function startReply(e: Event, commentId: number) {
    e.preventDefault();
    e.stopPropagation();
    actionError = null;
    editingId = null;
    editBody = '';
    replyToId = commentId;
    replyBody = '';
  }

  async function submitReply(e: Event, commentId: number) {
    e.preventDefault();
    e.stopPropagation();
    if (!onReplyToComment) return;
    const body = replyBody.trim();
    if (!body) return;

    busyId = commentId;
    actionError = null;
    try {
      await onReplyToComment(commentId, body);
      replyToId = null;
      replyBody = '';
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'Failed to reply';
    } finally {
      busyId = null;
    }
  }

  function startEdit(e: Event, comment: ReviewComment) {
    e.preventDefault();
    e.stopPropagation();
    actionError = null;
    replyToId = null;
    replyBody = '';
    editingId = comment.id;
    editBody = comment.body;
  }

  async function submitEdit(e: Event, commentId: number) {
    e.preventDefault();
    e.stopPropagation();
    if (!onUpdateComment) return;
    const body = editBody.trim();
    if (!body) return;

    busyId = commentId;
    actionError = null;
    try {
      await onUpdateComment(commentId, body);
      editingId = null;
      editBody = '';
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'Failed to update';
    } finally {
      busyId = null;
    }
  }

  async function deleteComment(e: Event, commentId: number) {
    e.preventDefault();
    e.stopPropagation();
    if (!onDeleteComment) return;
    if (!confirm('Delete this comment from GitHub?')) return;

    busyId = commentId;
    actionError = null;
    try {
      await onDeleteComment(commentId);
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'Failed to delete';
    } finally {
      busyId = null;
    }
  }

  function cancelAction(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    replyToId = null;
    replyBody = '';
    editingId = null;
    editBody = '';
    actionError = null;
  }
</script>

{#if relevantComments.length > 0}
  <tr class="border-t border-[#30363d] bg-[#0d1117]">
    <td colspan={colspan} class="px-0 py-0">
      <div class="bg-[#161b22] border-l-4 border-[#1f6feb] text-[#c9d1d9]">
        {#if actionError}
          <div class="px-4 py-2 text-xs text-red-200 bg-red-900/20 border-b border-red-900/40">
            {actionError}
          </div>
        {/if}

        <div class="px-4 py-3">
          {#each threads as thread, idx (thread.key)}
            <div class={idx > 0 ? 'mt-3 pt-3 border-t border-[#30363d]' : ''}>
              {#if thread.isResolved}
                <div class="mb-2">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-[#0d1117] border border-[#30363d] text-[#8b949e]">Resolved</span>
                </div>
              {/if}

              <div class="space-y-3">
                {#each thread.comments as comment (comment.id)}
                  <div class="flex items-start gap-3">
                    <img src={comment.user.avatar_url} alt={comment.user.login} class="w-8 h-8 rounded-full flex-shrink-0" />

                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2 mb-1">
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="font-medium text-sm text-[#f0f6fc] truncate">{comment.user.login}</span>
                          <span class="text-xs text-[#8b949e]">{formatDate(comment.created_at)}</span>
                          {#if comment.updated_at !== comment.created_at}
                            <span class="text-xs text-[#8b949e]">(edited)</span>
                          {/if}
                        </div>

                        <div class="flex items-center gap-1 flex-shrink-0">
                          <button
                            class="text-[#8b949e] hover:text-[#c9d1d9] p-1"
                            title="View comment on GitHub"
                            aria-label="View comment on GitHub"
                            onclick={() => window.open(comment.html_url, '_blank')}
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>

                          {#if canInteract}
                            {#if onUpdateComment && isOwnComment(comment)}
                              <button
                                type="button"
                                class="text-[#8b949e] hover:text-[#c9d1d9] transition-colors p-1 rounded hover:bg-[#21262d]"
                                onclick={(e) => startEdit(e, comment)}
                                title="Edit comment"
                                aria-label="Edit comment"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M15.232 5.232l3.536 3.536M9 11l6.232-6.232a2.5 2.5 0 013.536 3.536L12.536 14.536a2.5 2.5 0 01-1.768.732H7v-3.768a2.5 2.5 0 01.732-1.768z"
                                  />
                                </svg>
                              </button>
                            {/if}

                            {#if onDeleteComment && isOwnComment(comment)}
                              <button
                                type="button"
                                class="text-red-200 hover:text-red-100 transition-colors p-1 rounded hover:bg-red-900/20 disabled:opacity-50"
                                onclick={(e) => deleteComment(e, comment.id)}
                                disabled={busyId === comment.id}
                                title="Delete comment"
                                aria-label="Delete comment"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3m-4 0h14"
                                  />
                                </svg>
                              </button>
                            {/if}
                          {/if}
                        </div>
                      </div>

                      {#if editingId === comment.id}
                        <textarea
                          class="w-full bg-[#0d1117] text-[#c9d1d9] placeholder:text-[#8b949e] border border-[#30363d] rounded px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
                          rows="4"
                          bind:value={editBody}
                        ></textarea>
                        <div class="flex items-center justify-end gap-2 mt-2">
                          <button type="button" class="text-xs px-2 py-1 rounded border border-[#30363d] bg-transparent hover:bg-[#21262d] text-[#8b949e] transition-colors" onclick={cancelAction}>Cancel</button>
                          <button
                            type="button"
                            class="text-xs px-2 py-1 rounded border border-[#1f6feb]/50 bg-[#1f6feb] hover:bg-[#388bfd] text-white transition-colors disabled:opacity-50"
                            disabled={busyId === comment.id || !editBody.trim()}
                            onclick={(e) => submitEdit(e, comment.id)}
                          >
                            {busyId === comment.id ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      {:else}
                        <div class="gh-markdown text-sm prose prose-sm max-w-none prose-invert overflow-x-auto">
                          {@html renderMarkdownToHtml(comment.body)}
                        </div>
                      {/if}

                      {#if comment.diff_hunk}
                        <details class="mt-2">
                          <summary class="text-xs text-[#8b949e] cursor-pointer hover:text-[#c9d1d9]">Show diff context</summary>
                          <pre class="mt-1 text-xs bg-[#0d1117] border border-[#30363d] p-2 rounded overflow-x-auto text-[#c9d1d9]"><code>{comment.diff_hunk}</code></pre>
                        </details>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>

              {#if (canResolve && thread.threadId) || (canInteract && onReplyToComment)}
                <div class="mt-3 pt-2 border-t border-[#30363d] flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    {#if canResolve && thread.threadId}
                      <button
                        type="button"
                         class="inline-flex items-center gap-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] transition-colors px-2 py-1 rounded hover:bg-[#21262d]"
                        onclick={(e) => toggleResolved(e, thread.threadId as string, thread.isResolved)}
                        title={thread.isResolved ? 'Unresolve conversation' : 'Resolve conversation'}
                        aria-label={thread.isResolved ? 'Unresolve conversation' : 'Resolve conversation'}
                      >
                        {#if thread.isResolved}
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm4-12l-8 8m0-8l8 8"
                            />
                          </svg>
                           <span>Unresolve</span>
                        {:else}
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-1-7l-3-3m0 0l-2-2m2 2l6-6"
                            />
                          </svg>
                           <span>Resolve</span>
                        {/if}
                      </button>
                    {/if}
                  </div>

                  <div class="flex items-center gap-2">
                    {#if canInteract && onReplyToComment}
                      <button
                        type="button"
                         class="inline-flex items-center gap-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] transition-colors px-2 py-1 rounded hover:bg-[#21262d]"
                        onclick={(e) => startReply(e, thread.root.id)}
                        title="Reply"
                        aria-label="Reply"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10 7l-5 5m0 0l5 5m-5-5h9a4 4 0 014 4v1"
                          />
                        </svg>
                         <span>Reply</span>
                      </button>
                    {/if}
                  </div>
                </div>

                {#if replyToId === thread.root.id}
                  <div class="mt-3">
                    <textarea
                      class="w-full bg-[#0d1117] text-[#c9d1d9] placeholder:text-[#8b949e] border border-[#30363d] rounded px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
                      rows="3"
                      bind:value={replyBody}
                      placeholder="Write a reply..."
                    ></textarea>
                    <div class="flex items-center justify-end gap-2 mt-2">
                      <button type="button" class="text-xs px-2 py-1 rounded border border-[#30363d] bg-transparent hover:bg-[#21262d] text-[#8b949e] transition-colors" onclick={cancelAction}>Cancel</button>
                      <button
                        type="button"
                        class="text-xs px-2 py-1 rounded border border-[#1f6feb]/50 bg-[#1f6feb] hover:bg-[#388bfd] text-white transition-colors disabled:opacity-50"
                        disabled={busyId === thread.root.id || !replyBody.trim()}
                        onclick={(e) => submitReply(e, thread.root.id)}
                      >
                        {busyId === thread.root.id ? 'Replying…' : 'Reply'}
                      </button>
                    </div>
                  </div>
                {/if}
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </td>
  </tr>
{/if}
