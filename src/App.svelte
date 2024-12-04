<script lang="ts">
  import { fetchDataAndSaveToLocalStorage, Firebase } from "@services";
  import { onMount } from "svelte";
  import Actions from "./components/Actions.svelte";
  import Footer from "./components/Footer.svelte";
  import Header from "./components/Header.svelte";
  import PullRequests from "./components/PullRequests.svelte";
  import { initPWA } from "./pwa";

  const firebase = new Firebase();
  let pullRequests: { title: string }[] = [];
  let actions: { name: string }[] = [];

  onMount(async () => {
    initPWA();
    await fetchDataAndSaveToLocalStorage();
    const data = JSON.parse(localStorage.getItem("siteData"));
    pullRequests = data.pullRequests || [];
    actions = data.actions || [];
  });
</script>

<Header {firebase} />

<main class="flex-1 px-5 bg-gray-900">
  <PullRequests {pullRequests} />
  <Actions {actions} />
</main>

<Footer />

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
    flex: 1;
    overflow: auto;
  }

  h1 {
    color: #ff3e00;
    font-size: 2em;
  }
</style>
