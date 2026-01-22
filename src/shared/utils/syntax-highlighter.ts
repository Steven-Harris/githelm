import hljs from 'highlight.js/lib/core';

// Import common languages
import bash from 'highlight.js/lib/languages/bash';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('css', css);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml); // HTML uses XML highlighting
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('php', php);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('c', cpp);
hljs.registerLanguage('dockerfile', dockerfile);

/**
 * Detect language from file extension
 */
export function detectLanguage(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'mjs': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'less': 'css',
    'json': 'json',
    'xml': 'xml',
    'html': 'html',
    'htm': 'html',
    'svg': 'xml',
    'md': 'markdown',
    'markdown': 'markdown',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'fish': 'bash',
    'sql': 'sql',
    'yaml': 'yaml',
    'yml': 'yaml',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'cs': 'csharp',
    'cpp': 'cpp',
    'cxx': 'cpp',
    'cc': 'cpp',
    'c': 'c',
    'h': 'cpp',
    'hpp': 'cpp',
    'dockerfile': 'dockerfile',
    'dockerignore': 'dockerfile',
  };

  // Special case for specific filenames
  const filename_lower = filename.toLowerCase();
  if (filename_lower === 'dockerfile' || filename_lower.includes('dockerfile')) {
    return 'dockerfile';
  }
  if (filename_lower === 'makefile' || filename_lower.includes('makefile')) {
    return 'bash';
  }

  return ext ? languageMap[ext] || null : null;
}

/**
 * Highlight code with syntax highlighting
 */
export function highlightCode(code: string, filename: string): string {
  const language = detectLanguage(filename);

  if (!language) {
    // Return escaped HTML for unknown file types
    return escapeHtml(code);
  }

  try {
    const result = hljs.highlight(code, { language });
    return result.value;
  } catch (_error) {
    // Fallback to auto-detection if specific language fails
    try {
      const result = hljs.highlightAuto(code);
      return result.value;
    } catch (_autoError) {
      // Final fallback to escaped HTML
      return escapeHtml(code);
    }
  }
}

/**
 * Escape HTML characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Get file type icon based on filename
 */
export function getFileTypeIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  // Return emoji or Unicode symbols for different file types
  const iconMap: Record<string, string> = {
    'js': '🟨',
    'jsx': '⚛️',
    'ts': '🔷',
    'tsx': '⚛️',
    'py': '🐍',
    'java': '☕',
    'css': '🎨',
    'scss': '🎨',
    'html': '🌐',
    'md': '📝',
    'json': '📄',
    'yaml': '⚙️',
    'yml': '⚙️',
    'go': '🔵',
    'rs': '🦀',
    'php': '🐘',
    'sql': '🗄️',
    'dockerfile': '🐳',
  };

  return ext ? iconMap[ext] || '📄' : '📄';
}
