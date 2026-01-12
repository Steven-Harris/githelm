import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  try {
    return marked.parse(markdown, { async: false });
  } catch {
    return markdown;
  }
}
