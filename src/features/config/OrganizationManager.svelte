<script lang="ts">
  import deleteSVG from '$assets/delete.svg';
  import { organizationManagerService, type OrganizationManagerState } from '$features/config/services/organization-manager.service';
  import { onMount } from 'svelte';

  let managerState = $state(organizationManagerService.createInitialState() as OrganizationManagerState);
  let isAdding = $state(false);
  let newOrgName = $state('');

  onMount(async () => {
    await organizationManagerService.loadOrganizations((updates) => {
      Object.assign(managerState, updates);
    });
  });

  async function addOrganization(): Promise<void> {
    if (!newOrgName.trim()) return;

    await organizationManagerService.addOrganization(newOrgName, managerState.organizations, (updates) => {
      Object.assign(managerState, updates);
    });

    // Reset form
    newOrgName = '';
    isAdding = false;
  }

  async function deleteOrganization(index: number): Promise<void> {
    await organizationManagerService.deleteOrganization(index, managerState.organizations, (updates) => {
      Object.assign(managerState, updates);
    });
  }

  function startAdding(): void {
    isAdding = true;
  }

  function cancelAdding(): void {
    isAdding = false;
    newOrgName = '';
  }
</script>

<div>
  {#if managerState.loading}
    <div class="text-center py-6 flex flex-col items-center">
      <div class="animate-spin w-6 h-6 mb-3" aria-hidden="true">
        <svg class="w-full h-full" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="rgba(148,168,205,0.18)" stroke-width="1.5" />
          <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="var(--beacon)" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </div>
      <span class="text-sm text-[var(--text-dim)]">Loading organizations…</span>
    </div>
  {:else}
    <div class="space-y-2">
      {#if managerState.organizations.length > 0}
        {#each managerState.organizations as org, i (i)}
          <div class="org-row">
            <span class="org-name">{org.name}</span>
            <button class="org-delete" title="Remove organization" aria-label={`Remove ${org.name}`} onclick={() => deleteOrganization(i)}>
              <img src={deleteSVG} alt="" width="14" height="14" />
            </button>
          </div>
        {/each}
      {:else}
        <p class="text-sm text-[var(--text-faint)] text-center py-4">No organizations yet.</p>
      {/if}
    </div>

    {#if !isAdding}
      <button class="ghost-button w-full justify-center mt-4" onclick={startAdding}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M7.25 1.25a.75.75 0 0 1 1.5 0V7.25h6a.75.75 0 0 1 0 1.5h-6v6a.75.75 0 0 1-1.5 0v-6h-6a.75.75 0 0 1 0-1.5h6V1.25Z" />
        </svg>
        <span>Add organization</span>
      </button>
    {:else}
      <div class="add-form">
        <input
          type="text"
          bind:value={newOrgName}
          placeholder="Organization name"
          aria-label="Organization name"
          class="w-full"
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOrganization();
            } else if (e.key === 'Escape') {
              cancelAdding();
            }
          }}
        />
        <div class="flex gap-2">
          <button class="beacon-button flex-1" style="padding: 0.5rem 1rem" disabled={!newOrgName.trim()} onclick={addOrganization}> Add </button>
          <button class="ghost-button" onclick={cancelAdding}>Cancel</button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .org-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(148, 168, 205, 0.05);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    transition:
      border-color 180ms var(--ease),
      background-color 180ms var(--ease);
  }

  .org-row:hover {
    border-color: var(--line-strong);
    background: rgba(148, 168, 205, 0.08);
  }

  .org-name {
    color: var(--text);
    font-weight: 500;
    font-size: 0.875rem;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .org-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    opacity: 0.55;
    transition:
      opacity 160ms var(--ease),
      background-color 160ms var(--ease);
  }

  .org-delete:hover {
    opacity: 1;
    background: rgba(255, 107, 98, 0.16);
  }

  .add-form {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin-top: 1rem;
    padding: 0.75rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: rgba(148, 168, 205, 0.04);
  }
</style>
