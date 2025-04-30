/**
 * Base Store Class
 * Provides event dispatching capabilities for state controllers
 * All controllers should extend this class for consistent behavior
 */
export class Store extends EventTarget {
  /**
   * Create a new store
   */
  constructor() {
    super();
  }
  
  /**
   * Subscribe to store changes with a callback
   * Returns an unsubscribe function
   */
  subscribe(callback: (event?: Event) => void, eventName: string = 'change'): () => void {
    const listener = (event: Event) => callback(event);
    this.addEventListener(eventName, listener);
    
    // Return unsubscribe function
    return () => {
      this.removeEventListener(eventName, listener);
    };
  }
  
  /**
   * Notify subscribers about a change
   */
  protected notify(eventName: string = 'change', detail?: any): void {
    this.dispatchEvent(
      detail 
        ? new CustomEvent(eventName, { detail }) 
        : new Event(eventName)
    );
  }
}