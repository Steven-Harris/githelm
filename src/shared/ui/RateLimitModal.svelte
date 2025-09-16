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
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="rate-limit-title" tabindex="-1" onclick={stopPropagation} onkeydown={stopPropagation}>
      <h2 id="rate-limit-title">Rate Limit Exceeded</h2>
      <p>Unfortunately, GitHub's Rate Limit has been hit. If you're feeling lucky you can try again or re-logging in.</p>
      <button onclick={dismissModal} aria-label="Try again">I'm feeling lucky</button>
      <button onclick={reLogin} aria-label="Re-login with GitHub">Re-Login</button>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal {
    background: var(--primary-color);
    padding: 20px;
    max-width: 40vw;
    border-radius: 0.5rem;
    text-align: center;
  }

  @media (max-width: 768px) {
    .modal {
      max-width: 80vw;
    }
  }

  h2 {
    font-size: 1.5rem;
  }

  button {
    margin-top: 20px;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background: var(--primary-color);
    color: white;
    margin-right: 0.5rem;
  }

  button:hover {
    background: var(--primary-accent-color);
    color: white;
  }
</style>
