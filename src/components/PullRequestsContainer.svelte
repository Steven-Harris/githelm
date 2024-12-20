<script lang="ts">
  import { onMount } from "svelte";
  import { firebase } from "../services/firebase.svelte";
  import type { RepoConfig } from "../services/models";
  import PullRequest from "./pull-requests/PullRequest.svelte";

  let configs: RepoConfig[] = $state([]);
  let isLoading = $derived(firebase.loading);
  onMount(async () => {
    console.log("Mounting PullRequestsContainer");
    configs = await firebase.getPRsConfig();
  });
</script>

<section
  id="pull-requests-section"
  class="glow bg-gray-800 pl-5 pr-5 rounded-lg"
>
  <div class="flex justify-between pb-4 pt-3 lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Pull Requests</h2>
    <div>
      <button
        id="edit-pull-requests-button"
        type="button"
        class="hover:underline"
        title="edit pull requests configuration"
      >
        <img
          alt="edit pull request config"
          src="src/assets/edit.svg"
          width="20"
          height="20"
          class="-mb-1"
        />
      </button>
      <button
        id="save-pull-requests-config-button"
        type="button"
        class="hidden px-2 py-1 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded"
        >Save</button
      >
      <button
        id="cancel-pull-requests-config-button"
        type="button"
        class="hidden px-2 py-1 bg-red-500 hover:bg-red-700 text-white font-bold rounded"
        >Cancel</button
      >
    </div>
  </div>
  {#if configs.length > 0}
    <ul>
      {#each configs as pr}
        <PullRequest {...pr} />
      {/each}
    </ul>
  {:else if !isLoading}
    <p id="prs-not-found">
      No pull requests found. Configure repositories by clicking the pencil icon
      above.
    </p>
  {/if}
</section>
