import type { Review, ReviewComment } from '$integrations/github';
import { submitPullRequestComment, submitPullRequestReview, type ReviewSubmission } from './review-api.service';

export interface ReviewActionsService {
  approveReview: (comment?: string) => Promise<void>;
  requestChanges: (comment: string) => Promise<void>;
  submitComment: (comment: string) => Promise<void>;
}

export function createReviewActionsService(
  owner: string,
  repo: string,
  prNumber: number,
  onReviewAdded: (review: Review) => void,
  onCommentAdded: (comment: ReviewComment) => void
): ReviewActionsService {

  async function approveReview(comment?: string): Promise<void> {
    console.log('Approving PR:', { owner, repo, prNumber, comment });

    const review: ReviewSubmission = {
      event: 'APPROVE',
      body: comment || '',
    };

    const newReview = await submitPullRequestReview(owner, repo, prNumber, review);
    onReviewAdded(newReview);
  }

  async function requestChanges(comment: string): Promise<void> {
    console.log('Requesting changes for PR:', { owner, repo, prNumber, comment });

    const review: ReviewSubmission = {
      event: 'REQUEST_CHANGES',
      body: comment,
    };

    const newReview = await submitPullRequestReview(owner, repo, prNumber, review);
    onReviewAdded(newReview);
  }

  async function submitComment(comment: string): Promise<void> {
    console.log('Submitting comment for PR:', { owner, repo, prNumber, comment });

    const newComment = await submitPullRequestComment(owner, repo, prNumber, comment);
    onCommentAdded(newComment);
  }

  return {
    approveReview,
    requestChanges,
    submitComment
  };
}