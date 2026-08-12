<script lang="ts">
  import type { CheckRun } from '$integrations/github';

  interface Props {
    checks: CheckRun[];
    maxVisible?: number;
  }

  let { checks, maxVisible = 8 }: Props = $props();

  function getCheckColor(conclusion: string | null, status: string): string {
    if (status !== 'completed') return 'bg-[rgba(242,181,68,0.20)] text-[#f5d79b] border-[rgba(242,181,68,0.50)]';

    switch (conclusion) {
      case 'success':
        return 'bg-[rgba(63,211,130,0.20)] text-[#8fe8b8] border-[rgba(63,211,130,0.50)]';
      case 'failure':
        return 'bg-[rgba(255,107,98,0.20)] text-[#ffb3ae] border-[rgba(255,107,98,0.50)]';
      case 'neutral':
        return 'bg-[rgba(121,184,255,0.20)] text-[#c2dcff] border-[rgba(121,184,255,0.50)]';
      case 'cancelled':
        return 'bg-[#243044]/40 text-[#e9eefb] border-[#243044]';
      case 'skipped':
        return 'bg-[rgba(169,139,255,0.20)] text-[#d5c6ff] border-[rgba(169,139,255,0.50)]';
      default:
        return 'bg-[#243044]/40 text-[#e9eefb] border-[#243044]';
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

  function getCheckTargetUrl(check: CheckRun): string | null {
    const url = check.details_url || check.html_url;
    return url && url.length > 0 ? url : null;
  }
</script>

{#if checks.length > 0}
  <div class="mt-3 pt-3 border-t border-[#243044]">
    <div class="flex items-center space-x-2 flex-wrap gap-y-2">
      <span class="text-sm font-medium text-[#9dabc4] mr-2">Checks:</span>
      {#each checks.slice(0, maxVisible) as check}
        {@const checkTargetUrl = getCheckTargetUrl(check)}
        {#if checkTargetUrl}
          <a
            href={checkTargetUrl}
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border {getCheckColor(check.conclusion, check.status)} cursor-pointer hover:border-[#6e7d96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6fd4]/60"
            title="{check.name}: {check.conclusion || check.status}{check.output?.summary ? '\n' + check.output.summary : ''}"
            aria-label={`Open check '${check.name}' on GitHub`}
          >
            <span class="mr-1 text-xs">{getCheckIcon(check.conclusion, check.status)}</span>
            <span class="truncate max-w-32">
              {check.name.replace(/^CI\//, '').replace(/^GitHub Actions\//, '')}
            </span>
          </a>
        {:else}
          <div
            class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border {getCheckColor(check.conclusion, check.status)} cursor-help"
            title="{check.name}: {check.conclusion || check.status}{check.output?.summary ? '\n' + check.output.summary : ''}"
          >
            <span class="mr-1 text-xs">{getCheckIcon(check.conclusion, check.status)}</span>
            <span class="truncate max-w-32">
              {check.name.replace(/^CI\//, '').replace(/^GitHub Actions\//, '')}
            </span>
          </div>
        {/if}
      {/each}
      {#if checks.length > maxVisible}
        <span class="text-xs text-[#9dabc4]">
          +{checks.length - maxVisible} more
        </span>
      {/if}
    </div>
  </div>
{/if}
