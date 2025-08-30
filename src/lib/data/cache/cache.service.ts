import { getStorageObject, setStorageObject } from '$integrations/storage';
import { captureException } from '$integrations/sentry';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  key?: string; // Custom cache key
}

export class CacheService {
  private static instance: CacheService;
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    try {
      const entry = getStorageObject<CacheEntry<T>>(key);
      
      if (!entry.data) {
        return null;
      }

      // Check if cache entry is expired
      if (this.isExpired(entry.data)) {
        this.delete(key);
        return null;
      }

      return entry.data.data;
    } catch (error) {
      captureException(error, {
        action: 'cacheGet',
        context: key,
      });
      return null;
    }
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    try {
      const ttl = options.ttl || this.defaultTTL;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      setStorageObject(key, entry);
    } catch (error) {
      captureException(error, {
        action: 'cacheSet',
        context: key,
      });
    }
  }

  /**
   * Delete data from cache
   */
  delete(key: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (error) {
      captureException(error, {
        action: 'cacheDelete',
        context: key,
      });
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return now - entry.timestamp > entry.ttl;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        // Only clear cache entries, not other storage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (this.isCacheKey(key)) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      captureException(error, {
        action: 'cacheClear',
      });
    }
  }

  /**
   * Check if a key is a cache key
   */
  private isCacheKey(key: string): boolean {
    // Cache keys typically start with specific prefixes
    const cachePrefixes = [
      'pull-requests-',
      'actions-',
      'workflow-jobs-',
      'repository-labels-',
      'repository-workflows-',
    ];
    
    return cachePrefixes.some(prefix => key.startsWith(prefix));
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    expiredEntries: number;
    validEntries: number;
    totalSize: number;
  } {
    try {
      if (typeof localStorage === 'undefined') {
        return {
          totalEntries: 0,
          expiredEntries: 0,
          validEntries: 0,
          totalSize: 0,
        };
      }

      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => this.isCacheKey(key));
      
      let expiredCount = 0;
      let validCount = 0;
      let totalSize = 0;

      cacheKeys.forEach(key => {
        try {
          const entry = getStorageObject<CacheEntry<any>>(key);
          totalSize += JSON.stringify(entry).length;
          
          if (this.isExpired(entry.data)) {
            expiredCount++;
          } else {
            validCount++;
          }
        } catch {
          expiredCount++;
        }
      });

      return {
        totalEntries: cacheKeys.length,
        expiredEntries: expiredCount,
        validEntries: validCount,
        totalSize,
      };
    } catch (error) {
      captureException(error, {
        action: 'cacheGetStats',
      });
      return {
        totalEntries: 0,
        expiredEntries: 0,
        validEntries: 0,
        totalSize: 0,
      };
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanup(): void {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }

      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => this.isCacheKey(key));
      
      cacheKeys.forEach(key => {
        try {
          const entry = getStorageObject<CacheEntry<any>>(key);
          if (this.isExpired(entry.data)) {
            this.delete(key);
          }
        } catch {
          // If we can't parse the entry, delete it
          this.delete(key);
        }
      });
    } catch (error) {
      captureException(error, {
        action: 'cacheCleanup',
      });
    }
  }

  /**
   * Generate cache key for repository data
   */
  generateRepositoryKey(org: string, repo: string, type: 'pull-requests' | 'actions' | 'labels' | 'workflows'): string {
    return `${type}-${org}/${repo}`;
  }

  /**
   * Generate cache key for workflow jobs
   */
  generateWorkflowJobsKey(org: string, repo: string, runId: number): string {
    return `workflow-jobs-${org}/${repo}-${runId}`;
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();
