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

// POST /make-server-d1fbc049/sync-products - Process one chunk per request (frontend calls repeatedly)
// Pass { offset, chunkIndex, totalSoFar, uploadedChunks, startedAt } to continue; omit for fresh start.
app.post('/make-server-d1fbc049/sync-products', async (c) => {
  const kvSupabase = createClient(supabaseUrl, supabaseServiceKey);
  const FETCH_BATCH = 500;
  const CHUNK_SIZE = 1000;

  let body: any = {};
  try { body = await c.req.json(); } catch {}

  const offset: number = body.offset ?? 0;
  const chunkIndex: number = body.chunkIndex ?? 0;
  const totalSoFar: number = body.totalSoFar ?? 0;
  const uploadedChunks: string[] = body.uploadedChunks ?? [];
  const startedAt: string = body.startedAt ?? new Date().toISOString();

  // On first call, mark as running
  if (offset === 0) {
    await kvSupabase.from('kv_store_577b3f26').upsert({
      key: 'sync:cdn-status',
      value: { status: 'running', startedAt }
    });
  }

  try {
    const products: any[] = [];
    let dbOffset = offset;

    // Fetch up to CHUNK_SIZE valid products using FETCH_BATCH-sized DB queries
    while (products.length < CHUNK_SIZE) {
      const { data: batch, error } = await kvSupabase
        .from('kv_store_577b3f26')
        .select('value')
        .like('key', 'products:%')
        .range(dbOffset, dbOffset + FETCH_BATCH - 1);

      if (error) throw new Error(`DB fetch error: ${error.message}`);
      if (!batch || batch.length === 0) break;

      for (const item of batch) {
        const p = item.value;
        if (!p || typeof p !== 'object') continue;
        if (!p.name || p.name === 'Unnamed Product') continue;
        if (!p.code && !p.id && !p.sku) continue;
        if (p.price === undefined || p.price === null) continue;
        if (p.sections || p.categories || p.sectionsConfig) continue;
        products.push(p);
      }

      dbOffset += batch.length;
      if (batch.length < FETCH_BATCH) break; // end of table
    }

    if (products.length === 0) {
      // Nothing left — write manifest and mark complete
      const newTotal = totalSoFar;
      const manifest = {
        totalProducts: newTotal,
        totalChunks: uploadedChunks.length,
        chunks: uploadedChunks,
        timestamp: new Date().toISOString()
      };
      await supabase.storage.from(BUCKET_NAME).upload(
        'manifest.json',
        new TextEncoder().encode(JSON.stringify(manifest)),
        { contentType: 'application/json', cacheControl: '3600', upsert: true }
      );
      await kvSupabase.from('kv_store_577b3f26').upsert({
        key: 'sync:cdn-status',
        value: { status: 'completed', totalCount: newTotal, chunks: uploadedChunks.length, completedAt: new Date().toISOString() }
      });
      return c.json({ success: true, done: true, totalCount: newTotal, chunks: uploadedChunks.length });
    }

    // Upload this chunk
    const chunkFileName = `products-chunk-${chunkIndex}.json.gz`;
    await uploadChunk(products, chunkFileName);
    uploadedChunks.push(chunkFileName);
    const newTotal = totalSoFar + products.length;
    console.log(`Chunk ${chunkIndex}: ${products.length} products (total: ${newTotal})`);

    await kvSupabase.from('kv_store_577b3f26').upsert({
      key: 'sync:cdn-status',
      value: { status: 'running', totalCount: newTotal, chunksUploaded: uploadedChunks.length, startedAt }
    });

    return c.json({
      success: true,
      done: false,
      nextOffset: dbOffset,
      chunkIndex: chunkIndex + 1,
      totalSoFar: newTotal,
      uploadedChunks,
      startedAt,
      message: `Chunk ${chunkIndex} done — ${newTotal.toLocaleString()} products so far`
    });

  } catch (error) {
    await kvSupabase.from('kv_store_577b3f26').upsert({
      key: 'sync:cdn-status',
      value: { status: 'failed', error: String(error), failedAt: new Date().toISOString() }
    });
    console.error('Sync chunk failed:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// GET /make-server-d1fbc049/sync-products/status - Check sync progress
app.get('/make-server-d1fbc049/sync-products/status', async (c) => {
  try {
    const kvSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await kvSupabase
      .from('kv_store_577b3f26')
      .select('value')
      .eq('key', 'sync:cdn-status')
      .single();

    return c.json({ success: true, status: data?.value || { status: 'never_run' } });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Helper function to compress and upload a chunk
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
      cacheControl: '3600',
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

export default app;
