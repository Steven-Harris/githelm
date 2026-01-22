import type { CommentFormState, PendingComment, SelectedLine } from '../types/pr-review.types';

/**
 * Composable for managing comment forms and pending comments
 * Handles form state, validation, and pending comment lifecycle
 */
export function useCommentForms() {
  // Reactive state for comment forms
  const state = $state<CommentFormState>({
    selectedLines: [],
    pendingComments: [],
    isSelectingLines: false,
    activeCommentId: null,
    showGeneralCommentForm: false,
    showApproveForm: false,
    showRequestChangesForm: false
  });

  // Form text states
  let formTexts = $state({
    generalComment: '',
    approveComment: '',
    requestChangesComment: ''
  });

  // Start a comment on selected lines
  function startCommentOnSelectedLines(selectedLines: SelectedLine[]) {
    if (selectedLines.length === 0) return;

    const firstLine = selectedLines[0];
    const lastLine = selectedLines[selectedLines.length - 1];

    const commentId = `pending-${Date.now()}`;
    const pendingComment: PendingComment = {
      id: commentId,
      filename: firstLine.filename,
      startLine: firstLine.lineNumber,
      endLine: selectedLines.length > 1 ? lastLine.lineNumber : undefined,
      side: firstLine.side,
      body: '',
      isPartOfReview: false
    };

    state.pendingComments = [...state.pendingComments, pendingComment];
    state.activeCommentId = commentId;
  }

  // Update a pending comment
  function updatePendingComment(commentId: string, body: string, isPartOfReview?: boolean) {
    state.pendingComments = state.pendingComments.map((comment) => {
      if (comment.id !== commentId) return comment;

      return {
        ...comment,
        body,
        ...(isPartOfReview !== undefined ? { isPartOfReview } : {})
      };
    });
  }

  // Remove a pending comment
  function removePendingComment(commentId: string) {
    state.pendingComments = state.pendingComments.filter(c => c.id !== commentId);

    if (state.activeCommentId === commentId) {
      state.activeCommentId = null;
    }
  }

  // Cancel a pending comment
  function cancelPendingComment(commentId: string) {
    removePendingComment(commentId);
  }

  // Set active comment for editing
  function setActiveComment(commentId: string | null) {
    state.activeCommentId = commentId;
  }

  // General comment form management
  function showGeneralCommentForm() {
    hideAllForms();
    state.showGeneralCommentForm = true;
  }

  function hideGeneralCommentForm() {
    state.showGeneralCommentForm = false;
    formTexts.generalComment = '';
  }

  // Approve form management
  function showApproveForm() {
    hideAllForms();
    state.showApproveForm = true;
  }

  function hideApproveForm() {
    state.showApproveForm = false;
    formTexts.approveComment = '';
  }

  // Request changes form management
  function showRequestChangesForm() {
    hideAllForms();
    state.showRequestChangesForm = true;
  }

  function hideRequestChangesForm() {
    state.showRequestChangesForm = false;
    formTexts.requestChangesComment = '';
  }

  // Hide all forms
  function hideAllForms() {
    state.showGeneralCommentForm = false;
    state.showApproveForm = false;
    state.showRequestChangesForm = false;
    formTexts.generalComment = '';
    formTexts.approveComment = '';
    formTexts.requestChangesComment = '';
  }

  // Submit general comment
  function submitGeneralComment(): string | null {
    const comment = formTexts.generalComment.trim();
    if (!comment) return null;

    hideGeneralCommentForm();
    return comment;
  }

  // Submit approve comment
  function submitApproveComment(): string | undefined {
    const comment = formTexts.approveComment.trim();
    hideApproveForm();
    return comment || undefined;
  }

  // Submit request changes comment
  function submitRequestChangesComment(): string | null {
    const comment = formTexts.requestChangesComment.trim();
    if (!comment) return null;

    hideRequestChangesForm();
    return comment;
  }

  // Validation
  const canSubmitGeneralComment = $derived(formTexts.generalComment.trim().length > 0);
  const canSubmitRequestChanges = $derived(formTexts.requestChangesComment.trim().length > 0);

  // Check if any form is shown
  const hasActiveForm = $derived(
    state.showGeneralCommentForm ||
    state.showApproveForm ||
    state.showRequestChangesForm ||
    state.activeCommentId !== null
  );

  // Get pending comment by ID
  function getPendingComment(commentId: string): PendingComment | undefined {
    return state.pendingComments.find(c => c.id === commentId);
  }

  // Reset all comment form state
  function reset() {
    state.pendingComments = [];
    state.activeCommentId = null;
    state.isSelectingLines = false;
    hideAllForms();
  }

  return {
    // State
    state: readonly(state),
    formTexts: readonly(formTexts),

    // Computed
    get canSubmitGeneralComment() { return canSubmitGeneralComment; },
    get canSubmitRequestChanges() { return canSubmitRequestChanges; },
    get hasActiveForm() { return hasActiveForm; },

    // Pending comment actions
    startCommentOnSelectedLines,
    updatePendingComment,
    removePendingComment,
    cancelPendingComment,
    setActiveComment,
    getPendingComment,

    // Form actions
    showGeneralCommentForm,
    hideGeneralCommentForm,
    showApproveForm,
    hideApproveForm,
    showRequestChangesForm,
    hideRequestChangesForm,
    hideAllForms,

    // Submit actions
    submitGeneralComment,
    submitApproveComment,
    submitRequestChangesComment,

    // Utilities
    reset
  };
}

// Helper to make objects readonly
function readonly<T>(obj: T): Readonly<T> {
  return obj as Readonly<T>;
}