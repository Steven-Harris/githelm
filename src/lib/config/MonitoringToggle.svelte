<script lang="ts">
  let { title = "", enabled = false, color = "blue", onChange } = $props();
</script>

<div class="flex items-center justify-between mb-2">
  <h4 class="font-medium text-[#c9d1d9]">{title}</h4>
  <label class="switch">
    <input 
      type="checkbox" 
      checked={enabled}
      onclick={() => onChange(!enabled)}
      aria-label="Toggle {title}"
    >
    <span class="slider round {color}"></span>
  </label>
</div>

<style>
  /* Toggle switch styling */
  .switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 20px;
    cursor: pointer;
  }
  
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(110, 118, 129, 0.4);
    transition: .3s;
    border: 1px solid #30363d;
  }
  
  .slider:before {
    position: absolute;
    content: "";
    height: 14px;
    width: 14px;
    left: 3px;
    bottom: 2px;
    background-color: #c9d1d9;
    transition: .3s;
  }
  
  input:checked + .slider {
    background-color: var(--secondary-accent-color);
  }
  
  input:checked + .slider.blue {
    background-color: #58a6ff;
  }
  
  input:checked + .slider.green {
    background-color: #3fb950;
  }
  
  input:checked + .slider:before {
    transform: translateX(20px);
  }
  
  .slider.round {
    border-radius: 20px;
  }
  
  .slider.round:before {
    border-radius: 50%;
  }
</style>