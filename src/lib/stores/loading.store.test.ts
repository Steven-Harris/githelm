import { describe, it, expect, beforeEach } from 'vitest';
import { isLoading, startRequest, endRequest, withLoading } from './loading.store';
import { get } from 'svelte/store';

describe('Loading Store', () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    // We need to call endRequest multiple times to ensure counter is reset to 0
    while (get(isLoading)) {
      endRequest();
    }
  });

  describe('isLoading store', () => {
    it('should have an initial value of false', () => {
      expect(get(isLoading)).toBe(false);
    });

    it('should update to true when startRequest is called', () => {
      startRequest();
      expect(get(isLoading)).toBe(true);
    });

    it('should update to false when all requests are ended', () => {
      startRequest();
      expect(get(isLoading)).toBe(true);
      
      endRequest();
      expect(get(isLoading)).toBe(false);
    });

    it('should remain true when multiple requests are started and only some are ended', () => {
      startRequest();
      startRequest();
      startRequest();
      
      expect(get(isLoading)).toBe(true);
      
      endRequest();
      expect(get(isLoading)).toBe(true);
      
      endRequest();
      expect(get(isLoading)).toBe(true);
      
      endRequest();
      expect(get(isLoading)).toBe(false);
    });
  });

  describe('startRequest function', () => {
    it('should increment the pending requests counter', () => {
      startRequest();
      expect(get(isLoading)).toBe(true);
      
      startRequest();
      endRequest();
      expect(get(isLoading)).toBe(true);
    });
  });

  describe('endRequest function', () => {
    it('should decrement the pending requests counter', () => {
      startRequest();
      startRequest();
      
      endRequest();
      expect(get(isLoading)).toBe(true);
      
      endRequest();
      expect(get(isLoading)).toBe(false);
    });

    it('should not let the counter go below zero', () => {
      // Ensure counter is at 0
      while (get(isLoading)) {
        endRequest();
      }
      
      // Try to decrement below 0
      endRequest();
      endRequest();
      
      // Start a new request
      startRequest();
      expect(get(isLoading)).toBe(true);
      
      // End the request
      endRequest();
      expect(get(isLoading)).toBe(false);
    });
  });

  describe('withLoading function', () => {
    it('should set isLoading to true during the operation', async () => {
      const operation = async () => {
        expect(get(isLoading)).toBe(true);
        return 'result';
      };
      
      const result = await withLoading(operation);
      
      expect(result).toBe('result');
      expect(get(isLoading)).toBe(false);
    });

    it('should set isLoading back to false after the operation completes successfully', async () => {
      const operation = async () => 'success';
      
      await withLoading(operation);
      
      expect(get(isLoading)).toBe(false);
    });

    it('should set isLoading back to false even if the operation throws an error', async () => {
      const operation = async () => {
        throw new Error('Test error');
      };
      
      try {
        await withLoading(operation);
      } catch (error: any) {
        // Expected error
        expect(error.message).toBe('Test error');
      }
      
      expect(get(isLoading)).toBe(false);
    });

    it('should handle nested loading operations correctly', async () => {
      const nestedOperation = async () => {
        expect(get(isLoading)).toBe(true);
        
        await withLoading(async () => {
          expect(get(isLoading)).toBe(true);
          return 'nested result';
        });
        
        expect(get(isLoading)).toBe(true);
        return 'outer result';
      };
      
      const result = await withLoading(nestedOperation);
      
      expect(result).toBe('outer result');
      expect(get(isLoading)).toBe(false);
    });
  });
});