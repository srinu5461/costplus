/**
 * IndexedDB Cache Utility
 * Stores large datasets (products, categories) in browser IndexedDB
 * Better than localStorage: 50MB+ capacity, async, doesn't block UI
 */

const DB_NAME = 'costplus_cache';
const DB_VERSION = 1;
const STORE_NAME = 'cms_data';

interface CacheData {
  key: string;
  data: any;
  timestamp: number;
  version: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('[IndexedDB] Object store created');
      }
    };
  });

  return dbPromise;
}

/**
 * Save data to IndexedDB cache
 */
export async function setCachedDataIDB(key: string, data: any, version: string = '1'): Promise<boolean> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const cacheEntry: CacheData = {
      key,
      data,
      timestamp: Date.now(),
      version,
    };

    const request = store.put(cacheEntry);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`✅ [IndexedDB] Cached ${key} (version: ${version})`);
        resolve(true);
      };
      request.onerror = () => {
        console.error('[IndexedDB] Failed to cache data:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] setCachedData error:', error);
    return false;
  }
}

/**
 * Get data from IndexedDB cache
 */
export async function getCachedDataIDB(key: string, requiredVersion: string = '1'): Promise<any | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result as CacheData | undefined;

        if (!result) {
          console.log(`[IndexedDB] Cache miss for ${key}`);
          resolve(null);
          return;
        }

        // Check version
        if (result.version !== requiredVersion) {
          console.log(`[IndexedDB] Version mismatch for ${key}: ${result.version} vs ${requiredVersion}`);
          resolve(null);
          return;
        }

        const age = Math.round((Date.now() - result.timestamp) / 1000 / 60);
        console.log(`✅ [IndexedDB] Cache hit for ${key} (age: ${age}m, version: ${result.version})`);
        resolve(result.data);
      };

      request.onerror = () => {
        console.error('[IndexedDB] Failed to get data:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] getCachedData error:', error);
    return null;
  }
}

/**
 * Clear specific cache key
 */
export async function clearCacheKeyIDB(key: string): Promise<boolean> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        console.log(`🔄 [IndexedDB] Cleared cache key: ${key}`);
        resolve(true);
      };
      request.onerror = () => {
        console.error('[IndexedDB] Failed to clear key:', request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] clearCacheKey error:', error);
    return false;
  }
}

/**
 * Clear all cached data
 */
export async function clearAllCacheIDB(): Promise<boolean> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        console.log('🔄 [IndexedDB] All cache cleared');
        resolve(true);
      };
      request.onerror = () => {
        console.error('[IndexedDB] Failed to clear cache:', request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] clearAllCache error:', error);
    return false;
  }
}

/**
 * Check if IndexedDB is supported
 */
export function isIndexedDBSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}
