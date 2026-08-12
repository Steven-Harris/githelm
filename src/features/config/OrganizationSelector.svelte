<script lang="ts">
  import { eventBus } from '$shared/stores/event-bus.store';
  import { onMount } from 'svelte';
  import { organizationService, type OrganizationState } from '$features/config/services/organization.service';

  let { selectedOrg = '', disabled = false, onChange } = $props<{
    selectedOrg: string;
    disabled?: boolean;
    onChange: (org: string) => void;
  }>();

  let orgState = $state<OrganizationState>(organizationService.createInitialState());

  onMount(() => {
    updateOrganizations();
  });

  $effect(() => {
    if ($eventBus === 'organizations-updated') {
      updateOrganizations();
      eventBus.set('');

      if (organizationService.shouldResetOrganization(selectedOrg, orgState.organizations)) {
        onChange('');
      }
    }
  });

  function updateOrganizations(): void {
    organizationService.updateOrganizations((updates) => {
      Object.assign(orgState, updates);
    });
  }
</script>

<div class="mb-4">
  <label for="organization-select" class="field-label">
    Organization
    {#if !disabled}
      <span class="required" aria-hidden="true">*</span>
    {:else}
      <span id="organization-select" class="field-value">{selectedOrg}</span>
    {/if}
  </label>
  {#if !disabled}
    {#if organizationService.hasOrganizations(orgState.organizations)}
      <div class="relative">
        <select id="organization-select" bind:value={selectedOrg} onchange={(e) => onChange(e.currentTarget.value)} class="w-full pr-9 appearance-none" aria-required="true">
          <option value="">Select an organization</option>
          {#each orgState.organizations as org, i (i)}
            <option value={org.name}>{org.name}</option>
          {/each}
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[var(--text-faint)]">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    {:else}
      <div class="notice">
        <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          ></path>
        </svg>
        <p class="text-sm">Add an organization first — then you can pick repositories from it.</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .field-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
    margin-bottom: 0.5rem;
  }

  .required {
    color: var(--danger);
  }

  .field-value {
    margin-left: 0.375rem;
    font-family: var(--font-display);
    font-size: 0.875rem;
    letter-spacing: 0;
    text-transform: none;
    color: var(--text);
  }

  .notice {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem 0.875rem;
    border-radius: var(--radius-sm);
    background: rgba(242, 181, 68, 0.1);
    border: 1px solid rgba(242, 181, 68, 0.3);
    color: #f5d79b;
  }

  select option {
    background: var(--panel);
    color: var(--text);
  }
</style>
