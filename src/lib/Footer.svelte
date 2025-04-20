<script lang="ts">
  import refreshSVG from "$assets/refresh.svg";
  import { lastUpdatedStore, manualTrigger } from "./stores/last-updated.store";
  import { page } from "$app/state";

  const year = new Date().getFullYear();
  
  // Use derived to safely access page properties with null checking
  let isConfig = $derived(() => {
    return page?.url?.pathname === "/config";
  });
  
  // Format the last updated time using derived state
  let formattedLastUpdate = $derived(() => {
    const lastUpdatedValue = lastUpdatedStore();
    if (lastUpdatedValue === undefined || lastUpdatedValue === null) return "";
    
    // Ensure we're working with a number
    let value = Number(lastUpdatedValue);
    if (isNaN(value) || value <= 0) return "";
    
    const units = [
      { label: "d", mod: 86400 },
      { label: "h", mod: 3600 },
      { label: "m", mod: 60 },
      { label: "s", mod: 1 },
    ];

    return units
      .reduce((acc, { label, mod }) => {
        const unitValue = Math.floor(value / mod);
        value %= mod;
        return unitValue > 0 ? `${acc} ${unitValue}${label}` : acc;
      }, "")
      .trim();
  });

  function refresh() {
    manualTrigger.set(true);
  }
</script>

<footer class="p-1 bg-gray-800 flex justify-between items-center">
  <div class="flex-1 text-left">
    <a href="https://github.com/steven-harris/githelm" title="GitHub repository" target="_blank" rel="noopener" class="hover:underline">
      &copy;{year} GitHelm. All rights reserved.</a
    >
  </div>
  {#if formattedLastUpdate && !isConfig}
    <div class="flex-1 text-center text-gray-400">
      Last updated: {formattedLastUpdate} ago
      <button type="button" title="refresh content" aria-label="refresh content" id="refresh-button" class="p-0 cursor-pointer" onclick={refresh}>
        <img src={refreshSVG} title="refresh" alt="refresh" width="15" height="15" class="pt-2 size-5 mt-0 text-gray-400" />
      </button>
    </div>
  {/if}
  <a href="https://www.flaticon.com" title="rudder edit icons" class="flex-1 hover:underline text-right" target="_blank" rel="noopener">Icons created by Flat Icons </a>
</footer>

<style>
  footer {
    background-color: var(--primary-color);
    color: white;
    padding: 0.5rem 1rem;
    text-align: center;
    position: fixed;
    width: 100%;
    bottom: 0;
  }
</style>
