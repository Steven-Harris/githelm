<footer>
  <div class="px-4 sm:px-6 py-3 flex justify-between items-center gap-4 text-xs">
    <span>© 2025 GitHelm</span>
    <a href="https://www.flaticon.com" title="rudder edit icons" class="hover:underline" target="_blank" rel="noopener">Icons by Flat Icons</a>
  </div>
</footer>

<style>
  footer {
    background: rgba(8, 11, 19, 0.78);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    color: var(--text-faint);
    position: fixed;
    width: 100%;
    bottom: 0;
    z-index: 50;
    border-top: 1px solid var(--line);
  }

  a {
    color: inherit;
    transition: color 150ms var(--ease);
  }

  a:hover {
    color: var(--text-dim);
  }
</style>
