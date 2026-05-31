import { createContext, useContext, ReactNode } from 'react';

interface CacheContextType {
  getCache: (key: string) => any;
  setCache: (key: string, value: any, ttl?: number) => void;
  clearCache: (key?: string) => void;
  getCacheAge: (key: string) => number | null;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within CacheProvider');
  }
  return context;
};

interface CacheProviderProps {
  children: ReactNode;
}

export const CacheProvider = ({ children }: CacheProviderProps) => {
  const getCache = (key: string): any => {
    try {
      const cached = localStorage.getItem(key);
      const timestamp = localStorage.getItem(`${key}_timestamp`);
      const ttl = localStorage.getItem(`${key}_ttl`);

      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        const maxAge = ttl ? parseInt(ttl) : 1000 * 60 * 60; // Default 1 hour

        if (age < maxAge) {
          return JSON.parse(cached);
        } else {
          // Cache expired, remove it
          localStorage.removeItem(key);
          localStorage.removeItem(`${key}_timestamp`);
          localStorage.removeItem(`${key}_ttl`);
        }
      }
    } catch (error) {
      console.warn(`Cache read error for key "${key}":`, error);
    }
    return null;
  };

  const setCache = (key: string, value: any, ttl?: number) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(`${key}_timestamp`, Date.now().toString());
      if (ttl) {
        localStorage.setItem(`${key}_ttl`, ttl.toString());
      }
    } catch (error) {
      console.warn(`Cache write error for key "${key}":`, error);
    }
  };

  const clearCache = (key?: string) => {
    if (key) {
      // Clear specific key
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_timestamp`);
      localStorage.removeItem(`${key}_ttl`);
    } else {
      // Clear all cache keys (only those with _timestamp suffix)
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.endsWith('_timestamp')) {
          const baseKey = k.replace('_timestamp', '');
          localStorage.removeItem(baseKey);
          localStorage.removeItem(`${baseKey}_timestamp`);
          localStorage.removeItem(`${baseKey}_ttl`);
        }
      });
    }
  };

  const getCacheAge = (key: string): number | null => {
    try {
      const timestamp = localStorage.getItem(`${key}_timestamp`);
      if (timestamp) {
        return Date.now() - parseInt(timestamp);
      }
    } catch (error) {
      console.warn(`Cache age check error for key "${key}":`, error);
    }
    return null;
  };

  const value = {
    getCache,
    setCache,
    clearCache,
    getCacheAge,
  };

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
};
