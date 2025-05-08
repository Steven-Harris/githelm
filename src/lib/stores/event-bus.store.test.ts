import { describe, it, expect, beforeEach } from 'vitest';
import { eventBus } from './event-bus.store';
import { get } from 'svelte/store';

describe('Event Bus Store', () => {
  beforeEach(() => {
    // Reset the event bus to an empty string before each test
    eventBus.set('');
  });

  it('should have an empty string as the initial value', () => {
    expect(get(eventBus)).toBe('');
  });

  it('should update when set is called', () => {
    eventBus.set('config-updated');
    expect(get(eventBus)).toBe('config-updated');
  });

  it('should notify subscribers when the value changes', () => {
    let notifiedValue = '';
    
    const unsubscribe = eventBus.subscribe(value => {
      notifiedValue = value;
    });
    
    eventBus.set('organizations-updated');
    expect(notifiedValue).toBe('organizations-updated');
    
    unsubscribe();
  });

  it('should handle multiple events in sequence', () => {
    const events: string[] = [];
    
    const unsubscribe = eventBus.subscribe(value => {
      if (value) {
        events.push(value);
      }
    });
    
    eventBus.set('event-1');
    eventBus.set('event-2');
    eventBus.set('event-3');
    
    expect(events).toEqual(['event-1', 'event-2', 'event-3']);
    
    unsubscribe();
  });

  it('should handle multiple subscribers correctly', () => {
    let value1 = '';
    let value2 = '';
    
    const unsubscribe1 = eventBus.subscribe(value => {
      value1 = value;
    });
    
    const unsubscribe2 = eventBus.subscribe(value => {
      value2 = value;
    });
    
    eventBus.set('save-config');
    
    expect(value1).toBe('save-config');
    expect(value2).toBe('save-config');
    
    unsubscribe1();
    unsubscribe2();
  });

  it('should correctly update using the update method', () => {
    eventBus.set('initial-event');
    
    eventBus.update(currentValue => {
      return currentValue + '-updated';
    });
    
    expect(get(eventBus)).toBe('initial-event-updated');
  });

  it('should stop notifying unsubscribed listeners', () => {
    let valueBeforeUnsubscribe = '';
    let valueAfterUnsubscribe = '';
    
    const unsubscribe = eventBus.subscribe(value => {
      valueBeforeUnsubscribe = value;
    });
    
    eventBus.set('first-event');
    expect(valueBeforeUnsubscribe).toBe('first-event');
    
    unsubscribe();
    
    eventBus.set('second-event');
    expect(valueBeforeUnsubscribe).toBe('first-event'); // Value should not change after unsubscribe
    expect(valueBeforeUnsubscribe).not.toBe('second-event');
  });
});