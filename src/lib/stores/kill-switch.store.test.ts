import { describe, it, expect, beforeEach } from 'vitest';
import { killSwitch } from './kill-switch.store';
import { get } from 'svelte/store';

describe('Kill Switch Store', () => {
  beforeEach(() => {
    // Reset the kill switch to false before each test
    killSwitch.set(false);
  });

  it('should have false as the initial value', () => {
    expect(get(killSwitch)).toBe(false);
  });

  it('should update when set is called', () => {
    killSwitch.set(true);
    expect(get(killSwitch)).toBe(true);
  });

  it('should notify subscribers when the value changes', () => {
    let notifiedValue = false;

    const unsubscribe = killSwitch.subscribe((value) => {
      notifiedValue = value;
    });

    killSwitch.set(true);
    expect(notifiedValue).toBe(true);

    killSwitch.set(false);
    expect(notifiedValue).toBe(false);

    unsubscribe();
  });

  it('should handle multiple subscribers correctly', () => {
    let value1 = false;
    let value2 = false;

    const unsubscribe1 = killSwitch.subscribe((value) => {
      value1 = value;
    });

    const unsubscribe2 = killSwitch.subscribe((value) => {
      value2 = value;
    });

    killSwitch.set(true);

    expect(value1).toBe(true);
    expect(value2).toBe(true);

    unsubscribe1();
    unsubscribe2();
  });

  it('should correctly update using the update method', () => {
    killSwitch.set(false);

    killSwitch.update((currentValue) => !currentValue);

    expect(get(killSwitch)).toBe(true);

    killSwitch.update((currentValue) => !currentValue);

    expect(get(killSwitch)).toBe(false);
  });

  it('should stop notifying unsubscribed listeners', () => {
    let valueBeforeUnsubscribe = false;

    const unsubscribe = killSwitch.subscribe((value) => {
      valueBeforeUnsubscribe = value;
    });

    killSwitch.set(true);
    expect(valueBeforeUnsubscribe).toBe(true);

    unsubscribe();

    killSwitch.set(false);
    // Value should remain true as the listener is unsubscribed
    expect(valueBeforeUnsubscribe).toBe(true);
  });
});
