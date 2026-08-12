<script lang="ts">
  import { firebase } from '$integrations/firebase';
  import { killSwitch } from '$shared/stores/kill-switch.store';
  import { manualTrigger } from '$shared/stores/last-updated.store';

  let showModal = $state(false);
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if ($killSwitch) {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      
      debounceTimeout = setTimeout(() => {
        showModal = true;
      }, 500);
    } else {
      showModal = false;
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
        debounceTimeout = null;
      }
    }
  });

  async function reLogin() {
    await firebase.reLogin();
    killSwitch.set(false);
    manualTrigger.set(true);
  }

  function dismissModal() {
    killSwitch.set(false);
  }

  function stopPropagation(e: Event) {
    e.stopPropagation();
  }

  function handleOverlayKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      dismissModal();
    }
  }
</script>

{#if showModal}
  <div class="modal-overlay" onclick={dismissModal} tabindex="0" role="button" aria-label="Close rate limit modal" onkeydown={handleOverlayKeydown}>
    <div class="modal menu-surface" role="dialog" aria-modal="true" aria-labelledby="rate-limit-title" tabindex="-1" onclick={stopPropagation} onkeydown={stopPropagation}>
      <span class="pill mb-4" style="color: var(--warn)"><span class="status-dot"></span>Updates paused</span>
      <h2 id="rate-limit-title">GitHub is rate limiting us</h2>
      <p>You've hit GitHub's API request limit, so GitHelm stopped polling. Wait a few minutes and retry, or sign in again to refresh your token.</p>
      <div class="actions">
        <button class="ghost-button" onclick={dismissModal}>Retry now</button>
        <button class="beacon-button" onclick={reLogin}>Sign in again</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(5, 7, 13, 0.72);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1.5rem;
    z-index: 1000;
    animation: overlay-in 200ms var(--ease);
  }

  @keyframes overlay-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal {
    padding: 1.75rem;
    max-width: 26rem;
    width: 100%;
    text-align: left;
    animation: modal-in 260ms var(--ease);
  }

  @keyframes modal-in {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  h2 {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #fff;
    margin-bottom: 0.5rem;
  }

  p {
    color: var(--text-dim);
    font-size: 0.875rem;
    line-height: 1.55;
  }

  .actions {
    display: flex;
    gap: 0.625rem;
    margin-top: 1.5rem;
  }

  .actions :global(.beacon-button) {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
</style>
