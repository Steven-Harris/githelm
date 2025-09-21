/**
 * Scrolls to a specific line in the code and highlights it
 */
export function scrollToLine(filename: string, lineNumber: number): void {
  const lineElement = document.querySelector(
    `[data-filename="${filename}"] [data-line="${lineNumber}"]`
  );

  if (lineElement) {
    // Remove any existing highlights
    document.querySelectorAll('.line-highlight').forEach(el => {
      el.classList.remove('line-highlight');
    });

    // Add highlight to target line
    lineElement.classList.add('line-highlight');

    // Scroll to line with offset for header
    lineElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    // Remove highlight after 3 seconds
    setTimeout(() => {
      lineElement.classList.remove('line-highlight');
    }, 3000);
  }
}

/**
 * Gets the selected text from a range of lines
 */
export function getSelectedText(filename: string, startLine: number, endLine: number): string {
  const lines: string[] = [];

  for (let i = startLine; i <= endLine; i++) {
    const lineElement = document.querySelector(
      `[data-filename="${filename}"] [data-line="${i}"] .line-content`
    );

    if (lineElement) {
      lines.push(lineElement.textContent || '');
    }
  }

  return lines.join('\n');
}

/**
 * Formats line numbers for display
 */
export function formatLineRange(startLine: number, endLine: number): string {
  return startLine === endLine
    ? `Line ${startLine}`
    : `Lines ${startLine}-${endLine}`;
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}