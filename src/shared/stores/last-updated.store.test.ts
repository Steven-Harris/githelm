import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { manualTrigger, lastUpdatedStore } from './last-updated.store';
import { get } from 'svelte/store';
import * as storage from '$shared/storage/storage';

// Mock the storage module
vi.mock('$shared/storage/storage', () => ({
  getLastUpdated: vi.fn(),
}));

describe('Last Updated Store', () => {
  // Mock Date.now() to return deterministic values
  const mockNow = 1714770000000; // May 4, 2025 (fixed timestamp for consistent tests)
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    // Save original Date.now
    originalDateNow = Date.now;

    // Mock Date.now to return a fixed value
    Date.now = vi.fn().mockReturnValue(mockNow);

    // Reset the manual trigger
    manualTrigger.set(false);

    // Reset mocks
    vi.mocked(storage.getLastUpdated).mockReset();
  });

  afterEach(() => {
    // Restore original Date.now
    Date.now = originalDateNow;

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('manualTrigger store', () => {
    it('should have an initial value of false', () => {
      expect(get(manualTrigger)).toBe(false);
    });

    it('should update when set is called', () => {
      manualTrigger.set(true);
      expect(get(manualTrigger)).toBe(true);
    });

    it('should notify subscribers when the value changes', () => {
      let notifiedValue = false;

      const unsubscribe = manualTrigger.subscribe((value) => {
        notifiedValue = value;
      });

      manualTrigger.set(true);
      expect(notifiedValue).toBe(true);

      unsubscribe();
    });
  });

  describe('lastUpdatedStore function', () => {
    it('should create a readable store with initial value of 0', () => {
      const store = lastUpdatedStore();
      expect(get(store)).toBe(0);
    });

    it('should return a store with a subscribe method', () => {
      const store = lastUpdatedStore();
      expect(typeof store.subscribe).toBe('function');
    });

    it('should notify subscribers with the initial value', () => {
      let receivedValue = -1; // Use a value that's different from the initial value
      const store = lastUpdatedStore();

      const unsubscribe = store.subscribe((value) => {
        receivedValue = value;
      });

      // Initially the value should be 0
      expect(receivedValue).toBe(0);

      unsubscribe();
    });

    it('should setup cleanup function on unsubscribe', () => {
      // This test verifies that the unsubscribe function works
      // by ensuring it can be called without errors
      const store = lastUpdatedStore();
      const unsubscribe = store.subscribe(() => {});

      expect(() => {
        unsubscribe();
      }).not.toThrow();
    });
  });
});
