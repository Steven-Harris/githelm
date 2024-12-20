<script lang="ts">
  import { firebase } from "../services/firebase.svelte";
  let actions: any[] = $state([]);
  let isLoading = $derived(firebase.loading);
</script>

<section
  id="actions-section"
  class="glow bg-gray-800 pl-5 pr-5 rounded-lg hidden md:block"
>
  <div class="flex justify-between pb-4 pt-3 lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Actions</h2>
    <div>
      <button
        id="edit-actions-button"
        type="button"
        class="hover:underline"
        title="edit actions configuration"
      >
        <img
          alt="edit button"
          title="edit-actions-config"
          src="src/assets/edit.svg"
          width="20"
          height="20"
          class="-mb-1"
        />
      </button>
      <button
        id="save-actions-config-button"
        type="button"
        class="hidden px-2 py-1 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded"
        >Save</button
      >
      <button
        id="cancel-actions-config-button"
        type="button"
        class="hidden px-2 py-1 bg-red-500 hover:bg-red-700 text-white font-bold rounded"
        >Cancel</button
      >
    </div>
  </div>
  {#if !isLoading}
    <p id="actions-not-found">
      No actions found. Configure repositories by clicking the pencil icon
      above.
    </p>
  {/if}
  {#if actions.length > 0}
    <ul>
      {#each actions as action}
        <li>{action.name}</li>
      {/each}
    </ul>
  {/if}
</section>
