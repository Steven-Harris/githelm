<script lang="ts">
  import { onMount } from "svelte";
  import { derived as watch } from "svelte/store";
  import Actions from "./components/Actions.svelte";
  import Footer from "./components/Footer.svelte";
  import Header from "./components/Header.svelte";
  import Loading from "./components/Loading.svelte";
  import PullRequests from "./components/PullRequests.svelte";
  import { firebase } from "./services/firebase.svelte";
  import { fetchDataAndSaveToLocalStorage } from "./services/github";
  import { initPWA } from "./services/pwa";
  import { storage } from "./services/storage.svelte";

  let { pullRequests, actions } = storage.data;
  let signedIn = $derived(firebase.user !== null);
  let isLoading = $derived(signedIn && !firebase.loading && !storage.loading);
  watch(firebase.config, async (config) => {
    await fetchDataAndSaveToLocalStorage(config);
  });

  onMount(async () => {
    initPWA();
  });
</script>

<Header
  {signedIn}
  login={async () => await firebase.signIn()}
  logout={() => firebase.signOut()}
/>

<main class="flex-1 px-5 bg-gray-900">
  <div id="content" class="content grid grid-cols-1 md:grid-cols-2 gap-4">
    {#if !signedIn}
      <h1>Login to view your GitHub data</h1>
    {/if}
    {#if signedIn}
      <Loading {isLoading} />
      <PullRequests {isLoading} {pullRequests} />
      <Actions {isLoading} {actions} />
    {/if}
  </div>
</main>

<Footer />
