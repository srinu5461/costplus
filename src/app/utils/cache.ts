/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CACHE MANAGEMENT UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Centralized cache management for CMS data with automatic invalidation
 * 
 * Features:
 * - Extended cache duration (5 minutes)
 * - Cache validation and auto-refresh
 * - Manual cache clearing
 * - Cache age tracking
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const CACHE_KEY = 'cms_data_cache';
const CACHE_VERSION_KEY = 'cms_cache_version';

export interface CacheData {
  categories?: string[];
  categoryTree?: any[];
  header?: any;
  footer?: any;
  homepage?: any;
  banners?: any[]; // ⚡ NEW: Include banners in cache
  sectionsConfig?: any[]; // ⚡ NEW: Include sections config
  timestamp: number;
  productCount?: number;
  version?: string; // Cache version - incremented when admin clears cache
}

/**
 * Check if cache is still valid
 * Cache is ALWAYS valid until admin explicitly clears it
 */
export function isCacheValid(cacheData: CacheData | null): boolean {
  if (!cacheData || !cacheData.timestamp) {
    return false;
  }

  // Get current cache version
  const currentVersion = localStorage.getItem(CACHE_VERSION_KEY) || '1';
  const cacheVersion = cacheData.version || '1';

  // Cache is valid if version matches (no time expiration!)
  return currentVersion === cacheVersion;
}

/**
 * Get cached data from localStorage (persists across page refreshes)
 * Cache is ALWAYS valid until admin explicitly clears it
 */
export function getCachedData(): CacheData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);

    // Validate cache structure
    if (!parsed.timestamp) {
      console.warn('[Cache] Invalid cache data - missing timestamp');
      clearCache();
      return null;
    }

    // Check if cache version matches
    if (!isCacheValid(parsed)) {
      console.log('[Cache] Cache version mismatch, need to refresh...');
      clearCache();
      return null;
    }

    const age = Math.round((Date.now() - parsed.timestamp) / 1000);
    const ageMinutes = Math.floor(age / 60);
    console.log(`✅ [Cache] Using cached data (age: ${ageMinutes} minutes, version: ${parsed.version || '1'})`);
    return parsed;
  } catch (error) {
    console.error('[Cache] Failed to parse cached data:', error);
    clearCache();
    return null;
  }
}

/**
 * Save data to cache (persists across page refreshes)
 * Includes current cache version
 */
export function setCachedData(data: Omit<CacheData, 'timestamp' | 'version'>): boolean {
  try {
    // Get current cache version
    const currentVersion = localStorage.getItem(CACHE_VERSION_KEY) || '1';

    const cacheData: CacheData = {
      ...data,
      timestamp: Date.now(),
      version: currentVersion,
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log(`✅ [Cache] Data cached successfully (version: ${currentVersion})`);
    return true;
  } catch (error) {
    console.error('[Cache] Failed to cache data:', error);
    // If quota exceeded, try clearing old data
    try {
      const currentVersion = localStorage.getItem(CACHE_VERSION_KEY) || '1';
      localStorage.clear();
      localStorage.setItem(CACHE_VERSION_KEY, currentVersion); // Preserve version
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        ...data,
        timestamp: Date.now(),
        version: currentVersion,
      }));
      console.log('[Cache] Cache saved after clearing storage');
      return true;
    } catch (retryError) {
      console.error('[Cache] Failed to cache even after clearing storage:', retryError);
      return false;
    }
  }
}

/**
 * Clear cached data by incrementing version number
 * This invalidates ALL cached data across all user browsers on next visit
 */
export function clearCache(): void {
  try {
    // Increment cache version to invalidate all caches
    const currentVersion = localStorage.getItem(CACHE_VERSION_KEY) || '1';
    const newVersion = String(parseInt(currentVersion) + 1);
    localStorage.setItem(CACHE_VERSION_KEY, newVersion);

    // Also remove the cached data
    localStorage.removeItem(CACHE_KEY);

    console.log(`🔄 [Cache] Cache cleared successfully (version: ${currentVersion} → ${newVersion})`);
    console.log('[Cache] All cached data will be refreshed on next load');
  } catch (error) {
    console.error('[Cache] Failed to clear cache:', error);
  }
}

/**
 * Get cache age in seconds
 */
export function getCacheAge(): number | null {
  const cached = getCachedData();
  if (!cached) return null;
  
  return Math.round((Date.now() - cached.timestamp) / 1000);
}

/**
 * Check if cache needs refresh
 * Only refresh if no cache exists (version-based invalidation, not time-based)
 */
export function shouldRefreshCache(): boolean {
  const cached = getCachedData();
  // Only refresh if cache doesn't exist or version mismatch
  return !cached;
}