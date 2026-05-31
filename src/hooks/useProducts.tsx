import { useQuery } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export interface Product {
  [key: string]: any; // Flexible structure for product data
}

// Fetch chunked products from Supabase Storage
const fetchProductsJSON = async (): Promise<Product[]> => {
  try {
    // Get manifest with chunk URLs (add cache buster to force fresh data)
    const manifestResponse = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/products-url?t=${Date.now()}`,
      {
        cache: 'no-store', // Don't use cached response
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
      }
    );

    if (!manifestResponse.ok) {
      throw new Error(`Failed to get manifest: ${manifestResponse.statusText}`);
    }

    const manifest = await manifestResponse.json();
    console.log('Manifest response:', manifest);

    if (!manifest.success || !manifest.fileExists) {
      console.log('ℹ️  CDN JSON not synced yet. Using database fallback.');
      return []; // Return empty array to trigger fallback to CMS products
    }

    if (!manifest.chunkUrls || manifest.chunkUrls.length === 0) {
      console.log('ℹ️  No chunk files found. Using database fallback.');
      return []; // Return empty array to trigger fallback to CMS products
    }

    console.log(`Loading ${manifest.totalProducts} products from ${manifest.totalChunks} chunks...`);

    // Fetch all chunks in parallel with cache-busting headers
    const chunkPromises = manifest.chunkUrls.map(async (url: string, index: number) => {
      console.log(`Fetching chunk ${index}:`, url);
      const response = await fetch(url, {
        cache: 'no-store', // Don't use cached response
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch chunk ${index}: ${response.statusText}`);
      }

      // Decompress gzip
      const compressedBlob = await response.blob();
      const decompressedStream = compressedBlob.stream().pipeThrough(new DecompressionStream('gzip'));
      const decompressedBlob = await new Response(decompressedStream).blob();
      const text = await decompressedBlob.text();
      return JSON.parse(text);
    });

    const chunks = await Promise.all(chunkPromises);

    // Merge all chunks into single array
    const products = chunks.flat();

    console.log(`✅ [CDN JSON] Loaded ${products.length} products from ${manifest.totalChunks} chunks (INSTANT LOAD)`);

    return products;
  } catch (error) {
    // Don't log error if it's just that the file doesn't exist (expected during initial setup)
    if (error instanceof Error && (error.message.includes('not found') || error.message.includes('sync first') || error.message.includes('Failed to fetch'))) {
      console.log('ℹ️  CDN not synced yet, using database fallback');
    } else {
      console.log('ℹ️  CDN unavailable, using database fallback');
    }
    return []; // Return empty array to trigger fallback to CMS products
  }
};

// Hook to fetch products with TanStack Query
export const useProducts = (refreshTrigger?: number) => {
  return useQuery<Product[], Error>({
    queryKey: ['products-json', refreshTrigger], // Include refreshTrigger to force refetch when it changes
    queryFn: fetchProductsJSON,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry - let it fail fast and use CMS fallback
  });
};
