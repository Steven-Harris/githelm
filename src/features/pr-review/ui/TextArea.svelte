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

  const baseClasses = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed';
  const computedClasses = `${baseClasses} ${className}`;
</script>

<textarea {id} bind:value {placeholder} {rows} {disabled} {required} class={computedClasses} {oninput} {onkeydown}></textarea>
