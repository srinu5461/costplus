import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';

const app = new Hono();

const UROPA_API_BASE = 'https://p1-api.nisbets.com.au/occ/v2/uropa-au';

// Helper to get token from KV storage (same key as Description Sync)
const getToken = async () => {
  try {
    console.log('🔍 [getToken] Checking KV storage for uropa_api_token...');
    const savedToken = await kv.get('uropa_api_token');
    if (savedToken && typeof savedToken === 'string' && savedToken.length > 0) {
      console.log('✅ [getToken] Using token from KV storage, length:', savedToken.length);
      return savedToken.trim();
    }
  } catch (error) {
    console.warn('❌ [getToken] Could not check KV store for token:', error);
  }

  // Fallback to environment variable
  const envToken = Deno.env.get('UROPA_API_TOKEN');
  if (envToken) {
    console.log('🔑 [getToken] Using UROPA_API_TOKEN from environment variable, length:', envToken.length);
    return envToken.trim();
  }

  console.error('⛔ [getToken] No token found!');
  return null;
};

// Helper to normalize token - remove "Bearer " prefix if present
const normalizeToken = (token: string): string => {
  if (!token) return token;
  // Remove "Bearer " prefix if present (case insensitive) to prevent double "Bearer Bearer"
  return token.replace(/^bearer\s+/i, '').trim();
};

// Helper to format auth header
const formatAuthHeader = (token: string) => {
  const normalized = normalizeToken(token);
  return `Bearer ${normalized}`;
};

interface ScrapedProduct {
  code: string;
  name: string;
  price: number;
  images: string[];
  mainImage?: string;
}

// GET /image-scraper/check-token - Check if token is available
app.get('/check-token', async (c) => {
  try {
    const envToken = Deno.env.get('UROPA_API_TOKEN');
    const kvToken = await kv.get('uropa_api_token');

    return c.json({
      success: true,
      hasEnvToken: !!envToken,
      hasKvToken: !!kvToken,
      envTokenLength: envToken ? envToken.length : 0,
      kvTokenLength: kvToken ? String(kvToken).length : 0
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// POST /image-scraper/save-token - Save Uropa token to backend
app.post('/save-token', async (c) => {
  try {
    const body = await c.req.json();
    const { token } = body;

    if (!token) {
      return c.json({ success: false, error: 'Token is required' }, 400);
    }

    await kv.set('uropa_api_token', token);

    return c.json({
      success: true,
      message: 'Token saved successfully'
    });
  } catch (error) {
    console.error('Error saving token:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// GET /image-scraper/brands - Get all brands for selection
app.get('/brands', async (c) => {
  try {
    const allProducts = await kv.getByPrefix('products:');
    const brands = [...new Set(allProducts.map((p: any) => p.brand || p.manufacturer).filter(Boolean))].sort();

    return c.json({
      success: true,
      brands,
      count: brands.length
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// GET /image-scraper/products - Get products for a brand
app.get('/products', async (c) => {
  try {
    const brand = c.req.query('brand') || '';

    if (!brand) {
      return c.json({ success: false, error: 'Brand is required' }, 400);
    }

    const allProducts = await kv.getByPrefix('products:');
    const brandProducts = allProducts
      .filter((p: any) => (p.brand || p.manufacturer || '').toLowerCase() === brand.toLowerCase())
      .map((p: any) => ({
        code: p.code || p.sku || p.model,
        name: p.name,
        price: p.tradePrice || 0,
        brand: p.brand,
        currentImages: p.images || [],
        mainImage: p.image || p.mainImage
      }));

    return c.json({
      success: true,
      products: brandProducts,
      count: brandProducts.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// GET /image-scraper/export - Export all products as CSV data
app.get('/export', async (c) => {
  try {
    const allProducts = await kv.getByPrefix('products:');

    const csvData = allProducts.map((p: any) => ({
      code: p.code || p.sku || p.model || '',
      name: (p.name || '').replace(/,/g, ';'),
      brand: p.brand || p.manufacturer || '',
      brandLogo: p.brandLogo || p.brandLogoUrl || '',
      tradePrice: p.tradePrice || 0,
      mainImage: p.image || p.mainImage || '',
      imageCount: Array.isArray(p.images) ? p.images.length : 0,
      images: Array.isArray(p.images) ? p.images.join('|') : '',
      description: (p.description || '').substring(0, 200).replace(/,/g, ';').replace(/\n/g, ' '),
    }));

    return c.json({
      success: true,
      data: csvData,
      count: csvData.length
    });
  } catch (error) {
    console.error('Error exporting products:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// POST /image-scraper/export-uropa - Start chunked export (processes 500 at a time)
app.post('/export-uropa', async (c) => {
  try {
    console.log('📥 [Export Uropa] Starting chunked export...');

    const body = await c.req.json().catch(() => ({}));
    const { chunkIndex = 0 } = body;

    // Get token
    const token = await getToken();
    if (!token) {
      return c.json({
        success: false,
        error: 'Uropa API token not configured. Please set it in Admin > Uropa API Token.'
      }, 400);
    }

    // Get all product codes from our database
    const allProducts = await kv.getByPrefix('products:');
    const productCodes = allProducts
      .filter((p: any) => p && (p.code || p.sku || p.productCode))
      .map((p: any) => p.code || p.sku || p.productCode);

    // Create a lookup map: code → full product object (for KV updates + brand fallback)
    const productMap = new Map(
      allProducts.map((p: any) => [
        p.code || p.sku || p.productCode,
        p
      ])
    );

    console.log(`📦 [Export Uropa] Total products: ${productCodes.length}`);

    const CHUNK_SIZE = 500; // Process 500 products per chunk to stay under Edge Function timeout
    const totalChunks = Math.ceil(productCodes.length / CHUNK_SIZE);
    const currentChunk = productCodes.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);

    console.log(`🔄 [Export Uropa] Processing chunk ${chunkIndex + 1}/${totalChunks} (${currentChunk.length} products)`);

    // Create or get job ID
    const jobId = body.jobId || `uropa-export-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Get existing job data if resuming
    let existingJob = await kv.get(`uropa-export:job:${jobId}`);
    const existingData = existingJob?.data || [];

    const csvData: Array<{code: string, brand: string, brandLogo: string, tradePrice: number, inStock?: boolean, backOrderAvailable?: boolean, uropaPromisedDate?: string, error?: string}> = [...existingData];
    let successCount = existingJob?.success || 0;
    let errorCount = existingJob?.errors || 0;

    // Process current chunk
    const BATCH_SIZE = 10;
    for (let i = 0; i < currentChunk.length; i += BATCH_SIZE) {
      const batch = currentChunk.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (code: string) => {
        try {
          // Get brand info from productMap as fallback
          const productInfo = productMap.get(code) || { brand: '', brandLogo: '' };

          console.log(`🔍 [Uropa API] Fetching data for ${code} from Uropa API...`);

          const response = await fetch(
            `${UROPA_API_BASE}/products/${code}?lang=en&curr=AUD&fields=FULL`,
            {
              method: 'GET',
              headers: {
                'Authorization': formatAuthHeader(token),
                'Content-Type': 'application/json'
              }
            }
          );

          if (!response.ok) {
            console.error(`❌ [Uropa API] Failed for ${code}: HTTP ${response.status}`);
            csvData.push({ code, brand: productInfo.brand || productInfo.manufacturer || '', brandLogo: productInfo.brandLogo || productInfo.brandLogoUrl || '', tradePrice: 0, error: `API error ${response.status}` });
            errorCount++;
            return;
          }

          const uropaData = await response.json();
          console.log(`📦 [Uropa API] Response for ${code}:`, JSON.stringify(uropaData).substring(0, 200));

          // Handle response - might be wrapped in products array
          const actualProduct = uropaData?.products?.[0] || uropaData;

          // Extract brand name from Uropa API (brandLogo.altText contains the brand name like "Polar")
          let brandName = actualProduct?.brandLogo?.altText ||
                         actualProduct?.manufacturer ||
                         actualProduct?.brandName ||
                         productInfo.brand || productInfo.manufacturer ||
                         '';

          // Extract brand logo URL from Uropa API (brandLogo.url contains the image URL)
          let brandLogo = actualProduct?.brandLogo?.url ||
                         actualProduct?.manufacturerLogo?.url ||
                         productInfo.brandLogo || productInfo.brandLogoUrl ||
                         '';

          console.log(`🏷️ [Brand Data] ${code}: name="${brandName}", logo="${brandLogo}"`);

          // ✅ CORRECT PATH: priceDetail.salesPrice (based on actual Uropa API structure)
          let tradePrice = 0;
          let priceSource = 'not_found';

          if (actualProduct?.priceDetail?.salesPrice !== undefined) {
            tradePrice = actualProduct.priceDetail.salesPrice;
            priceSource = 'priceDetail.salesPrice';
          } else if (actualProduct?.priceDetail?.lowestPrice !== undefined) {
            // Parse formatted price "$2,199.90" -> 2199.90
            const parsed = parseFloat(actualProduct.priceDetail.lowestPrice.replace(/[$,]/g, ''));
            if (!isNaN(parsed)) {
              tradePrice = parsed;
              priceSource = 'priceDetail.lowestPrice';
            }
          } else if (actualProduct?.price?.value !== undefined) {
            tradePrice = actualProduct.price.value;
            priceSource = 'price.value';
          } else if (actualProduct?.tradePrice !== undefined) {
            tradePrice = actualProduct.tradePrice;
            priceSource = 'tradePrice';
          } else if (actualProduct?.costPrice !== undefined) {
            tradePrice = actualProduct.costPrice;
            priceSource = 'costPrice';
          }

          // Extract stock / availability fields
          const uropaStockStatus = actualProduct?.stock?.stockLevelStatus || actualProduct?.stockLevelStatus;
          const uropaInStock = uropaStockStatus === 'inStock';
          const uropaBackOrderAvailable = actualProduct?.stock?.backorderAvailable || actualProduct?.backorderAvailable || false;
          const uropaAvailabilityMessage = actualProduct?.availabilityMessage?.message || null;
          const uropaPromisedDate = actualProduct?.availabilityMessage?.promisedDate ||
            (uropaAvailabilityMessage?.match(/\d{2}\/\d{2}\/\d{2,4}/)?.[0]) || null;

          console.log(`[Export Uropa] ${code}: Brand=${brandName}, Price=$${tradePrice} (from ${priceSource}), inStock=${uropaInStock}, backOrder=${uropaBackOrderAvailable}, promisedDate=${uropaPromisedDate}`);

          csvData.push({ code, brand: brandName, brandLogo: brandLogo, tradePrice, inStock: uropaInStock, backOrderAvailable: uropaBackOrderAvailable, uropaPromisedDate: uropaPromisedDate || '' });
          successCount++;

        } catch (error) {
          const productInfo = productMap.get(code) || {};
          console.error(`❌ [Uropa API] Exception for ${code}:`, error);
          csvData.push({ code, brand: productInfo.brand || productInfo.manufacturer || '', brandLogo: productInfo.brandLogo || productInfo.brandLogoUrl || '', tradePrice: 0, error: error instanceof Error ? error.message : 'Unknown error' });
          errorCount++;
        }
      }));

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const totalProcessed = (chunkIndex + 1) * CHUNK_SIZE;
    const progress = Math.min(Math.round((totalProcessed / productCodes.length) * 100), 100);
    const isComplete = chunkIndex + 1 >= totalChunks;

    // Update job status
    const jobStatus = {
      jobId,
      status: isComplete ? 'completed' : 'running',
      total: productCodes.length,
      processed: Math.min(totalProcessed, productCodes.length),
      success: successCount,
      errors: errorCount,
      progress,
      currentChunk: chunkIndex + 1,
      totalChunks,
      data: csvData,
      startTime: existingJob?.startTime || new Date().toISOString(),
      ...(isComplete ? { endTime: new Date().toISOString() } : {})
    };

    await kv.set(`uropa-export:job:${jobId}`, jobStatus);

    console.log(`✅ [Export Uropa] Chunk ${chunkIndex + 1}/${totalChunks} complete. Progress: ${progress}%`);

    return c.json({
      success: true,
      jobId,
      status: jobStatus.status,
      progress,
      processed: jobStatus.processed,
      total: productCodes.length,
      currentChunk: chunkIndex + 1,
      totalChunks,
      isComplete,
      message: isComplete ? 'Export complete' : 'Chunk processed, continue to next'
    });

  } catch (error) {
    console.error('❌ [Export Uropa] Fatal error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// GET /image-scraper/export-uropa/:jobId - Get job status and data
app.get('/export-uropa/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId');
    const jobStatus = await kv.get(`uropa-export:job:${jobId}`);

    if (!jobStatus) {
      return c.json({
        success: false,
        error: 'Job not found'
      }, 404);
    }

    return c.json({
      success: true,
      job: jobStatus
    });

  } catch (error) {
    console.error('❌ Error getting job status:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// GET /image-scraper/check-pricing/:code - Check price fields from UROPA API (not database)
app.get('/check-pricing/:code', async (c) => {
  try {
    const productCode = c.req.param('code');

    // Get token
    const token = await getToken();
    if (!token) {
      return c.json({
        success: false,
        error: 'Uropa API token not configured'
      }, 400);
    }

    console.log(`[Pricing Check] Fetching ${productCode} from Uropa API...`);

    // Fetch from Uropa API
    const response = await fetch(
      `${UROPA_API_BASE}/products/${productCode}?lang=en&curr=AUD&fields=FULL`,
      {
        method: 'GET',
        headers: {
          'Authorization': formatAuthHeader(token),
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return c.json({
        success: false,
        error: `Uropa API returned ${response.status}`
      }, 500);
    }

    const uropaData = await response.json();

    console.log('[Pricing Check] Raw Uropa response type:', typeof uropaData);
    console.log('[Pricing Check] Raw Uropa response keys:', uropaData ? Object.keys(uropaData) : 'null/undefined');
    console.log('[Pricing Check] Full response:', JSON.stringify(uropaData, null, 2));

    // Check if response is wrapped in a 'products' array (common pattern)
    const actualProduct = uropaData?.products?.[0] || uropaData;

    console.log('[Pricing Check] Actual product keys:', actualProduct ? Object.keys(actualProduct) : 'null/undefined');

    // Safety check
    if (!actualProduct || typeof actualProduct !== 'object') {
      return c.json({
        success: false,
        error: 'Invalid response structure from Uropa API',
        rawResponse: uropaData
      }, 500);
    }

    // Extract all possible price fields
    const priceFields = {
      // ✅ PRIMARY: priceDetail object (this is what Uropa actually uses!)
      'priceDetail.salesPrice': actualProduct.priceDetail?.salesPrice,
      'priceDetail.lowestPrice': actualProduct.priceDetail?.lowestPrice,
      'priceDetail.formattedSalesPrice': actualProduct.priceDetail?.formattedSalesPrice,
      'priceDetail.wasPrice': actualProduct.priceDetail?.wasPrice,
      'priceDetail.wasPriceValue': actualProduct.priceDetail?.wasPriceValue,
      'priceDetail.calculatedSavingsFlash': actualProduct.priceDetail?.calculatedSavingsFlash,

      // Legacy/fallback price fields
      'price': actualProduct.price,
      'price.value': actualProduct.price?.value,
      'price.formattedValue': actualProduct.price?.formattedValue,
      'price.currencyIso': actualProduct.price?.currencyIso,

      // Other common price field names
      'tradePrice': actualProduct.tradePrice,
      'costPrice': actualProduct.costPrice,
      'retailPrice': actualProduct.retailPrice,
      'basePrice': actualProduct.basePrice,
      'sellingPrice': actualProduct.sellingPrice,
      'listPrice': actualProduct.listPrice,
      'cost': actualProduct.cost,
      'value': actualProduct.value,

      // Price object variants
      'priceData': actualProduct.priceData,
      'priceRange': actualProduct.priceRange,
      'prices': actualProduct.prices,

      // Alternative paths
      'product.price': actualProduct.product?.price,
      'data.price': actualProduct.data?.price,
    };

    // Find all keys that contain 'price'
    let allPriceKeys: string[] = [];
    try {
      const jsonStr = JSON.stringify(actualProduct);
      const matches = jsonStr.match(/"([^"]*price[^"]*)"/gi) || [];
      allPriceKeys = [...new Set(matches)].map(k => k.replace(/"/g, ''));
    } catch (e) {
      console.error('[Pricing Check] Error finding price keys:', e);
    }

    return c.json({
      success: true,
      code: productCode,
      name: actualProduct.name || actualProduct.title || actualProduct.code || 'N/A',

      // All price-related fields we tried
      priceFields,

      // All keys in response that contain 'price'
      allPriceKeys,

      // Full raw response (for debugging)
      rawResponse: uropaData,

      // Actual product data
      actualProduct,

      // Top-level keys from both
      topLevelKeys: Object.keys(uropaData || {}).sort(),
      productKeys: Object.keys(actualProduct || {}).sort()
    });

  } catch (error) {
    console.error('[Pricing Check] Exception:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// GET /image-scraper/test/:code - Test what images are returned for a product
app.get('/test/:code', async (c) => {
  try {
    const productCode = c.req.param('code');

    const token = await getToken();
    console.log('[Image Test] Token:', { hasToken: !!token, tokenLength: token ? token.length : 0, tokenPreview: token ? token.substring(0, 10) + '...' : 'none' });

    if (!token) {
      return c.json({ error: 'Token not configured' }, 400);
    }

    const authHeader = formatAuthHeader(token);
    console.log('[Image Test] Auth header:', authHeader.substring(0, 20) + '...');

    // ✅ Use same parameters as description-sync (required by Uropa API)
    const uropaUrl = `${UROPA_API_BASE}/productRecommendations/productCarousel?vatToggle=EXVAT&productCodes=${productCode}&productIds=${productCode}&slotName=homeRecsTop&lang=en&curr=AUD`;
    console.log('[Image Test] URL:', uropaUrl);

    const response = await fetch(uropaUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    console.log('[Image Test] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Image Test] Error response:', errorText);
      return c.json({
        error: `API returned ${response.status}`,
        url: uropaUrl,
        responseBody: errorText.substring(0, 200)
      }, response.status);
    }

    const uropaResponse = await response.json();
    const uropaProduct = uropaResponse.products?.[0] || uropaResponse;

    // Return the raw images array
    return c.json({
      success: true,
      productCode,
      imagesRaw: uropaProduct.images,
      imagesType: typeof uropaProduct.images,
      imagesIsArray: Array.isArray(uropaProduct.images),
      imagesLength: Array.isArray(uropaProduct.images) ? uropaProduct.images.length : 0,
      firstImage: Array.isArray(uropaProduct.images) ? uropaProduct.images[0] : null,
    });
  } catch (error) {
    console.error('[Image Test] Exception:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// POST /image-scraper/scrape - Scrape images for selected products
app.post('/scrape', async (c) => {
  try {
    const body = await c.req.json();
    const { productCodes } = body;

    if (!productCodes || !Array.isArray(productCodes)) {
      return c.json({ success: false, error: 'productCodes array is required' }, 400);
    }

    // Get token from KV storage
    const token = await getToken();
    if (!token) {
      return c.json({ success: false, error: 'Uropa API token not configured in backend' }, 400);
    }

    const results = {
      success: 0,
      failed: 0,
      details: [] as any[]
    };

    for (const productCode of productCodes) {
      try {
        console.log(`[Image Scraper] Processing ${productCode}...`);

        // Fetch from Uropa CAROUSEL endpoint (same as description sync)
        // ✅ Use same parameters as description-sync (required by Uropa API)
        const uropaUrl = `${UROPA_API_BASE}/productRecommendations/productCarousel?vatToggle=EXVAT&productCodes=${productCode}&productIds=${productCode}&slotName=homeRecsTop&lang=en&curr=AUD`;
        const response = await fetch(uropaUrl, {
          method: 'GET',
          headers: {
            'Authorization': formatAuthHeader(token),
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          results.failed++;
          results.details.push({
            code: productCode,
            success: false,
            error: `API returned ${response.status}`
          });
          continue;
        }

        const uropaResponse = await response.json();
        const uropaProduct = uropaResponse.products?.[0] || uropaResponse;

        // Extract images from images array
        let images: string[] = [];
        if (Array.isArray(uropaProduct.images) && uropaProduct.images.length > 0) {
          images = uropaProduct.images.map((img: any) => {
            if (typeof img === 'string') return img;
            // Extract URL from image object - prioritize galleryUrl
            return img.galleryUrl || img.url || img.imageUrl || img.superZoom ||
                   img.zoom || img.product || img.thumbnail || null;
          }).filter(Boolean);
        }

        // Add primaryImageUrl if exists (put it first)
        if (uropaProduct.primaryImageUrl) {
          images.unshift(uropaProduct.primaryImageUrl);
        }

        // Fallback to single image fields if no images array
        if (images.length === 0) {
          const singleImage = uropaProduct.image || uropaProduct.thumbnail || uropaProduct.imageUrl;
          if (singleImage) images = [singleImage];
        }

        // Remove duplicates
        const uniqueImages = [...new Set(images)];

        // Get existing product from database
        const allProducts = await kv.getByPrefix('products:');
        const existingProduct = allProducts.find((p: any) =>
          p.code === productCode || p.productCode === productCode || p.sku === productCode
        );

        if (!existingProduct) {
          results.failed++;
          results.details.push({
            code: productCode,
            success: false,
            error: 'Product not found in database'
          });
          continue;
        }

        // Update product with scraped images
        const updatedProduct = {
          ...existingProduct,
          images: uniqueImages,
          imageScrapedAt: new Date().toISOString(),
          imageCount: uniqueImages.length
        };

        // Save back using product code
        const key = `products:${existingProduct.code || existingProduct.productCode || existingProduct.sku}`;
        await kv.set(key, updatedProduct);

        results.success++;
        results.details.push({
          code: productCode,
          success: true,
          imagesFound: uniqueImages.length,
          images: uniqueImages
        });

        console.log(`[Image Scraper] ✅ ${productCode}: ${uniqueImages.length} images`);

      } catch (error) {
        results.failed++;
        results.details.push({
          code: productCode,
          success: false,
          error: String(error)
        });
        console.error(`[Image Scraper] ❌ ${productCode}:`, error);
      }
    }

    return c.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error in image scraper:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default app;
