<script lang="ts">
  import { marked } from 'marked';

  interface Props {
    body: string;
    title: string;
  }

  const { body, title }: Props = $props();

  let expanded = $state(false);

  // Check if this looks like a dependabot or automated PR
  const isAutomatedPR = $derived(() => {
    const lowerTitle = title.toLowerCase();
    const lowerBody = body.toLowerCase();
    return (
      lowerTitle.includes('dependabot') ||
      lowerTitle.includes('bump') ||
      lowerBody.includes('dependabot') ||
      body.includes('## ') || // Has markdown headers
      body.includes('| ') || // Has tables
      body.length > 500
    ); // Very long description
  });

  // For automated PRs, show a much shorter preview
  const previewLength = $derived(() => (isAutomatedPR() ? 100 : 200));
  const shouldShowToggle = $derived(() => body.length > previewLength());

  const displayText = $derived(() => {
    if (!shouldShowToggle() || expanded) return body;
    return body.substring(0, previewLength()) + '...';
  });

  // Simple markdown-to-text converter for preview
  function stripMarkdown(text: string): string {
    return text
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/`(.*?)`/g, '$1') // Remove code formatting
      .replace(/\|.*\|/g, '') // Remove table rows
      .replace(/---+/g, '') // Remove horizontal rules
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim();
  }

  // Configure marked options for security and styling
  marked.setOptions({
    breaks: true, // Convert line breaks to <br>
    gfm: true, // GitHub Flavored Markdown
  });

  const cleanText = $derived(() => stripMarkdown(displayText()));
  const renderedMarkdown = $derived(() => {
    // Always render markdown when expanded, or when there's no toggle needed
    if ((expanded && shouldShowToggle()) || !shouldShowToggle()) {
      try {
        return marked.parse(displayText());
      } catch (error) {
        console.error('Error rendering markdown:', error);
        return displayText();
      }
    }
    return null;
  });

  // Check if the content has markdown formatting
  const hasMarkdown = $derived(() => {
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
  {#if hasMarkdown() && (renderedMarkdown() || (!shouldShowToggle() && !expanded))}
    <!-- Render markdown when there's markdown content -->
    <div class="gh-markdown prose prose-sm max-w-none prose-invert">
      {@html renderedMarkdown()}
    </div>
  {:else}
    <!-- Show plain text when no markdown or in preview mode -->
    <div class="text-sm text-[#c9d1d9] whitespace-pre-line">
      {cleanText()}
    </div>
  {/if}
  {#if shouldShowToggle()}
    <button onclick={() => (expanded = !expanded)} class="text-blue-600 hover:text-blue-800 text-sm mt-1 font-medium">
      {expanded ? 'Show less' : 'Show more'}
    </button>
  {/if}
</div>
