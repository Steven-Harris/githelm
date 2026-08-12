<script lang="ts">
  let { title = '', enabled = false, color = 'blue', onChange } = $props();
</script>

<div class="flex items-center justify-between gap-3">
  <h4 class="toggle-title">{title}</h4>
  <label class="switch">
    <input type="checkbox" checked={enabled} onclick={() => onChange(!enabled)} aria-label="Monitor {title}" />
    <span class="slider {color}"></span>
  </label>
</div>

<style>
  .toggle-title {
    font-family: var(--font-display);
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .switch {
    position: relative;
    display: inline-block;
    flex-shrink: 0;
    width: 38px;
    height: 21px;
    cursor: pointer;
  }

  .switch input {
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    cursor: pointer;
  }

  .slider {
    position: absolute;
    inset: 0;
    cursor: pointer;
    border-radius: 999px;
    background-color: rgba(148, 168, 205, 0.16);
    border: 1px solid var(--line-strong);
    transition:
      background-color 240ms var(--ease),
      border-color 240ms var(--ease),
      box-shadow 240ms var(--ease);
  }

  .slider::before {
    position: absolute;
    content: '';
    height: 15px;
    width: 15px;
    left: 2px;
    top: 2px;
    border-radius: 50%;
    background-color: var(--text-dim);
    transition:
      transform 240ms var(--ease),
      background-color 240ms var(--ease);
  }

  input:checked + .slider {
    background-color: var(--beacon-dim);
    border-color: var(--beacon);
    box-shadow: 0 2px 10px -2px rgba(47, 212, 193, 0.5);
  }

  input:checked + .slider.blue {
    background-color: rgba(121, 184, 255, 0.22);
    border-color: var(--link);
    box-shadow: 0 2px 10px -2px rgba(121, 184, 255, 0.5);
  }

  input:checked + .slider.green {
    background-color: rgba(63, 211, 130, 0.22);
    border-color: var(--success);
    box-shadow: 0 2px 10px -2px rgba(63, 211, 130, 0.5);
  }

  input:checked + .slider::before {
    transform: translateX(17px);
    background-color: #fff;
  }

  input:focus-visible + .slider {
    outline: 2px solid var(--beacon);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .slider,
    .slider::before {
      transition: none;
    }
  }
</style>
