<script lang="ts">
  interface Props {
    repoKey: string;
    type: 'pullRequests' | 'actions';
    count: number;
    iconType: 'pullRequest' | 'action';
    label: string;
  }

  let { repoKey, type, count, iconType, label }: Props = $props();
  
  let previousCount = $state<number | null>(null);
  let isAnimating = $state(false);
  let changeDirection: 'increase' | 'decrease' | null = $state(null);

  $effect(() => {
    const currentCount = count;

    if (previousCount === null) {
      previousCount = currentCount;
      return;
    }

    if (previousCount !== currentCount) {
      changeDirection = currentCount > previousCount ? 'increase' : 'decrease';
      isAnimating = true;
      
      // Stop animation after 2 seconds
      setTimeout(() => {
        isAnimating = false;
        changeDirection = null;
      }, 2000);
      
      previousCount = currentCount;
    }
  });
</script>

<span 
  class="text-sm flex items-center gap-1 bg-[#21262d] py-1 px-2 rounded-full transition-all duration-300 {isAnimating ? 'scale-110' : ''}"
  class:bg-green-900={isAnimating && changeDirection === 'increase'}
  class:bg-red-900={isAnimating && changeDirection === 'decrease'}
  class:border-green-500={isAnimating && changeDirection === 'increase'}
  class:border-red-500={isAnimating && changeDirection === 'decrease'}
  class:border={isAnimating}
>
  <svg
    aria-hidden="true"
    height="16"
    width="16"
    version="1.1"
    class="fill-[#8b949e] min-w-[16px]"
    viewBox="0 0 512 512"
    preserveAspectRatio="xMidYMid meet"
  >
    {#if iconType === 'pullRequest'}
      <g transform="translate(0,512) scale(0.1,-0.1)" fill="grey" stroke="none">
        <path
          d="
            M 1115, 4604
            c -11, -2, -45, -9, -75, -15
            c -30, -6, -97, -31, -149, -56
            c -79, -38, -109, -59, -177, -127
            c -68, -69, -89, -98, -127, -177
            c -59, -123, -72, -181, -71, -314
            c 2, -166, 50, -297, 160, -431
            c 67, -81, 197, -168, 307, -203
            l 37, -13, 0, -707, 0, -707, -72, -29
            c -196, -76, -339, -228, -405, -430
            c -21, -65, -26, -100, -27, -190
            c -1, -133, 12, -191, 71, -314
            c 38, -79, 59, -108, 127, -177
            c 69, -68, 98, -89, 177, -127
            c 123, -59, 181, -72, 314, -71
            c 88, 1, 125, 6, 187, 26
            c 157, 52, 280, 143, 367, 273
            c 93, 140, 132, 294, 112, 453
            c -32, 262, -198, 474, -440, 562
            l -61, 23, 0, 708, 0, 707, 38, 13
            c 301, 97, 501, 406, 464, 714
            c -35, 285, -216, 501, -487, 584
            c -67, 21, -226, 36, -270, 25
            z
            m 160, -349
            c 157, -41, 257, -169, 257, -330
            c 0, -80, -18, -138, -63, -199
            c -63, -89, -160, -137, -274, -138
            c -162, 0, -290, 100, -331, 261
            c -44, 176, 65, 356, 246, 405
            c 71, 19, 94, 19, 165, 1
            z
            m 37, -2741
            c 91, -32, 170, -112, 204, -206
            c 20, -55, 20, -171, 0, -226
            c -55, -152, -224, -253, -373, -223
            c -203, 40, -327, 224, -279, 412
            c 52, 203, 253, 312, 448, 243
            z
          "
        />
        <path
          d="
            M 2533, 4308
            c -161, -161, -297, -306, -303, -321
            c -14, -39, -13, -92, 4, -130
            c 8, -18, 145, -162, 305, -322
            l 291, -290, 120, 120, 120, 120, -132, 133, -133, 133, 355, -3, 355, -3, 50, -27
            c 60, -32, 124, -97, 156, -158
            l 24, -45, 3, -832, 2, -831, -37, -13
            c -121, -39, -254, -132, -329, -232
            c -95, -125, -138, -254, -138, -412
            c 0, -190, 65, -346, 199, -480
            c 89, -89, 170, -138, 295, -176
            c 106, -33, 264, -33, 370, 0
            c 233, 72, 399, 236, 469, 465
            c 103, 336, -83, 704, -418, 826
            l -60, 22, -4, 832
            c -3, 748, -5, 837, -20, 895
            c -53, 196, -185, 359, -362, 445
            c -133, 66, -153, 68, -549, 73
            l -359, 5, 132, 132, 131, 131, -118, 118
            c -64, 64, -120, 117, -122, 117
            c -3, 0, -137, -132, -297, -292
            z
            m 1509, -2794
            c 103, -36, 184, -129, 214, -243
            c 61, -240, -167, -468, -407, -407
            c -219, 56, -325, 283, -227, 485
            c 73, 150, 258, 223, 420, 165
            z
          "
        />
      </g>
    {:else if iconType === 'action'}
      <g transform="scale(32)" fill="grey">
        <path
          d="
            M 8,0
            a 8,8,0,1,1,0,16
            A 8,8,0,0,1,8,0
            Z
            M 1.5,8
            a 6.5,6.5,0,1,0,13,0
            a 6.5,6.5,0,0,0,-13,0
            Z
            m 4.879,-2.773
            l 4.264,2.559
            a 0.25,0.25,0,0,1,0,0.428
            l -4.264,2.559
            A 0.25,0.25,0,0,1,6,10.559
            V 5.442
            a 0.25,0.25,0,0,1,0.379,-0.215
            Z
          "
        ></path>
      </g>
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
