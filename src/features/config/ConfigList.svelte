<script lang="ts">
  import editSVG from '$assets/edit.svg';
  import { configService } from '$features/config/services/config.service';
  import type { SaveEventData } from '$features/config/services/repository-form.service';
  import type { CombinedConfig } from '$features/config/stores/config.store';
  import { useDraggable } from './directives/useDraggable';
  import RepositoryForm from './RepositoryForm.svelte';

  let { configs = [], onUpdate } = $props<{ configs: CombinedConfig[]; onUpdate: (configs: CombinedConfig[]) => void }>();

  let editingIndex = $state<number>(-1);
  let configListElement = $state<HTMLElement | null>(null);

  async function handleSave(event: SaveEventData, index?: number): Promise<void> {
    let updatedConfigs: CombinedConfig[];

    if (typeof index === 'number') {
      updatedConfigs = configService.updateConfigAtIndex(configs, index, event);
      editingIndex = -1;
    } else {
      updatedConfigs = configService.addNewConfig(configs, event);
      editingIndex = -1;
    }

    onUpdate(updatedConfigs);
  }

  async function handleReorder(fromIndex: number, toIndex: number): Promise<void> {
    const updatedConfigs = configService.reorderConfigs(configs, fromIndex, toIndex);

    onUpdate(updatedConfigs);
  }

  function handleMouseDown(event: MouseEvent): void {
    if (event.target instanceof HTMLElement && (event.target.closest('button') || event.target.classList.contains('no-drag') || event.target.closest('.no-drag'))) {
      return;
    }
  }
</script>

<div class="mt-4">
  {#if configs.length > 0}
    <div class="space-y-3 mb-4" bind:this={configListElement} use:useDraggable={{ onReorder: handleReorder }}>
      {#each configs as config, i (i)}
        {#if editingIndex === i}
          <RepositoryForm
            {config}
            onSave={(data: any) => handleSave(data, i)}
            onCancel={() => (editingIndex = -1)}
            onDelete={() => {
              const updatedConfigs = configService.removeConfigAtIndex(configs, i);
              onUpdate(updatedConfigs);
              editingIndex = -1;
            }}
          />
        {:else}
          <div class="config-item" draggable="true" role="button" tabindex="0" onmousedown={handleMouseDown} data-index={i}>
            <span class="drag-handle" aria-hidden="true">
              <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                <circle cx="4" cy="3" r="1.3" /><circle cx="8" cy="3" r="1.3" />
                <circle cx="4" cy="7" r="1.3" /><circle cx="8" cy="7" r="1.3" />
                <circle cx="4" cy="11" r="1.3" /><circle cx="8" cy="11" r="1.3" />
              </svg>
            </span>

            <div class="flex flex-col min-w-0 flex-1 gap-1.5">
              <strong class="config-name truncate">
                <span class="config-org">{config.org}/</span>{config.repo}
              </strong>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {#if config.pullRequests?.length > 0}
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="filter-label">PRs</span>
                    {#each config.pullRequests as filter, i (i)}
                      <span class="chip">{filter}</span>
                    {/each}
                  </div>
                {:else if config.pullRequests}
                  <span class="filter-label">PRs · all labels</span>
                {/if}

                {#if config.actions && config.actions.length > 0}
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="filter-label filter-label-actions">Actions</span>
                    {#each config.actions as filter, i (i)}
                      <span class="chip chip-actions">{filter.replace(/\.(ya?ml)$/, '')}</span>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>

            <button class="config-edit no-drag" type="button" aria-label="Edit {config.org}/{config.repo}" title="Edit repository configuration" onclick={() => (editingIndex = i)}>
              <img src={editSVG} alt="" width="15" height="15" />
            </button>
          </div>
        {/if}
      {/each}
    </div>
  {:else}
    <p class="text-sm text-[var(--text-faint)] mb-4">No repositories yet. Add one below.</p>
  {/if}

  {#if editingIndex === -1}
    <button class="ghost-button w-full justify-center mb-4" onclick={() => (editingIndex = -2)} aria-label="Add repository">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M7.25 1.25a.75.75 0 0 1 1.5 0V7.25h6a.75.75 0 0 1 0 1.5h-6v6a.75.75 0 0 1-1.5 0v-6h-6a.75.75 0 0 1 0-1.5h6V1.25Z" />
      </svg>
      <span>Add repository</span>
    </button>
  {/if}

  {#if editingIndex === -2}
    <RepositoryForm onSave={handleSave} onCancel={() => (editingIndex = -1)} existingRepos={configs} />
  {/if}
</div>

<style>
  :global(.chip) {
    display: inline-flex;
    align-items: center;
    background-color: rgba(121, 184, 255, 0.13);
    color: #a9d1ff;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 0.6875rem;
    border: 1px solid rgba(121, 184, 255, 0.3);
    margin: 0;
  }

  :global(.chip.chip-actions) {
    background-color: rgba(63, 211, 130, 0.12);
    color: #8fe8b8;
    border-color: rgba(63, 211, 130, 0.28);
  }

  :global(.chip > button) {
    margin-left: 4px;
  }

  .filter-label {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .config-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.625rem 0.75rem;
    background: rgba(148, 168, 205, 0.05);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    cursor: grab;
    transition:
      transform 0.15s var(--ease),
      opacity 0.15s var(--ease),
      background-color 0.15s var(--ease),
      border-color 0.15s var(--ease),
      box-shadow 0.15s var(--ease);
  }

  .config-item:hover {
    border-color: var(--line-strong);
    background: rgba(148, 168, 205, 0.08);
  }

  .config-name {
    font-family: var(--font-display);
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--text);
  }

  .config-org {
    color: var(--text-faint);
    font-weight: 400;
  }

  .config-edit {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
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

  .config-edit:hover {
    opacity: 1;
    background: rgba(148, 168, 205, 0.14);
  }

  :global(.config-item.dragging) {
    opacity: 0.4;
  }

  :global(.config-item.drag-over) {
    transform: translateY(6px);
    border: 1px dashed var(--beacon);
    background-color: rgba(47, 212, 193, 0.06);
    position: relative;
  }

  :global(.config-item.drag-over::before) {
    content: '';
    position: absolute;
    top: -3px;
    left: 0;
    right: 0;
    height: 2px;
    background-color: var(--beacon);
    opacity: 0.7;
  }

  .config-item button {
    pointer-events: all;
  }

  .drag-handle {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    color: var(--text-faint);
    opacity: 0.6;
    cursor: grab;
  }

  .config-item .no-drag {
    cursor: pointer !important;
  }

  .config-item:active {
    cursor: grabbing;
  }

  :global(.ghost-element) {
    transition: transform 0.05s ease-out;
    box-shadow: var(--shadow-pop);
    border-radius: var(--radius-sm);
    border: 1px solid rgba(47, 212, 193, 0.35);
    background-color: var(--panel-raised);
    pointer-events: none;
    will-change: transform;
    opacity: 0.75 !important;
    z-index: 9999 !important;
  }

  @media (max-width: 768px) {
    .config-item button {
      min-height: 32px;
      min-width: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  /* Auto-scroll zone visual feedback */
  :global(body.scroll-zone-top) {
    position: relative;
  }

  :global(body.scroll-zone-top::before) {
    content: '';
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    height: 120px;
    background: linear-gradient(to bottom, rgba(47, 212, 193, 0.14) 0%, transparent 100%);
    pointer-events: none;
    z-index: 9998;
  }

  :global(body.scroll-zone-bottom) {
    position: relative;
  }

  :global(body.scroll-zone-bottom::after) {
    content: '';
    position: fixed;
    bottom: 60px;
    left: 0;
    right: 0;
    height: 120px;
    background: linear-gradient(to top, rgba(47, 212, 193, 0.14) 0%, transparent 100%);
    pointer-events: none;
    z-index: 9998;
  }
</style>
