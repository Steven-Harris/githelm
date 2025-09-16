<script lang="ts">
  import type { CheckRun } from '$integrations/github';

  interface Props {
    checks: CheckRun[];
    maxVisible?: number;
  }

  let { checks, maxVisible = 8 }: Props = $props();

  function getCheckColor(conclusion: string | null, status: string): string {
    if (status !== 'completed') return 'bg-yellow-100 text-yellow-800 border-yellow-200';

    switch (conclusion) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failure':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'neutral':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'skipped':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
  <div class="mt-3 pt-3 border-t border-gray-100">
    <div class="flex items-center space-x-2 flex-wrap gap-y-2">
      <span class="text-sm font-medium text-gray-600 mr-2">Checks:</span>
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
        <span class="text-xs text-gray-500">
          +{checks.length - maxVisible} more
        </span>
      {/if}
    </div>
  </div>
{/if}
