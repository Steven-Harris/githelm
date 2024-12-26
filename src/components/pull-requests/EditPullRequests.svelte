<script lang="ts">
  import Sortable from "sortablejs";
  import { onMount } from "svelte";
  import EditPullRequestForm from "./EditPullRequestForm.svelte";

  let { configs } = $props();
  onMount(() => {
    const PULL_REQUESTS_CONFIG = document.getElementById("pull-request-configs")!;
    Sortable.create(PULL_REQUESTS_CONFIG, {
      animation: 150,
      ghostClass: "sortable-ghost",
      handle: ".sortable-handle",
    });
  });
</script>

<div id="pull-request-configs">
  {#each configs as config}
    <div class="p-2 bg-gray-700 rounded-md hover:bg-gray-600 mb-2 sortable-handle cursor-move">
      <div class="flex justify-between">
        <span>
          <span class="mr-2">☰</span>
          <strong>
            {config.org}/{config.repo}
          </strong>
        </span>
        <button class="remove-repo-button text-white">
          <span class="hover:font-bold"> &times;</span>
        </button>
      </div>
      {#each config.filters as filter}
        <span class="chip">
          {filter}
        </span>
      {/each}
    </div>
  {/each}
</div>
<EditPullRequestForm />

<style>
  .chip {
    display: inline-block;
    padding: 0.5rem;
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
    margin-right: 0.25rem;
    background-color: var(--tertiary-accent-color);
    color: var(--secondary-text-color);
    border-radius: 0.25rem;
    cursor: pointer;
  }
</style>
