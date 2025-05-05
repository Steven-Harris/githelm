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
  import { derived, readable } from "svelte/store";

  interface Props {
    children?: import('svelte').Snippet
  }

  const { children }: Props = $props();
  
  const pwaInfoStore = readable(pwaInfo);
  let webManifest = derived(pwaInfoStore, ($pwaInfo) => $pwaInfo?.webManifest?.linkTag || '');

  let signedIn = derived(firebase.user, ($user) => $user !== null);
  let isAuth = derived(authState, ($authState) => {
    if ($authState === 'authenticated') {
      initAuthStateHandling();
      loadRepositoryConfigs();
    }
    return $authState;
  });
  
  function login() {
    firebase.signIn();
  }
</script>

<svelte:head>
  {#if pwaAssetsHead.themeColor}
    <meta name="theme-color" content={pwaAssetsHead.themeColor.content} />
  {/if}
  {#each pwaAssetsHead.links as link}
    <link {...link} />
  {/each}
  {@html webManifest}
</svelte:head>

<Header signedIn={signedIn && $authState === "authenticated"}/>

<main class="flex-1 overflow-auto md:px-5 bg-gray-900 pb-12">
  <Tabs />

  {#if $isAuth === 'authenticating'}
    <div class="my-4 mx-auto max-w-3xl bg-yellow-800/80 text-white p-3 rounded-md shadow-lg border border-yellow-700 backdrop-blur-sm text-center">
      <div class="flex items-center justify-center">
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Authentication in progress - please wait while we connect to GitHub...
      </div>
    </div>
  {/if}
  
  {#if $isAuth === 'error'}
    <div class="my-4 mx-auto max-w-3xl bg-red-800/80 text-white p-3 rounded-md shadow-lg border border-red-700 backdrop-blur-sm text-center">
      <div class="flex items-center justify-center">
        <svg class="h-5 w-5 mr-2 text-red-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        Authentication error - please try refreshing the page
      </div>
    </div>
  {/if}
    
  <Loading loading={$isLoading} />
  {#if signedIn && $isAuth === 'authenticated'}
    {@render children?.()}
  {:else }
    <div class="flex flex-col items-center justify-center pt-20">
      <div class="hero-section max-w-md w-full p-8 text-center">
        <h1 class="hero-title text-2xl mb-4">Welcome to GitHelm</h1>
        <p class="text-[#c9d1d9] mb-6">
          Sign in with your GitHub account to monitor pull requests and actions across your repositories.
        </p>
        <button 
          class="flex items-center justify-center mx-auto bg-[#2ea043] hover:bg-[#3fb950] text-white font-medium px-6 py-3 rounded-md transition-all duration-200 shadow-lg hover:shadow-xl transform hover:translate-y-[-1px] active:translate-y-[1px]"
          onclick={login}
        >
          <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"></path>
          </svg>
          <span>Login with GitHub</span>
        </button>
      </div>
    </div>
  {/if}
</main>

<Footer />

{#await import("$lib/ReloadPrompt.svelte") then { default: ReloadPrompt }}
  <ReloadPrompt />
{/await}
