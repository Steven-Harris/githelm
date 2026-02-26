<script lang="ts">
  import type { ReviewComment } from '$integrations/github';
  import { renderMarkdownToHtml } from '../utils/markdown';

  interface Props {
    comments: ReviewComment[];
    onCommentClick?: (filename: string, lineNumber: number) => void;
    onDeleteComment?: (commentId: number) => void | Promise<void>;
    onUpdateComment?: (commentId: number, body: string) => void | Promise<void>;
    onReplyToComment?: (inReplyToId: number, body: string) => void | Promise<void>;
    onSetThreadResolved?: (threadId: string, resolved: boolean) => void | Promise<void>;
    canResolve?: boolean;
    canInteract?: boolean;
    viewerLogin?: string | null;
  }

  const {
    comments,
    onCommentClick,
    onDeleteComment,
    onUpdateComment,
    onReplyToComment,
    onSetThreadResolved,
    canResolve = false,
    canInteract = false,
    viewerLogin = null,
  }: Props = $props();

  type ThreadGroup = {
    key: string;
    threadId: string | null;
    path: string;
    lineNumber: number;
    isResolved: boolean;
    comments: ReviewComment[];
    root: ReviewComment;
  };

  let replyToId = $state<number | null>(null);
  let replyBody = $state('');
  let editingId = $state<number | null>(null);
  let editBody = $state('');
  let busyCommentId = $state<number | null>(null);
  let actionError = $state<string | null>(null);

  // Helper function to format dates
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Get file name from path
  function getFileName(path: string): string {
    return path.split('/').pop() || path;
  }

  // Check if a comment is resolved (simplified - you might need to enhance this based on GitHub's API)
  function isCommentResolved(comment: ReviewComment): boolean {
    return comment.is_resolved === true;
  }

  const threads = $derived.by<ThreadGroup[]>(() => {
    const map = new Map<string, ReviewComment[]>();

    for (const c of comments) {
      const key = c.thread_id ? `thread:${c.thread_id}` : `comment:${c.id}`;
      const list = map.get(key);
      if (list) {
        list.push(c);
      } else {
        map.set(key, [c]);
      }
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
      const lineNumber = root.line || root.original_line || 0;

      groups.push({
        key,
        threadId: root.thread_id ?? null,
        path: root.path,
        lineNumber,
        isResolved: isCommentResolved(root),
        comments: sorted,
        root,
      });
    }

    groups.sort((a, b) => {
      const pathCompare = a.path.localeCompare(b.path);
      if (pathCompare !== 0) return pathCompare;
      return a.lineNumber - b.lineNumber;
    });

    return groups;
  });

  function isOwnComment(comment: ReviewComment): boolean {
    return !!viewerLogin && comment.user?.login === viewerLogin;
  }

  async function handleToggleResolved(e: Event, threadId: string, currentlyResolved: boolean) {
    e.preventDefault();
    e.stopPropagation();
    if (!onSetThreadResolved) return;

    actionError = null;
    try {
      await onSetThreadResolved(threadId, !currentlyResolved);
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'Failed to update thread resolution';
    }
  }

  // Handle comment click to scroll to code
  function handleCommentClick(comment: ReviewComment) {
    if (onCommentClick) {
      const lineNumber = comment.line || comment.original_line || 0;
      onCommentClick(comment.path, lineNumber);
    }
  }

  async function handleDeleteClick(e: Event, comment: ReviewComment) {
    e.preventDefault();
    e.stopPropagation();
    if (!onDeleteComment) return;
    if (!confirm('Delete this comment from GitHub?')) return;

    actionError = null;
    busyCommentId = comment.id;

    try {
      await onDeleteComment(comment.id);
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'Failed to delete comment';
    } finally {
      busyCommentId = null;
    }
  }

  function startReply(e: Event, comment: ReviewComment) {
    e.preventDefault();
    e.stopPropagation();
    actionError = null;
    editingId = null;
    replyToId = comment.id;
    replyBody = '';
  }

  async function submitReply(e: Event, commentId: number) {
    e.preventDefault();
    e.stopPropagation();
    if (!onReplyToComment) return;

    const body = replyBody.trim();
    if (!body) return;

    busyCommentId = commentId;
    actionError = null;

    try {
      await onReplyToComment(commentId, body);
      replyToId = null;
      replyBody = '';
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'Failed to reply';
    } finally {
      busyCommentId = null;
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

    busyCommentId = commentId;
    actionError = null;

    try {
      await onUpdateComment(commentId, body);
      editingId = null;
      editBody = '';
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'Failed to update comment';
    } finally {
      busyCommentId = null;
    }
  }

  function cancelInlineAction(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    replyToId = null;
    replyBody = '';
    editingId = null;
    editBody = '';
    actionError = null;
  }
</script>

{#if comments.length > 0}
  <div class="p-4">
    <h4 class="text-xs font-medium text-[#8b949e] uppercase tracking-wide mb-3">Code Comments</h4>
    {#if actionError}
      <div class="mb-3 text-xs text-red-200 bg-red-900/20 border border-red-900/40 rounded px-2 py-1">
        {actionError}
      </div>
    {/if}

    <div class="space-y-3">
      {#each threads as thread (thread.key)}
        <div class="border border-[#30363d] rounded-lg overflow-hidden {thread.isResolved ? 'opacity-70' : ''}">
          <!-- Thread header -->
          <div class="flex items-center justify-between px-3 py-2 bg-[#0d1117] border-b border-[#30363d]">
            <button
              type="button"
              class="min-w-0 text-left text-xs text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
              onclick={() => handleCommentClick(thread.root)}
              title="Scroll to code"
            >
              <span class="font-medium">{getFileName(thread.path)}</span>
              <span class="mx-1 text-[#30363d]">:</span>
              <span class="text-[#58a6ff] font-medium">line {thread.lineNumber}</span>
            </button>

            <div class="flex items-center gap-2">
              {#if thread.isResolved}
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-[#161b22] border border-[#30363d] text-[#8b949e]">
                  Resolved
                </span>
              {/if}
            </div>
          </div>

          <!-- Thread comments -->
          <div class="divide-y divide-[#30363d]">
            {#each thread.comments as comment (comment.id)}
              <div class="px-3 py-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center min-w-0">
                    <img src={comment.user.avatar_url} alt={comment.user.login} class="w-5 h-5 rounded-full mr-2 flex-shrink-0" />
                    <div class="min-w-0">
                      <div class="flex items-center text-xs min-w-0">
                        <span class="font-medium text-[#f0f6fc] truncate">{comment.user.login}</span>
                        <span class="mx-1 text-[#30363d]">•</span>
                        <span class="text-[#8b949e]">{formatDate(comment.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {#if canInteract}
                    <div class="flex items-center gap-1">
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
                          onclick={(e) => handleDeleteClick(e, comment)}
                          title="Delete comment"
                          aria-label="Delete comment"
                          disabled={busyCommentId === comment.id}
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
                    </div>
                  {/if}
                </div>

                <!-- Comment body / edit mode -->
                {#if editingId === comment.id}
                  <div class="mt-2">
                    <textarea
                      class="w-full bg-[#0d1117] text-[#c9d1d9] placeholder:text-[#8b949e] border border-[#30363d] rounded px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
                      rows="4"
                      bind:value={editBody}
                      placeholder="Edit comment..."
                    ></textarea>
                    <div class="flex items-center justify-end gap-2 mt-2">
                      <button
                        type="button"
                        class="text-xs px-2 py-1 rounded border border-[#30363d] bg-transparent hover:bg-[#21262d] text-[#8b949e] transition-colors"
                        onclick={cancelInlineAction}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        class="text-xs px-2 py-1 rounded border border-[#1f6feb]/50 bg-[#1f6feb] hover:bg-[#388bfd] text-white transition-colors disabled:opacity-50"
                        disabled={busyCommentId === comment.id || !editBody.trim()}
                        onclick={(e) => submitEdit(e, comment.id)}
                      >
                        {busyCommentId === comment.id ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                {:else}
                  <div class="mt-2 gh-markdown text-sm prose prose-sm max-w-none prose-invert leading-relaxed overflow-x-auto {thread.isResolved ? 'line-through' : ''}">
                    {@html renderMarkdownToHtml(comment.body)}
                  </div>
                {/if}

              </div>
            {/each}
          </div>

          {#if (canResolve && thread.threadId) || (canInteract && onReplyToComment)}
            <div class="px-3 py-2 bg-[#0d1117] border-t border-[#30363d]">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  {#if canResolve && thread.threadId}
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] transition-colors px-2 py-1 rounded hover:bg-[#21262d]"
                      onclick={(e) => handleToggleResolved(e, thread.threadId as string, thread.isResolved)}
                      aria-label={thread.isResolved ? 'Unresolve conversation' : 'Resolve conversation'}
                      title={thread.isResolved ? 'Unresolve conversation' : 'Resolve conversation'}
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
                      onclick={(e) => startReply(e, thread.root)}
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
                    <button
                      type="button"
                      class="text-xs px-2 py-1 rounded border border-[#30363d] bg-transparent hover:bg-[#21262d] text-[#8b949e] transition-colors"
                      onclick={cancelInlineAction}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      class="text-xs px-2 py-1 rounded border border-[#1f6feb]/50 bg-[#1f6feb] hover:bg-[#388bfd] text-white transition-colors disabled:opacity-50"
                      disabled={busyCommentId === thread.root.id || !replyBody.trim()}
                      onclick={(e) => submitReply(e, thread.root.id)}
                    >
                      {busyCommentId === thread.root.id ? 'Replying…' : 'Reply'}
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}
