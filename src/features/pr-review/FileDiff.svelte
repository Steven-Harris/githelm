<script lang="ts">
  import type { PullRequestFile, ReviewComment } from '$integrations/github';
  import { detectLanguage, getFileTypeIcon, highlightCode } from '$shared';

  interface Props {
    file: PullRequestFile;
    isExpanded?: boolean;
    onToggle?: (filename: string) => void;
    reviewComments?: ReviewComment[];
    diffViewMode?: 'inline' | 'side-by-side';
    // New props for line selection
    onLineClick?: (filename: string, lineNumber: number, side: 'left' | 'right', content: string) => void;
    isLineSelected?: (filename: string, lineNumber: number, side: 'left' | 'right') => boolean;
  }

  let { file, isExpanded = false, onToggle, reviewComments = [], diffViewMode = 'side-by-side', onLineClick, isLineSelected }: Props = $props();

  function toggleExpanded() {
    if (onToggle) {
      onToggle(file.filename);
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'added':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'removed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'modified':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'renamed':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
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
  const fileIcon = $derived(getFileTypeIcon(file.filename));
  const detectedLanguage = $derived(detectLanguage(file.filename));

  // Handle line clicks for commenting
  function handleLineClick(lineNumber: number, side: 'left' | 'right', content: string) {
    if (onLineClick) {
      onLineClick(file.filename, lineNumber, side, content);
    }
  }

  // Check if a line is selected
  function checkLineSelected(lineNumber: number, side: 'left' | 'right'): boolean {
    return isLineSelected ? isLineSelected(file.filename, lineNumber, side) : false;
  }
</script>

<div class="border border-gray-200 rounded-lg overflow-hidden">
  <!-- File header -->
  <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <button onclick={toggleExpanded} class="text-gray-500 hover:text-gray-700" title={isExpanded ? 'Collapse file' : 'Expand file'} aria-label={isExpanded ? 'Collapse file' : 'Expand file'}>
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

        <span class="text-lg mr-2">{fileIcon}</span>
        <span class="font-mono text-sm text-gray-900">{file.filename}</span>

        {#if detectedLanguage}
          <span class="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">{detectedLanguage}</span>
        {/if}

        {#if file.previous_filename && file.status === 'renamed'}
          <span class="text-gray-500 text-sm">← {file.previous_filename}</span>
        {/if}
      </div>

      <div class="flex items-center space-x-4 text-sm">
        {#if file.additions > 0}
          <span class="text-green-600 font-medium">+{file.additions}</span>
        {/if}
        {#if file.deletions > 0}
          <span class="text-red-600 font-medium">-{file.deletions}</span>
        {/if}
        <span class="text-gray-500">{file.changes} changes</span>
      </div>
    </div>
  </div>

  <!-- File diff content -->
  {#if isExpanded && file.patch}
    <div class="bg-white overflow-x-auto">
      {#if diffViewMode === 'side-by-side'}
        <!-- Side-by-side view -->
        <table class="w-full text-sm font-mono">
          <tbody>
            {#each parsedPatch as line, index (index)}
              {#if line.type === 'header'}
                <tr class="bg-gray-100">
                  <td colspan="4" class="px-4 py-2 text-gray-600 text-xs">
                    {line.content}
                  </td>
                </tr>
              {:else if line.type === 'context'}
                <tr
                  class={`hover:bg-gray-50 ${checkLineSelected(line.lineNumber?.old || 0, 'left') ? 'bg-blue-100' : ''} ${checkLineSelected(line.lineNumber?.new || 0, 'right') ? 'bg-blue-100' : ''}`}
                  data-line-old={line.lineNumber?.old}
                  data-line-new={line.lineNumber?.new}
                >
                  <!-- Old line number -->
                  <td
                    class={`px-2 py-1 text-gray-400 text-xs text-right border-r border-gray-200 w-12 select-none cursor-pointer hover:bg-gray-200 ${checkLineSelected(line.lineNumber?.old || 0, 'left') ? 'bg-blue-200' : ''}`}
                    onclick={() => line.lineNumber?.old && handleLineClick(line.lineNumber.old, 'left', line.content)}
                  >
                    {line.lineNumber?.old || ''}
                  </td>
                  <!-- Old content -->
                  <td
                    class={`px-4 py-1 whitespace-pre-wrap w-1/2 border-r border-gray-200 cursor-pointer ${checkLineSelected(line.lineNumber?.old || 0, 'left') ? 'bg-blue-50' : ''}`}
                    onclick={() => line.lineNumber?.old && handleLineClick(line.lineNumber.old, 'left', line.content)}
                  >
                    <span class="text-gray-800">
                      {@html highlightCode(line.content, file.filename)}
                    </span>
                  </td>
                  <!-- New line number -->
                  <td
                    class={`px-2 py-1 text-gray-400 text-xs text-right border-r border-gray-200 w-12 select-none cursor-pointer hover:bg-gray-200 ${checkLineSelected(line.lineNumber?.new || 0, 'right') ? 'bg-blue-200' : ''}`}
                    onclick={() => line.lineNumber?.new && handleLineClick(line.lineNumber.new, 'right', line.content)}
                  >
                    {line.lineNumber?.new || ''}
                  </td>
                  <!-- New content -->
                  <td
                    class={`px-4 py-1 whitespace-pre-wrap w-1/2 cursor-pointer ${checkLineSelected(line.lineNumber?.new || 0, 'right') ? 'bg-blue-50' : ''}`}
                    onclick={() => line.lineNumber?.new && handleLineClick(line.lineNumber.new, 'right', line.content)}
                  >
                    <span class="text-gray-800">
                      {@html highlightCode(line.content, file.filename)}
                    </span>
                  </td>
                </tr>
              {:else if line.type === 'deletion'}
                <tr
                  class={`bg-red-50 hover:bg-red-100 ${checkLineSelected(line.lineNumber?.old || 0, 'left') ? 'bg-red-200' : ''}`}
                  data-line-old={line.lineNumber?.old}
                  data-line-new={line.lineNumber?.new}
                >
                  <!-- Old line number -->
                  <td
                    class={`px-2 py-1 text-gray-400 text-xs text-right border-r border-gray-200 w-12 select-none cursor-pointer hover:bg-red-200 ${checkLineSelected(line.lineNumber?.old || 0, 'left') ? 'bg-red-300' : ''}`}
                    onclick={() => line.lineNumber?.old && handleLineClick(line.lineNumber.old, 'left', line.content)}
                  >
                    {line.lineNumber?.old || ''}
                  </td>
                  <!-- Old content (deleted) -->
                  <td
                    class={`px-4 py-1 whitespace-pre-wrap w-1/2 border-r border-gray-200 cursor-pointer ${checkLineSelected(line.lineNumber?.old || 0, 'left') ? 'bg-red-100' : ''}`}
                    onclick={() => line.lineNumber?.old && handleLineClick(line.lineNumber.old, 'left', line.content)}
                  >
                    <span class="text-red-800">
                      -
                      {@html highlightCode(line.content, file.filename)}
                    </span>
                  </td>
                  <!-- New line number (empty) -->
                  <td class="px-2 py-1 text-gray-400 text-xs text-right border-r border-gray-200 w-12 select-none bg-gray-50"> </td>
                  <!-- New content (empty) -->
                  <td class="px-4 py-1 whitespace-pre-wrap w-1/2 bg-gray-50"> </td>
                </tr>
              {:else if line.type === 'addition'}
                <tr
                  class={`bg-green-50 hover:bg-green-100 ${checkLineSelected(line.lineNumber?.new || 0, 'right') ? 'bg-green-200' : ''}`}
                  data-line-old={line.lineNumber?.old}
                  data-line-new={line.lineNumber?.new}
                >
                  <!-- Old line number (empty) -->
                  <td class="px-2 py-1 text-gray-400 text-xs text-right border-r border-gray-200 w-12 select-none bg-gray-50"> </td>
                  <!-- Old content (empty) -->
                  <td class="px-4 py-1 whitespace-pre-wrap w-1/2 border-r border-gray-200 bg-gray-50"> </td>
                  <!-- New line number -->
                  <td
                    class={`px-2 py-1 text-gray-400 text-xs text-right border-r border-gray-200 w-12 select-none cursor-pointer hover:bg-green-200 ${checkLineSelected(line.lineNumber?.new || 0, 'right') ? 'bg-green-300' : ''}`}
                    onclick={() => line.lineNumber?.new && handleLineClick(line.lineNumber.new, 'right', line.content)}
                  >
                    {line.lineNumber?.new || ''}
                  </td>
                  <!-- New content (added) -->
                  <td
                    class={`px-4 py-1 whitespace-pre-wrap w-1/2 cursor-pointer ${checkLineSelected(line.lineNumber?.new || 0, 'right') ? 'bg-green-100' : ''}`}
                    onclick={() => line.lineNumber?.new && handleLineClick(line.lineNumber.new, 'right', line.content)}
                  >
                    <span class="text-green-800">
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
                <tr class="bg-gray-100">
                  <td colspan="3" class="px-4 py-2 text-gray-600 text-xs">
                    {line.content}
                  </td>
                </tr>
              {:else}
                <tr
                  class={`
                  ${line.type === 'addition' ? 'bg-green-50 hover:bg-green-100' : ''}
                  ${line.type === 'deletion' ? 'bg-red-50 hover:bg-red-100' : ''}
                  ${line.type === 'context' ? 'hover:bg-gray-50' : ''}
                `}
                  data-line-old={line.lineNumber?.old}
                  data-line-new={line.lineNumber?.new}
                >
                  <!-- Old line number -->
                  <td class="px-2 py-1 text-gray-400 text-xs text-right border-r border-gray-200 w-12 select-none">
                    {line.lineNumber?.old || ''}
                  </td>

                  <!-- New line number -->
                  <td class="px-2 py-1 text-gray-400 text-xs text-right border-r border-gray-200 w-12 select-none">
                    {line.lineNumber?.new || ''}
                  </td>

                  <!-- Content -->
                  <td class="px-4 py-1 whitespace-pre-wrap">
                    <span
                      class={`
                      ${line.type === 'addition' ? 'text-green-800' : ''}
                      ${line.type === 'deletion' ? 'text-red-800' : ''}
                      ${line.type === 'context' ? 'text-gray-800' : ''}
                    `}
                    >
                      {#if line.type === 'addition'}+{/if}
                      {#if line.type === 'deletion'}-{/if}
                      {@html highlightCode(line.content, file.filename)}
                    </span>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {:else if isExpanded && !file.patch}
    <!-- No patch available (binary file or no changes to show) -->
    <div class="p-4 text-center text-gray-500">
      {#if file.status === 'added'}
        <p>New file created</p>
      {:else if file.status === 'removed'}
        <p>File deleted</p>
      {:else if file.status === 'renamed'}
        <p>File renamed from <code class="bg-gray-100 px-1 rounded">{file.previous_filename}</code></p>
      {:else}
        <p>Binary file or no diff available</p>
      {/if}
    </div>
  {/if}
</div>
