<script lang="ts">
  import type { PullRequestFile } from '$integrations/github';
  import FileTreeNode from './FileTreeNode.svelte';

  interface Props {
    files: PullRequestFile[];
    onFileSelect?: (filename: string) => void;
    selectedFile?: string;
  }

  let { files, onFileSelect, selectedFile }: Props = $props();

  // Group files by directory for a tree structure
  interface FileTreeNodeData {
    name: string;
    type: 'file' | 'directory';
    children?: FileTreeNodeData[];
    path?: string;
    file?: PullRequestFile;
    isExpanded?: boolean;
  }

  function buildFileTree(files: PullRequestFile[]): FileTreeNodeData[] {
    const root: { [key: string]: FileTreeNodeData } = {};

    files.forEach((file) => {
      const parts = file.filename.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLastPart = i === parts.length - 1;

        if (!current[part]) {
          current[part] = {
            name: part,
            type: isLastPart ? 'file' : 'directory',
            children: isLastPart ? undefined : [],
            path: parts.slice(0, i + 1).join('/'),
            file: isLastPart ? file : undefined,
            isExpanded: true, // Start with all directories expanded
          };
        }

        if (!isLastPart && current[part].children) {
          // Convert children array to object for easier traversal
          const childrenObj: { [key: string]: FileTreeNodeData } = {};
          current[part].children!.forEach((child) => {
            childrenObj[child.name] = child;
          });
          current = childrenObj;
        }
      }
    });

    // Convert object structure to array and sort
    function convertToArray(obj: { [key: string]: FileTreeNodeData }): FileTreeNodeData[] {
      return Object.values(obj)
        .sort((a, b) => {
          // Directories first, then files
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
        .map((node) => ({
          ...node,
          children: node.children && node.children.length > 0 ? node.children : undefined,
        }));
    }

    return convertToArray(root);
  }

  let fileTree = $derived(buildFileTree(files));

  function handleFileClick(node: FileTreeNodeData) {
    if (node.type === 'file' && node.path && onFileSelect) {
      onFileSelect(node.path);
    }
  }

  function toggleDirectory(node: FileTreeNodeData) {
    if (node.type === 'directory') {
      node.isExpanded = !node.isExpanded;
      // Force reactivity update
      fileTree = [...fileTree];
    }
  }
</script>

<div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
  <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
    <h3 class="text-sm font-medium text-gray-900">
      Changed Files ({files.length})
    </h3>
  </div>

  <div class="p-2 max-h-96 overflow-y-auto">
    {#if fileTree.length === 0}
      <div class="text-gray-500 text-sm p-4 text-center">No files changed</div>
    {:else}
      {#each fileTree as node}
        <FileTreeNode {node} level={0} {selectedFile} {onFileSelect} onToggle={toggleDirectory} />
      {/each}
    {/if}
  </div>
</div>

<style>
  /* Ensure smooth transitions for the tree */
  :global(.file-tree-button) {
    transition: background-color 0.15s ease;
  }
</style>
