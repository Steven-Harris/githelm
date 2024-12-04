<script lang="ts">
  export let actions: { name: string }[] = [];
</script>

<div>
  <h2>Actions</h2>
  {#if actions.length > 0}
    <ul>
      {#each actions as action}
        <li>{action.name}</li>
      {/each}
    </ul>
  {:else}
    <p>No actions found.</p>
  {/if}
</div>

<style>
  div {
    padding: 1em;
    border: 1px solid #ccc;
    margin: 1em 0;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  li {
    background: #f4f4f4;
    margin: 0.5em 0;
    padding: 0.5em;
  }
</style>
