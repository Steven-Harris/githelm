import { html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AppElement } from '../base/app-element';
import { apiLimitController } from '../../controllers/api-limit.controller';
import { firebase } from '../../integrations/firebase';
import { eventBusController } from '../../controllers/event-bus.controller';

/**
 * Rate Limit Modal Component
 * Displays a modal when the GitHub API rate limit is exceeded
 * @element rate-limit-modal-element
 */
@customElement('rate-limit-modal-element')
export class RateLimitModalElement extends AppElement {
  @state() private limitExceeded: boolean = false;
  @state() private rateLimitReset: number | null = null;
  
  static styles = css`
    :host {
      display: block;
    }
    
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    
    .modal {
      background: var(--primary-color, #1f2937);
      padding: 1.25rem;
      max-width: 40vw;
      border-radius: 0.5rem;
      text-align: center;
    }
    
    h2 {
      font-size: 1.5rem;
      margin-top: 0;
    }
    
    .reset-time {
      margin-top: 1rem;
      font-style: italic;
    }
    
    .button-container {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }
    
    button {
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      background-color: var(--primary-accent-color, #3b82f6);
      color: white;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    
    button:hover {
      background-color: var(--primary-accent-hover-color, #2563eb);
    }
    
    @media (max-width: 768px) {
      .modal {
        max-width: 80vw;
      }
      
      .button-container {
        flex-direction: column;
      }
    }
  `;

  constructor() {
    super();
    
    // Set up API limit controller listener
    this.addStoreListener(
      apiLimitController,
      'api-limit-changed',
      this._handleApiLimitChanged as EventListener
    );
    
    // Initialize state from the controller
    this.limitExceeded = apiLimitController.limitExceeded;
    this.rateLimitReset = apiLimitController.rateLimitReset;
  }
  
  /**
   * Handle changes to the API limit state
   */
  private _handleApiLimitChanged(e: CustomEvent): void {
    this.limitExceeded = e.detail.limitExceeded;
    this.rateLimitReset = e.detail.rateLimitReset;
  }
  
  /**
   * Format the reset time as a human-readable string
   */
  private _formatResetTime(): string {
    if (!this.rateLimitReset) {
      return '';
    }
    
    const resetDate = new Date(this.rateLimitReset);
    return resetDate.toLocaleTimeString();
  }
  
  /**
   * Try again by resetting the API limit exceeded state
   */
  private _tryAgain(): void {
    apiLimitController.resetLimitExceeded();
    eventBusController.dispatchEvent(new CustomEvent('refresh-data'));
  }
  
  /**
   * Re-login to GitHub
   */
  private async _reLogin(): Promise<void> {
    try {
      await firebase.reLogin();
      apiLimitController.resetLimitExceeded();
      eventBusController.dispatchEvent(new CustomEvent('refresh-data'));
    } catch (error) {
      console.error('Error during re-login:', error);
    }
  }

  render() {
    if (!this.limitExceeded) {
      return html``;
    }
    
    return html`
      <div class="modal-overlay">
        <div class="modal">
          <h2>Rate Limit Exceeded</h2>
          <p>
            Unfortunately, GitHub's API Rate Limit has been hit. 
            You can try again or re-login to GitHub.
          </p>
          ${this.rateLimitReset 
            ? html`<p class="reset-time">Rate limit will reset at ${this._formatResetTime()}</p>` 
            : ''}
          <div class="button-container">
            <button @click=${this._tryAgain}>I'm feeling lucky</button>
            <button @click=${this._reLogin}>Re-Login</button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rate-limit-modal-element': RateLimitModalElement;
  }
}