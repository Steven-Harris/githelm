<script lang="ts">
  import editSVG from '$assets/edit.svg';
  import { configService } from '$features/config/services/config.service';
  import type { SaveEventData } from '$features/config/services/repository-form.service';
  import type { CombinedConfig } from '$features/config/stores/config.store';
  import { useSortable } from './directives/useSortable';
  import RepositoryForm from './RepositoryForm.svelte';

  let { configs = [], onUpdate } = $props<{ configs: CombinedConfig[]; onUpdate: (configs: CombinedConfig[]) => void }>();

  let editingIndex = $state<number>(-1);
  let announcement = $state<string>('');

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

  function handleReorder(fromIndex: number, toIndex: number): void {
    onUpdate(configService.reorderConfigs(configs, fromIndex, toIndex));
  }
</script>

<div class="mt-4">
  {#if editingIndex === -1}
    <button class="ghost-button add-repository mb-3" onclick={() => (editingIndex = -2)} aria-label="Add repository">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M7.25 1.25a.75.75 0 0 1 1.5 0V7.25h6a.75.75 0 0 1 0 1.5h-6v6a.75.75 0 0 1-1.5 0v-6h-6a.75.75 0 0 1 0-1.5h6V1.25Z" />
      </svg>
      <span>Add repository</span>
    </button>
  {/if}

  {#if editingIndex === -2}
    <div class="mb-3">
      <RepositoryForm onSave={handleSave} onCancel={() => (editingIndex = -1)} existingRepos={configs} />
    </div>
  {/if}

  {#if configs.length > 0}
    <ul class="config-list space-y-3" use:useSortable={{ onReorder: handleReorder, disabled: editingIndex !== -1, onAnnounce: (message: string) => (announcement = message) }}>
      {#each configs as config, i (`${config.org}/${config.repo}`)}
        <li class="config-row">
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
            <div class="config-item" data-sortable-item data-index={i}>
              <button
                type="button"
                class="drag-handle"
                data-drag-handle
                aria-label="Reorder {config.org}/{config.repo}, position {i + 1} of {configs.length}. Press space to grab, then arrow keys to move."
                title="Drag to reorder"
              >
                <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
                  <circle cx="4" cy="3" r="1.3" /><circle cx="8" cy="3" r="1.3" />
                  <circle cx="4" cy="7" r="1.3" /><circle cx="8" cy="7" r="1.3" />
                  <circle cx="4" cy="11" r="1.3" /><circle cx="8" cy="11" r="1.3" />
                </svg>
              </button>

              <div class="flex flex-col min-w-0 flex-1 gap-1.5">
                <strong class="config-name truncate">
                  <span class="config-org">{config.org}/</span>{config.repo}
                </strong>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {#if config.pullRequests?.length > 0}
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="filter-label">PRs</span>
                      {#each config.pullRequests as filter, f (f)}
                        <span class="chip">{filter}</span>
                      {/each}
                    </div>
                  {:else if config.pullRequests}
                    <span class="filter-label">PRs · all labels</span>
                  {/if}

                  {#if config.actions && config.actions.length > 0}
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="filter-label filter-label-actions">Actions</span>
                      {#each config.actions as filter, a (a)}
                        <span class="chip chip-actions">{filter.replace(/\.(ya?ml)$/, '')}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>

              <button class="config-edit" type="button" aria-label="Edit {config.org}/{config.repo}" title="Edit repository configuration" onclick={() => (editingIndex = i)}>
                <img src={editSVG} alt="" width="15" height="15" />
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
    <p class="sr-only" role="status" aria-live="polite">{announcement}</p>
  {:else if editingIndex !== -2}
    <p class="text-sm text-[var(--text-faint)]">No repositories yet. Add one above.</p>
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

  .add-repository {
    display: flex;
    width: 100%;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.75rem;
    min-height: 2.875rem;
    border-style: dashed;
  }

  .config-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .config-row {
    list-style: none;
  }

  .config-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.625rem 0.75rem;
    background: rgba(148, 168, 205, 0.05);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    transition:
      opacity 0.15s var(--ease),
      background-color 0.15s var(--ease),
      border-color 0.15s var(--ease),
      box-shadow 0.15s var(--ease);
  }

  .config-item:hover {
    border-color: var(--line-strong);
    background: rgba(148, 168, 205, 0.08);
  }

  /* Neighbours slide out of the way while a drag is in flight. */
  :global(.config-item.sortable-shifting) {
    transition:
      transform 0.18s var(--ease),
      background-color 0.15s var(--ease),
      border-color 0.15s var(--ease);
    will-change: transform;
  }

  /* The original row stays in place as a low-opacity placeholder. */
  :global(.config-item.sortable-source) {
    opacity: 0.28;
    border-style: dashed;
    border-color: var(--beacon);
    background: rgba(47, 212, 193, 0.05);
    pointer-events: none;
  }

  :global(.config-item.sortable-keyboard) {
    border-color: var(--beacon);
    box-shadow: 0 0 0 1px var(--beacon);
  }

  :global(.sortable-floating) {
    opacity: 0.95;
    box-shadow: var(--shadow-pop, 0 12px 28px rgba(0, 0, 0, 0.45));
    border-color: rgba(47, 212, 193, 0.45) !important;
    background: var(--panel-raised, #0d1117) !important;
    cursor: grabbing;
    will-change: transform;
  }

  :global(body.sortable-dragging) {
    cursor: grabbing;
    user-select: none;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.config-item.sortable-shifting) {
      transition: none;
    }
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

  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.75rem;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-faint);
    opacity: 0.55;
    cursor: grab;
    touch-action: none;
    transition:
      opacity 160ms var(--ease),
      background-color 160ms var(--ease);
  }

  .drag-handle:hover {
    opacity: 1;
    background: rgba(148, 168, 205, 0.14);
  }

  .drag-handle:focus-visible {
    outline: 2px solid var(--beacon);
    outline-offset: 2px;
    opacity: 1;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
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
</style>
