<script lang="ts">
  interface ReviewActionsState {
    showGeneralCommentForm: boolean;
    showApproveForm: boolean;
    showRequestChangesForm: boolean;
    generalCommentText: string;
    approveCommentText: string;
    requestChangesText: string;
  }

  interface Props {
    state: ReviewActionsState;
    canReview: boolean;
    isAuthenticated: boolean;
    isSubmitting?: boolean;
    onStateChange: (newState: Partial<ReviewActionsState>) => void;
    onApproveReview?: (comment?: string) => void;
    onRequestChanges?: (reason: string) => void;
    onSubmitGeneralComment?: (comment: string) => void;
  }

  const { state, canReview, isAuthenticated, isSubmitting = false, onStateChange, onApproveReview, onRequestChanges, onSubmitGeneralComment }: Props = $props();

  function cancelAllForms() {
    onStateChange({
      showGeneralCommentForm: false,
      showApproveForm: false,
      showRequestChangesForm: false,
      generalCommentText: '',
      approveCommentText: '',
      requestChangesText: '',
    });
  }

  function handleApproveSubmit() {
    if (onApproveReview) {
      onApproveReview(state.approveCommentText.trim() || undefined);
    }
    onStateChange({
      showApproveForm: false,
      approveCommentText: '',
    });
  }

  function handleRequestChangesSubmit() {
    if (onRequestChanges && state.requestChangesText.trim()) {
      onRequestChanges(state.requestChangesText.trim());
    }
    onStateChange({
      showRequestChangesForm: false,
      requestChangesText: '',
    });
  }

  function handleGeneralCommentSubmit() {
    if (onSubmitGeneralComment && state.generalCommentText.trim()) {
      onSubmitGeneralComment(state.generalCommentText.trim());
    }
    onStateChange({
      showGeneralCommentForm: false,
      generalCommentText: '',
    });
  }
</script>

{#if isAuthenticated}
  <div class="p-4 bg-gray-50">
    <h4 class="text-xs font-medium text-gray-700 uppercase tracking-wide mb-3">Review Actions</h4>

    <div class="space-y-2">
      <!-- General Comment Button -->
      <button
        onclick={() => {
          cancelAllForms();
          onStateChange({ showGeneralCommentForm: true });
        }}
        disabled={isSubmitting}
        class="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        💬 Add Comment
      </button>

      {#if canReview}
        <!-- Approve Button -->
        <button
          onclick={() => {
            cancelAllForms();
            onStateChange({ showApproveForm: true });
          }}
          disabled={isSubmitting}
          class="w-full bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ✓ Approve
        </button>

        <!-- Request Changes Button -->
        <button
          onclick={() => {
            cancelAllForms();
            onStateChange({ showRequestChangesForm: true });
          }}
          disabled={isSubmitting}
          class="w-full bg-red-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ⚠ Request Changes
        </button>
      {/if}
    </div>

    <!-- Comment Forms -->
    {#if state.showGeneralCommentForm}
      <div class="mt-3 border border-blue-200 rounded-lg p-3 bg-white">
        <textarea
          value={state.generalCommentText}
          oninput={(e) => onStateChange({ generalCommentText: (e.target as HTMLTextAreaElement).value })}
          placeholder="Add your comment..."
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="3"
        ></textarea>
        <div class="flex justify-end space-x-2 mt-2">
          <button onclick={cancelAllForms} disabled={isSubmitting} class="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Cancel
          </button>
          <button
            onclick={handleGeneralCommentSubmit}
            disabled={!state.generalCommentText.trim() || isSubmitting}
            class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Adding...' : 'Add Comment'}
          </button>
        </div>
      </div>
    {/if}

    {#if state.showApproveForm}
      <div class="mt-3 border border-green-200 rounded-lg p-3 bg-white">
        <p class="text-sm text-gray-600 mb-2">You're approving this pull request.</p>
        <textarea
          value={state.approveCommentText}
          oninput={(e) => onStateChange({ approveCommentText: (e.target as HTMLTextAreaElement).value })}
          placeholder="Add an optional comment..."
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          rows="3"
        ></textarea>
        <div class="flex justify-end space-x-2 mt-2">
          <button onclick={cancelAllForms} disabled={isSubmitting} class="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Cancel
          </button>
          <button
            onclick={handleApproveSubmit}
            disabled={isSubmitting}
            class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Approving...' : '✓ Approve Pull Request'}
          </button>
        </div>
      </div>
    {/if}

    {#if state.showRequestChangesForm}
      <div class="mt-3 border border-red-200 rounded-lg p-3 bg-white">
        <p class="text-sm text-gray-600 mb-2">You're requesting changes on this pull request.</p>
        <textarea
          value={state.requestChangesText}
          oninput={(e) => onStateChange({ requestChangesText: (e.target as HTMLTextAreaElement).value })}
          placeholder="Explain what changes are needed..."
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          rows="4"
          required
        ></textarea>
        <div class="flex justify-end space-x-2 mt-2">
          <button onclick={cancelAllForms} disabled={isSubmitting} class="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Cancel
          </button>
          <button
            onclick={handleRequestChangesSubmit}
            disabled={!state.requestChangesText.trim() || isSubmitting}
            class="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Requesting...' : '⚠ Request Changes'}
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}
