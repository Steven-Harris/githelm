<script lang="ts">
  import { firebase, authState } from "$integrations/firebase";
  import { initAuthStateHandling } from "$integrations/github";
  import Footer from "$lib/Footer.svelte";
  import Header from "$lib/Header.svelte";
  import Loading from "$lib/Loading.svelte";
  import Tabs from "$lib/Tabs.svelte";
  import { loadRepositoryConfigs } from "$lib/stores/repository-service";
  import { isLoading } from "$lib/stores/loading.store";
  import { pwaAssetsHead } from "virtual:pwa-assets/head";
  import { pwaInfo } from "virtual:pwa-info";
  import "../style.css";
  import { onMount } from "svelte";
  
  let { children } = $props();

  // Use derived values instead of explicit store subscriptions
  let webManifest = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : "");
  
  let signedIn = $state(false);
  let loading = $state(false);
  let isAuth = $state();
  let subscriptions = [];
  
  onMount(() => {
    subscriptions.push(isLoading.subscribe((state) => {
      loading = state;
    }));

    subscriptions.push(firebase.user.subscribe((user) => {
      signedIn = user !== null;
    }));
    
    subscriptions.push(authState.subscribe((state) => {
      isAuth = state;
      if (state === 'authenticated') {
        initAuthStateHandling();
        loadRepositoryConfigs();
      }
    }));
    
    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
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

<Header {signedIn}/>

<main class="flex-1 overflow-auto px-5 bg-gray-900 pb-12">
  <Tabs />
  {#if isAuth === 'authenticating'}
    <div class="col-span-full bg-yellow-800 text-white p-2 rounded text-center">
      Authentication in progress - please wait while we connect to GitHub...
    </div>
  {/if}
  
  {#if isAuth === 'error'}
    <div class="col-span-full bg-red-800 text-white p-2 rounded text-center">
      Authentication error - please try refreshing the page
    </div>
  {/if}
    
  <Loading {loading} />
  {#if signedIn && isAuth === 'authenticated'}
    {@render children?.()}
  {:else if isAuth === 'unauthenticated'}
    <h1>Login to view your GitHub data</h1>
  {/if}
</main>

<Footer />

{#await import("$lib/ReloadPrompt.svelte") then { default: ReloadPrompt }}
  <ReloadPrompt />
{/await}
