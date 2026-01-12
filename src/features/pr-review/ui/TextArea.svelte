<script lang="ts">
  interface Props {
    id?: string;
    value?: string;
    placeholder?: string;
    rows?: number;
    disabled?: boolean;
    required?: boolean;
    class?: string;
    oninput?: (event: Event) => void;
    onkeydown?: (event: KeyboardEvent) => void;
  }

  let { id, value = $bindable(''), placeholder, rows = 3, disabled = false, required = false, class: className = '', oninput, onkeydown }: Props = $props();

  const baseClasses =
    'block w-full rounded-md bg-[#0d1117] text-[#c9d1d9] border border-[#30363d] placeholder:text-[#8b949e] shadow-sm focus:border-[#58a6ff] focus:ring-[#58a6ff] disabled:bg-[#0d1117]/50 disabled:cursor-not-allowed';
  const computedClasses = `${baseClasses} ${className}`;
</script>

<textarea {id} bind:value {placeholder} {rows} {disabled} {required} class={computedClasses} {oninput} {onkeydown}></textarea>
