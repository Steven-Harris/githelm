<script lang="ts">
  import helmSVG from "$assets/helm.svg";
  import { firebase } from "$integrations/firebase";
  import { eventBus } from "./stores/event-bus.store";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";

  let { signedIn } = $props();
  let isConfig = $derived(page.url.pathname === "/config");

  function save() {
    eventBus.set("save-config");
  }
  
  function cancel() {
    eventBus.set("cancel-config");
    goto("/");
  }
  
  function navigateToConfig() {
    goto("/config");
  }
</script>

<header class="flex justify-between items-center pl-5 pr-5 pb-4 pt-4 sticky top-0 z-10">
  <div id="header" class="flex">
    <img src={helmSVG} alt="site logo" width="50" height="50" class="mr-2" />
    <h1 class="text-4xl font-bold">GitHelm</h1>
  </div>
  <div id="buttons" class="flex space-x-4">
    {#if signedIn}
      {#if isConfig}
        <button onclick={cancel} id="cancel-config-button" type="button" class="nav-button"> Cancel </button>
        <button onclick={save} id="save-config-button" type="button" class="nav-button primary"> Save </button>
      {:else}
        <button onclick={navigateToConfig} id="config-button" type="button" class="nav-button"> Config </button>
        <button onclick={() => firebase.signOut()} id="logout-button" type="button" class="nav-button"> Logout </button>
      {/if}
    {:else}
      <button onclick={() => firebase.signIn()} type="button" class="nav-button"> Login with GitHub </button>
    {/if}
  </div>
</header>

<style>
  header {
    background-color: var(--primary-color);
    color: white;
    padding: 1em;
    text-align: center;
    position: sticky;
    top: 0;
  }

  h1 {
    margin: 0;
  }

  .nav-button {
    background-color: var(--secondary-color);
    border-radius: 0.5rem;
    transition:
      background-color 300ms,
      color 300ms;
    font-size: 0.875rem;
    width: 10rem;
    height: 3rem;
  }

  .nav-button:hover {
    background-color: var(--primary-accent-hover-color);
    color: var(--primary-text-color);
  }

  .primary {
    background-color: var(--primary-accent-color);
  }

  @media (max-width: 768px) {
    .nav-button {
      box-shadow: none;
      background-color: transparent;
      transition: none;
      width: 2rem;
      height: 3rem;
      margin-left: 1rem;
      margin-right: 1rem;
      align-items: center;
      justify-content: center;
    }

    .nav-button::before {
      content: "";
      width: 1.5rem;
      height: 1.5rem;
      background-size: cover;
    }
  }
</style>
