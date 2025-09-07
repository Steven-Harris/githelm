<script lang="ts">
  import { configPageService } from '$features/config/services/config-page.service';
  import { initAuthStateHandling } from '$integrations/github';
  import { ReloadPrompt } from '$shared';
  import { repositoryFacade } from '$shared/stores/facades/repository.facade';
  import { pwaAssetsHead } from 'virtual:pwa-assets/head';
  import { pwaInfo } from 'virtual:pwa-info';
  import '../../style.css';
  import Footer from './Footer.svelte';
  import Header from './Header.svelte';
  import Tabs from './Tabs.svelte';
  import { homePageService } from './services/home-page.service';

  interface Props {
    children?: import('svelte').Snippet;
  }

  const { children }: Props = $props();

  const authState = homePageService.getAuthState();
  let configsLoaded = $state(false);
  let isLoadingConfigs = $state(false);

  $effect(() => {
    if ($authState.isAuth === 'authenticated' && !configsLoaded && !isLoadingConfigs) {
      isLoadingConfigs = true;
      initAuthStateHandling();
      configPageService
        .loadConfigurations()
        .then(() => {
          configsLoaded = true;
          isLoadingConfigs = false;
        })
        .catch((error) => {
          isLoadingConfigs = false;
        });
    } else if ($authState.isAuth === 'unauthenticated') {
      repositoryFacade.clearAllStores();
      configsLoaded = false;
      isLoadingConfigs = false;
    }
  });
</script>

<svelte:head>
  {#if pwaAssetsHead.themeColor}
    <meta name="theme-color" content={pwaAssetsHead.themeColor.content} />
  {/if}
  {#each pwaAssetsHead.links as link}
    <link {...link} />
  {/each}
  {#if pwaInfo?.webManifest?.href}
    <link rel="manifest" href={pwaInfo.webManifest.href} />
  {/if}
</svelte:head>

<Header signedIn={$authState.signedIn && $authState.isAuth === 'authenticated'} />

<main class="flex-1 overflow-auto md:px-5 bg-gray-900 pb-12">
  <Tabs />

  {#if $authState.isAuth === 'error'}
    <div class="my-4 mx-auto max-w-3xl bg-red-800/80 text-white p-3 rounded-md shadow-lg border border-red-700 text-center">
      <div class="flex items-center justify-center">
        <svg class="h-5 w-5 mr-2 text-red-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        Authentication error - please try refreshing the page
      </div>
    </div>
  {/if}

  {#if $authState.shouldShowContent}
    {@render children?.()}
  {:else if $authState.isConfigLoading}
    <div class="flex flex-col items-center justify-center pt-20">
      <div
        class="hero-section max-w-md w-full p-8 text-center"
        style="background:#22272e;border:1px solid #3a3f4b;box-shadow:0 8px 32px rgba(0,0,0,0.18);color-scheme:light dark;forced-color-adjust:none;"
      >
        <div class="animate-spin mx-auto w-8 h-8 mb-4">
          <svg class="w-full h-full text-[#58a6ff] fill-current" viewBox="0 0 16 16">
            <path d="M8 16a8 8 0 1 1 0-16 8 8 0 0 1 0 16ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
            <path class="text-[#0d1117] fill-current" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Z"></path>
          </svg>
        </div>
        <h1 class="hero-title text-2xl mb-4">Loading Configuration</h1>
        <p class="text-[#c9d1d9] mb-6">Please wait while we load your repository configurations...</p>
      </div>
    </div>
  {:else if $authState.shouldShowConfigurePrompt}
    <div class="flex flex-col items-center justify-center pt-20">
      <div class="hero-section max-w-md w-full p-8 text-center">
        <h1 class="hero-title text-2xl mb-4" style="color:#fff;font-weight:800;text-shadow:0 2px 8px #22272e,0 0 1px #000;">Welcome to GitHelm</h1>
        <p class="text-[#c9d1d9] mb-6">You're all set up! Now let's configure which repositories you'd like to monitor for pull requests and actions.</p>
        <button
          class="flex items-center justify-center mx-auto bg-[#2ea043] hover:bg-[#3fb950] text-white font-medium px-6 py-3 rounded-md transition-all duration-200 shadow-lg hover:shadow-xl transform hover:translate-y-[-1px] active:translate-y-[1px]"
          onclick={() => homePageService.goToConfig()}
        >
          <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
          </svg>
          <span>Configure Repositories</span>
        </button>
      </div>
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center pt-20">
      <div class="hero-section max-w-md w-full p-8 text-center">
        <h1 class="hero-title text-2xl mb-4" style="color:#fff;font-weight:800;text-shadow:0 2px 8px #22272e,0 0 1px #000;">Welcome to GitHelm</h1>
        <p class="text-[#c9d1d9] mb-6">Sign in with your GitHub account to monitor pull requests and actions across your repositories.</p>
        <button
          class="flex items-center justify-center mx-auto bg-[#2ea043] hover:bg-[#3fb950] text-white font-medium px-6 py-3 rounded-md transition-all duration-200 shadow-lg hover:shadow-xl transform hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={() => homePageService.login()}
          disabled={$authState.isAuthLoading}
        >
          {#if $authState.isAuthLoading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>
              {#if $authState.isAuth === 'initializing'}
                Initializing...
              {:else}
                Logging in...
              {/if}
            </span>
          {:else}
            <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
              ></path>
            </svg>
            <span>Login with GitHub</span>
          {/if}
        </button>
      </div>
    </div>
  {/if}
</main>

<Footer />

<ReloadPrompt />
