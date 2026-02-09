<script lang="ts">
  import type { PullRequestCommit } from '$integrations/github';
  import { formatDate } from './utils/format';

  interface Props {
    commits: PullRequestCommit[];
    selectedCommit: string | null;
    onCommitChange: (commitSha: string | null) => void;
  }

  const { commits, selectedCommit, onCommitChange }: Props = $props();
</script>

<div class="flex items-center space-x-4">
  <label for="commit-selector" class="text-sm font-medium text-[#8b949e]">View changes:</label>
  <div class="relative w-64">
    <select
      id="commit-selector"
      value={selectedCommit || 'all'}
      onchange={(e) => onCommitChange((e.target as HTMLSelectElement).value === 'all' ? null : (e.target as HTMLSelectElement).value)}
      class="block w-full appearance-none rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 pr-9 text-sm text-[#c9d1d9] shadow-sm hover:border-[#3d444d] focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-[#58a6ff]"
    >
      <option value="all">All commits ({commits.length})</option>
      {#each commits as commit}
        <option value={commit.sha}>
          {commit.sha.substring(0, 7)} - {commit.commit.message.split('\n')[0].substring(0, 50)}{commit.commit.message.split('\n')[0].length > 50 ? '...' : ''}
        </option>
      {/each}
    </select>
    <svg
      class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b949e]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </div>

  {#if selectedCommit}
    {@const commit = commits.find((c) => c.sha === selectedCommit)}
    {#if commit}
      <div class="flex items-center text-sm text-[#8b949e]">
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
