<script lang="ts">
  import AppLayout from "$features/home/AppLayout.svelte";

  interface Props {
    children?: import('svelte').Snippet;
  }

  const { children }: Props = $props();
</script>

<AppLayout>
  {@render children?.()}
</AppLayout>
