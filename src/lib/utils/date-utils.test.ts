import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { timeAgo, timeAgoInSeconds } from './date-utils';

describe('Date Utils', () => {
  describe('timeAgo', () => {
    // Mock Date.now for consistent testing
    let originalDate: typeof Date;
    
    beforeAll(() => {
      originalDate = global.Date;
      // Mock to May 4, 2025 12:00:00 UTC
      const mockDate = new Date(2025, 4, 4, 12, 0, 0);
      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return mockDate;
          }
          return new originalDate(...args);
        }
        static now() {
          return mockDate.getTime();
        }
      } as DateConstructor;
    });
    
    afterAll(() => {
      global.Date = originalDate;
    });

    it('should correctly format time differences in days', () => {
      // 3 days ago
      const threeDay = new Date(2025, 4, 1, 12, 0, 0).toISOString();
      expect(timeAgo(threeDay)).toBe('3d');
    });

    it('should correctly format time differences in hours', () => {
      // 5 hours ago
      const fiveHours = new Date(2025, 4, 4, 7, 0, 0).toISOString();
      expect(timeAgo(fiveHours)).toBe('5h');
    });

    it('should correctly format time differences in minutes', () => {
      // 30 minutes ago
      const thirtyMins = new Date(2025, 4, 4, 11, 30, 0).toISOString();
      expect(timeAgo(thirtyMins)).toBe('30m');
    });

    it('should correctly format time differences in seconds', () => {
      // 45 seconds ago
      const fortyFiveSecs = new Date(2025, 4, 4, 11, 59, 15).toISOString();
      expect(timeAgo(fortyFiveSecs)).toBe('45s');
    });

    it('should correctly format complex time differences', () => {
      // 1 day, 3 hours, 15 minutes, 20 seconds ago
      const complexTime = new Date(2025, 4, 3, 8, 44, 40).toISOString();
      expect(timeAgo(complexTime)).toBe('1d 3h 15m 20s');
    });
  });

  describe('timeAgoInSeconds', () => {
    it('should format seconds correctly', () => {
      expect(timeAgoInSeconds(45)).toBe('45s');
    });

    it('should format minutes correctly', () => {
      expect(timeAgoInSeconds(125)).toBe('2m 5s');
    });

    it('should format hours correctly', () => {
      expect(timeAgoInSeconds(3661)).toBe('1h 1m 1s');
    });

    it('should format days correctly', () => {
      expect(timeAgoInSeconds(90061)).toBe('1d 1h 1m 1s');
    });

    it('should handle zero correctly', () => {
      expect(timeAgoInSeconds(0)).toBe('');
    });
  });
});