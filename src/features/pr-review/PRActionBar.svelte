<script lang="ts">
  import type { PullRequest } from '$integrations/github';
  import { isAuthenticated } from '$shared/services/auth.state';
  import { canReviewPullRequest } from './services/review-api.service';

  interface Props {
    pullRequest: PullRequest;
    currentUser?: any;
    onApprove: (comment?: string) => void;
    onRequestChanges: (reason: string) => void;
    onComment: (comment: string) => void;
  }

  let { pullRequest, currentUser, onApprove, onRequestChanges, onComment }: Props = $props();

  // Reactive state for review capabilities
  let canReview = $derived($isAuthenticated && canReviewPullRequest(pullRequest, currentUser));

  // Modal states
  let showApproveModal = $state(false);
  let showRequestChangesModal = $state(false);
  let showCommentModal = $state(false);

  // Form states
  let approveComment = $state('');
  let requestChangesComment = $state('');
  let generalComment = $state('');

  function handleApprove() {
    if (!canReview) return;
    showApproveModal = true;
  }

  function handleRequestChanges() {
    if (!canReview) return;
    showRequestChangesModal = true;
  }

  function handleComment() {
    if (!$isAuthenticated) return;
    showCommentModal = true;
  }

  function submitApprove() {
    onApprove(approveComment.trim() || undefined);
    showApproveModal = false;
    approveComment = '';
  }

  function submitRequestChanges() {
    onRequestChanges(requestChangesComment.trim());
    showRequestChangesModal = false;
    requestChangesComment = '';
  }

  function submitComment() {
    onComment(generalComment.trim());
    showCommentModal = false;
    generalComment = '';
  }

  function closeModals() {
    showApproveModal = false;
    showRequestChangesModal = false;
    showCommentModal = false;
    approveComment = '';
    requestChangesComment = '';
    generalComment = '';
  }

  // Svelte 5: handle event modifiers in functions instead of pipe syntax
  function stopPropagation(e: Event) {
    e.stopPropagation();
  }

  function handleOverlayKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      closeModals();
    }
  }
</script>

  <div class="pr-action-bar">
  <div class="action-buttons">
    {#if canReview}
  <button class="action-btn approve" onclick={handleApprove} title="Approve this pull request" aria-label="Approve pull request"> ✓ Approve </button>

  <button class="action-btn request-changes" onclick={handleRequestChanges} title="Request changes on this pull request" aria-label="Request changes"> ⚠ Request Changes </button>
    {/if}

    {#if $isAuthenticated}
  <button class="action-btn comment" onclick={handleComment} title="Add a comment to this pull request" aria-label="Add comment"> 💬 Comment </button>
    {/if}
  </div>
</div>

<!-- Approve Modal -->
{#if showApproveModal}
  <div class="modal-overlay" onclick={closeModals} tabindex="0" role="button" aria-label="Close modal" onkeydown={handleOverlayKeydown}>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="approve-title" tabindex="-1" onclick={stopPropagation} onkeydown={stopPropagation}>
      <div class="modal-header">
        <h3 id="approve-title">Approve Pull Request</h3>
        <button class="close-btn" onclick={closeModals} aria-label="Close">×</button>
      </div>

      <div class="modal-body">
        <p>You're about to approve this pull request.</p>

        <div class="form-group">
          <label for="approve-comment">Comment (optional):</label>
          <textarea id="approve-comment" bind:value={approveComment} placeholder="Add an optional comment..." rows="3"></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn secondary" onclick={closeModals} aria-label="Cancel approve">Cancel</button>
        <button class="btn primary approve" onclick={submitApprove} aria-label="Confirm approve"> ✓ Approve Pull Request </button>
      </div>
    </div>
  </div>
{/if}

<!-- Request Changes Modal -->
{#if showRequestChangesModal}
  <div class="modal-overlay" onclick={closeModals} tabindex="0" role="button" aria-label="Close modal" onkeydown={handleOverlayKeydown}>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="request-changes-title" tabindex="-1" onclick={stopPropagation} onkeydown={stopPropagation}>
      <div class="modal-header">
        <h3 id="request-changes-title">Request Changes</h3>
        <button class="close-btn" onclick={closeModals} aria-label="Close">×</button>
      </div>

      <div class="modal-body">
        <p>You're about to request changes on this pull request.</p>

        <div class="form-group">
          <label for="request-changes-comment">Comment (required):</label>
          <textarea id="request-changes-comment" bind:value={requestChangesComment} placeholder="Explain what changes are needed..." rows="4" required></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn secondary" onclick={closeModals} aria-label="Cancel request changes">Cancel</button>
        <button class="btn primary request-changes" onclick={submitRequestChanges} aria-label="Submit request changes" disabled={!requestChangesComment.trim()}> ⚠ Request Changes </button>
      </div>
    </div>
  </div>
{/if}

<!-- Comment Modal -->
{#if showCommentModal}
  <div class="modal-overlay" onclick={closeModals} tabindex="0" role="button" aria-label="Close modal" onkeydown={handleOverlayKeydown}>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="comment-title" tabindex="-1" onclick={stopPropagation} onkeydown={stopPropagation}>
      <div class="modal-header">
        <h3 id="comment-title">Add Comment</h3>
        <button class="close-btn" onclick={closeModals} aria-label="Close">×</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="general-comment">Comment:</label>
          <textarea id="general-comment" bind:value={generalComment} placeholder="Add your comment..." rows="4" required></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn secondary" onclick={closeModals} aria-label="Cancel comment">Cancel</button>
        <button class="btn primary comment" onclick={submitComment} aria-label="Add comment" disabled={!generalComment.trim()}> 💬 Add Comment </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .pr-action-bar {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-top: 1px solid #e1e5e9;
    padding: 16px;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
    z-index: 100;
  }

  .action-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
    align-items: center;
  }

  .action-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .action-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .action-btn:active {
    transform: translateY(0);
  }

  .action-btn.approve {
    background: #28a745;
    color: white;
  }

  .action-btn.approve:hover {
    background: #218838;
  }

  .action-btn.request-changes {
    background: #dc3545;
    color: white;
  }

  .action-btn.request-changes:hover {
    background: #c82333;
  }

  .action-btn.comment {
    background: #007bff;
    color: white;
  }

  .action-btn.comment:hover {
    background: #0056b3;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e1e5e9;
    background: #f8f9fa;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    color: #24292e;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6a737d;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .close-btn:hover {
    background: #e1e5e9;
    color: #24292e;
  }

  .modal-body {
    padding: 20px;
    flex: 1;
    overflow-y: auto;
  }

  .modal-body p {
    margin: 0 0 16px 0;
    color: #586069;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;
    color: #24292e;
  }

  .form-group textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
    min-height: 80px;
  }

  .form-group textarea:focus {
    outline: none;
    border-color: #0969da;
    box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px;
    border-top: 1px solid #e1e5e9;
    background: #f8f9fa;
  }

  .btn {
    padding: 8px 16px;
    border: 1px solid;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn.secondary {
    background: white;
    border-color: #d0d7de;
    color: #24292e;
  }

  .btn.secondary:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #afb8c1;
  }

  .btn.primary {
    color: white;
    border-color: transparent;
  }

  .btn.primary.approve {
    background: #28a745;
  }

  .btn.primary.approve:hover:not(:disabled) {
    background: #218838;
  }

  .btn.primary.request-changes {
    background: #dc3545;
  }

  .btn.primary.request-changes:hover:not(:disabled) {
    background: #c82333;
  }

  .btn.primary.comment {
    background: #007bff;
  }

  .btn.primary.comment:hover:not(:disabled) {
    background: #0056b3;
  }

  @media (max-width: 768px) {
    .action-buttons {
      flex-direction: column;
      gap: 8px;
    }

    .action-btn {
      width: 100%;
      justify-content: center;
    }

    .modal {
      width: 95%;
      margin: 20px;
    }

    .modal-header,
    .modal-body,
    .modal-footer {
      padding: 16px;
    }
  }
</style>
