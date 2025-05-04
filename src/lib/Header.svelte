<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import helmSrc from "$assets/helm.svg";
  import refreshSrc from "$assets/refresh.svg";
  import { firebase } from "$integrations/firebase";
  import { killSwitch } from "$lib/stores/kill-switch.store";
  import { manualTrigger, lastUpdatedStore } from "$lib/stores/last-updated.store";
  import { isLoading } from "$lib/stores/loading.store";
  import { eventBus } from "$lib/stores/event-bus.store";
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
    // Trigger save event for config components
    eventBus.set('save-config');
  }
  
  function cancelConfig() {
    goto('/');
  }
</script>

<header class="sticky top-0 z-50 glass-nav-header w-full">
  <div class="backdrop-blur-md bg-opacity-75 bg-[#0d1117] border-b border-[#30363d] shadow-sm">
    <div class="h-full px-4 py-2 flex justify-between items-center">
      <div class="flex items-center">
        <img src={helmSrc} alt="GitHelm logo" class="w-10 h-10 mr-2" />
        <h1 class="text-2xl font-bold text-[#f0f6fc] hidden md:block">GitHelm</h1>
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
              <span class="hidden md:inline">Save</span>
            </button>

            <button 
              class="nav-button ml-2" 
              onclick={cancelConfig} 
              aria-label="cancel configuration"
              title="Cancel configuration"
            >
              <span class="hidden md:inline">Cancel</span>
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
            <!-- Configure button for main page -->
            <button 
              class="nav-button" 
              onclick={() => goto('/config')} 
              aria-label="configure repositories"
              title="Configure repositories"
            >
              <span class="hidden md:inline">Configure</span>
            </button>

            <button 
              class="nav-button ml-2" 
              onclick={manualRefresh}
              disabled={$isLoading || $killSwitch}
              aria-label="refresh data"
              title="Refresh data"
            >
              {#if $isLoading}
                <div class="animate-spin">
                  <img src={refreshSrc} alt="refresh" class="w-5 h-5 mx-auto" />
                </div>
              {:else}
                <img src={refreshSrc} alt="refresh" class="w-5 h-5 mx-auto" />
              {/if}
              <span class="hidden md:inline ml-1">{$isLoading ? 'Loading...' : 'Refresh'}</span>
            </button>
            <button class="nav-button ml-2" onclick={logout}>
              <span class="hidden md:inline">Logout</span>
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
    }
  }
</style>
