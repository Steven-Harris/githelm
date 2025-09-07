<script lang="ts">
  interface Props {
    currentMode: 'inline' | 'side-by-side';
    onModeChange: (mode: 'inline' | 'side-by-side') => void;
  }

  let { currentMode, onModeChange }: Props = $props();

  function handleToggle(mode: 'inline' | 'side-by-side') {
    if (mode !== currentMode) {
      onModeChange(mode);
    }
  }
</script>

<div class="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
  <button
    onclick={() => handleToggle('inline')}
    class={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center space-x-1.5 ${
      currentMode === 'inline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
    }`}
    aria-label="Inline diff view"
    title="Show changes inline"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
    <span>Inline</span>
  </button>

  <button
    onclick={() => handleToggle('side-by-side')}
    class={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center space-x-1.5 ${
      currentMode === 'side-by-side' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
    }`}
    aria-label="Side-by-side diff view"
    title="Show changes side-by-side"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      />
    </svg>
    <span>Side by Side</span>
  </button>
</div>
