<script lang="ts">
  import { onMount } from "svelte";
  import ActionsContainer from "./components/actions/ActionsContainer.svelte";
  import Footer from "./components/Footer.svelte";
  import Header from "./components/Header.svelte";
  import PullRequestsContainer from "./components/pull-requests/PullRequestsContainer.svelte";
  import Tabs from "./components/Tabs.svelte";
  import { firebase } from "./services/firebase";
  import { initPWA } from "./services/pwa";

  import { isMobile } from "./services/mobile.state";
  let signedIn = $state(false);
  let activeTab = $state("pull-requests");

  onMount(async () => {
    initPWA();
    firebase.user.subscribe((user) => {
      signedIn = user !== null;
    });
  });
  function switchTab(tab: string) {
    activeTab = tab;
  }
</script>

<Header {signedIn} />

<main class="flex-1 overflow-auto px-5 bg-gray-900 pb-12">
  <Tabs {activeTab} {switchTab} />
  <div id="content" class="mt-1 content grid grid-cols-1 md:grid-cols-2 gap-4 sm:grid-cols-1">
    {#if signedIn}
      {#if $isMobile}
        {#if activeTab === "pull-requests"}
          <PullRequestsContainer />
        {:else}
          <ActionsContainer />
        {/if}
      {:else}
        <PullRequestsContainer />
        <ActionsContainer />
      {/if}
    {:else}
      <h1>Login to view your GitHub data</h1>
    {/if}
  </div>
</main>

<Footer />
