import type { SelectedLine } from '../types/pr-review.types';

/**
 * Composable for managing line selection in diff views
 * Handles single and multi-line selection for commenting
 */
export function useLineSelection() {
  // Reactive state for line selection
  let state = $state({
    selectedLines: [] as SelectedLine[],
    isSelectingLines: false
  });

  // Select a line (or extend selection)
  function selectLine(filename: string, lineNumber: number, side: 'left' | 'right', content: string) {
    const newSelection: SelectedLine = { filename, lineNumber, side, content };

    // Check if we're extending an existing selection on the same file/side
    const existingSelection = state.selectedLines.find(
      line => line.filename === filename && line.side === side
    );

    if (existingSelection && state.selectedLines.length === 1) {
      // Extend selection to create a range
      const startLine = Math.min(existingSelection.lineNumber, lineNumber);
      const endLine = Math.max(existingSelection.lineNumber, lineNumber);

      // Create range selection
      const rangeSelection: SelectedLine[] = [];
      for (let i = startLine; i <= endLine; i++) {
        rangeSelection.push({
          filename,
          lineNumber: i,
          side,
          content: i === lineNumber ? content : `Line ${i}` // Would need actual content from diff
        });
      }

      state.selectedLines = rangeSelection;
    } else {
      // New selection (replace existing)
      state.selectedLines = [newSelection];
    }

    state.isSelectingLines = true;
  }

  // Check if a specific line is selected
  function isLineSelected(filename: string, lineNumber: number, side: 'left' | 'right'): boolean {
    return state.selectedLines.some(
      line => line.filename === filename &&
        line.lineNumber === lineNumber &&
        line.side === side
    );
  }

  // Clear all line selection
  function clearSelection() {
    state.selectedLines = [];
    state.isSelectingLines = false;
  }

  // Get selected line range info
  const selectionInfo = $derived(() => {
    if (state.selectedLines.length === 0) {
      return null;
    }

    const firstLine = state.selectedLines[0];
    const lastLine = state.selectedLines[state.selectedLines.length - 1];

    return {
      filename: firstLine.filename,
      side: firstLine.side,
      startLine: firstLine.lineNumber,
      endLine: state.selectedLines.length > 1 ? lastLine.lineNumber : undefined,
      lineCount: state.selectedLines.length
    };
  });

  // Check if we have a selection
  const hasSelection = $derived(state.selectedLines.length > 0);

  return {
    // State
    state: readonly(state),

    // Computed
    get selectionInfo() { return selectionInfo; },
    get hasSelection() { return hasSelection; },

    // Actions
    selectLine,
    isLineSelected,
    clearSelection,

    // Utilities
    reset: clearSelection
  };
}

// Helper to make objects readonly
function readonly<T>(obj: T): Readonly<T> {
  return obj as Readonly<T>;
}