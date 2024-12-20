<script lang="ts">
  import { onMount } from "svelte";
  import ActionsContainer from "./components/ActionsContainer.svelte";
  import Footer from "./components/Footer.svelte";
  import Header from "./components/Header.svelte";
  import PullRequestsContainer from "./components/PullRequestsContainer.svelte";
  import { firebase } from "./services/firebase.svelte";
  import { initPWA } from "./services/pwa";

  let signedIn = $derived(firebase.user !== null);

  onMount(async () => {
    initPWA();
  });
</script>

<Header />

<main class="flex-1 px-5 bg-gray-900">
  <div id="content" class="content grid grid-cols-1 md:grid-cols-2 gap-4">
    {#if !signedIn}
      <h1>Login to view your GitHub data</h1>
    {/if}
    {#if signedIn}
      <PullRequestsContainer />
      <ActionsContainer />
    {/if}
  </div>
</main>

<Footer />
