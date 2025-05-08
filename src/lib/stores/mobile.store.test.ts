import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';

describe('Mobile Store', () => {
  // Save original matchMedia function if it exists
  let originalMatchMedia: any;
  let mockMediaQueryList: any;

  beforeEach(() => {
    // Save original window.matchMedia if it exists
    if (typeof window !== 'undefined' && window.matchMedia) {
      originalMatchMedia = window.matchMedia;
    }

    // Create a mock MediaQueryList
    mockMediaQueryList = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    // Mock window.matchMedia
    window.matchMedia = vi.fn().mockReturnValue(mockMediaQueryList);
  });

  afterEach(() => {
    // Restore original matchMedia if it exists
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    }

    vi.resetModules();
  });

  it('should create a store with correct initial value based on media query', async () => {
    // Set mock to return desktop first
    mockMediaQueryList.matches = false;
    
    // Import the module
    const { isMobile } = await import('./mobile.store');
    
    // The initial value should match our mock
    expect(get(isMobile)).toBe(false);
  });

  it('should use the readable store factory', async () => {
    // Import the module
    const mobileStoreModule = await import('./mobile.store');
    
    // Verify that the exported isMobile has a subscribe method (readable store)
    expect(typeof mobileStoreModule.isMobile.subscribe).toBe('function');
  });
});