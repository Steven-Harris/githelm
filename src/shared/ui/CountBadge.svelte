<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    repoKey: string;
    type: 'pullRequests' | 'actions';
    count: number;
    iconType: 'pullRequest' | 'action';
    label: string;
  }

  let { repoKey, type, count, iconType, label }: Props = $props();
  
  let previousCount = $state(count);
  let isAnimating = $state(false);
  let changeDirection: 'increase' | 'decrease' | null = $state(null);

  $effect(() => {
    if (previousCount !== count) {
      changeDirection = count > previousCount ? 'increase' : 'decrease';
      isAnimating = true;
      
      // Stop animation after 2 seconds
      setTimeout(() => {
        isAnimating = false;
        changeDirection = null;
      }, 2000);
      
      previousCount = count;
    }
  });
</script>

<span 
  class="text-sm flex items-center gap-2 bg-[#21262d] py-1 px-2 rounded-full transition-all duration-300 {isAnimating ? 'scale-110' : ''}"
  class:bg-green-900={isAnimating && changeDirection === 'increase'}
  class:bg-red-900={isAnimating && changeDirection === 'decrease'}
  class:border-green-500={isAnimating && changeDirection === 'increase'}
  class:border-red-500={isAnimating && changeDirection === 'decrease'}
  class:border={isAnimating}
>
  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="fill-[#8b949e] min-w-[16px]">
    {#if iconType === 'pullRequest'}
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854v4.792a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854v4.792a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 10.5a.75.75 0 1 0 0 1.5.75.75 0 0 0-1.5Zm3.75.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z"></path>
    {:else if iconType === 'action'}
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"></path>
    {/if}
  </svg>
  <span 
    class="text-[#8b949e] transition-colors duration-300"
    class:text-green-300={isAnimating}
  >
    {count} {count === 1 ? label : label + 's'}
  </span>
  
</span>

<style>
  /* Add a subtle pulse animation for the count change */
  :global(.scale-110) {
    animation: pulse 0.6s ease-in-out;
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }
</style>
