// Product Sync: Database → JSON File (CDN)
import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_custom.tsx';

const app = new Hono();

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bucket name for products JSON
const BUCKET_NAME = 'make-d1fbc049-products';
const FILE_NAME = 'products.json';
const COMPRESSED_FILE_NAME = 'products.json.gz';

// Initialize bucket on startup
const initBucket = async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

    if (!bucketExists) {
      console.log(`Creating public bucket: ${BUCKET_NAME}`);
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
    }
  } catch (error) {
    console.error('Bucket initialization error:', error);
  }
};

// Initialize on module load
await initBucket();

// POST /make-server-d1fbc049/sync-products - Sync all products to chunked JSON files
app.post('/make-server-d1fbc049/sync-products', async (c) => {
  try {
    console.log('Starting product sync to chunked JSON files...');

    const kvSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const BATCH_SIZE = 500;
    const CHUNK_SIZE = 1000; // Products per chunk file
    const MAX_CHUNK_SIZE_MB = 4; // Keep chunks under 4MB to be safe

    let totalCount = 0;
    let chunkIndex = 0;
    let currentChunk: any[] = [];
    const uploadedChunks: string[] = [];

    let offset = 0;

    while (true) {
      const { data: batch, error: fetchError } = await kvSupabase
        .from('kv_store_577b3f26')
        .select('value')
        .like('key', 'products:%')
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchError) {
        throw new Error(`Database fetch error: ${fetchError.message}`);
      }

      if (!batch || batch.length === 0) break;

      for (const item of batch) {
        const product = item.value;

        // Filter out non-product entries (sections, categories, metadata)
        // Skip if not a valid object
        if (!product || typeof product !== 'object') {
          continue;
        }

        // Skip if no valid name
        if (!product.name || product.name === '' || product.name === 'Unnamed Product') {
          continue;
        }

        // Skip if no identifier
        if (!product.code && !product.id && !product.sku) {
          continue;
        }

        // Skip if no price
        if (product.price === undefined || product.price === null) {
          continue;
        }

        // Skip metadata objects (sections, categories, etc.)
        if (product.sections || product.categories || product.sectionsConfig) {
          console.log(`Skipping metadata object with sections/categories`);
          continue;
        }

        currentChunk.push(product);
        totalCount++;

        // Check if chunk is ready to upload
        if (currentChunk.length >= CHUNK_SIZE) {
          const chunkFileName = `products-chunk-${chunkIndex}.json.gz`;
          await uploadChunk(currentChunk, chunkFileName);
          uploadedChunks.push(chunkFileName);
          console.log(`Uploaded chunk ${chunkIndex} with ${currentChunk.length} products`);

          currentChunk = [];
          chunkIndex++;
        }
      }

      if (batch.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }

    // Upload remaining products
    if (currentChunk.length > 0) {
      const chunkFileName = `products-chunk-${chunkIndex}.json.gz`;
      await uploadChunk(currentChunk, chunkFileName);
      uploadedChunks.push(chunkFileName);
      console.log(`Uploaded final chunk ${chunkIndex} with ${currentChunk.length} products`);
    }

    if (totalCount === 0) {
      return c.json({
        success: false,
        error: 'No products found in database',
        count: 0
      }, 404);
    }

    // Create manifest file
    const manifest = {
      totalProducts: totalCount,
      totalChunks: uploadedChunks.length,
      chunks: uploadedChunks,
      timestamp: new Date().toISOString()
    };

    const manifestContent = new TextEncoder().encode(JSON.stringify(manifest));
    await supabase.storage
      .from(BUCKET_NAME)
      .upload('manifest.json', manifestContent, {
        contentType: 'application/json',
        cacheControl: '3600',
        upsert: true
      });

    console.log(`Sync complete: ${totalCount} products in ${uploadedChunks.length} chunks`);

    return c.json({
      success: true,
      message: 'Products synced successfully',
      count: totalCount,
      chunks: uploadedChunks.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Product sync error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during sync',
      details: String(error)
    }, 500);
  }
});

// POST /make-server-d1fbc049/sync-featured — build featured-products.json CDN file
// Call this after saving featured products in admin, or on a schedule
app.post('/make-server-d1fbc049/sync-featured', async (c) => {
  try {
    const kvSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get featured/popular/promo IDs from KV
    const sections = await kv.get('featured_sections') as any || {};
    const featuredIds: string[] = sections.featured || [];
    const popularIds: string[] = sections.popular || [];
    const promoIds: string[] = sections.promotion || [];
    const allIds = [...new Set([...featuredIds, ...popularIds, ...promoIds])];

    if (allIds.length === 0) {
      return c.json({ success: false, error: 'No featured/popular/promo IDs configured' });
    }

    // Fetch just those products from KV
    const featuredProducts: any[] = [];
    for (const id of allIds) {
      const cleanId = id.replace(/^P_/i, ''); // strip P_ prefix if present
      const product = await kv.get(`products:P_${cleanId}`) || await kv.get(`products:${cleanId}`) || await kv.get(`products:${id}`);
      if (product && typeof product === 'object' && product.name) {
        featuredProducts.push(product);
      }
    }

    if (featuredProducts.length === 0) {
      return c.json({ success: false, error: 'No featured products found in database' });
    }

    // Upload as plain JSON (small file, no need to gzip)
    const content = new TextEncoder().encode(JSON.stringify({
      featuredIds,
      popularIds,
      promoIds,
      products: featuredProducts,
      timestamp: new Date().toISOString(),
    }));

    await supabase.storage
      .from(BUCKET_NAME)
      .upload('featured-products.json', content, {
        contentType: 'application/json',
        cacheControl: '300', // 5 min cache
        upsert: true,
      });

    console.log(`[Featured Sync] Uploaded ${featuredProducts.length} featured products`);

    return c.json({
      success: true,
      count: featuredProducts.length,
      featuredIds: featuredIds.length,
      popularIds: popularIds.length,
      promoIds: promoIds.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Featured Sync] Error:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});


async function uploadChunk(products: any[], fileName: string) {
  const jsonContent = JSON.stringify(products);
  const jsonBytes = new TextEncoder().encode(jsonContent);

  // Compress with gzip
  const compressedStream = new ReadableStream({
    start(controller) {
      controller.enqueue(jsonBytes);
      controller.close();
    }
  }).pipeThrough(new CompressionStream('gzip'));

  const chunks: Uint8Array[] = [];
  const reader = compressedStream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const compressed = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, pos);
    pos += chunk.length;
  }

  const sizeMB = (compressed.length / 1024 / 1024).toFixed(2);
  console.log(`Chunk ${fileName}: ${sizeMB}MB compressed`);

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, compressed, {
      contentType: 'application/gzip',
      cacheControl: '0',
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to upload chunk ${fileName}: ${error.message}`);
  }
}

// GET /make-server-d1fbc049/products-count - Check products in database (diagnostic)
app.get('/make-server-d1fbc049/products-count', async (c) => {
  try {
    const kvSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Count products with prefix
    const { data, error, count } = await kvSupabase
      .from('kv_store_577b3f26')
      .select('key', { count: 'exact', head: true })
      .like('key', 'products:%');

    if (error) {
      return c.json({
        success: false,
        error: error.message,
        table: 'kv_store_577b3f26'
      }, 500);
    }

    // Also try to fetch first 5 products
    const { data: sampleData } = await kvSupabase
      .from('kv_store_577b3f26')
      .select('key, value')
      .like('key', 'products:%')
      .limit(5);

    return c.json({
      success: true,
      table: 'kv_store_577b3f26',
      totalCount: count,
      sampleKeys: sampleData?.map(d => d.key) || [],
      sampleProducts: sampleData?.length || 0
    });

  } catch (error) {
    console.error('Error counting products:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// GET /make-server-d1fbc049/products-url - Get manifest for chunked products
app.get('/make-server-d1fbc049/products-url', async (c) => {
  try {
    // Check if manifest exists
    const { data: files } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 100 });

    const manifestExists = files?.some(f => f.name === 'manifest.json');

    if (!manifestExists) {
      return c.json({
        success: false,
        fileExists: false,
        message: 'Products not synced. Run sync first.'
      });
    }

    // Get manifest URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl('manifest.json');

    // Fetch manifest content
    const manifestResponse = await fetch(publicUrl);
    const manifest = await manifestResponse.json();

    // Generate URLs for all chunks with cache-busting timestamp
    const cacheBuster = Date.now(); // Use current timestamp for cache busting
    const chunkUrls = manifest.chunks.map((fileName: string) => {
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);
      // Add cache-busting parameter to force fresh download
      return `${publicUrl}?t=${cacheBuster}`;
    });

    return c.json({
      success: true,
      fileExists: true,
      chunked: true,
      totalProducts: manifest.totalProducts,
      totalChunks: manifest.totalChunks,
      chunkUrls,
      timestamp: manifest.timestamp,
      cacheBuster, // Return cache buster for debugging
      message: `Products available in ${manifest.totalChunks} chunks`
    });

  } catch (error) {
    console.error('Error getting products URL:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// GET /make-server-d1fbc049/featured-url — get public URL for featured-products.json
app.get('/make-server-d1fbc049/featured-url', async (c) => {
  try {
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl('featured-products.json');

    return c.json({ success: true, url: `${publicUrl}?t=${Date.now()}` });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default app;
