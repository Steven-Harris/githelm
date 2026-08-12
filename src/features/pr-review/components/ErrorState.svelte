<script lang="ts">
  interface Props {
    error: string;
    onRetry?: () => void;
  }

  let { error, onRetry }: Props = $props();
</script>

<div class="error-shell" role="alert">
  <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path stroke-linecap="round" d="M12 7.5v5.25M12 16.25h.01" />
  </svg>
  <div class="error-body">
    <h3 class="error-title">Couldn't load this pull request</h3>
    <p class="error-detail">{error}</p>
    {#if onRetry}
      <button onclick={onRetry} class="ghost-button error-retry" aria-label="Retry loading pull request">Try again</button>
    {/if}
  </div>
</div>

<style>
  .error-shell {
    display: flex;
    gap: 0.875rem;
    margin: 1.5rem;
    padding: 1.125rem 1.25rem;
    border: 1px solid color-mix(in srgb, var(--danger) 34%, transparent);
    background: color-mix(in srgb, var(--danger) 9%, var(--panel));
    border-radius: var(--radius);
    box-shadow: var(--shadow-panel);
  }

  .error-icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
    margin-top: 0.0625rem;
    color: var(--danger);
  }

  .error-body {
    min-width: 0;
  }

  .error-title {
    font-family: var(--font-display);
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.01em;
  }

  .error-detail {
    margin-top: 0.375rem;
    font-size: 0.8125rem;
    line-height: 1.55;
    color: var(--text-dim);
    overflow-wrap: anywhere;
  }

  .error-retry {
    margin-top: 0.875rem;
  }
</style>
