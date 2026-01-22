import { writable, derived, type Writable } from 'svelte/store';

/**
 * Cache entry with automatic expiration and ETag support
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  etag?: string;
  lastFetch?: number;
}

/**
 * Cache statistics for debugging and monitoring
 */
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalEntries: number;
}

/**
 * Smart in-memory cache service to replace localStorage API caching
 * 
 * Features:
 * - Automatic expiration based on TTL
 * - ETag support for efficient GitHub API usage
 * - Memory cleanup on page reload
 * - Centralized cache invalidation
 * - Reactive updates via Svelte stores
 * - Cache statistics and monitoring
 */
class MemoryCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 60 * 1000; // 60 seconds default
  private maxEntries = 1000; // Prevent memory leaks
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, totalEntries: 0 };
  
  // Reactive store for cache updates
  private cacheStore: Writable<Map<string, CacheEntry<any>>> = writable(new Map());
  
  constructor() {
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.evictions++;
      this.updateStore();
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Get cached data with ETag information
   */
  getWithETag<T>(key: string): { data: T; etag: string } | null {
    const entry = this.cache.get(key);
    
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        this.cache.delete(key);
        this.stats.evictions++;
        this.updateStore();
      } else {
        this.stats.misses++;
      }
      return null;
    }

    this.stats.hits++;
    return {
      data: entry.data,
      etag: entry.etag || ''
    };
  }

  /**
   * Set cached data with optional TTL and ETag
   */
  set<T>(key: string, data: T, ttl?: number, etag?: string): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    // Enforce max entries limit
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
      etag,
      lastFetch: now
    });

    this.stats.totalEntries = this.cache.size;
    this.updateStore();
  }

  /**
   * Set cached data with ETag
   */
  setWithETag<T>(key: string, data: T, etag: string, ttl?: number): void {
    this.set(key, data, ttl, etag);
  }

  /**
   * Check if we have a valid cached entry
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.updateStore();
      return false;
    }
    
    return true;
  }

  /**
   * Get cache entry with metadata (for advanced use cases)
   */
  getEntry<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        this.cache.delete(key);
        this.updateStore();
      }
      return null;
    }
    
    return entry;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    if (this.cache.delete(key)) {
      this.stats.evictions++;
      this.updateStore();
    }
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    if (count > 0) {
      this.stats.evictions += count;
      this.updateStore();
    }
    
    return count;
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.stats.evictions += count;
    this.stats.totalEntries = 0;
    this.updateStore();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { 
      ...this.stats, 
      totalEntries: this.cache.size 
    };
  }

  /**
   * Get all cache keys (useful for debugging)
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Check if cache needs refresh based on time threshold
   */
  needsRefresh(key: string, threshold: number = this.defaultTTL): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    
    const age = Date.now() - entry.timestamp;
    return age > threshold;
  }

  /**
   * Get cache size in approximate bytes (for monitoring)
   */
  getApproximateSize(): number {
    let size = 0;
    for (const [key, entry] of this.cache) {
      // Rough estimation: key size + JSON string size
      size += key.length * 2; // Unicode characters
      size += JSON.stringify(entry.data).length * 2;
      size += 64; // Overhead for entry metadata
    }
    return size;
  }

  /**
   * Create cache key from components
   */
  createKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}-${parts.join('/')}`;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let evicted = 0;
    
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        evicted++;
      }
    }
    
    if (evicted > 0) {
      this.stats.evictions += evicted;
      this.stats.totalEntries = this.cache.size;
      this.updateStore();
      console.log(`Cache cleanup: evicted ${evicted} expired entries`);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (entry.lastFetch && entry.lastFetch < oldestTime) {
        oldestTime = entry.lastFetch;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Update the reactive store
   */
  private updateStore(): void {
    this.cacheStore.set(new Map(this.cache));
  }

  /**
   * Get reactive store for cache updates
   */
  getStore() {
    return derived(this.cacheStore, $cache => $cache);
  }
}

// Create singleton instance
export const memoryCacheService = new MemoryCacheService();

// Export commonly used cache keys
export const CacheKeys = {
  PULL_REQUESTS: 'pull-requests',
  ACTIONS: 'actions', 
  WORKFLOWS: 'workflows',
  WORKFLOW_RUNS: 'workflow-runs',
  REPOSITORIES: 'repositories'
} as const;