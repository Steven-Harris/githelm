<script lang="ts">
  import { useRegisterSW } from 'virtual:pwa-register/svelte';

  const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, r) {
      if (!r) {
        return;
      }

      setInterval(
          async () => {
            if (r.installing || !navigator) return;

            if ('connection' in navigator && !navigator.onLine) return;

            const resp = await fetch(swUrl, {
              cache: 'no-store',
              headers: {
                cache: 'no-store',
                'cache-control': 'no-cache',
              },
            });

            if (resp?.status === 200) await r.update();
          },
          60 * 60 * 1000
        ); // Check for updates once per hour
    },
    onRegisterError(error) {
      console.error('Service worker registration error', error);
    },
  });

  const close = () => {
    offlineReady.set(false);
    needRefresh.set(false);
  };

  const update = () => {
    updateServiceWorker(true);
  };

  let toast = $derived($offlineReady || $needRefresh);
</script>

{#if toast}
  <div class="pwa-toast menu-surface" role="alert">
    <p class="message">
      {#if $offlineReady}
        GitHelm works offline now.
      {:else}
        A new version is ready.
      {/if}
    </p>
    <div class="buttons">
      {#if $needRefresh}
        <button onclick={update} class="beacon-button" aria-label="Update application"> Reload </button>
      {/if}
      <button onclick={close} class="ghost-button" aria-label={$offlineReady ? 'Close' : 'Dismiss'}>
        {$offlineReady ? 'Close' : 'Not now'}
      </button>
    </div>
  </div>
{/if}

<style>
  .pwa-toast {
    position: fixed;
    right: 1rem;
    bottom: 4rem;
    padding: 1rem;
    max-width: 20rem;
    z-index: 100;
    text-align: left;
    animation: toast-in 320ms var(--ease) both;
  }

  .message {
    margin-bottom: 0.875rem;
    font-size: 0.875rem;
    color: var(--text);
  }

  .buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .pwa-toast :global(.beacon-button) {
    padding: 0.4375rem 0.875rem;
    font-size: 0.8125rem;
  }

  .pwa-toast :global(.ghost-button) {
    font-size: 0.8125rem;
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pwa-toast {
      animation: none;
    }
  }
</style>
