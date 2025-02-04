<script lang="ts">
  import { firebase } from "$integrations/firebase";
  import Footer from "$lib/Footer.svelte";
  import Header from "$lib/Header.svelte";
  import Loading from "$lib/Loading.svelte";
  import Tabs from "$lib/Tabs.svelte";
  import { onMount } from "svelte";
  import { pwaAssetsHead } from "virtual:pwa-assets/head";
  import { pwaInfo } from "virtual:pwa-info";
  import "../style.css";
  interface Props {
    children?: import("svelte").Snippet;
  }

  let { children }: Props = $props();

  let signedIn = $state(false);
  let loading = $state(true);
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
  {#if pwaAssetsHead.themeColor}
    <meta name="theme-color" content={pwaAssetsHead.themeColor.content} />
  {/if}
  {#each pwaAssetsHead.links as link}
    <link {...link} />
  {/each}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html webManifest}
</svelte:head>
<Header {signedIn} {isConfig} />
<main class="flex-1 overflow-auto px-5 bg-gray-900 pb-12">
  <Tabs />
  <div id="content" class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 sm:grid-cols-1">
    <Loading {loading} />
    {#if signedIn && !loading}
      {@render children?.()}
    {:else}
      <h1>Login to view your GitHub data</h1>
    {/if}
  </div>
</main>

<Footer {isConfig} />
{#await import("$lib/ReloadPrompt.svelte") then { default: ReloadPrompt }}
  <ReloadPrompt />
{/await}
