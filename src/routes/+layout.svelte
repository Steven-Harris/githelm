<script lang="ts">
  export const prerender = true;
  let { children } = $props();
  import Footer from "$lib/Footer.svelte";
  import Header from "$lib/Header.svelte";
  import Tabs from "$lib/Tabs.svelte";
  import { firebase } from "$lib/integrations";
  import { onMount } from "svelte";
  import "../style.css";
  let signedIn = $state(false);
  let loading = $state(true);
  let activeTab = $state("pull-requests");

  onMount(async () => {
    firebase.user.subscribe((user) => {
      signedIn = user !== null;
    });
    firebase.loading.subscribe((load) => {
      loading = load;
    });
  });
</script>

<Header {signedIn} />
<main class="flex-1 overflow-auto px-5 bg-gray-900 pb-12">
  <Tabs bind:activeTab />
  <div id="content" class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 sm:grid-cols-1">
    {#if signedIn && !loading}
      {@render children()}
    {:else}
      <h1>Login to view your GitHub data</h1>
    {/if}
  </div>
</main>

<Footer />
