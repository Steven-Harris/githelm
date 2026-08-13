<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import helmSVG from '$assets/helm.svg';
  import refreshSVG from '$assets/refresh.svg';
  import { firebase } from '$integrations/firebase';
  import { authService } from '$shared/services/auth.service';
  import { killSwitch } from '$shared/stores/kill-switch.store';
  import { lastUpdatedStore, manualTrigger } from '$shared/stores/last-updated.store';
  import { pollingPaused } from '$shared/stores/polling-paused.store';
  import { isLoading } from '$shared/stores/loading.store';
  import { isMobile } from '$shared/stores/mobile.store';
  import { timeAgoInSeconds } from '$shared/utils/date-utils';

  let { signedIn } = $props();

  const lastUpdated = lastUpdatedStore();
  const user = firebase.user;

  let menuOpen = $state(false);
  let menuRef = $state<HTMLElement | null>(null);

  function manualRefresh() {
    manualTrigger.set(true);
  }

  function logout() {
    authService.signOut();
  }

  function navigateToConfig() {
    goto('/config');
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }

  function handleWindowClick(event: MouseEvent) {
    if (menuOpen && menuRef && event.target instanceof Node && !menuRef.contains(event.target)) {
      closeMenu();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeMenu();
    }
  }
</script>

<svelte:window on:click={handleWindowClick} on:keydown={handleKeydown} />

<header class="sticky top-0 z-50 w-full app-header">
  <div class="px-4 sm:px-6 h-16 flex justify-between items-center gap-4">
    <a href="/" class="flex items-center gap-2.5 group" aria-label="GitHelm home">
      <img src={helmSVG} alt="" class="w-8 h-8 helm-mark" />
      <span class="brand-word">GitHelm</span>
    </a>

    <div class="flex items-center gap-2">
      {#if signedIn}
        {#if page.url.pathname !== '/config'}
          {#if !$pollingPaused}
            <div class="hidden sm:flex items-center gap-2 pill" aria-live="polite">
              {#if $killSwitch}
                <span class="status-dot" style="color: var(--warn)"></span>
                <span>Updates paused</span>
              {:else if $lastUpdated > 0}
                <span class="status-dot beacon-live" style="color: var(--beacon)"></span>
                <span>Live · {timeAgoInSeconds($lastUpdated)} ago</span>
              {:else}
                <span class="status-dot beacon-live" style="color: var(--beacon)"></span>
                <span>Syncing…</span>
              {/if}
            </div>

            <button class="ghost-button tooltip-container" onclick={manualRefresh} disabled={$isLoading || $killSwitch} aria-label="Refresh data" title="Refresh data">
              <img src={refreshSVG} alt="" class="w-4 h-4 {$isLoading ? 'animate-spin' : ''}" />
              {#if !$isMobile}
                <span>{$isLoading ? 'Refreshing' : 'Refresh'}</span>
              {:else}
                <span class="tooltip">{$isLoading ? 'Refreshing' : 'Refresh'}</span>
              {/if}
            </button>
          {/if}
        {/if}

        <!-- Profile dropdown -->
        <div class="relative" bind:this={menuRef}>
          <button class="avatar-button" onclick={toggleMenu} aria-label="User menu" aria-haspopup="menu" aria-expanded={menuOpen} title="User menu">
            {#if $user?.photoURL}
              <img src={$user.photoURL} alt="" class="avatar-img" />
            {:else}
              <div class="avatar-fallback">{$user?.displayName?.charAt(0) || 'U'}</div>
            {/if}
          </button>
          {#if menuOpen}
            <div class="menu menu-surface" role="menu">
              {#if $user?.displayName}
                <div class="menu-heading">{$user.displayName}</div>
              {/if}
              <button
                class="menu-item"
                role="menuitem"
                onclick={() => {
                  navigateToConfig();
                  closeMenu();
                }}>Settings</button
              >
              <button
                class="menu-item"
                role="menuitem"
                onclick={() => {
                  logout();
                  closeMenu();
                }}>Sign out</button
              >
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .app-header {
    background: rgba(8, 11, 19, 0.72);
    backdrop-filter: blur(18px) saturate(160%);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    border-bottom: 1px solid var(--line);
  }

  .brand-word {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
  }

  .helm-mark {
    transition: transform 700ms var(--ease);
  }

  .group:hover .helm-mark {
    transform: rotate(72deg);
  }

  /* Tooltip styles */
  .tooltip-container {
    position: relative;
  }

  .tooltip {
    visibility: hidden;
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(18, 24, 38, 0.96);
    color: var(--text-dim);
    text-align: center;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    white-space: nowrap;
    margin-top: 8px;
    z-index: 10;
    border: 1px solid var(--line-strong);
    box-shadow: var(--shadow-panel);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .tooltip-container:hover .tooltip {
    visibility: visible;
    opacity: 1;
  }

  /* Avatar dropdown */
  .avatar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    background-color: rgba(148, 168, 205, 0.06);
    border: 1px solid var(--line);
    border-radius: 9999px;
    cursor: pointer;
    transition:
      border-color 200ms var(--ease),
      box-shadow 200ms var(--ease);
  }

  .avatar-button:hover {
    border-color: rgba(47, 212, 193, 0.5);
    box-shadow: 0 0 0 3px rgba(47, 212, 193, 0.12);
  }

  .avatar-img {
    width: 1.875rem;
    height: 1.875rem;
    border-radius: 9999px;
  }

  .avatar-fallback {
    width: 1.875rem;
    height: 1.875rem;
    border-radius: 9999px;
    background: linear-gradient(140deg, rgba(47, 212, 193, 0.3), rgba(122, 108, 255, 0.3));
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .menu {
    position: absolute;
    right: 0;
    top: calc(100% + 0.625rem);
    color: var(--text-dim);
    min-width: 12rem;
    padding: 0.3125rem;
    z-index: 100;
    animation: menu-in 180ms var(--ease);
  }

  @keyframes menu-in {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .menu-heading {
    padding: 0.5rem 0.75rem 0.375rem;
    font-size: 0.75rem;
    color: var(--text-faint);
    border-bottom: 1px solid var(--line);
    margin-bottom: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .menu-item {
    width: 100%;
    text-align: left;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    background: transparent;
    color: inherit;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    transition:
      background-color 150ms var(--ease),
      color 150ms var(--ease);
  }

  .menu-item:hover {
    background-color: rgba(148, 168, 205, 0.1);
    color: var(--text);
  }
</style>
