<script lang="ts">
  import type { PullRequestCommit } from '$integrations/github';

  interface Props {
    commits: PullRequestCommit[];
    selectedCommit: string | null;
    onCommitChange: (commitSha: string | null) => void;
  }

  const { commits, selectedCommit, onCommitChange }: Props = $props();

  // Helper function to format dates
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

<div class="flex items-center space-x-4">
  <label for="commit-selector" class="text-sm font-medium text-gray-700">View changes:</label>
  <select
    id="commit-selector"
    value={selectedCommit || 'all'}
    onchange={(e) => onCommitChange((e.target as HTMLSelectElement).value === 'all' ? null : (e.target as HTMLSelectElement).value)}
    class="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  >
    <option value="all">All commits ({commits.length})</option>
    {#each commits as commit}
      <option value={commit.sha}>
        {commit.sha.substring(0, 7)} - {commit.commit.message.split('\n')[0].substring(0, 50)}{commit.commit.message.split('\n')[0].length > 50 ? '...' : ''}
      </option>
    {/each}
  </select>

  {#if selectedCommit}
    {@const commit = commits.find((c) => c.sha === selectedCommit)}
    {#if commit}
      <div class="flex items-center text-sm text-gray-600">
        <span>by</span>
        {#if commit.author}
          <img src={commit.author.avatar_url} alt={commit.author.login} class="w-5 h-5 rounded-full mx-2" />
          <span>{commit.author.login}</span>
        {:else}
          <span class="mx-2">{commit.commit.author.name}</span>
        {/if}
        <span class="mx-2">•</span>
        <span>{formatDate(commit.commit.author.date)}</span>
      </div>
    {/if}
  {/if}
</div>
