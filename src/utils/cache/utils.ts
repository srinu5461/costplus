// Cache utility functions for localStorage-based caching
// Used by CMSContext and other components for data caching

const CACHE_VERSION = '1.0.0';

export interface CacheEntry {
  data: any;
  timestamp: number;
  version: string;
}

export const getCachedData = (key: string): any => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);

    // Check version compatibility
    if (entry.version !== CACHE_VERSION) {
      console.log(`Cache version mismatch for ${key}, clearing...`);
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.warn(`Failed to get cached data for ${key}:`, error);
    return null;
  }
};

export const setCachedData = (key: string, data: any): void => {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn(`Failed to set cached data for ${key}:`, error);
  }
};

export const clearCache = (key?: string): void => {
  try {
    if (key) {
      // Clear specific cache key
      localStorage.removeItem(key);
      console.log(`Cache cleared for key: ${key}`);
    } else {
      // Clear all cache keys (look for our cache entries)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey) {
          try {
            const value = localStorage.getItem(storageKey);
            if (value) {
              const parsed = JSON.parse(value);
              // Check if it's our cache format
              if (parsed && typeof parsed === 'object' && 'timestamp' in parsed && 'version' in parsed) {
                keysToRemove.push(storageKey);
              }
            }
          } catch {
            // Not a JSON value, skip
          }
        }
      }

      // Remove all identified cache keys
      keysToRemove.forEach(k => localStorage.removeItem(k));
      console.log(`Cleared ${keysToRemove.length} cache entries`);
    }
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
};

export const isCacheValid = (key: string, maxAge: number = 300000): boolean => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return false;

    const entry: CacheEntry = JSON.parse(cached);

    // Check version
    if (entry.version !== CACHE_VERSION) return false;

    // Check age
    const age = Date.now() - entry.timestamp;
    return age < maxAge;
  } catch (error) {
    return false;
  }
};

export const getCacheAge = (key: string): number | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    return Date.now() - entry.timestamp;
  } catch (error) {
    return null;
  }
};

export const getCacheTimestamp = (key: string): number | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    return entry.timestamp;
  } catch (error) {
    return null;
  }
};
