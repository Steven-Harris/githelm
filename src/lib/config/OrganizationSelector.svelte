<script lang="ts">
  import { configService } from '$integrations/firebase';
  import type { Organization } from '$integrations/firebase';
  import { eventBus } from '$lib/stores/event-bus.store';
  import { onMount } from 'svelte';

  let { selectedOrg = '', disabled = false, onChange } = $props();

  let organizations = $state<Organization[]>([]);
  let loading = $state(false);

  function updateOrganizations() {
    organizations = configService.getLocalOrganizations();
  }

  onMount(() => {
    loading = true;

    updateOrganizations();

    loading = false;
  });

  $effect(() => {
    if ($eventBus === 'organizations-updated') {
      updateOrganizations();
      eventBus.set('');

      if (!selectedOrg || organizations.some((org) => org.name === selectedOrg)) {
        return;
      }

      onChange('');
    }
  });
</script>

<div class="mb-4">
  <label for="organization-select" class="{!disabled ? 'block' : ''} text-sm font-medium text-[#c9d1d9] mb-2">
    Organization
    {#if !disabled}
      <span class="text-red-700">*</span>
    {:else}
      <span id="organization-select" class="text-sm font-medium text-white mb-2">
        - {selectedOrg}
      </span>
    {/if}
  </label>
  {#if !disabled}
    {#if organizations.length > 0}
      <div class="relative">
        <select
          id="organization-select"
          bind:value={selectedOrg}
          onchange={(e) => onChange(e.currentTarget.value)}
          class="w-full p-2 pl-3 pr-10 bg-[#161b22] border border-[#30363d] rounded-md text-[#f0f6fc] hover:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff] focus:border-[#58a6ff] transition-colors appearance-none"
          aria-required="true"
        >
          <option value="" class="bg-[#161b22] text-[#f0f6fc]">Select an organization</option>
          {#each organizations as org}
            <option value={org.name} class="bg-[#161b22] text-[#f0f6fc]">{org.name}</option>
          {/each}
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#8b949e]">
          <svg class="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    {:else}
      <div class="p-4 rounded-md bg-[#261D15] border border-[#F2B8584D] text-[#F0E3CA]">
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2 text-[#F0E3CA]" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            ></path>
          </svg>
          <p class="text-sm">Please add an organization in the Organizations section above before configuring repositories.</p>
        </div>
      </div>
    {/if}
  {/if}
</div>
