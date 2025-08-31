import { getStorageObject, setStorageObject } from '$shared/storage/storage';
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

  get<T>(key: string): T | null {
    try {
      const entry = getStorageObject<CacheEntry<T>>(key);
      
      if (!entry.data) {
        return null;
      }

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

  private isExpired<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return now - entry.timestamp > entry.ttl;
  }

  clear(): void {
    try {
      if (typeof localStorage !== 'undefined') {
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

  private isCacheKey(key: string): boolean {
    const cachePrefixes = [
      'pull-requests-',
      'actions-',
      'workflow-jobs-',
      'repository-labels-',
      'repository-workflows-',
    ];
    
    return cachePrefixes.some(prefix => key.startsWith(prefix));
  }

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
          this.delete(key);
        }
      });
    } catch (error) {
      captureException(error, {
        action: 'cacheCleanup',
      });
    }
  }

  generateRepositoryKey(org: string, repo: string, type: 'pull-requests' | 'actions' | 'labels' | 'workflows'): string {
    return `${type}-${org}/${repo}`;
  }

  generateWorkflowJobsKey(org: string, repo: string, runId: number): string {
    return `workflow-jobs-${org}/${repo}-${runId}`;
  }
}

export const cacheService = CacheService.getInstance();
