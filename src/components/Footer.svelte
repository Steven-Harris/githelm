<script>
  const year = new Date().getFullYear();
</script>

<footer class="p-1 bg-gray-800 flex justify-between items-center">
  <div>
    <a
      href="https://github.com/steven-harris/githelm"
      title="GitHub repository"
      target="_blank"
      rel="noopener"
      class="hover:underline"
    >
      &copy;{year} GitHelm. All rights reserved.</a
    >
  </div>
  <div class="flex-1 text-center align-center">
    <label id="last-updated" class="text-gray-400"></label>
    <button
      type="button"
      title="refresh content"
      id="refresh-button"
      class="hidden"
    >
      <img
        src="src/assets/refresh.svg"
        title="refresh"
        width="20"
        height="20"
        class="pt-2 size-5 text-gray-400"
      />
    </button>
  </div>
  <a
    href="https://www.flaticon.com"
    title="rudder edit icons"
    class="flex-1 hover:underline text-right"
    target="_blank"
    rel="noopener"
    >Icons created by Flat Icons
  </a>
</footer>

<style>
  footer {
    background-color: var(--primary-color);
    color: white;
    padding: 1em;
    text-align: center;
    position: fixed;
    width: 100%;
    bottom: 0;
  }

  p {
    margin: 0;
  }
</style>
