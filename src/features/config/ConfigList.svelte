<script lang="ts">
  import editSVG from '$assets/edit.svg';
  import { configService } from '$features/config/services/config.service';
  import type { SaveEventData } from '$features/config/services/repository-form.service';
  import type { CombinedConfig } from '$features/config/stores/config.store';
  import { isMobile } from '$shared/stores/mobile.store';
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
          <div
            class="config-item flex items-center justify-between p-2 bg-[rgba(22,27,34,0.5)] border border-[#30363d] rounded-md hover:border-[#388bfd44] transition-colors cursor-grab active:cursor-grabbing mb-1"
            draggable="true"
            role="button"
            tabindex="0"
            onmousedown={handleMouseDown}
            data-index={i}
          >
            <div class="flex justify-between items-center w-full overflow-hidden">
              <div class="flex items-center min-w-0 flex-shrink flex-1">
                <span class="{$isMobile ? 'mr-1' : 'mr-2'} text-gray-400 opacity-70 drag-handle flex-shrink-0">☰</span>
                <div class="flex flex-col min-w-0 flex-1">
                  <strong class="text-[#e6edf3] {$isMobile ? 'text-sm' : ''} truncate">
                    {config.org}/<span class="text-[#58a6ff]">{config.repo}</span>
                  </strong>
                  <div class="{$isMobile ? 'text-xs' : 'text-sm'} flex flex-wrap gap-2 mt-1">
                    {#if config.pullRequests?.length > 0}
                      <div class="flex items-center">
                        <span class="text-[#58a6ff] font-medium {$isMobile ? 'mr-0.5' : 'mr-1'}">PRs:</span>
                        <div class="flex flex-wrap gap-1">
                          {#each config.pullRequests as filter, i (i)}
                            <span class="chip">{filter}</span>
                          {/each}
                        </div>
                      </div>
                    {:else if config.pullRequests}
                      <div class="flex items-center">
                        <span class="text-[#58a6ff] font-medium">PRs: All Labels</span>
                      </div>
                    {/if}

                    {#if config.actions && config.actions.length > 0}
                      <div class="flex items-center">
                        <span class="text-[#3fb950] font-medium {$isMobile ? 'mr-0.5' : 'mr-1'}">Actions:</span>
                        <div class="flex flex-wrap gap-1">
                          {#each config.actions as filter, i (i)}
                            <span class="chip">{filter.replace(/\.(ya?ml)$/, '')}</span>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>

              <div class="flex items-center {$isMobile ? 'ml-2' : 'ml-3'} flex-shrink-0">
                <button
                  class="text-[#8b949e] hover:text-[#58a6ff] transition-colors duration-200 no-drag cursor-pointer flex items-center justify-center {$isMobile ? 'w-8 h-8' : ''}"
                  type="button"
                  aria-label="edit {config.org}/{config.repo}"
                  title="Edit repository configuration"
                  onclick={() => (editingIndex = i)}
                >
                  <img src={editSVG} alt="edit" width={$isMobile ? '16' : '15'} height={$isMobile ? '16' : '15'} />
                </button>
              </div>
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {:else}
    <p class="text-[#8b949e] mb-4">No repositories configured. Add one below.</p>
  {/if}

  {#if editingIndex === -1}
    <button class="flex items-center {$isMobile ? 'p-2 px-3' : 'p-3 px-4'} glass-container hover:border-[#388bfd44] w-full mb-4 transition-all duration-200" onclick={() => (editingIndex = -2)}>
      <span class="text-xl mr-1 text-[#3fb950]">+</span>
      <span>Add Repository</span>
    </button>
  {/if}

  {#if editingIndex === -2}
    <RepositoryForm onSave={handleSave} onCancel={() => (editingIndex = -1)} existingRepos={configs} />
  {/if}
</div>

<style>
  :global(.chip) {
    display: flex;
    align-items: center;
    background-color: rgba(88, 166, 255, 0.15);
    color: var(--secondary-accent-color);
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    border: 1px solid rgba(88, 166, 255, 0.4);
  }

  :global(.chip > button) {
    margin-left: 4px;
  }

  .config-item {
    transition:
      transform 0.15s ease,
      opacity 0.15s ease,
      background-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  :global(.config-item.dragging) {
    opacity: 0.4;
  }

  :global(.config-item.drag-over) {
    transform: translateY(6px);
    border: 1px dashed var(--border-color);
    background-color: rgba(33, 38, 45, 0.8);
    position: relative;
  }

  :global(.config-item.drag-over::before) {
    content: '';
    position: absolute;
    top: -3px;
    left: 0;
    right: 0;
    height: 2px;
    background-color: #58a6ff;
    opacity: 0.6;
  }

  .config-item button {
    pointer-events: all;
  }

  .drag-handle {
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
    box-shadow:
      0 12px 28px rgba(0, 0, 0, 0.5),
      0 8px 10px rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    border: 1px solid rgba(88, 166, 255, 0.3);
    background-color: #0d1117;
    pointer-events: none;
    will-change: transform;
    opacity: 0.7 !important;
    z-index: 9999 !important;
  }

  @media (max-width: 768px) {
    :global(.chip) {
      padding: 1px 6px;
      font-size: 0.7rem;
    }

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
    top: 60px; /* Start below header */
    left: 0;
    right: 0;
    height: 120px; /* Match the scroll zone height */
    background: linear-gradient(to bottom, rgba(88, 166, 255, 0.15) 0%, transparent 100%);
    pointer-events: none;
    z-index: 9998;
  }

  :global(body.scroll-zone-bottom) {
    position: relative;
  }

  :global(body.scroll-zone-bottom::after) {
    content: '';
    position: fixed;
    bottom: 60px; /* End above footer */
    left: 0;
    right: 0;
    height: 120px; /* Match the scroll zone height */
    background: linear-gradient(to top, rgba(88, 166, 255, 0.15) 0%, transparent 100%);
    pointer-events: none;
    z-index: 9998;
  }
</style>
