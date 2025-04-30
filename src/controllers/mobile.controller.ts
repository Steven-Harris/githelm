import { Store } from './base/store';

/**
 * Controller for handling responsive layout detection
 */
export class MobileController extends Store {
  // Events
  static readonly MOBILE_CHANGED = 'mobile-changed';
  
  // Private state
  private _isMobile: boolean = false;
  private _mediaQuery: MediaQueryList;
  
  constructor() {
    super();
    
    this._mediaQuery = window.matchMedia("(max-width: 768px)");
    this._isMobile = this._mediaQuery.matches;
    
    // Set up the event listener for media query changes
    this._mediaQuery.addEventListener("change", this._handleMediaQueryChange.bind(this));
  }
  
  /**
   * Get whether the current viewport is mobile-sized
   */
  get isMobile(): boolean {
    return this._isMobile;
  }
  
  /**
   * Handle media query changes
   */
  private _handleMediaQueryChange(e: MediaQueryListEvent): void {
    this._isMobile = e.matches;
    this.emitChange(MobileController.MOBILE_CHANGED, { isMobile: this._isMobile });
  }
  
  /**
   * Clean up resources when controller is no longer needed
   */
  dispose(): void {
    this._mediaQuery.removeEventListener("change", this._handleMediaQueryChange.bind(this));
  }
}

// Create a singleton instance
export const mobileController = new MobileController();