<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import helmSVG from "$assets/helm.svg";
  import refreshSVG from "$assets/refresh.svg";
  import { firebase } from "$integrations/firebase";
  import { killSwitch } from "$lib/stores/kill-switch.store";
  import { manualTrigger, lastUpdatedStore } from "$lib/stores/last-updated.store";
  import { isLoading } from "$lib/stores/loading.store";
  import { eventBus } from "$lib/stores/event-bus.store";
  import { isMobile } from "$lib/stores/mobile.store";
  import { timeAgoInSeconds } from "./utils/date-utils";

  let { signedIn } = $props();
  
  // Get the actual store instance
  const lastUpdated = lastUpdatedStore();
  
  function manualRefresh() {
    manualTrigger.set(true);
  }
  
  function logout() {
    firebase.signOut();
  }
  
  function saveConfig() {
    eventBus.set('save-config');
  }
  
  function cancelConfig() {
    killSwitch.set(false);
    goto('/');
  }

  function navigateToConfig() {
    killSwitch.set(true);
    goto('/config');
  }
</script>

<header class="sticky top-0 z-50 glass-nav-header w-full">
  <div class="backdrop-blur-md bg-opacity-75 bg-[#0d1117] border-b border-[#30363d] shadow-sm">
    <div class="h-full px-4 py-2 flex justify-between items-center">
      <div class="flex items-center">
        <img src={helmSVG} alt="GitHelm logo" class="w-10 h-10 mr-2" />
        <h1 class="text-2xl font-bold text-[#f0f6fc]">GitHelm</h1>
      </div>
      
      <div class="flex items-center">
        {#if signedIn}
          {#if page.url.pathname === '/config'}
            <!-- Save/Cancel buttons for config page -->
            <button 
              class="nav-button github-btn" 
              onclick={saveConfig} 
              aria-label="save configuration"
              title="Save configuration"
            >
              {#if $isMobile}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              {:else}
                <span>Save</span>
              {/if}
            </button>

            <button 
              class="nav-button ml-2" 
              onclick={cancelConfig} 
              aria-label="cancel configuration"
              title="Cancel configuration"
            >
              {#if $isMobile}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              {:else}
                <span>Cancel</span>
              {/if}
            </button>
          {:else}
            <div class="hidden md:flex items-center mr-4 text-sm text-[#8b949e]">
              {#if $lastUpdated > 0}
                <span class="mr-2">Updated:</span>
                <span>{timeAgoInSeconds($lastUpdated)}</span>
              {:else}
                <span class="mr-2">Updating...</span>
              {/if}
            </div>
            <button 
              class="nav-button tooltip-container" 
              onclick={navigateToConfig} 
              aria-label="configure repositories"
              title="Configure repositories"
            >
              {#if $isMobile}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span class="tooltip">Configure</span>
              {:else}
                <span>Configure</span>
              {/if}
            </button>

            <button 
              class="nav-button ml-2 tooltip-container" 
              onclick={manualRefresh}
              disabled={$isLoading || $killSwitch}
              aria-label="refresh data"
              title="Refresh data"
            >
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
            
            <button class="nav-button ml-2 tooltip-container" onclick={logout}>
              {#if $isMobile}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span class="tooltip">Logout</span>
              {:else}
                <span>Logout</span>
              {/if}
            </button>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</header>

<style>
  .glass-nav-header {
    position: sticky;
    top: 0;
    z-index: 50;
  }

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

  .github-btn {
    background-color: var(--primary-accent-color);
    border-color: rgba(240, 246, 252, 0.1);
  }
  
  .github-btn:hover {
    background-color: var(--primary-accent-hover-color);
    border-color: rgba(240, 246, 252, 0.2);
  }

  .primary {
    background-color: var(--primary-accent-color);
    border-color: transparent;
  }
  
  .primary:hover {
    background-color: var(--primary-accent-hover-color);
  }

  @media (max-width: 768px) {
    .nav-button {
      width: 2.5rem;
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
    content: "";
    position: absolute;
    bottom: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: transparent transparent rgba(22, 27, 34, 0.95) transparent;
  }
</style>
