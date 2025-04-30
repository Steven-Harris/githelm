/**
 * Event Bus Controller
 * Simple event bus for application-wide communication between components
 */
import { Store } from './base/store';

// Event types for application-wide communication
export type EventBusEventType = 'save-config' | 'cancel-config' | 'auth-state-changed' | '';

class EventBusController extends Store {
  private _currentEvent: EventBusEventType = '';
  
  /**
   * Set a new event on the bus
   */
  set(eventType: EventBusEventType): void {
    this._currentEvent = eventType;
    this.dispatchEvent(new CustomEvent(eventType));
  }
  
  /**
   * Get the current event
   */
  get current(): EventBusEventType {
    return this._currentEvent;
  }
}

// Export a singleton instance
export const eventBus = new EventBusController();