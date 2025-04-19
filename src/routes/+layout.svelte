<script lang="ts">
  import { firebase, authState } from "$integrations/firebase";
  import { initAuthStateHandling } from "$integrations/github";
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
  let currentAuthState = $state('initializing');
  
  onMount(async () => {
    isConfig = location.pathname === "/config";
    
    firebase.user.subscribe((user) => {
      signedIn = user !== null;
    });
    
    firebase.loading.subscribe((load) => {
      loading = load;
    });
    
    authState.subscribe((state) => {
      currentAuthState = state;
      
      // Initialize GitHub authentication only when Firebase is fully initialized
      if (state === 'authenticated') {
        // Safe to initialize GitHub auth now that Firebase is ready
        initAuthStateHandling();
      }
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
    {#if currentAuthState === 'authenticating'}
      <div class="col-span-full bg-yellow-800 text-white p-2 rounded text-center">
        Authentication in progress - please wait while we connect to GitHub...
      </div>
    {/if}
    
    {#if currentAuthState === 'error'}
      <div class="col-span-full bg-red-800 text-white p-2 rounded text-center">
        Authentication error - please try refreshing the page
      </div>
    {/if}
    
    <Loading {loading} />
    {#if signedIn && !loading && currentAuthState === 'authenticated'}
      {@render children?.()}
    {:else if currentAuthState === 'unauthenticated'}
      <h1>Login to view your GitHub data</h1>
    {/if}
  </div>
</main>

<Footer {isConfig} />
{#await import("$lib/ReloadPrompt.svelte") then { default: ReloadPrompt }}
  <ReloadPrompt />
{/await}
