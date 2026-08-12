<script lang="ts">
  interface Props {
    message?: string;
  }

  let { message = 'Loading pull request...' }: Props = $props();
</script>

<div class="loading-state" role="status">
  <span class="ring" aria-hidden="true"></span>
  <span class="loading-label">{message}</span>
</div>

<style>
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    min-height: 18rem;
  }

  .ring {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    border: 2px solid var(--line-strong);
    border-top-color: var(--beacon);
    animation: spin 800ms linear infinite;
    box-shadow: 0 0 18px -4px var(--beacon-dim);
  }

  .loading-label {
    font-size: 0.8125rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ring {
      animation-duration: 2400ms;
    }
  }
</style>
