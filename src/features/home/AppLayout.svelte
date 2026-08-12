<script lang="ts">
  import { page } from '$app/stores';
  import { configPageService } from '$features/config/services/config-page.service';
  import { initAuthStateHandling } from '$integrations/github';
  import { Breadcrumb, ReloadPrompt } from '$shared';
  import { repositoryFacade } from '$shared/stores/repository.facade';
  import { pollingPaused } from '$shared/stores/polling-paused.store';
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
    const pathname = $page.url.pathname;
    pollingPaused.set(pathname.startsWith('/pr') || pathname.startsWith('/config') || pathname.startsWith('/settings'));
  });

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
<Breadcrumb />

<main class="flex-1 overflow-auto px-3 sm:px-5 lg:px-8 pb-24">
  <Tabs />

  {#if $authState.isAuth === 'error'}
    <div class="my-4 mx-auto max-w-3xl p-3 rounded-xl text-center" style="background: rgba(255,107,98,0.12); border: 1px solid rgba(255,107,98,0.35); color: #ffb3ae;">
      <div class="flex items-center justify-center">
        <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        We couldn't verify your session. Refresh the page to sign in again.
      </div>
    </div>
  {/if}

  {#if $authState.shouldShowContent}
    {@render children?.()}
  {:else if $authState.isConfigLoading}
    <div class="flex flex-col items-center justify-center pt-24">
      <div class="hero-section max-w-md w-full p-10 text-center fade-in">
        <div class="animate-spin mx-auto w-7 h-7 mb-5" aria-hidden="true">
          <svg class="w-full h-full" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="rgba(148,168,205,0.18)" stroke-width="1.5" />
            <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="var(--beacon)" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>
        <h1 class="welcome-title">Bringing your repositories aboard</h1>
        <p class="text-[var(--text-dim)]">Loading the repositories you're monitoring.</p>
      </div>
    </div>
  {:else if $authState.shouldShowConfigurePrompt}
    <div class="flex flex-col items-center justify-center pt-24">
      <div class="hero-section max-w-md w-full p-10 text-center fade-in">
        <h1 class="welcome-title">You're signed in</h1>
        <p class="text-[var(--text-dim)] mb-8">Pick the repositories you want on the bridge, and GitHelm will keep their pull requests and workflow runs in view.</p>
        <button class="beacon-button mx-auto" onclick={() => homePageService.goToConfig()}>
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
          </svg>
          <span>Choose repositories</span>
        </button>
      </div>
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center pt-24">
      <div class="hero-section max-w-md w-full p-10 text-center fade-in">
        <h1 class="welcome-title">Every pull request and run, one bridge</h1>
        <p class="text-[var(--text-dim)] mb-8">Sign in with GitHub to watch pull requests and workflow runs across all the repositories you care about.</p>
        <button class="beacon-button mx-auto" onclick={() => homePageService.login()} disabled={$authState.isAuthLoading}>
          {#if $authState.isAuthLoading}
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>
              {#if $authState.isAuth === 'initializing'}
                Initializing…
              {:else}
                Signing in…
              {/if}
            </span>
          {:else}
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
              ></path>
            </svg>
            <span>Continue with GitHub</span>
          {/if}
        </button>
      </div>
    </div>
  {/if}
</main>

<Footer />

<ReloadPrompt />

<style>
  .welcome-title {
    font-family: var(--font-display);
    font-size: 1.625rem;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.025em;
    text-wrap: balance;
    color: #fff;
    margin-bottom: 0.75rem;
  }
</style>
