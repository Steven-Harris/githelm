<script lang="ts">
  import Footer from "$lib/Footer.svelte";
  import Header from "$lib/Header.svelte";
  import Tabs from "$lib/Tabs.svelte";
  import { firebase } from "$lib/integrations";
  import { onMount } from "svelte";
  import { pwaInfo } from "virtual:pwa-info";
  import "../style.css";
  let { children } = $props();
  let signedIn = $state(false);
  let loading = $state(true);
  let activeTab = $state("pull-requests");
  let webManifest = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : "");
  let isConfig = $state(false);
  onMount(async () => {
    isConfig = location.pathname === "/config";
    firebase.user.subscribe((user) => {
      signedIn = user !== null;
    });
    firebase.loading.subscribe((load) => {
      loading = load;
    });
  });
</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html webManifest}
</svelte:head>
<Header {signedIn} {isConfig} />
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

<Footer {isConfig} />
{#await import("$lib/ReloadPrompt.svelte") then { default: ReloadPrompt }}
  <ReloadPrompt />
{/await}
