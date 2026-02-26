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
  <div class="pwa-toast" role="alert">
    <div class="message">
      {#if $offlineReady}
        <span>✅ GitHelm is ready to work offline</span>
      {:else}
        <span>🔄 New version available!</span>
      {/if}
    </div>
    <div class="buttons">
      {#if $needRefresh}
        <button onclick={update} class="update-button" aria-label="Update application"> Update </button>
      {/if}
      <button onclick={close} class="close-button" aria-label={$offlineReady ? 'Close' : 'Dismiss'}>
        {$offlineReady ? 'Close' : 'Dismiss'}
      </button>
    </div>
  </div>
{/if}

<style>
  .pwa-toast {
    position: fixed;
    right: 0;
    bottom: 0;
    margin: 16px;
    padding: 16px;
    border: 1px solid #8885;
    border-radius: 8px;
    z-index: 100;
    text-align: left;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    background-color: #1f2937;
    color: white;
    font-weight: 500;
  }

  .pwa-toast .message {
    margin-bottom: 12px;
    font-size: 16px;
  }

  .buttons {
    display: flex;
    gap: 8px;
  }

  .pwa-toast button {
    border: none;
    outline: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .update-button {
    background-color: #3b82f6;
    color: white;
  }

  .update-button:hover {
    background-color: #2563eb;
  }

  .close-button {
    background-color: transparent;
    color: #d1d5db;
    border: 1px solid #4b5563;
  }

  .close-button:hover {
    background-color: #374151;
  }
</style>
