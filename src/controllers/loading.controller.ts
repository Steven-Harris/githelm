import { Store } from './base/store';

/**
 * Loading Controller
 * Manages application-wide loading states
 */
class LoadingController extends Store {
  static readonly LOADING_CHANGED = 'loading-changed';
  
  private _isLoading = false;
  private _loadingOperations = new Set<string>();
  
  /**
   * Start a new loading operation
   * @param id Unique identifier for the loading operation
   */
  startLoading(id: string = 'default'): void {
    this._loadingOperations.add(id);
    
    if (!this._isLoading) {
      this._isLoading = true;
      this.dispatchEvent(new CustomEvent(LoadingController.LOADING_CHANGED, { 
        detail: { isLoading: true } 
      }));
    }
  }
  
  /**
   * Complete a loading operation
   * @param id Identifier of the operation to complete
   */
  finishLoading(id: string = 'default'): void {
    this._loadingOperations.delete(id);
    
    if (this._isLoading && this._loadingOperations.size === 0) {
      this._isLoading = false;
      this.dispatchEvent(new CustomEvent(LoadingController.LOADING_CHANGED, { 
        detail: { isLoading: false } 
      }));
    }
  }
  
  /**
   * Check if any loading operation is in progress
   */
  get isLoading(): boolean {
    return this._isLoading;
  }
  
  /**
   * Get the count of active loading operations
   */
  get operationCount(): number {
    return this._loadingOperations.size;
  }
}

// Export a singleton instance
export const loadingController = new LoadingController();