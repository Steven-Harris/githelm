<script lang="ts">
  import type { Snippet } from 'svelte';

  type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
  type ButtonSize = 'sm' | 'md' | 'lg';

  interface Props {
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    onclick?: () => void;
    children: Snippet;
  }

  let { variant = 'primary', size = 'md', disabled = false, loading = false, type = 'button', class: className = '', onclick, children }: Props = $props();

  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d1117] disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-[#2ea043] text-white hover:bg-[#3fb950] focus:ring-[#3fb950]',
    secondary: 'bg-[#30363d] text-[#f0f6fc] hover:bg-[#3d444d] focus:ring-[#58a6ff]',
    danger: 'bg-[#da3633] text-white hover:bg-[#f85149] focus:ring-[#f85149]',
    ghost: 'text-[#c9d1d9] hover:text-[#f0f6fc] hover:bg-white/5 focus:ring-[#58a6ff]',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded',
    md: 'px-4 py-2 text-sm rounded-md',
    lg: 'px-6 py-3 text-base rounded-lg',
  };

  const computedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
</script>

<button {type} class={computedClasses} disabled={disabled || loading} {onclick}>
  {#if loading}
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  {/if}
  {@render children()}
</button>
