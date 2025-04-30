import { LitElement, css } from 'lit';

/**
 * Base class for all application components
 * Provides common functionality and styling
 */
export class AppElement extends LitElement {
  private disconnectCallbacks: Array<() => void> = [];
  
  /**
   * Register a callback to be called when the component is disconnected
   * Useful for cleaning up subscriptions and event listeners
   */
  protected addDisconnectCallback(callback: () => void): void {
    this.disconnectCallbacks.push(callback);
  }
  
  /**
   * Called when the element is removed from the DOM
   * Cleans up all registered callbacks
   */
  disconnectedCallback(): void {
    // Call parent implementation first
    super.disconnectedCallback();
    
    // Execute all disconnect callbacks
    this.disconnectCallbacks.forEach(callback => callback());
    
    // Clear the callbacks
    this.disconnectCallbacks = [];
  }
  
  /**
   * Base styles that all components will inherit
   * Import app-wide styles here
   */
  static styles = [
    css`
      :host {
        display: block;
      }
      
      .nav-button {
        background-color: var(--secondary-color, #2d3748);
        border-radius: 0.5rem;
        transition:
          background-color 300ms,
          color 300ms;
        font-size: 0.875rem;
        width: 10rem;
        height: 3rem;
      }

      .nav-button:hover {
        background-color: var(--primary-accent-hover-color, #4a5568);
        color: var(--primary-text-color, #ffffff);
      }

      .primary {
        background-color: var(--primary-accent-color, #3182ce);
      }

      @media (max-width: 768px) {
        .nav-button {
          box-shadow: none;
          background-color: transparent;
          transition: none;
          width: 2rem;
          height: 3rem;
          margin-left: 1rem;
          margin-right: 1rem;
          align-items: center;
          justify-content: center;
        }
      }
    `
  ];
}