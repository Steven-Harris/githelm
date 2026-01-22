import type { UIState } from '../types/pr-review.types';

/**
 * Composable for managing UI state (tabs, selections, preferences)
 * Handles user interface state that doesn't involve API calls
 */
export function useUIState() {
  // Reactive UI state
  const state = $state<UIState>({
    activeTab: 'overview',
    selectedFile: null,
    selectedCommit: null,
    showResolvedComments: false,
    expandedFiles: new Set<string>(),
    diffViewMode: 'side-by-side',
    expandFilesOnLoad: true
  });

  let preferencesLoaded = $state(false);

  // Derived values
  const hasSelectedFile = $derived(state.selectedFile !== null);
  const hasSelectedCommit = $derived(state.selectedCommit !== null);
  const expandedFilesList = $derived(Array.from(state.expandedFiles));

  // Tab management
  function setActiveTab(tab: UIState['activeTab']) {
    state.activeTab = tab;

    // Clear file selection when switching away from files tab
    if (tab !== 'files') {
      state.selectedFile = null;
    }

    // Clear commit selection when switching away from commits tab
    if (tab !== 'commits') {
      state.selectedCommit = null;
    }
  }

  // File selection and expansion
  function selectFile(filename: string | null) {
    state.selectedFile = filename;

    // Auto-expand selected file
    if (filename && !state.expandedFiles.has(filename)) {
      toggleFileExpanded(filename);
    }
  }

  function toggleFileExpanded(filename: string) {
    const newExpanded = new Set(state.expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    state.expandedFiles = newExpanded;
  }

  function expandAllFiles(filenames: string[]) {
    state.expandedFiles = new Set(filenames);
  }

  function collapseAllFiles() {
    state.expandedFiles = new Set<string>();
  }

  // Commit selection
  function selectCommit(commitSha: string | null) {
    state.selectedCommit = commitSha;
  }

  // Comment visibility
  function toggleResolvedComments() {
    state.showResolvedComments = !state.showResolvedComments;
  }

  function setShowResolvedComments(show: boolean) {
    state.showResolvedComments = show;
  }

  // Diff view mode
  function setDiffViewMode(mode: UIState['diffViewMode']) {
    state.diffViewMode = mode;
    saveDiffViewMode(mode);
  }

  // Preferences management
  async function loadPreferences() {
    try {
      // Load from localStorage or API
      const saved = localStorage.getItem('pr-review-preferences');
      if (saved) {
        const preferences = JSON.parse(saved);

        if (preferences.diffViewMode) {
          state.diffViewMode = preferences.diffViewMode;
        }
        if (preferences.expandFilesOnLoad !== undefined) {
          state.expandFilesOnLoad = preferences.expandFilesOnLoad;
        }
        if (preferences.showResolvedComments !== undefined) {
          state.showResolvedComments = preferences.showResolvedComments;
        }
      }

      preferencesLoaded = true;
    } catch (error) {
      console.warn('Failed to load preferences:', error);
      preferencesLoaded = true;
    }
  }

  async function savePreferences() {
    try {
      const preferences = {
        diffViewMode: state.diffViewMode,
        expandFilesOnLoad: state.expandFilesOnLoad,
        showResolvedComments: state.showResolvedComments
      };

      localStorage.setItem('pr-review-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save preferences:', error);
    }
  }

  function saveDiffViewMode(mode: UIState['diffViewMode']) {
    state.diffViewMode = mode;
    savePreferences();
  }

  function setExpandFilesOnLoad(expand: boolean) {
    state.expandFilesOnLoad = expand;
    savePreferences();
  }

  // Auto-expand files based on preference
  function autoExpandFiles(filenames: string[]) {
    if (state.expandFilesOnLoad) {
      expandAllFiles(filenames);
    }
  }

  // Reset state
  function reset() {
    state.activeTab = 'overview';
    state.selectedFile = null;
    state.selectedCommit = null;
    state.expandedFiles = new Set<string>();
    // Keep preferences and diff view mode
  }

  // Initialize - load preferences on creation
  $effect(() => {
    if (!preferencesLoaded) {
      loadPreferences();
    }
  });

  return {
    // Reactive state
    state: readonly(state),
    get preferencesLoaded() { return preferencesLoaded; },

    // Computed values
    get hasSelectedFile() { return hasSelectedFile; },
    get hasSelectedCommit() { return hasSelectedCommit; },
    get expandedFilesList() { return expandedFilesList; },

    // Tab actions
    setActiveTab,

    // File actions
    selectFile,
    toggleFileExpanded,
    expandAllFiles,
    collapseAllFiles,
    autoExpandFiles,

    // Commit actions
    selectCommit,

    // Comment actions
    toggleResolvedComments,
    setShowResolvedComments,

    // Preference actions
    setDiffViewMode,
    setExpandFilesOnLoad,
    loadPreferences,
    savePreferences,

    // Utility
    reset
  };
}

// Helper to make objects readonly
function readonly<T>(obj: T): Readonly<T> {
  return obj as Readonly<T>;
}