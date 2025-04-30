import { Store } from './base/store';

/**
 * Controller for managing API rate limit state
 * Replaces the kill-switch store from Svelte implementation
 */
export class ApiLimitController extends Store {
  // Events
  static readonly API_LIMIT_CHANGED = 'api-limit-changed';
  
  // Private state
  private _limitExceeded: boolean = false;
  private _rateLimitReset: number | null = null;
  
  /**
   * Check if the API rate limit has been exceeded
   */
  get limitExceeded(): boolean {
    return this._limitExceeded;
  }
  
  /**
   * Get the timestamp when the rate limit resets (if available)
   */
  get rateLimitReset(): number | null {
    return this._rateLimitReset;
  }
  
  /**
   * Set the API limit exceeded state
   * @param exceeded Whether the API limit is exceeded
   * @param resetTime Optional timestamp when the rate limit will reset
   */
  setLimitExceeded(exceeded: boolean, resetTime?: number | null): void {
    const changed = this._limitExceeded !== exceeded || 
                    (resetTime !== undefined && this._rateLimitReset !== resetTime);
    
    if (changed) {
      this._limitExceeded = exceeded;
      
      if (resetTime !== undefined) {
        this._rateLimitReset = resetTime;
      }
      
      this.emitChange(ApiLimitController.API_LIMIT_CHANGED, { 
        limitExceeded: this._limitExceeded,
        rateLimitReset: this._rateLimitReset
      });
    }
  }
  
  /**
   * Reset the API limit exceeded state
   */
  resetLimitExceeded(): void {
    this.setLimitExceeded(false, null);
  }
}

// Create a singleton instance
export const apiLimitController = new ApiLimitController();