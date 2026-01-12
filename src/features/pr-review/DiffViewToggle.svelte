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

<div class="flex items-center space-x-1 bg-[#0d1117] border border-[#30363d] rounded-lg p-1">
  <button
    onclick={() => handleToggle('inline')}
    class={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center space-x-1.5 ${
      currentMode === 'inline' ? 'bg-[#161b22] text-[#f0f6fc]' : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-white/5'
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
      currentMode === 'side-by-side' ? 'bg-[#161b22] text-[#f0f6fc]' : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-white/5'
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
