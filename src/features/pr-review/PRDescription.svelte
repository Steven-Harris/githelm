<script lang="ts">
  import { marked } from 'marked';

  interface Props {
    body: string;
    title: string;
  }

  const { body, title }: Props = $props();

  let expanded = $state(false);

  const COLLAPSED_HEIGHT = 150; // px

  const shouldShowToggle = $derived.by(() => body.length > 200);

  // Configure marked options for security and styling
  marked.setOptions({
    breaks: true, // Convert line breaks to <br>
    gfm: true, // GitHub Flavored Markdown
  });

  // Always render the full markdown so tables/structure are never broken
  const renderedMarkdown = $derived.by(() => {
    try {
      return marked.parse(body);
    } catch (error) {
      console.error('Error rendering markdown:', error);
      return body;
    }
  });

  // Check if the content has markdown formatting
  const hasMarkdown = $derived.by(() => {
    return (
      body.includes('**') || // Bold
      body.includes('*') || // Italic
      body.includes('`') || // Code
      body.includes('[') || // Links
      body.includes('#') || // Headers
      body.includes('|') || // Tables
      body.includes('>') || // Blockquotes
      body.includes('-') || // Lists
      body.includes('\n```') // Code blocks
    );
  });
</script>

<div class="mt-3">
  <div
    class="relative"
    class:collapsed={shouldShowToggle && !expanded}
  >
    {#if hasMarkdown}
      <div class="gh-markdown prose prose-sm max-w-none prose-invert">
        {@html renderedMarkdown}
      </div>
    {:else}
      <div class="text-sm text-[#c9d1d9] whitespace-pre-line">
        {body}
      </div>
    {/if}
    {#if shouldShowToggle && !expanded}
      <div class="collapsed-fade"></div>
    {/if}
  </div>
  {#if shouldShowToggle}
    <button onclick={() => (expanded = !expanded)} class="text-blue-600 hover:text-blue-800 text-sm mt-1 font-medium">
      {expanded ? 'Show less' : 'Show more'}
    </button>
  {/if}
</div>

<style>
  .collapsed {
    max-height: 150px;
    overflow: hidden;
  }

  .collapsed-fade {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50px;
    background: linear-gradient(to bottom, transparent, var(--color-bg, #0d1117));
    pointer-events: none;
  }
</style>
