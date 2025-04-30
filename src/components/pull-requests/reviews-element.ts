import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AppElement } from '../base/app-element';
import { type Review } from '../../integrations/github';
import checkSVG from '../../assets/check.svg';
import commentSVG from '../../assets/comment.svg';

/**
 * Reviews Component
 * Displays reviewer information for pull requests
 * @element reviews-element
 */
@customElement('reviews-element')
export class ReviewsElement extends AppElement {
  @property({ type: Array }) reviews: Review[] = [];

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
    }
    
    .reviews-container {
      height: 1.75rem;
      display: flex;
      align-items: center;
      overflow: hidden;
    }
    
    .avatar-container {
      position: relative;
      display: inline-block;
      margin-right: 0.25rem;
    }
    
    .avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
    }
    
    .review-state-icon {
      position: absolute;
      bottom: -5px;
      right: -3px;
      width: 15px;
      height: 15px;
    }
    
    .more-approvers {
      color: var(--primary-text-color, white);
      margin-left: 0.5rem;
      font-size: 0.875rem;
    }
  `;

  /**
   * Generate a unique key for a review
   */
  private getUniqueKey(review: Review, index: number): string {
    return review?.id ? `${review.id}-${index}` : `review-${index}`;
  }

  render() {
    if (!this.reviews || this.reviews.length === 0) {
      return html``;
    }

    const displayedReviews = this.reviews.slice(0, 3);
    const hasMoreReviews = this.reviews.length > 3;

    return html`
      <span class="reviews-container">
        ${displayedReviews.map((review, index) => html`
          <div class="avatar-container" key="${this.getUniqueKey(review, index)}">
            <img src="${review.user.avatar_url}" class="avatar" alt="${review.user.login}" />
            ${review.state === "APPROVED" 
              ? html`<img class="review-state-icon approved" alt="approved" src="${checkSVG}" width="15" height="15" />`
              : html`<img class="review-state-icon not-approved" alt="not approved" src="${commentSVG}" width="15" height="15" />`
            }
          </div>
        `)}
        ${hasMoreReviews 
          ? html`<span class="more-approvers">+${this.reviews.length - 3}</span>` 
          : ''
        }
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reviews-element': ReviewsElement;
  }
}