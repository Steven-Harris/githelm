<script lang="ts">
  import type { Firebase } from "@services";
  let { firebase }: { firebase: Firebase } = $props();

  async function login() {
    await firebase.signIn();
  }
  function logout() {
    firebase.signOut();
  }
</script>

<header
  class="flex justify-between items-center pl-5 pr-5 pb-4 pt-4 sticky top-0 z-10"
>
  <div id="header" class="flex">
    <img
      src="src/assets/helm.svg"
      alt="site logo"
      width="50"
      height="50"
      class="mr-2"
    />
    <h1 class="text-4xl font-bold">GitHelm</h1>
  </div>
  <div id="buttons" class="flex space-x-4">
    <button onclick={login} type="button" class="nav-button">
      Login with GitHub
    </button>
    <button
      onclick={logout}
      id="logout-button"
      type="button"
      class="hidden nav-button"
    >
      Logout
    </button>
  </div>
</header>

<style>
  header {
    background-color: var(--primary-color);
    color: white;
    padding: 1em;
    text-align: center;
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
    background-color: var(--secondary-accent-color);
    color: var(--primary-color);
  }

  @media (max-width: 768px) {
    .nav-button {
      box-shadow: none;
      background-color: transparent;
      transition: none;
      width: 7rem;
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
