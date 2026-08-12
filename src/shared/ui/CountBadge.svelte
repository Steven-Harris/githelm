<script lang="ts">
  interface Props {
    repoKey: string;
    type: 'pullRequests' | 'actions';
    count: number;
    iconType: 'pullRequest' | 'action';
    label: string;
  }

  let { repoKey, type, count, iconType, label }: Props = $props();
  
  let previousCount = $state<number | null>(null);
  let isAnimating = $state(false);
  let changeDirection: 'increase' | 'decrease' | null = $state(null);

  $effect(() => {
    const currentCount = count;

    if (previousCount === null) {
      previousCount = currentCount;
      return;
    }

    if (previousCount !== currentCount) {
      changeDirection = currentCount > previousCount ? 'increase' : 'decrease';
      isAnimating = true;
      
      // Stop animation after 2 seconds
      setTimeout(() => {
        isAnimating = false;
        changeDirection = null;
      }, 2000);
      
      previousCount = currentCount;
    }
  });
</script>

<span class="count-badge" class:up={isAnimating && changeDirection === 'increase'} class:down={isAnimating && changeDirection === 'decrease'}>
  <svg aria-hidden="true" height="13" width="13" viewBox="0 0 16 16" fill="currentColor" class="opacity-70">
    {#if iconType === 'pullRequest'}
      <path
        d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"
      />
    {:else}
      <path
        d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"
      />
    {/if}
  </svg>
  <span class="tabular-nums">{count} {count === 1 ? label : label + 's'}</span>
</span>

<style>
  .count-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.1875rem 0.5rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: rgba(148, 168, 205, 0.07);
    color: var(--text-dim);
    font-size: 0.75rem;
    white-space: nowrap;
    transition:
      color 400ms var(--ease),
      border-color 400ms var(--ease),
      background-color 400ms var(--ease);
  }

  .count-badge.up {
    color: var(--beacon-bright);
    border-color: rgba(47, 212, 193, 0.45);
    background: rgba(47, 212, 193, 0.14);
  }

  .count-badge.down {
    color: var(--text-faint);
    border-color: var(--line);
  }
</style>
