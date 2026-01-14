<script lang="ts">
  import type { PullRequestFile } from '$integrations/github';
  import FileTreeNode from './FileTreeNode.svelte';

  interface FileTreeNodeData {
    name: string;
    type: 'file' | 'directory';
    children?: FileTreeNodeData[];
    path?: string;
    file?: PullRequestFile;
    isExpanded?: boolean;
  }

  interface Props {
    node: FileTreeNodeData;
    level: number;
    selectedFile?: string;
    onFileSelect?: (filename: string) => void;
    onToggle?: (node: FileTreeNodeData) => void;
  }

  let { node, level, selectedFile, onFileSelect, onToggle }: Props = $props();

  function handleFileClick(node: FileTreeNodeData) {
    if (node.type === 'file' && node.path && onFileSelect) {
      onFileSelect(node.path);
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'added':
        return 'text-green-400';
      case 'removed':
        return 'text-red-400';
      case 'modified':
        return 'text-yellow-300';
      case 'renamed':
        return 'text-blue-400';
      default:
        return 'text-[#8b949e]';
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
        return '';
    }
  }
</script>

<div class="select-none">
  {#if node.type === 'directory'}
    <!-- Directory node -->
    <button onclick={() => onToggle?.(node)} class="file-tree-button flex items-center w-full px-2 py-1 text-left hover:bg-white/5 rounded text-sm" style="padding-left: {level * 16 + 8}px" aria-label={`Toggle folder ${node.name}`} aria-expanded={node.isExpanded}>
      <span class="w-4 h-4 flex items-center justify-center mr-2">
        {#if node.isExpanded}
          <!-- Expanded folder icon -->
          <svg class="w-3 h-3 text-[#8b949e]" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        {:else}
          <!-- Collapsed folder icon -->
          <svg class="w-3 h-3 text-[#8b949e]" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        {/if}
      </span>
      <span class="text-[#c9d1d9] font-medium">📁 {node.name}</span>
    </button>

    <!-- Children -->
    {#if node.isExpanded && node.children}
      {#each node.children as child}
        <FileTreeNode node={child} level={level + 1} {selectedFile} {onFileSelect} {onToggle} />
      {/each}
    {/if}
  {:else}
    <!-- File node -->
    <button
      onclick={() => handleFileClick(node)}
      class={`file-tree-button flex items-center w-full px-2 py-1 text-left hover:bg-white/5 rounded text-sm transition-colors ${
        selectedFile === node.path ? 'bg-[#1f6feb]/15 border-l-2 border-[#58a6ff]' : ''
      }`}
      style="padding-left: {level * 16 + 8}px"
      aria-label={`Open file ${node.name}`}
    >
      <span class="flex-1 text-[#c9d1d9] truncate">{node.name}</span>

      {#if node.file}
        <div class="flex items-center space-x-1 ml-2">
          {#if node.file.additions > 0}
            <span class="text-green-400 text-xs">+{node.file.additions}</span>
          {/if}
          {#if node.file.deletions > 0}
            <span class="text-red-400 text-xs">-{node.file.deletions}</span>
          {/if}
          <span class={`text-xs font-medium ${getStatusColor(node.file.status)}`}>
            {getStatusIcon(node.file.status)}
          </span>
        </div>
      {/if}
    </button>
  {/if}
</div>
