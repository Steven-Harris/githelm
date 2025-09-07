<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import helmSVG from '$assets/helm.svg';
  import refreshSVG from '$assets/refresh.svg';
  import { configService } from '$features/config/services/config.service';
  import { firebase } from '$integrations/firebase';
  import { authService } from '$shared/services/auth.service';
  import { killSwitch } from '$shared/stores/kill-switch.store';
  import { lastUpdatedStore, manualTrigger } from '$shared/stores/last-updated.store';
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
    configService.enableKillSwitch();
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

<header class="sticky top-0 z-50 glass-nav-header w-full">
  <div class="bg-[#0d1117] border-b border-[#30363d] shadow-sm">
    <div class="h-full px-4 py-2 flex justify-between items-center">
      <div class="flex items-center">
        <img src={helmSVG} alt="GitHelm logo" class="w-10 h-10 mr-2" />
        <h1 class="text-2xl font-bold text-[#f0f6fc]">GitHelm</h1>
      </div>

      <div class="flex items-center">
        {#if signedIn}
          {#if page.url.pathname === '/config'}
            <!-- Profile dropdown -->
            <div class="relative ml-2" bind:this={menuRef}>
              <button class="avatar-button tooltip-container" onclick={toggleMenu} aria-label="user menu" title="User menu">
                {#if $user?.photoURL}
                  <img src={$user.photoURL} alt="profile" class="avatar-img" />
                {:else}
                  <div class="avatar-fallback">{$user?.displayName?.charAt(0) || 'U'}</div>
                {/if}
              </button>
              {#if menuOpen}
                <div class="menu" role="menu">
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
                    }}>Logout</button
                  >
                </div>
              {/if}
            </div>
          {:else}
            <div class="hidden md:flex items-center mr-4 text-sm text-[#8b949e]">
              {#if $lastUpdated > 0}
                <span class="mr-2">Updated:</span>
                <span>{timeAgoInSeconds($lastUpdated)}</span>
                <span class="ml-1">ago</span>
              {:else if $killSwitch}
                <span class="mr-2">Updating paused</span>
              {:else}
                <span class="mr-2">Updating...</span>
              {/if}
            </div>
            <button class="nav-button ml-2 tooltip-container" onclick={manualRefresh} disabled={$isLoading || $killSwitch} aria-label="refresh data" title="Refresh data">
              {#if $isLoading}
                <div class="animate-spin">
                  <img src={refreshSVG} alt="refresh" class="w-5 h-5 mx-auto" />
                </div>
              {:else}
                <img src={refreshSVG} alt="refresh" class="w-5 h-5 mx-auto" />
              {/if}
              {#if !$isMobile}
                <span class="ml-1">{$isLoading ? 'Loading...' : 'Refresh'}</span>
              {:else}
                <span class="tooltip">{$isLoading ? 'Loading...' : 'Refresh'}</span>
              {/if}
            </button>

            <!-- Profile dropdown -->
            <div class="relative ml-2" bind:this={menuRef}>
              <button class="avatar-button tooltip-container" onclick={toggleMenu} aria-label="user menu" title="User menu">
                {#if $user?.photoURL}
                  <img src={$user.photoURL} alt="profile" class="avatar-img" />
                {:else}
                  <div class="avatar-fallback">{$user?.displayName?.charAt(0) || 'U'}</div>
                {/if}
              </button>
              {#if menuOpen}
                <div class="menu" role="menu">
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
                    }}>Logout</button
                  >
                </div>
              {/if}
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</header>

<style>
  .nav-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    background-color: rgba(33, 38, 45, 0.8);
    color: var(--primary-text-color);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.875rem;
    transition: all 200ms ease;
  }

  .nav-button:hover {
    background-color: rgba(48, 54, 61, 0.8);
    border-color: #8b949e;
  }

  .nav-button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
  }

  .nav-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .nav-button {
      width: 4rem;
      height: 2.5rem;
      padding: 0.5rem;
    }
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
    background-color: rgba(22, 27, 34, 0.95);
    color: #c9d1d9;
    text-align: center;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    white-space: nowrap;
    margin-top: 6px;
    z-index: 10;
    border: 1px solid #30363d;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .tooltip-container:hover .tooltip {
    visibility: visible;
    opacity: 1;
  }

  /* Add a little arrow to the tooltip */
  .tooltip::after {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: transparent transparent rgba(22, 27, 34, 0.95) transparent;
  }

  /* Avatar dropdown */
  .avatar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    background-color: rgba(33, 38, 45, 0.8);
    border: 1px solid var(--border-color);
    border-radius: 9999px;
    transition: all 200ms ease;
  }

  .avatar-button:hover {
    background-color: rgba(48, 54, 61, 0.8);
    border-color: #8b949e;
  }

  .avatar-img {
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
  }

  .avatar-fallback {
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    background-color: #30363d;
    color: #c9d1d9;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }

  .menu {
    position: absolute;
    right: 0;
    top: calc(100% + 0.5rem);
    background-color: rgba(22, 27, 34, 0.98);
    color: #c9d1d9;
    border: 1px solid #30363d;
    border-radius: 8px;
    min-width: 12rem;
    padding: 0.25rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    z-index: 100;
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
    font-size: 0.9rem;
  }

  .menu-item:hover {
    background-color: rgba(48, 54, 61, 0.8);
  }
</style>
