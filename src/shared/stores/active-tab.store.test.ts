import { describe, it, expect, beforeEach } from 'vitest';
import { activeTab } from './active-tab.store';
import { get } from 'svelte/store';

describe('Active Tab Store', () => {
  beforeEach(() => {
    // Reset to default value before each test
    activeTab.set('pull-requests');
  });

  it('should have the default value of pull-requests', () => {
    expect(get(activeTab)).toBe('pull-requests');
  });

  it('should update when set is called', () => {
    activeTab.set('actions');
    expect(get(activeTab)).toBe('actions');
  });

  it('should notify subscribers when value changes', () => {
    let notifiedValue = '';

    const unsubscribe = activeTab.subscribe((value) => {
      notifiedValue = value;
    });

    activeTab.set('actions');
    expect(notifiedValue).toBe('actions');

    unsubscribe();
  });

  it('should handle multiple subscribers correctly', () => {
    let value1 = '';
    let value2 = '';

    const unsubscribe1 = activeTab.subscribe((value) => {
      value1 = value;
    });

    const unsubscribe2 = activeTab.subscribe((value) => {
      value2 = value;
    });

    activeTab.set('actions');

    expect(value1).toBe('actions');
    expect(value2).toBe('actions');

    unsubscribe1();
    unsubscribe2();
  });
});
