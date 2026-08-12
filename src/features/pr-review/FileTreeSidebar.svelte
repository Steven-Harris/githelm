<script lang="ts">
  import type { PullRequestFile } from '$integrations/github';

  interface Props {
    files: PullRequestFile[];
    selectedFile: string | null;
    onFileSelect: (filename: string) => void;
  }

  const { files, selectedFile, onFileSelect }: Props = $props();

  // Build file tree structure
  const fileTree = $derived.by(() => {
    const tree: Record<string, any> = {};

    files.forEach((file) => {
      const parts = file.filename.split('/');
      let current = tree;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // This is a file
          current[part] = {
            type: 'file',
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
          };
        } else {
          // This is a directory
          if (!current[part]) {
            current[part] = {
              type: 'directory',
              children: {},
            };
          }
          current = current[part].children;
        }
      });
    });

    return tree;
  });

  function getStatusColor(status: string): string {
    switch (status) {
      case 'added':
        return 'text-[#3fd382]';
      case 'removed':
        return 'text-[#ff6b62]';
      case 'modified':
        return 'text-[#79b8ff]';
      case 'renamed':
        return 'text-[#a98bff]';
      default:
        return 'text-[#6e7d96]';
    }
  }

  function getStatusIcon(status: string): string {
    switch (status) {
      case 'added':
        return '+';
      case 'removed':
        return '−';
      case 'modified':
        return 'M';
      case 'renamed':
        return 'R';
      default:
        return '•';
    }
  }

  function renderTreeNode(name: string, node: any, depth: number): string | null {
    if (node.type === 'directory') {
      return null; // Handle directories
    }
    return node.filename;
  }
</script>

<div
  class="w-64 flex-shrink-0 bg-[#121826] border-r border-[#243044] min-h-0 overflow-y-auto text-[#e9eefb] sticky top-4 self-start max-h-[calc(100dvh-8rem)]"
>
  <div class="p-4 border-b border-[#243044]">
    <h3 class="text-sm font-medium text-[#e9eefb]">Files Changed ({files.length})</h3>
  </div>

  <div class="p-2">
    {#each files as file}
      <button
        onclick={() => onFileSelect(file.filename)}
        class="flex items-center w-full py-2 px-2 text-sm rounded hover:bg-white/5 {selectedFile === file.filename ? 'bg-[#2f6fd4]/20 text-[#79b8ff]' : 'text-[#e9eefb]'}"
      >
        <span class="w-4 text-center mr-2 text-xs font-mono {getStatusColor(file.status)}">
          {getStatusIcon(file.status)}
        </span>
        <svg class="w-4 h-4 mr-2 text-[#9dabc4]" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
            clip-rule="evenodd"
          />
        </svg>
        <div class="flex flex-col items-start min-w-0 flex-1">
          <span class="truncate text-left w-full">{file.filename.split('/').pop()}</span>
          {#if file.filename.includes('/')}
            <span class="text-xs text-[#9dabc4] truncate">{file.filename.substring(0, file.filename.lastIndexOf('/'))}</span>
          {/if}
        </div>
        {#if file.additions > 0 || file.deletions > 0}
          <div class="ml-2 flex flex-col text-xs">
            {#if file.additions > 0}<span class="text-[#3fd382]">+{file.additions}</span>{/if}
            {#if file.deletions > 0}<span class="text-[#ff6b62]">-{file.deletions}</span>{/if}
          </div>
        {/if}
      </button>
    {/each}
  </div>
</div>
