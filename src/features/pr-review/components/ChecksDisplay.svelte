<script lang="ts">
  import type { CheckRun } from '$integrations/github';

  interface Props {
    checks: CheckRun[];
    maxVisible?: number;
  }

  let { checks, maxVisible = 8 }: Props = $props();

  function getCheckColor(conclusion: string | null, status: string): string {
    if (status !== 'completed') return 'bg-yellow-900/20 text-yellow-200 border-yellow-800/50';

    switch (conclusion) {
      case 'success':
        return 'bg-green-900/20 text-green-200 border-green-800/50';
      case 'failure':
        return 'bg-red-900/20 text-red-200 border-red-800/50';
      case 'neutral':
        return 'bg-blue-900/20 text-blue-200 border-blue-800/50';
      case 'cancelled':
        return 'bg-[#30363d]/40 text-[#c9d1d9] border-[#30363d]';
      case 'skipped':
        return 'bg-purple-900/20 text-purple-200 border-purple-800/50';
      default:
        return 'bg-[#30363d]/40 text-[#c9d1d9] border-[#30363d]';
    }
  }

  function getCheckIcon(conclusion: string | null, status: string): string {
    if (status !== 'completed') return '⏳';

    switch (conclusion) {
      case 'success':
        return '✓';
      case 'failure':
        return '✗';
      case 'neutral':
        return '○';
      case 'cancelled':
        return '⚪';
      case 'skipped':
        return '⏭';
      default:
        return '?';
    }
  }
</script>

{#if checks.length > 0}
  <div class="mt-3 pt-3 border-t border-[#30363d]">
    <div class="flex items-center space-x-2 flex-wrap gap-y-2">
      <span class="text-sm font-medium text-[#8b949e] mr-2">Checks:</span>
      {#each checks.slice(0, maxVisible) as check}
        <div
          class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border {getCheckColor(check.conclusion, check.status)} cursor-help"
          title="{check.name}: {check.conclusion || check.status}{check.output?.summary ? '\n' + check.output.summary : ''}"
        >
          <span class="mr-1 text-xs">{getCheckIcon(check.conclusion, check.status)}</span>
          <span class="truncate max-w-32">
            {check.name.replace(/^CI\//, '').replace(/^GitHub Actions\//, '')}
          </span>
        </div>
      {/each}
      {#if checks.length > maxVisible}
        <span class="text-xs text-[#8b949e]">
          +{checks.length - maxVisible} more
        </span>
      {/if}
    </div>
  </div>
{/if}
