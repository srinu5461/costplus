import { useQuery } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getCachedDataIDB, getCachedTimestampIDB, setCachedDataIDB, isIndexedDBSupported } from '../app/utils/indexedDB';

export interface Product {
  [key: string]: any; // Flexible structure for product data
}

const IDB_PRODUCTS_KEY = 'products_cdn';
const IDB_PRODUCTS_VERSION = '1';

// Fetch chunked products from Supabase Storage
const fetchProductsJSON = async (): Promise<Product[]> => {
  try {
    return await fetchFromCDN();
  } catch (error) {
    if (error instanceof Error && (error.message.includes('not found') || error.message.includes('sync first') || error.message.includes('Failed to fetch'))) {
      console.log('ℹ️  CDN not synced yet, using database fallback');
    } else {
      console.log('ℹ️  CDN unavailable, using database fallback');
    }
    return [];
  }
};

const fetchFromCDN = async (): Promise<Product[]> => {
  // Always fetch manifest fresh — it tells us when CDN was last synced
  const manifestResponse = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/products-url?t=${Date.now()}`,
    {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Cache-Control': 'no-cache',
      },
    }
  );

  if (!manifestResponse.ok) {
    throw new Error(`Failed to get manifest: ${manifestResponse.statusText}`);
  }

  const manifest = await manifestResponse.json();

  // Use IDB cache only if it was saved AFTER the last CDN sync
  if (isIndexedDBSupported() && manifest.timestamp) {
    const idbTimestamp = await getCachedTimestampIDB(IDB_PRODUCTS_KEY, IDB_PRODUCTS_VERSION);
    const cdnTimestamp = new Date(manifest.timestamp).getTime();
    if (idbTimestamp && idbTimestamp >= cdnTimestamp) {
      const cached = await getCachedDataIDB(IDB_PRODUCTS_KEY, IDB_PRODUCTS_VERSION);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log(`⚡ [IDB] Loaded ${cached.length} products from IndexedDB cache (CDN unchanged since cache)`);
        return cached;
      }
    } else if (idbTimestamp) {
      console.log(`⚡ [IDB] CDN updated after cache — fetching fresh data`);
    }
  }

  if (!manifest.success || !manifest.fileExists) {
    console.log('ℹ️  CDN JSON not synced yet. Using database fallback.');
    return [];
  }

  if (!manifest.chunkUrls || manifest.chunkUrls.length === 0) {
    console.log('ℹ️  No chunk files found. Using database fallback.');
    return [];
  }

  console.log(`Loading ${manifest.totalProducts} products from ${manifest.totalChunks} chunks...`);

  // Fetch chunks fresh — prices must reflect latest sync
  const chunkPromises = manifest.chunkUrls.map(async (url: string, index: number) => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch chunk ${index}: ${response.statusText}`);
    }
    const compressedBlob = await response.blob();
    const decompressedStream = compressedBlob.stream().pipeThrough(new DecompressionStream('gzip'));
    const decompressedBlob = await new Response(decompressedStream).blob();
    const text = await decompressedBlob.text();
    return JSON.parse(text);
  });

  const chunks = await Promise.all(chunkPromises);
  const products = chunks.flat();

  console.log(`✅ [CDN JSON] Loaded ${products.length} products from ${manifest.totalChunks} chunks`);

  // Cache to IndexedDB for instant load next visit
  if (isIndexedDBSupported() && products.length > 0) {
    setCachedDataIDB(IDB_PRODUCTS_KEY, products, IDB_PRODUCTS_VERSION).catch(() => {});
  }

  return products;
};

// Hook to fetch products with TanStack Query
export const useProducts = (refreshTrigger?: number) => {
  return useQuery<Product[], Error>({
    queryKey: ['products-json', refreshTrigger],
    queryFn: fetchProductsJSON,
    staleTime: 30 * 60 * 1000, // 30 minutes — reuse in-memory cache across navigations
    gcTime: 60 * 60 * 1000,    // 60 minutes — keep in memory for the full session
    retry: false,
  });
};
