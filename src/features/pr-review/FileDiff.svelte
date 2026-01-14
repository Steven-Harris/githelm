<script lang="ts">
  import type { PullRequestFile, ReviewComment } from '$integrations/github';
  import { highlightCode } from '$shared';
  import InlineCommentForm from './components/InlineCommentForm.svelte';
  import InlineComments from './InlineComments.svelte';
  import { getGitHubFileUrl } from './utils/index.js';
  import type { PendingComment } from './types/pr-review.types.js';

  interface Props {
    file: PullRequestFile;
    repoHtmlUrl?: string | null;
    headRef?: string | null;
    isExpanded?: boolean;
    onToggle?: (filename: string) => void;
    onFileComment?: (filename: string) => void;
    reviewComments?: ReviewComment[];
    diffViewMode?: 'inline' | 'side-by-side';

    // Submitted comment interactions
    viewerLogin?: string | null;
    canResolve?: boolean;
    canInteract?: boolean;
    // Whether the user can create new review comments (GitHub disallows on own PR)
    canCreateComments?: boolean;
    onSetThreadResolved?: (threadId: string, resolved: boolean) => void | Promise<void>;
    onDeleteSubmittedComment?: (commentId: number) => void | Promise<void>;
    onUpdateSubmittedComment?: (commentId: number, body: string) => void | Promise<void>;
    onReplyToSubmittedComment?: (inReplyToId: number, body: string) => void | Promise<void>;
    // New props for line selection and commenting
    onLineClick?: (filename: string, lineNumber: number, side: 'left' | 'right', content: string, isExtending?: boolean) => void;
    isLineSelected?: (filename: string, lineNumber: number, side: 'left' | 'right') => boolean;
    // Props for comment handling
    pendingComments?: PendingComment[];
    onUpdateComment?: (commentId: string, body: string, isPartOfReview?: boolean) => void;
    onSubmitComment?: (commentId: string) => void;
    onCancelComment?: (commentId: string) => void;
  }

  let {
    file,
    repoHtmlUrl = null,
    headRef = null,
    isExpanded = false,
    onToggle,
    onFileComment,
    reviewComments = [],
    diffViewMode = 'side-by-side',
    viewerLogin = null,
    canResolve = false,
    canInteract = false,
    canCreateComments = false,
    onSetThreadResolved,
    onDeleteSubmittedComment,
    onUpdateSubmittedComment,
    onReplyToSubmittedComment,
    onLineClick,
    isLineSelected,
    pendingComments = [],
    onUpdateComment,
    onSubmitComment,
    onCancelComment,
  }: Props = $props();

  function toggleExpanded() {
    if (onToggle) {
      onToggle(file.filename);
    }
  }

  function startFileComment() {
    if (!canCreateComments || !onFileComment) return;

    // Ensure the diff is visible so the inline composer shows.
    if (!isExpanded && onToggle) {
      onToggle(file.filename);
    }

    onFileComment(file.filename);
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'added':
        return 'text-green-300 bg-green-900/20 border-green-800/50';
      case 'removed':
        return 'text-red-300 bg-red-900/20 border-red-800/50';
      case 'modified':
        return 'text-yellow-300 bg-yellow-900/20 border-yellow-800/50';
      case 'renamed':
        return 'text-blue-300 bg-blue-900/20 border-blue-800/50';
      default:
        return 'text-[#8b949e] bg-[#0d1117] border-[#30363d]';
    }
  }

  function getStatusIcon(status: string): string {
    switch (status) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      case 'modified':
        return '~';
      case 'renamed':
        return '→';
      default:
        return '?';
    }
  }

  // Parse the patch to show line-by-line diff
  function parsePatch(patch: string): Array<{ type: 'context' | 'addition' | 'deletion' | 'header'; content: string; lineNumber?: { old: number | null; new: number | null } }> {
    if (!patch) return [];

    const lines = patch.split('\n');
    const result = [];
    let oldLineNumber = 0;
    let newLineNumber = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        // Hunk header - extract line numbers
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldLineNumber = parseInt(match[1]) - 1;
          newLineNumber = parseInt(match[2]) - 1;
        }
        result.push({ type: 'header', content: line });
      } else if (line.startsWith('+')) {
        newLineNumber++;
        result.push({
          type: 'addition',
          content: line.slice(1),
          lineNumber: { old: null, new: newLineNumber },
        });
      } else if (line.startsWith('-')) {
        oldLineNumber++;
        result.push({
          type: 'deletion',
          content: line.slice(1),
          lineNumber: { old: oldLineNumber, new: null },
        });
      } else if (line.startsWith(' ')) {
        oldLineNumber++;
        newLineNumber++;
        result.push({
          type: 'context',
          content: line.slice(1),
          lineNumber: { old: oldLineNumber, new: newLineNumber },
        });
      }
    }

    return result;
  }

  const parsedPatch = $derived(file.patch ? parsePatch(file.patch) : []);
  const githubFileUrl = $derived(
    getGitHubFileUrl({
      repoHtmlUrl,
      ref: headRef,
      path: file.filename,
      fallbackUrl: file.blob_url,
    })
  );

  const isAddedOrRemoved = $derived(file.status === 'added' || file.status === 'removed');
  const isInlineForced = $derived(diffViewMode === 'side-by-side' && isAddedOrRemoved);
  const effectiveDiffViewMode = $derived(isInlineForced ? 'inline' : diffViewMode);

  // Handle line clicks for commenting with drag support
  let isDragging = $state(false);
  let dragStartLine: { lineNumber: number; side: 'left' | 'right' } | null = $state(null);

  function handleLineMouseDown(lineNumber: number, side: 'left' | 'right', content: string, event: MouseEvent) {
    event.preventDefault();
    isDragging = true;
    dragStartLine = { lineNumber, side };

    // Start selection
    if (onLineClick) {
      onLineClick(file.filename, lineNumber, side, content);
    }
  }

  function handleLineMouseEnter(lineNumber: number, side: 'left' | 'right', content: string) {
    if (isDragging && dragStartLine && dragStartLine.side === side && onLineClick) {
      // Extend selection during drag
      onLineClick(file.filename, lineNumber, side, content, true);
    }
  }

  function handleLineMouseUp() {
    if (isDragging) {
      isDragging = false;
      dragStartLine = null;
    }
  }

  function handleLineClick(lineNumber: number, side: 'left' | 'right', content: string, isExtending: boolean = false) {
    if (onLineClick) {
      onLineClick(file.filename, lineNumber, side, content, isExtending);
    }
  }

  // Global mouse up listener to handle drag end anywhere
  function handleGlobalMouseUp() {
    if (isDragging) {
      isDragging = false;
      dragStartLine = null;
    }
  }

  // Add global mouse up listener
  if (typeof window !== 'undefined') {
    window.addEventListener('mouseup', handleGlobalMouseUp);
  }

  // Check if a line is selected
  function checkLineSelected(lineNumber: number, side: 'left' | 'right'): boolean {
    return isLineSelected ? isLineSelected(file.filename, lineNumber, side) : false;
  }

  // Get pending comment for a specific line
  function getPendingCommentForLine(lineNumber: number, side: 'left' | 'right'): PendingComment | undefined {
    return pendingComments.find((comment) => comment.filename === file.filename && comment.startLine === lineNumber && comment.side === side);
  }

  // Get existing review comments for a specific line
  function getCommentsForLine(lineNumber: number): ReviewComment[] {
    return reviewComments.filter((comment) => comment.path === file.filename && (comment.line === lineNumber || comment.original_line === lineNumber));
  }

  // Handle comment form updates
  function handleCommentUpdate(commentId: string, body: string, isPartOfReview?: boolean) {
    if (onUpdateComment) {
      onUpdateComment(commentId, body, isPartOfReview);
    }
  }

  function handleCommentSubmit(commentId: string) {
    if (onSubmitComment) {
      onSubmitComment(commentId);
    }
  }

  function handleCommentCancel(commentId: string) {
    if (onCancelComment) {
      onCancelComment(commentId);
    }
  }
</script>

<div class="border border-[#30363d] rounded-lg overflow-hidden text-[#c9d1d9]">
  <!-- File header -->
  <div class="bg-[#0d1117] px-4 py-3 border-b border-[#30363d]">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <button onclick={toggleExpanded} class="text-[#8b949e] hover:text-[#c9d1d9]" title={isExpanded ? 'Collapse file' : 'Expand file'} aria-label={isExpanded ? 'Collapse file' : 'Expand file'}>
          {#if isExpanded}
            <!-- Collapse icon -->
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          {:else}
            <!-- Expand icon -->
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          {/if}
        </button>

        <span class={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getStatusColor(file.status)}`}>
          {getStatusIcon(file.status)}
          {file.status}
        </span>

        {#if githubFileUrl}
          <a
            href={githubFileUrl}
            target="_blank"
            rel="noreferrer"
            onclick={(e) => e.stopPropagation()}
            class="font-mono text-sm text-[#f0f6fc] hover:text-[#58a6ff] underline underline-offset-2"
            aria-label={`Open ${file.filename} on GitHub`}
            title="Open on GitHub"
          >
            {file.filename}
          </a>
        {:else}
          <span class="font-mono text-sm text-[#f0f6fc]">{file.filename}</span>
        {/if}

        {#if file.previous_filename && file.status === 'renamed'}
          <span class="text-[#8b949e] text-sm">← {file.previous_filename}</span>
        {/if}
      </div>

      <div class="flex items-center space-x-4 text-sm">
            {#if canCreateComments}
          <button
            type="button"
            onclick={startFileComment}
            class="px-3 py-1.5 text-sm bg-[#30363d]/30 hover:bg-[#30363d]/50 text-[#c9d1d9] border border-[#30363d] rounded-md transition-colors"
            title="Add a comment for this file"
            aria-label="Add a comment for this file"
          >
            Comment
          </button>
        {/if}

        {#if file.additions > 0}
          <span class="text-green-400 font-medium">+{file.additions}</span>
        {/if}
        {#if file.deletions > 0}
          <span class="text-red-400 font-medium">-{file.deletions}</span>
        {/if}
        <span class="text-[#8b949e]">{file.changes} changes</span>

        {#if isInlineForced}
          <span class="px-2 py-1 text-xs bg-[#161b22] text-[#8b949e] border border-[#30363d] rounded" title="Added/removed files are shown inline">
            Inline only
          </span>
        {/if}
      </div>
    </div>
  </div>

  <!-- File diff content -->
  {#if isExpanded && file.patch}
    <div class="bg-[#0d1117] overflow-x-hidden">
      {#if effectiveDiffViewMode === 'side-by-side'}
        <!-- Side-by-side view -->
        <table class="w-full text-sm font-mono">
          <tbody>
            {#each parsedPatch as line, index (index)}
              {#if line.type === 'header'}
                <tr class="bg-[#161b22]">
                  <td colspan="4" class="px-4 py-2 text-[#8b949e] text-xs border-t border-[#30363d]">
                    {line.content}
                  </td>
                </tr>
              {:else if line.type === 'context'}
                <tr
                  class={`hover:bg-white/5 ${checkLineSelected(line.lineNumber?.old || 0, 'left') ? 'bg-[#1f6feb]/15' : ''} ${checkLineSelected(line.lineNumber?.new || 0, 'right') ? 'bg-[#1f6feb]/15' : ''}`}
                  data-line-old={line.lineNumber?.old}
                  data-line-new={line.lineNumber?.new}
                >
                  <!-- Old line number -->
                  <td
                    class={`px-2 py-1 text-[#8b949e] text-xs text-right border-r border-[#30363d] w-12 select-none cursor-pointer hover:bg-white/5 ${checkLineSelected(line.lineNumber?.old || 0, 'left') ? 'bg-[#1f6feb]/25' : ''} ${isDragging ? 'user-select-none' : ''}`}
                    onmousedown={(e) => line.lineNumber?.old && handleLineMouseDown(line.lineNumber.old, 'left', line.content, e)}
                    onmouseenter={() => line.lineNumber?.old && handleLineMouseEnter(line.lineNumber.old, 'left', line.content)}
                    onmouseup={handleLineMouseUp}
                  >
                    {line.lineNumber?.old || ''}
                  </td>
                  <!-- Old content -->
                  <td
                    class={`px-4 py-1 whitespace-pre-wrap break-all w-1/2 border-r border-[#30363d] cursor-pointer ${checkLineSelected(line.lineNumber?.old || 0, 'left') ? 'bg-[#1f6feb]/10' : ''} ${isDragging ? 'user-select-none' : ''}`}
                    onmousedown={(e) => line.lineNumber?.old && handleLineMouseDown(line.lineNumber.old, 'left', line.content, e)}
                    onmouseenter={() => line.lineNumber?.old && handleLineMouseEnter(line.lineNumber.old, 'left', line.content)}
                    onmouseup={handleLineMouseUp}
                  >
                    <span class="text-[#c9d1d9]">
                      {@html highlightCode(line.content, file.filename)}
                    </span>
                  </td>
                  <!-- New line number -->
                  <td
                    class={`px-2 py-1 text-[#8b949e] text-xs text-right border-r border-[#30363d] w-12 select-none cursor-pointer hover:bg-white/5 ${checkLineSelected(line.lineNumber?.new || 0, 'right') ? 'bg-[#1f6feb]/25' : ''} ${isDragging ? 'user-select-none' : ''}`}
                    onmousedown={(e) => line.lineNumber?.new && handleLineMouseDown(line.lineNumber.new, 'right', line.content, e)}
                    onmouseenter={() => line.lineNumber?.new && handleLineMouseEnter(line.lineNumber.new, 'right', line.content)}
                    onmouseup={handleLineMouseUp}
                  >
                    {line.lineNumber?.new || ''}
                  </td>
                  <!-- New content -->
                  <td
                    class={`px-4 py-1 whitespace-pre-wrap break-all w-1/2 cursor-pointer ${checkLineSelected(line.lineNumber?.new || 0, 'right') ? 'bg-[#1f6feb]/10' : ''} ${isDragging ? 'user-select-none' : ''}`}
                    onmousedown={(e) => line.lineNumber?.new && handleLineMouseDown(line.lineNumber.new, 'right', line.content, e)}
                    onmouseenter={() => line.lineNumber?.new && handleLineMouseEnter(line.lineNumber.new, 'right', line.content)}
                    onmouseup={handleLineMouseUp}
                  >
                    <span class="text-[#c9d1d9]">
                      {@html highlightCode(line.content, file.filename)}
                    </span>
                  </td>
                </tr>

                <!-- Comments and forms for context lines -->
                {#if line.lineNumber?.new}
                  {@const lineComments = getCommentsForLine(line.lineNumber.new)}
                  {@const pendingComment = getPendingCommentForLine(line.lineNumber.new, 'right')}

                  {#if pendingComment}
                    <tr>
                      <td colspan="4" class="p-0">
                        <InlineCommentForm comment={pendingComment} {handleCommentUpdate} {handleCommentSubmit} {handleCommentCancel} />
                      </td>
                    </tr>
                  {/if}

                  {#if lineComments.length > 0}
                    <InlineComments
                      comments={reviewComments}
                      fileName={file.filename}
                      lineNumber={line.lineNumber.new}
                      colspan={4}
                      {viewerLogin}
                      {canResolve}
                      {canInteract}
                      onSetThreadResolved={onSetThreadResolved}
                      onDeleteComment={onDeleteSubmittedComment}
                      onUpdateComment={onUpdateSubmittedComment}
                      onReplyToComment={onReplyToSubmittedComment}
                    />
                  {/if}
                {/if}
              {:else if line.type === 'deletion'}
                <tr
                  class={`bg-red-900/15 hover:bg-red-900/20 ${checkLineSelected(line.lineNumber?.old || 0, 'left') ? 'bg-red-900/30' : ''}`}
                  data-line-old={line.lineNumber?.old}
                  data-line-new={line.lineNumber?.new}
                >
                  <!-- Old line number -->
                  <td
                    class={`px-2 py-1 text-[#8b949e] text-xs text-right border-r border-[#30363d] w-12 select-none cursor-pointer hover:bg-red-900/30 ${checkLineSelected(line.lineNumber?.old || 0, 'left') ? 'bg-red-900/40' : ''} ${isDragging ? 'user-select-none' : ''}`}
                    onmousedown={(e) => line.lineNumber?.old && handleLineMouseDown(line.lineNumber.old, 'left', line.content, e)}
                    onmouseenter={() => line.lineNumber?.old && handleLineMouseEnter(line.lineNumber.old, 'left', line.content)}
                    onmouseup={handleLineMouseUp}
                  >
                    {line.lineNumber?.old || ''}
                  </td>
                  <!-- Old content (deleted) -->
                  <td
                    class={`px-4 py-1 whitespace-pre-wrap break-all w-1/2 border-r border-[#30363d] cursor-pointer ${checkLineSelected(line.lineNumber?.old || 0, 'left') ? 'bg-red-900/20' : ''} ${isDragging ? 'user-select-none' : ''}`}
                    onmousedown={(e) => line.lineNumber?.old && handleLineMouseDown(line.lineNumber.old, 'left', line.content, e)}
                    onmouseenter={() => line.lineNumber?.old && handleLineMouseEnter(line.lineNumber.old, 'left', line.content)}
                    onmouseup={handleLineMouseUp}
                  >
                    <span class="text-red-300">
                      -
                      {@html highlightCode(line.content, file.filename)}
                    </span>
                  </td>
                  <!-- New line number (empty) -->
                  <td class="px-2 py-1 text-[#8b949e] text-xs text-right border-r border-[#30363d] w-12 select-none bg-[#0d1117]"> </td>
                  <!-- New content (empty) -->
                  <td class="px-4 py-1 whitespace-pre-wrap break-all w-1/2 bg-[#0d1117]"> </td>
                </tr>
              {:else if line.type === 'addition'}
                <tr
                  class={`bg-green-900/15 hover:bg-green-900/20 ${checkLineSelected(line.lineNumber?.new || 0, 'right') ? 'bg-green-900/30' : ''}`}
                  data-line-old={line.lineNumber?.old}
                  data-line-new={line.lineNumber?.new}
                >
                  <!-- Old line number (empty) -->
                  <td class="px-2 py-1 text-[#8b949e] text-xs text-right border-r border-[#30363d] w-12 select-none bg-[#0d1117]"> </td>
                  <!-- Old content (empty) -->
                  <td class="px-4 py-1 whitespace-pre-wrap break-all w-1/2 border-r border-[#30363d] bg-[#0d1117]"> </td>
                  <!-- New line number -->
                  <td
                    class={`px-2 py-1 text-[#8b949e] text-xs text-right border-r border-[#30363d] w-12 select-none cursor-pointer hover:bg-green-900/30 ${checkLineSelected(line.lineNumber?.new || 0, 'right') ? 'bg-green-900/40' : ''} ${isDragging ? 'user-select-none' : ''}`}
                    onmousedown={(e) => line.lineNumber?.new && handleLineMouseDown(line.lineNumber.new, 'right', line.content, e)}
                    onmouseenter={() => line.lineNumber?.new && handleLineMouseEnter(line.lineNumber.new, 'right', line.content)}
                    onmouseup={handleLineMouseUp}
                  >
                    {line.lineNumber?.new || ''}
                  </td>
                  <!-- New content (added) -->
                  <td
                    class={`px-4 py-1 whitespace-pre-wrap break-all w-1/2 cursor-pointer ${checkLineSelected(line.lineNumber?.new || 0, 'right') ? 'bg-green-900/20' : ''} ${isDragging ? 'user-select-none' : ''}`}
                    onmousedown={(e) => line.lineNumber?.new && handleLineMouseDown(line.lineNumber.new, 'right', line.content, e)}
                    onmouseenter={() => line.lineNumber?.new && handleLineMouseEnter(line.lineNumber.new, 'right', line.content)}
                    onmouseup={handleLineMouseUp}
                  >
                    <span class="text-green-300">
                      +
                      {@html highlightCode(line.content, file.filename)}
                    </span>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      {:else}
        <!-- Inline view (original) -->
        <table class="w-full text-sm font-mono">
          <tbody>
            {#each parsedPatch as line, index (index)}
              {#if line.type === 'header'}
                <tr class="bg-[#161b22]">
                  <td colspan="3" class="px-4 py-2 text-[#8b949e] text-xs border-t border-[#30363d]">
                    {line.content}
                  </td>
                </tr>
              {:else}
                {@const interactionSide = line.type === 'deletion' ? 'left' : 'right'}
                {@const interactionLineNumber = line.type === 'deletion' ? line.lineNumber?.old : line.lineNumber?.new}
                {@const isSelected = interactionLineNumber ? checkLineSelected(interactionLineNumber, interactionSide) : false}

                <tr
                  class={`
                  ${line.type === 'addition' ? 'bg-green-900/15 hover:bg-green-900/20' : ''}
                  ${line.type === 'deletion' ? 'bg-red-900/15 hover:bg-red-900/20' : ''}
                  ${line.type === 'context' ? 'hover:bg-white/5' : ''}
                  ${isSelected ? 'bg-[#1f6feb]/15' : ''}
                `}
                  data-line-old={line.lineNumber?.old}
                  data-line-new={line.lineNumber?.new}
                >
                  <!-- Old line number -->
                  <td
                    class={`px-2 py-1 text-[#8b949e] text-xs text-right border-r border-[#30363d] w-12 select-none ${interactionSide === 'left' && interactionLineNumber ? 'cursor-pointer hover:bg-white/5' : ''} ${isSelected && interactionSide === 'left' ? 'bg-[#1f6feb]/25' : ''} ${isDragging ? 'user-select-none' : ''}`}
                    onmousedown={(e) => interactionSide === 'left' && interactionLineNumber && handleLineMouseDown(interactionLineNumber, interactionSide, line.content, e)}
                    onmouseenter={() => interactionSide === 'left' && interactionLineNumber && handleLineMouseEnter(interactionLineNumber, interactionSide, line.content)}
                    onmouseup={handleLineMouseUp}
                  >
                    {line.lineNumber?.old || ''}
                  </td>

                  <!-- New line number -->
                  <td
                    class={`px-2 py-1 text-[#8b949e] text-xs text-right border-r border-[#30363d] w-12 select-none ${interactionSide === 'right' && interactionLineNumber ? 'cursor-pointer hover:bg-white/5' : ''} ${isSelected && interactionSide === 'right' ? 'bg-[#1f6feb]/25' : ''} ${isDragging ? 'user-select-none' : ''}`}
                    onmousedown={(e) => interactionSide === 'right' && interactionLineNumber && handleLineMouseDown(interactionLineNumber, interactionSide, line.content, e)}
                    onmouseenter={() => interactionSide === 'right' && interactionLineNumber && handleLineMouseEnter(interactionLineNumber, interactionSide, line.content)}
                    onmouseup={handleLineMouseUp}
                  >
                    {line.lineNumber?.new || ''}
                  </td>

                  <!-- Content -->
                  <td
                    class={`px-4 py-1 whitespace-pre-wrap break-all ${interactionLineNumber ? 'cursor-pointer' : ''} ${isSelected ? 'bg-[#1f6feb]/10' : ''} ${isDragging ? 'user-select-none' : ''}`}
                    onmousedown={(e) => interactionLineNumber && handleLineMouseDown(interactionLineNumber, interactionSide, line.content, e)}
                    onmouseenter={() => interactionLineNumber && handleLineMouseEnter(interactionLineNumber, interactionSide, line.content)}
                    onmouseup={handleLineMouseUp}
                  >
                    <span
                      class={`
                      ${line.type === 'addition' ? 'text-green-300' : ''}
                      ${line.type === 'deletion' ? 'text-red-300' : ''}
                      ${line.type === 'context' ? 'text-[#c9d1d9]' : ''}
                    `}
                    >
                      {#if line.type === 'addition'}+{/if}
                      {#if line.type === 'deletion'}-{/if}
                      {@html highlightCode(line.content, file.filename)}
                    </span>
                  </td>
                </tr>

                {#if interactionLineNumber}
                  {@const pendingComment = getPendingCommentForLine(interactionLineNumber, interactionSide)}
                  {#if pendingComment}
                    <tr>
                      <td colspan="3" class="p-0">
                        <InlineCommentForm comment={pendingComment} {handleCommentUpdate} {handleCommentSubmit} {handleCommentCancel} />
                      </td>
                    </tr>
                  {/if}

                  {#if interactionSide === 'right'}
                    {@const lineComments = getCommentsForLine(interactionLineNumber)}
                    {#if lineComments.length > 0}
                      <InlineComments
                        comments={reviewComments}
                        fileName={file.filename}
                        lineNumber={interactionLineNumber}
                        colspan={3}
                        {viewerLogin}
                        {canResolve}
                        {canInteract}
                        onSetThreadResolved={onSetThreadResolved}
                        onDeleteComment={onDeleteSubmittedComment}
                        onUpdateComment={onUpdateSubmittedComment}
                        onReplyToComment={onReplyToSubmittedComment}
                      />
                    {/if}
                  {/if}
                {/if}
              {/if}
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {:else if isExpanded && !file.patch}
    <!-- No patch available (binary file or no changes to show) -->
    <div class="p-4 text-center text-[#8b949e]">
      {#if file.status === 'added'}
        <p>New file created</p>
      {:else if file.status === 'removed'}
        <p>File deleted</p>
      {:else if file.status === 'renamed'}
        <p>
          File renamed from
          <code class="bg-[#161b22] border border-[#30363d] px-1 rounded">{file.previous_filename}</code>
        </p>
      {:else}
        <p>Binary file or no diff available</p>
      {/if}
    </div>
  {/if}
</div>
