/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTOMATED PRICE SYNC SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Compares Uropa API prices with database and updates changed prices
 * 
 * 📖 PRICING FLOW:
 * 
 * 1️⃣  SUPPLIER COST (Uropa):
 *     - Uropa's selling price = YOUR cost/trade price
 *     - API: GET /products/{code}?lang=en&curr=AUD&fields=FULL
 *     - Extract: price.value (Uropa's selling price)
 *     - Store as: tradePrice, baseCost in database
 * 
 * 2️⃣  TIERED MARKUP FORMULA (Fixed Dollar Amounts):
 *     - Formula: Selling Price = tradePrice + Dollar Markup
 *     - Tiers:
 *       • Under $100:      +$200
 *       • $100-$300:       +$125  
 *       • $300-$500:       +$100
 *       • $500-$1000:      +$55
 *       • $1000+:          +$49
 * 
 * 3️⃣  YOUR SELLING PRICE:
 *     - Calculated using calculateSellingPrice() function
 *     - Store as: price field in database
 * 
 * 🔄 SYNC ENDPOINTS:
 *     • POST /query-product - Check single product (diagnostic)
 *     • POST /price-sync/test - Check multiple products (no update)
 *     • POST /price-sync/auto-update - Update multiple products
 *     • POST /price-sync/run - Full database sync
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';
import { calculateSellingPrice, DEFAULT_PRICING } from './pricing-calculator.tsx';

const priceSync = new Hono();

const UROPA_API_BASE = 'https://p1-api.nisbets.com.au/occ/v2/uropa-au';

// Helper to get current pricing config
async function getPricingConfig() {
  const savedConfig = await kv.get('pricing:config');
  return savedConfig || DEFAULT_PRICING;
}

// Helper to format Authorization header
function formatAuthHeader(token: string): string {
  return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
}

// Helper to get Uropa API token
async function getToken(): Promise<string> {
  // ✅ PRIORITY FIX: Use KV storage FIRST (where user saves token via UI)
  try {
    console.log('🔍 [getToken] Checking KV storage for uropa_api_token...');
    const savedToken = await kv.get('uropa_api_token');
    console.log('📦 [getToken] KV storage result:', {
      found: !!savedToken,
      type: typeof savedToken,
      isString: typeof savedToken === 'string',
      length: savedToken ? String(savedToken).length : 0,
      preview: savedToken ? String(savedToken).substring(0, 20) + '...' : 'null'
    });
    
    if (savedToken && typeof savedToken === 'string' && savedToken.length > 0) {
      console.log('✅ [getToken] Using token from KV storage (user-saved via UI)');
      console.log('🔑 [getToken] Token length:', savedToken.length);
      console.log('🔑 [getToken] Token preview:', savedToken.substring(0, 30) + '...');
      return savedToken;
    } else {
      console.log('⚠️ [getToken] Token in KV is empty or invalid');
    }
  } catch (error) {
    console.warn('❌ [getToken] Could not check KV store for token:', error);
  }
  
  // Fallback to environment variable
  const envToken = Deno.env.get('UROPA_API_TOKEN');
  if (envToken) {
    console.log('🔑 [getToken] Using UROPA_API_TOKEN from environment variable (fallback)');
    console.log('🔑 [getToken] Env token length:', envToken.length);
    console.log('🔑 [getToken] Env token preview:', envToken.substring(0, 30) + '...');
    return envToken;
  }
  
  console.error('⛔ [getToken] No token found in KV or environment!');
  return '';
}

interface SyncLog {
  timestamp: string;
  totalProducts: number;
  productsChecked: number;
  pricesChanged: number;
  pricesUpdated: number;
  errors: number;
  duration: number;
  status: 'success' | 'partial' | 'error';
  errorDetails?: string[];
  changes?: Array<{
    productId: string;
    productName: string;
    productCode: string;
    oldCost: number;
    newCost: number;
    oldPrice: number;
    newPrice: number;
    priceChange: number;
    priceChangePercent: number;
  }>;
}

// ============================================
// POST /price-sync/run - Manual trigger price sync
// ============================================
priceSync.post('/run', async (c) => {
  const startTime = Date.now();
  const syncLog: SyncLog = {
    timestamp: new Date().toISOString(),
    totalProducts: 0,
    productsChecked: 0,
    pricesChanged: 0,
    pricesUpdated: 0,
    errors: 0,
    duration: 0,
    status: 'success',
    errorDetails: [],
    changes: [],
  };

  try {
    console.log('🔄 [Price Sync] Starting manual price synchronization...');

    // Get all products from database
    const allProducts = await kv.getByPrefix('products:');
    syncLog.totalProducts = allProducts.length;
    console.log(`📦 [Price Sync] Found ${allProducts.length} products in database`);

    if (allProducts.length === 0) {
      return c.json({
        success: false,
        error: 'No products found in database',
        log: syncLog,
      });
    }

    // Get Uropa API credentials
    const token = await getToken();
    if (!token) {
      return c.json({
        success: false,
        error: 'Uropa API token not configured',
        log: syncLog,
      }, 400);
    }

    // Use Authorization header (Bearer token)
    const headers = {
      'Authorization': formatAuthHeader(token)
    };

    // Batch process products (to avoid overwhelming the API)
    const BATCH_SIZE = 50; // Check 50 products at a time
    const batches: any[][] = [];
    
    for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
      batches.push(allProducts.slice(i, i + BATCH_SIZE));
    }

    console.log(`📊 [Price Sync] Processing ${batches.length} batches of ${BATCH_SIZE} products each`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`🔄 [Price Sync] Processing batch ${batchIndex + 1}/${batches.length}...`);

      // Process products in parallel within batch
      const batchResults = await Promise.allSettled(
        batch.map(async (product) => {
          syncLog.productsChecked++;

          try {
            // 🔥 FIXED: Get product code from various possible fields
            const productCode = product.code || product.productCode || product.sku || product.id;
            
            if (!productCode) {
              console.log(`⚠️ [Price Sync] Product has no code/SKU:`, product);
              return null;
            }

            // Fetch product from Uropa API by code
            const uropaUrl = `${UROPA_API_BASE}/products/${productCode}?lang=en&curr=AUD&fields=FULL`;
            const response = await fetch(uropaUrl, { 
              method: 'GET',
              headers: {
                'Authorization': formatAuthHeader(token),
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              // Product might not exist in Uropa anymore - skip it
              console.log(`⚠️ [Price Sync] Product ${productCode} not found in Uropa API (${response.status})`);
              return null;
            }

            const uropaProduct = await response.json();
            
            // ✅ FIXED: Extract price from priceDetail object
            // Priority order:
            // 1. priceDetail.priceBreakdown[0].priceB - Customer/wholesale price (B2B)
            // 2. priceDetail.salesPrice - Current selling price
            // 3. priceRange fallbacks
            const uropaCost = 
              uropaProduct.priceDetail?.priceBreakdown?.[0]?.priceB || // B2B wholesale price
              uropaProduct.priceDetail?.salesPrice || // Current sales price
              uropaProduct.priceDetail?.value || 
              uropaProduct.priceDetail?.price || 
              uropaProduct.priceRange?.minPrice?.value ||
              uropaProduct.priceRange?.maxPrice?.value ||
              uropaProduct.price?.value || 
              uropaProduct.basePrice?.value || 
              uropaProduct.price || 
              null;
            
            if (!uropaCost) {
              console.log(`⚠️ [Price Sync] No price found for product ${productCode} in Uropa API`);
              return null;
            }

            // ✅ CRITICAL FIX: Compare with COST PRICE in database (baseCost is the Uropa cost we scraped)
            // DO NOT use product.price - that's the calculated selling price!
            const dbCost = parseFloat(
              product.baseCost || 
              product.costPrice || 
              product.cost ||
              product.basePrice ||
              product.price || // Fallback only if no cost fields exist
              0
            );
            
            // Check if price changed (allow 0.01 difference for rounding)
            if (Math.abs(uropaCost - dbCost) < 0.01) {
              // No change
              console.log(`✅ [Price Sync] No change for ${productCode}: DB cost=${dbCost}, Uropa cost=${uropaCost}`);
              return null;
            }

            console.log(`💰 [Price Sync] Price change detected for ${productCode}: ${dbCost} → ${uropaCost}`);

            // Get current pricing config from database
            const pricingConfig = await getPricingConfig();

            // Calculate new selling price using current tier pricing
            const pricingResult = calculateSellingPrice(uropaCost, pricingConfig);
            const oldPricingResult = calculateSellingPrice(dbCost, pricingConfig);

            // Update product in database
            const updatedProduct = {
              ...product,
              // 🔥 COST FIELDS - Store the Uropa wholesale/cost price
              baseCost: uropaCost,
              costPrice: uropaCost,
              cost: uropaCost,
              basePrice: uropaCost,
              // 🔥 SELLING PRICE FIELDS - Store the calculated selling price (with markup)
              price: pricingResult.sellingPrice,  // ← Main price field (SELLING price, not cost!)
              salePrice: pricingResult.sellingPrice,  // ← ProductCard checks this FIRST
              sellingPrice: pricingResult.sellingPrice,
              sellPrice: pricingResult.sellingPrice,
              calculatedPrice: pricingResult.sellingPrice,
              // Pricing metadata
              markup: pricingResult.markup,
              markupPercent: pricingResult.markupPercent,
              marginPercent: pricingResult.marginPercent,
              tierLabel: pricingResult.tierLabel,
              // Timestamps
              lastPriceUpdate: new Date().toISOString(),
              lastSyncedWithUropa: new Date().toISOString(),
            };

            await kv.set(`products:${product.id}`, updatedProduct);

            syncLog.pricesChanged++;
            syncLog.pricesUpdated++;

            // Log the change
            const priceChange = pricingResult.sellingPrice - oldPricingResult.sellingPrice;
            const priceChangePercent = (priceChange / oldPricingResult.sellingPrice) * 100;

            syncLog.changes?.push({
              productId: product.id,
              productName: product.name || product.title || 'Unknown Product',
              productCode: productCode,
              oldCost: dbCost,
              newCost: uropaCost,
              oldPrice: oldPricingResult.sellingPrice,
              newPrice: pricingResult.sellingPrice,
              priceChange: Math.round(priceChange * 100) / 100,
              priceChangePercent: Math.round(priceChangePercent * 100) / 100,
            });

            console.log(`✅ [Price Sync] Updated ${productCode}: Cost ${dbCost}→${uropaCost}, Sell ${oldPricingResult.sellingPrice}→${pricingResult.sellingPrice}`);

            return { success: true, productCode: productCode };
          } catch (error: any) {
            syncLog.errors++;
            const productCode = product.code || product.productCode || product.sku || product.id || 'unknown';
            syncLog.errorDetails?.push(`${productCode}: ${error.message}`);
            console.error(`❌ [Price Sync] Error processing ${productCode}:`, error);
            return { success: false, productCode: productCode, error: error.message };
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    // Calculate duration
    syncLog.duration = Date.now() - startTime;

    // Determine status
    if (syncLog.errors > 0) {
      syncLog.status = syncLog.pricesUpdated > 0 ? 'partial' : 'error';
    }

    // Save sync log to database
    const syncLogId = `sync-log-${Date.now()}`;
    await kv.set(`price-sync-logs:${syncLogId}`, syncLog);

    // Update last sync timestamp
    await kv.set('price-sync:last-run', {
      timestamp: new Date().toISOString(),
      status: syncLog.status,
      pricesChanged: syncLog.pricesChanged,
      errors: syncLog.errors,
    });

    console.log(`✅ [Price Sync] Complete! Checked ${syncLog.productsChecked} products, updated ${syncLog.pricesUpdated} prices in ${syncLog.duration}ms`);

    // 🔄 Invalidate CMS cache if prices were updated
    if (syncLog.pricesUpdated > 0) {
      try {
        console.log('🔄 [Price Sync] Invalidating CMS cache due to price updates...');
        const cacheResponse = await fetch('http://localhost:54321/functions/v1/make-server-d1fbc049/cms/clear-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (cacheResponse.ok) {
          console.log('✅ [Price Sync] CMS cache invalidated successfully');
        } else {
          console.warn('⚠️  [Price Sync] Failed to invalidate cache:', await cacheResponse.text());
        }
      } catch (cacheError) {
        console.warn('⚠️  [Price Sync] Cache invalidation failed (non-critical):', cacheError);
      }
    }

    return c.json({
      success: true,
      message: `Price sync complete. Updated ${syncLog.pricesUpdated} of ${syncLog.productsChecked} products.`,
      log: syncLog,
    });

  } catch (error: any) {
    syncLog.duration = Date.now() - startTime;
    syncLog.status = 'error';
    syncLog.errors++;
    syncLog.errorDetails?.push(error.message);

    console.error('❌ [Price Sync] Fatal error:', error);

    return c.json({
      success: false,
      error: error.message,
      log: syncLog,
    }, 500);
  }
});

// ============================================
// GET /price-sync/status - Get last sync status
// ============================================
priceSync.get('/status', async (c) => {
  try {
    const lastRun = await kv.get('price-sync:last-run');
    const config = await kv.get('price-sync:config') || {
      enabled: false,
      schedule: 'daily',
      time: '02:00',
    };

    return c.json({
      success: true,
      lastRun,
      config,
    });
  } catch (error: any) {
    console.error('❌ Error getting sync status:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// GET /price-sync/logs - Get sync history
// ============================================
priceSync.get('/logs', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    
    const allLogs = await kv.getByPrefix('price-sync-logs:');
    
    // Sort by timestamp (newest first)
    const sortedLogs = allLogs.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Limit results
    const logs = sortedLogs.slice(0, limit);

    return c.json({
      success: true,
      logs,
      total: allLogs.length,
    });
  } catch (error: any) {
    console.error('❌ Error getting sync logs:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// GET /price-sync/logs/:id - Get specific sync log
// ============================================
priceSync.get('/logs/:id', async (c) => {
  try {
    const logId = c.req.param('id');
    const log = await kv.get(`price-sync-logs:${logId}`);

    if (!log) {
      return c.json({ success: false, error: 'Log not found' }, 404);
    }

    return c.json({
      success: true,
      log,
    });
  } catch (error: any) {
    console.error('❌ Error getting sync log:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// POST /price-sync/config - Update sync configuration
// ============================================
priceSync.post('/config', async (c) => {
  try {
    const body = await c.req.json();
    
    const config = {
      enabled: body.enabled ?? false,
      schedule: body.schedule || 'daily', // daily, weekly, manual
      time: body.time || '02:00', // HH:MM format
      timezone: body.timezone || 'Australia/Sydney',
    };

    await kv.set('price-sync:config', config);

    console.log('✅ Price sync config updated:', config);

    return c.json({
      success: true,
      config,
    });
  } catch (error: any) {
    console.error('❌ Error updating sync config:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// POST /price-sync/test - Test sync with sample products
// ============================================
priceSync.post('/test', async (c) => {
  try {
    const { productCodes } = await c.req.json();
    
    if (!productCodes || !Array.isArray(productCodes) || productCodes.length === 0) {
      return c.json({
        success: false,
        error: 'Please provide an array of product codes to test',
      }, 400);
    }

    console.log(`🧪 [Price Sync Test] Testing ${productCodes.length} products:`, productCodes);

    const token = await getToken();
    if (!token) {
      return c.json({
        success: false,
        error: 'Uropa API token not configured',
      }, 400);
    }

    console.log(`🔑 [Price Sync Test] Using token: ${token.substring(0, 20)}...`);

    const headers = {
      'Authorization': formatAuthHeader(token),
      'Content-Type': 'application/json'
    };
    console.log(`📋 [Price Sync Test] Request headers:`, Object.keys(headers));
    
    const results: any[] = [];

    // ✅ PERFORMANCE FIX: Fetch all products ONCE before the loop
    const allProducts = await kv.getByPrefix('products:');
    console.log(`📦 [Price Sync Test] Loaded ${allProducts.length} products from database`);

    // Fetch products from Uropa individually (no bulk endpoint available)
    console.log(`🌐 [Price Sync Test] Fetching ${productCodes.length} products from Uropa...`);
    const uropaMap = new Map();
    
    for (const code of productCodes) {
      try {
        const url = `${UROPA_API_BASE}/products/${code}?lang=en&curr=AUD&fields=FULL`;
        const response = await fetch(url, { 
          method: 'GET',
          headers: {
            'Authorization': formatAuthHeader(token),
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          uropaMap.set(code.toLowerCase(), data);
          console.log(`✅ [Price Sync Test] Fetched ${code}`);
        } else {
          console.log(`⚠️ [Price Sync Test] ${code} returned ${response.status}`);
        }
      } catch (error: any) {
        console.error(`❌ [Price Sync Test] Error fetching ${code}:`, error.message);
      }
    }
    
    console.log(`✅ [Price Sync Test] Received ${uropaMap.size} products from Uropa`);

    // Process each requested code
    for (const code of productCodes) {
      try {
        // Get from database - search by multiple fields
        const dbProduct = allProducts.find((p: any) => 
          p.code === code || 
          p.productCode === code || 
          p.sku === code ||
          p.id === code
        );

        if (!dbProduct) {
          results.push({
            code,
            status: 'not_in_db',
            error: 'Product not found in database',
          });
          continue;
        }

        // Get from Uropa bulk response
        const uropaProduct = uropaMap.get(code.toLowerCase());
        
        if (!uropaProduct) {
          results.push({
            code,
            status: 'not_in_uropa',
            error: 'Product not found in Uropa API response',
          });
          continue;
        }
        
        // ✅ FIXED: Extract price from priceDetail object
        const uropaCost = 
          uropaProduct.priceDetail?.priceBreakdown?.[0]?.priceB || // B2B wholesale price
          uropaProduct.priceDetail?.salesPrice || // Current sales price
          uropaProduct.priceDetail?.value || 
          uropaProduct.priceDetail?.price || 
          uropaProduct.priceRange?.minPrice?.value ||
          uropaProduct.priceRange?.maxPrice?.value ||
          uropaProduct.price?.value || 
          uropaProduct.basePrice?.value || 
          uropaProduct.price || 
          null;

        if (!uropaCost) {
          results.push({
            code,
            status: 'no_price',
            error: 'No price found in Uropa API response',
            debug: {
              responseKeys: Object.keys(uropaProduct),
              priceDetail: uropaProduct.priceDetail,
              priceRange: uropaProduct.priceRange,
            },
          });
          continue;
        }
        
        console.log(`✅ [Price Sync Test] Extracted price for ${code}: $${uropaCost}`);

        // ✅ CRITICAL FIX: Compare with COST PRICE in database
        const dbCost = parseFloat(
          dbProduct.baseCost || 
          dbProduct.costPrice || 
          dbProduct.cost ||
          dbProduct.basePrice ||
          dbProduct.price ||
          0
        );
        const priceDiff = uropaCost - dbCost;
        const priceChanged = Math.abs(priceDiff) >= 0.01;

        // Get current pricing config
        const pricingConfig = await getPricingConfig();
        const newPricing = calculateSellingPrice(uropaCost, pricingConfig);
        const oldPricing = calculateSellingPrice(dbCost, pricingConfig);

        results.push({
          code,
          status: priceChanged ? 'changed' : 'success',
          priceChanged,
          
          // ✅ FIX: Use field names that match the UI expectations
          oldCostPrice: dbCost,
          newCostPrice: uropaCost,
          oldSellingPrice: oldPricing.sellingPrice,
          newSellingPrice: newPricing.sellingPrice,
          difference: Math.round(priceDiff * 100) / 100,
          percentChange: dbCost > 0 ? Math.round((priceDiff / dbCost) * 10000) / 100 : 0,
          
          // Also keep the structured format for backward compatibility
          database: {
            cost: dbCost,
            sellingPrice: oldPricing.sellingPrice,
            markup: oldPricing.markupPercent,
          },
          uropa: {
            cost: uropaCost,
            sellingPrice: newPricing.sellingPrice,
            markup: newPricing.markupPercent,
          },
        });

      } catch (error: any) {
        results.push({
          code,
          status: 'error',
          error: error.message,
        });
      }
    }

    return c.json({
      success: true,
      results,
      summary: {
        total: results.length,
        pricesChanged: results.filter(r => r.priceChanged).length,
        errors: results.filter(r => r.status === 'error').length,
      },
    });

  } catch (error: any) {
    console.error('❌ Error in test sync:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// POST /price-sync/test-and-update - Check Uropa API AND auto-update prices
// ============================================
priceSync.post('/test-and-update', async (c) => {
  console.log('⚡ [Price Sync Auto-Update] Route called!');
  
  try {
    const { productCodes } = await c.req.json();
    
    if (!productCodes || !Array.isArray(productCodes) || productCodes.length === 0) {
      return c.json({
        success: false,
        error: 'Please provide an array of product codes',
      }, 400);
    }

    console.log(`⚡ [Price Sync Auto-Update] Checking and updating ${productCodes.length} products:`, productCodes);

    const token = await getToken();
    if (!token) {
      return c.json({
        success: false,
        error: 'Uropa API token not configured',
      }, 400);
    }

    // Use Authorization header (Bearer token)
    const headers = {
      'Authorization': formatAuthHeader(token),
      'Content-Type': 'application/json'
    };
    
    const results: any[] = [];
    let pricesUpdated = 0;

    // 🔥 STEP 1: Get all products from database
    console.log('📦 [Auto-Update] Step 1: Fetching products from database...');
    const allProducts = await kv.getByPrefix('products:');
    console.log(`✅ [Auto-Update] Found ${allProducts.length} total products in database`);
    
    // 🔥 STEP 2: Filter to products matching the codes
    const dbProductsMap = new Map();
    
    // 🐛 DEBUG: Log what we're searching for
    console.log(`🔍 [Auto-Update] Searching for codes:`, productCodes.map(c => c.toLowerCase()));
    
    for (const product of allProducts) {
      const productIdentifier = product.productCode || product.code || product.sku || product.id;
      const normalizedId = productIdentifier?.toLowerCase();
      
      // 🐛 DEBUG: Log each product check
      const isMatch = productCodes.some(code => code.toLowerCase() === normalizedId);
      
      if (isMatch) {
        dbProductsMap.set(normalizedId, product);
        console.log(`✅ [Auto-Update] Matched: ${productIdentifier} (${normalizedId})`);
      }
    }
    
    console.log(`✅ [Auto-Update] Found ${dbProductsMap.size} products matching codes (requested: ${productCodes.length})`);
    
    if (dbProductsMap.size === 0) {
      return c.json({
        success: false,
        error: 'No products found in database matching the provided codes',
        results: []
      });
    }
    
    // 🔥 STEP 3: Filter to products WITH cost prices
    const productsWithCost = Array.from(dbProductsMap.values()).filter((p: any) => {
      const costPrice = parseFloat(p.basePrice || p.costPrice || p.baseCost || 0);
      return costPrice > 0;
    });
    
    console.log(`✅ [Auto-Update] ${productsWithCost.length} products have cost prices`);
    
    if (productsWithCost.length === 0) {
      return c.json({
        success: false,
        error: 'None of the matched products have cost prices in database',
        results: []
      });
    }
    
    // 🔥 STEP 4: Get codes to send to Uropa (only products with cost prices)
    const codesToFetch = productsWithCost.map((p: any) => 
      p.productCode || p.code || p.sku
    );
    
    console.log(`🌐 [Auto-Update] Fetching ${codesToFetch.length} products from Uropa product detail endpoint...`);
    
    const uropaProducts: any[] = [];
    
    // 🔥 FIX: Add timeout to fetch calls (30 seconds per product)
    const fetchWithTimeout = async (url: string, options: any, timeoutMs = 30000) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(timeout);
        return response;
      } catch (error: any) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw error;
      }
    };
    
    // Fetch products one by one (with parallel processing in batches of 5)
    const BATCH_SIZE = 5;
    for (let i = 0; i < codesToFetch.length; i += BATCH_SIZE) {
      const batch = codesToFetch.slice(i, i + BATCH_SIZE);
      console.log(`🔄 [Auto-Update] Fetching batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(codesToFetch.length/BATCH_SIZE)}...`);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (code) => {
          try {
            // Use product detail endpoint with proper query params
            const url = `${UROPA_API_BASE}/products/${code}?lang=en&curr=AUD&fields=FULL`;
            console.log(`🌐 [Auto-Update] GET ${url}`);
            
            const response = await fetchWithTimeout(url, { 
              method: 'GET',
              headers: {
                'Authorization': formatAuthHeader(token),
                'Content-Type': 'application/json'
              }
            }, 30000); // 30 second timeout
            
            if (!response.ok) {
              console.log(`⚠️ [Auto-Update] Product ${code} returned ${response.status}`);
              return null;
            }
            
            const data = await response.json();
            console.log(`✅ [Auto-Update] Fetched ${code}:`, {
              code: data.code,
              hasPrice: !!data.priceDetail,
              priceB: data.priceDetail?.priceBreakdown?.[0]?.priceB,
              salesPrice: data.priceDetail?.salesPrice
            });
            
            return data;
          } catch (error: any) {
            console.error(`❌ [Auto-Update] Error fetching ${code}:`, error.message);
            return null;
          }
        })
      );
      
      // Collect successful results
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          uropaProducts.push(result.value);
          console.log(`✅ [Auto-Update] Added ${batch[idx]} to results`);
        }
      });
      
      // Small delay between batches
      if (i + BATCH_SIZE < codesToFetch.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`✅ [Auto-Update] Successfully fetched ${uropaProducts.length} of ${codesToFetch.length} products`);
    
    // Create map for quick lookup
    const uropaMap = new Map();
    uropaProducts.forEach((up: any) => {
      const code = (up.code || up.sku || up.productCode)?.toLowerCase();
      if (code) {
        uropaMap.set(code, up);
        console.log(`🗺️ [Auto-Update] Mapped Uropa product: ${code}`, {
          hasCode: !!up.code,
          hasSku: !!up.sku,
          hasProductCode: !!up.productCode,
          hasPriceDetail: !!up.priceDetail,
          hasPriceBreakdown: !!up.priceDetail?.priceBreakdown
        });
      }
    });

    console.log(`🗺️ [Auto-Update] Uropa map has ${uropaMap.size} entries`);
    console.log(`🗺️ [Auto-Update] Uropa map keys:`, Array.from(uropaMap.keys()));

    // 🔥 STEP 6: Compare and update prices
    for (const dbProduct of productsWithCost) {
      const productCode = dbProduct.productCode || dbProduct.code || dbProduct.sku;
      const normalizedCode = productCode?.toLowerCase();
      
      console.log(`🔍 [Auto-Update] Looking for: ${productCode} (normalized: ${normalizedCode})`);
      
      const uropaProduct = uropaMap.get(normalizedCode);
      
      if (!uropaProduct) {
        console.warn(`⚠️ [Auto-Update] Not found in map! Available keys:`, Array.from(uropaMap.keys()));
        results.push({
          code: productCode,
          status: 'not_in_uropa',
          error: 'Product not found in Uropa API response'
        });
        continue;
      }
      
      try {
        // ✅ STEP 1: Get current COST price from database (NOT selling price!)
        // 🔥 FIXED PRIORITY: Check basePrice FIRST (the field you're updating with SQL)
        const currentCostPrice = parseFloat(
          dbProduct.basePrice ||     // ← Check this FIRST (SQL update field!)
          dbProduct.baseCost ||      // ← Check this second
          dbProduct.costPrice ||     // ← Check this third
          dbProduct.cost ||          // ← Check this fourth
          dbProduct.price ||         // ← FALLBACK ONLY (might be selling price!)
          0
        );
        
        // 🔥 DEBUG: Show which field is being used
        const costFieldUsed = dbProduct.basePrice ? 'basePrice' :
                             dbProduct.baseCost ? 'baseCost' :
                             dbProduct.costPrice ? 'costPrice' :
                             dbProduct.cost ? 'cost' :
                             dbProduct.price ? 'price' :
                             'NONE';
        
        console.log(`🔍 [Auto-Update] ${productCode} cost fields:`, {
          basePrice: dbProduct.basePrice,
          baseCost: dbProduct.baseCost,
          costPrice: dbProduct.costPrice,
          cost: dbProduct.cost,
          price: dbProduct.price,
          fieldUsed: costFieldUsed,
          finalValue: currentCostPrice
        });
        
        // ✅ STEP 2: Get COST price from Uropa (Priority Order from docs)
        const uropaCost = 
          uropaProduct.priceDetail?.priceBreakdown?.[0]?.priceB ||  // ← BEST: B2B wholesale price
          uropaProduct.priceDetail?.salesPrice ||                   // ← Retail/sales price
          uropaProduct.priceDetail?.value ||                        // ← Generic value
          uropaProduct.priceDetail?.price ||                        // ← Generic price
          uropaProduct.priceRange?.minPrice?.value ||               // ← Min price from range
          uropaProduct.priceRange?.maxPrice?.value ||               // ← Max price from range
          uropaProduct.price?.value ||                              // ← Direct price value
          uropaProduct.basePrice?.value ||                          // ← Base price value
          uropaProduct.price ||                                     // ← Direct price
          null;
        
        if (!uropaCost) {
          results.push({
            code: productCode,
            status: 'no_price',
            error: 'No price found in Uropa API response'
          });
          continue;
        }
        
        const uropaCostPrice = parseFloat(String(uropaCost));
        
        // ✅ STEP 3: Calculate difference
        const difference = uropaCostPrice - currentCostPrice;
        const percentChange = currentCostPrice > 0 
          ? (difference / currentCostPrice) * 100 
          : 0;
        
        console.log(`📊 [Auto-Update] ${productCode}: DB=$${currentCostPrice.toFixed(2)} | Uropa=$${uropaCostPrice.toFixed(2)} | Diff=$${difference.toFixed(2)}`);
        
        // ✅ STEP 4: Check if price changed significantly (more than 1 cent)
        if (Math.abs(difference) > 0.01) {
          // Get current pricing config
          const pricingConfig = await getPricingConfig();
          
          // Calculate NEW selling price with current tiered pricing
          const newPricing = calculateSellingPrice(uropaCostPrice, pricingConfig);
          const oldPricing = calculateSellingPrice(currentCostPrice, pricingConfig);
          
          // ✅ STEP 5: Update ALL price fields in the product
          const updatedProduct = {
            ...dbProduct,
            
            // ═══════════════════════════════════════
            // COST FIELDS (Uropa wholesale price)
            // ═══════════════════════════════════════
            baseCost: uropaCostPrice,          // ← PRIMARY cost field
            costPrice: uropaCostPrice,         // ← Duplicate for compatibility
            cost: uropaCostPrice,              // ← Duplicate for compatibility
            basePrice: uropaCostPrice,         // ← Duplicate for compatibility
            
            // ═══════════════════════════════════════
            // SELLING PRICE FIELDS (Cost + Markup)
            // ═══════════════════════════════════════
            price: newPricing.sellingPrice,          // ← Main price field (SELLING price)
            salePrice: newPricing.sellingPrice,      // ← ProductCard checks this FIRST
            sellingPrice: newPricing.sellingPrice,   // ← Calculated selling price
            sellPrice: newPricing.sellingPrice,      // ← Duplicate
            calculatedPrice: newPricing.sellingPrice,// ← Duplicate
            
            // ══════════════════════════════════════
            // PRICING METADATA
            // ═══════════════════════════════════════
            markup: newPricing.markup,               // Dollar markup amount
            markupPercent: newPricing.markupPercent, // Markup percentage
            marginPercent: newPricing.marginPercent, // Profit margin percentage
            tierLabel: newPricing.tierLabel,         // Which tier applied
            
            // ═══════════════════════════════════════
            // TIMESTAMPS
            // ═══════════════════════════════════════
            lastPriceUpdate: new Date().toISOString(),
            lastSyncedWithUropa: new Date().toISOString()
          };
          
          // ✅ STEP 6: Save to KV store
          const productKey = `products:${dbProduct.id}`;
          await kv.set(productKey, updatedProduct);
          
          pricesUpdated++;
          
          results.push({
            code: productCode,
            status: 'updated',
            oldCostPrice: currentCostPrice,
            newCostPrice: uropaCostPrice,
            oldSellingPrice: oldPricing.sellingPrice,
            newSellingPrice: newPricing.sellingPrice,
            difference,
            percentChange,
            priceChanged: true
          });
          
          console.log(`✅ [Auto-Update] Updated ${productCode}: Cost ${currentCostPrice.toFixed(2)} → ${uropaCostPrice.toFixed(2)}, Selling ${oldPricing.sellingPrice.toFixed(2)} → ${newPricing.sellingPrice.toFixed(2)}`);
        } else {
          results.push({
            code: productCode,
            status: 'unchanged',
            costPrice: currentCostPrice,
            priceChanged: false
          });
          
          console.log(`➡️ [Auto-Update] ${productCode} unchanged (difference: $${difference.toFixed(2)})`);
        }
      } catch (error: any) {
        console.error(`❌ [Auto-Update] Error processing ${productCode}:`, error);
        results.push({
          code: productCode,
          status: 'error',
          error: error?.message || error?.toString() || 'Unknown error processing product'
        });
      }
    }

    console.log(`✅ [Auto-Update] COMPLETE: ${pricesUpdated} of ${productCodes.length} products updated`);

    return c.json({
      success: true,
      results,
      summary: {
        total: results.length,
        pricesChanged: results.filter(r => r.priceChanged).length,
        pricesUpdated: pricesUpdated,
        errors: results.filter(r => r.status === 'error').length,
      },
    });

  } catch (error: any) {
    console.error('❌ Error in auto-update sync:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// GET /price-sync/debug - Debug product structure
// ============================================
priceSync.get('/debug', async (c) => {
  try {
    const allProducts = await kv.getByPrefix('products:');
    
    if (allProducts.length === 0) {
      return c.json({
        success: false,
        error: 'No products found in database',
      });
    }

    // Get first 5 products as samples
    const sampleProducts = allProducts.slice(0, 5).map((p: any) => ({
      id: p.id,
      name: p.name || p.title || 'NO NAME',
      code: p.code || 'NO CODE',
      productCode: p.productCode || 'NO PRODUCT CODE',
      sku: p.sku || 'NO SKU',
      price: p.price || 'NO PRICE',
      baseCost: p.baseCost || 'NO BASE COST',
      costPrice: p.costPrice || 'NO COST PRICE',
      cost: p.cost || 'NO COST',
      basePrice: p.basePrice || 'NO BASE PRICE',
      allKeys: Object.keys(p).sort(),
    }));

    return c.json({
      success: true,
      totalProducts: allProducts.length,
      sampleProducts,
      message: 'Check the sampleProducts to see what fields your products have',
    });

  } catch (error: any) {
    console.error('❌ Error in debug:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// GET /price-sync/test-api - Test Uropa API connection
// ============================================
priceSync.get('/test-api', async (c) => {
  try {
    const token = await getToken();
    
    if (!token) {
      return c.json({
        success: false,
        error: 'Uropa API token not configured',
      }, 400);
    }

    console.log('🔍 [API Test] Token retrieved:', token ? `${token.substring(0, 30)}... (length: ${token.length})` : 'null');

    // ✅ Use tealium/data/category endpoint with POST method (known to work)
    const testUrl = `${UROPA_API_BASE}/tealium/data/category?lang=en&curr=AUD&vatToggle=EXVAT`;
    
    const authHeader = formatAuthHeader(token);
    console.log('🔍 [API Test] Authorization header:', authHeader.substring(0, 50) + '...');
    console.log('🔍 [API Test] Calling URL:', testUrl);
    
    const response = await fetch(testUrl, { 
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    console.log('🔍 [API Test] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API Test] Uropa API error:', errorText.substring(0, 500));
      return c.json({
        success: false,
        error: `Uropa API returned ${response.status}: ${errorText.substring(0, 100)}`,
        status: response.status,
        debug: {
          tokenPreview: token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : 'null',
          tokenLength: token ? token.length : 0,
          authHeaderPreview: authHeader.substring(0, 50) + '...',
          url: testUrl
        }
      }, 200);
    }

    const data = await response.json();

    console.log('✅ [API Test] Success! Got data:', Object.keys(data));

    return c.json({
      success: true,
      message: 'Uropa API connection successful!',
      testProductCode: data.products?.[0]?.code || 'TEST',
    });

  } catch (error: any) {
    console.error('❌ [API Test] Exception:', error);
    return c.json({ 
      success: false, 
      error: error.message,
    }, 500);
  }
});

// ============================================
// POST /price-sync/clear-credentials - Clear saved headers/token from KV
// ============================================
priceSync.post('/clear-credentials', async (c) => {
  try {
    console.log('🧹 [Clear Credentials] Clearing saved token and headers from KV...');
    
    // Delete saved credentials
    await kv.del('uropa_api_token');
    await kv.del('uropa_api_headers');
    
    console.log('✅ [Clear Credentials] Credentials cleared successfully');
    
    return c.json({
      success: true,
      message: 'Saved credentials cleared. System will now use UROPA_API_TOKEN environment variable.',
    });
  } catch (error: any) {
    console.error('❌ [Clear Credentials] Error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// ============================================
// GET /price-sync/debug-tokens - Debug token sources
// ============================================
priceSync.get('/debug-tokens', async (c) => {
  try {
    console.log('🔍 [Debug Tokens] Checking all token sources...');
    
    const kvToken = await kv.get('uropa_api_token');
    const kvHeaders = await kv.get('uropa_api_headers');
    const envToken = Deno.env.get('UROPA_API_TOKEN');
    
    let kvHeadersParsed = null;
    let kvAuthFromHeaders = null;
    if (kvHeaders) {
      try {
        kvHeadersParsed = JSON.parse(kvHeaders);
        kvAuthFromHeaders = kvHeadersParsed.authorization || kvHeadersParsed.Authorization;
      } catch (e) {
        console.error('Failed to parse KV headers:', e);
      }
    }
    
    return c.json({
      success: true,
      tokens: {
        kvToken: kvToken ? `${kvToken.substring(0, 50)}... (length: ${kvToken.length})` : null,
        kvHeaders: kvHeaders ? 'EXISTS' : null,
        kvAuthFromHeaders: kvAuthFromHeaders ? `${kvAuthFromHeaders.substring(0, 50)}... (length: ${kvAuthFromHeaders.length})` : null,
        kvHeadersKeys: kvHeadersParsed ? Object.keys(kvHeadersParsed) : null,
        envToken: envToken ? `${envToken.substring(0, 50)}... (length: ${envToken.length})` : null,
        priorityOrder: [
          '1. KV Storage (uropa_api_token) - User saved via UI',
          '2. Environment Variable (UROPA_API_TOKEN) - Fallback',
        ]
      }
    });
  } catch (error: any) {
    console.error('❌ [Debug Tokens] Error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// ============================================
// GET /price-sync/list-products - Get all products for testing
// ============================================
priceSync.get('/list-products', async (c) => {
  try {
    console.log('📋 [List Products] Fetching products...');
    
    // Get pagination params
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';
    const brand = url.searchParams.get('brand') || '';
    
    // Get ALL product keys first
    const allProductKeys = await kv.getByPrefix('products:');
    
    // Extract and filter products
    let products = allProductKeys.map(p => ({
      code: p.code || p.productCode || p.sku || p.id || '',
      name: p.name || p.productName || 'Unknown',
      brand: p.brand || p.brandName || 'Unknown',
      cost: p.baseCost || p.costPrice || p.cost || p.basePrice || 0,
      sellingPrice: p.price || p.sellingPrice || p.sellPrice || 0,
      markupPercent: p.markupPercent || 0,
      tradePrice: p.tradePrice || p.baseCost || p.costPrice || 0,
    })).filter(p => p.code);
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p => 
        p.code.toLowerCase().includes(searchLower) || 
        p.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply brand filter
    if (brand) {
      products = products.filter(p => p.brand === brand);
    }
    
    // Get unique brands
    const uniqueBrands = Array.from(new Set(allProductKeys.map(p => p.brand || p.brandName || 'Unknown'))).sort();
    
    // Paginate
    const totalProducts = products.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = products.slice(startIndex, endIndex);
    
    console.log(`✅ [List Products] Returning ${paginatedProducts.length} of ${totalProducts} products (page ${page}/${totalPages})`);
    
    return c.json({
      success: true,
      products: paginatedProducts,
      pagination: {
        page,
        limit,
        total: totalProducts,
        totalPages,
        hasMore: page < totalPages
      },
      brands: uniqueBrands
    });
  } catch (error: any) {
    console.error('❌ [List Products] Error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// ============================================
// POST /price-sync/manual-update-cost - Manually change a product's cost (for testing)
// ============================================
priceSync.post('/manual-update-cost', async (c) => {
  console.log('🔧 [Manual Update] Route called!');
  
  try {
    const body = await c.req.json();
    console.log('🔧 [Manual Update] Request body:', body);
    
    const { productCode, newCost } = body;
    
    if (!productCode || newCost === undefined) {
      console.log('🔧 [Manual Update] Missing parameters');
      return c.json({
        success: false,
        error: 'Please provide productCode and newCost',
      }, 400);
    }

    console.log(`🔧 [Manual Update] Changing cost for ${productCode} to $${newCost}...`);

    // Find the product
    const allProducts = await kv.getByPrefix('products:');
    const product = allProducts.find((p: any) => 
      p.code === productCode || 
      p.productCode === productCode || 
      p.sku === productCode ||
      p.id === productCode
    );

    if (!product) {
      return c.json({
        success: false,
        error: `Product ${productCode} not found in database`,
      }, 404);
    }

    // Store old values for comparison
    const oldCost = parseFloat(
      product.baseCost || 
      product.costPrice || 
      product.cost ||
      product.basePrice ||
      product.price || 
      0
    );

    // Get current pricing config
    const pricingConfig = await getPricingConfig();
    
    // Recalculate selling price
    const newPricing = calculateSellingPrice(newCost, pricingConfig);
    const oldPricing = calculateSellingPrice(oldCost, pricingConfig);

    // ✅ CRITICAL: Update ALL possible field names to ensure consistency
    const updatedProduct = {
      ...product,
      // 🔥 COST FIELDS - Store the Uropa wholesale/cost price
      tradePrice: newCost,      // ← Trade price (checked FIRST by bulk query!)
      baseCost: newCost,        // ← Uropa cost (original)
      costPrice: newCost,       // ← Alternative cost field
      cost: newCost,            // ← Generic cost
      basePrice: newCost,       // ← Base price
      // 🔥 SELLING PRICE FIELDS - Store the calculated selling price (with markup)
      price: newPricing.sellingPrice,           // ← Main price field (SELLING price!)
      salePrice: newPricing.sellingPrice,       // ← ProductCard checks this FIRST
      sellingPrice: newPricing.sellingPrice,
      sellPrice: newPricing.sellingPrice,
      calculatedPrice: newPricing.sellingPrice,
      // Update pricing metadata
      markup: newPricing.markup,
      markupPercent: newPricing.markupPercent,
      marginPercent: newPricing.marginPercent,
      tierLabel: newPricing.tierLabel,
      // Timestamps
      lastManualUpdate: new Date().toISOString(),
      lastPriceUpdate: new Date().toISOString(),
    };

    // Save to database
    console.log(`🔧 [Manual Update] Saving to KV store with key: products:${product.id}`);
    console.log(`🔧 [Manual Update] Product ID: ${product.id}`);
    console.log(`🔧 [Manual Update] Updated fields:`, {
      tradePrice: updatedProduct.tradePrice,
      baseCost: updatedProduct.baseCost,
      basePrice: updatedProduct.basePrice,
      price: updatedProduct.price,
      sellingPrice: updatedProduct.sellingPrice
    });
    
    await kv.set(`products:${product.id}`, updatedProduct);
    
    console.log(`✅ [Manual Update] KV.set completed successfully`);

    // ✅ CRITICAL: Clear CMS data cache to force frontend reload
    console.log('🔄 [Manual Update] Clearing cms:data cache to force price refresh...');
    try {
      await kv.del('cms:data');
      console.log('✅ [Manual Update] Cache cleared successfully');
    } catch (cacheError) {
      console.warn('⚠️  [Manual Update] Failed to clear cache:', cacheError);
      // Continue anyway - product is saved
    }

    console.log(`✅ [Manual Update] Updated ${productCode}: Cost ${oldCost}→${newCost}, Sell ${oldPricing.sellingPrice}→${newPricing.sellingPrice}`);

    return c.json({
      success: true,
      message: `Product ${productCode} cost manually updated`,
      product: {
        code: productCode,
        name: product.name || product.title || 'Unknown',
        oldCost,
        newCost,
        oldSellingPrice: oldPricing.sellingPrice,
        newSellingPrice: newPricing.sellingPrice,
        difference: {
          cost: Math.round((newCost - oldCost) * 100) / 100,
          sellingPrice: Math.round((newPricing.sellingPrice - oldPricing.sellingPrice) * 100) / 100,
        },
        updatedFields: {
          // Cost fields (what we pay Uropa)
          tradePrice: newCost,
          baseCost: newCost,
          costPrice: newCost,
          cost: newCost,
          basePrice: newCost,
          // Selling price fields (what customer pays)
          price: newPricing.sellingPrice,  // ✅ FIXED: price is SELLING price, not cost!
          sellingPrice: newPricing.sellingPrice,
          salePrice: newPricing.sellingPrice,
          // Pricing metadata
          markup: newPricing.markup,
          markupPercent: newPricing.markupPercent,
          marginPercent: newPricing.marginPercent,
          tierLabel: newPricing.tierLabel,
        },
      },
    });

  } catch (error: any) {
    console.error('❌ [Manual Update] Error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// ✅ NEW: Query product endpoint - Fetches from Uropa and auto-updates if price changed
priceSync.post('/query-product', async (c) => {
  try {
    console.log('🔍 [Query Product] Starting...');
    
    const { productCode } = await c.req.json();
    console.log('🔍 [Query Product] Code:', productCode);
    
    if (!productCode) {
      return c.json({ success: false, error: 'Product code is required' }, 400);
    }

    // Find product by code
    const allProducts = await kv.getByPrefix('products:');
    console.log(`🔍 [Query Product] Found ${allProducts.length} products in database`);

    const product = allProducts.find(p => p && p.code === productCode);
    
    if (!product) {
      console.log(`🔍 [Query Product] Product ${productCode} not found`);
      return c.json({ 
        success: false, 
        error: `Product ${productCode} not found in database` 
      }, 404);
    }

    console.log('✅ [Query Product] Found in database!');

    // Fetch from Uropa API
    const token = await getToken();
    if (!token) {
      return c.json({ success: false, error: 'Uropa API token not configured' }, 500);
    }

    console.log('🔍 [Query Product] Making TWO API calls for complete data...');
    
    // 🔥 CALL 1: /products/{code} - Basic product data
    console.log('📡 [Call 1] Fetching from /products endpoint...');
    const basicResponse = await fetch(`${UROPA_API_BASE}/products/${productCode}?lang=en&curr=AUD&fields=FULL`, {
      method: 'GET',
      headers: {
        'Authorization': formatAuthHeader(token),
        'Content-Type': 'application/json'
      }
    });

    if (!basicResponse.ok) {
      const errorText = await basicResponse.text();
      console.error('❌ [Call 1] Basic API error:', errorText);
      return c.json({ 
        success: false, 
        error: `Uropa /products API returned ${basicResponse.status}: ${errorText}` 
      }, 500);
    }

    const basicData = await basicResponse.json();
    console.log('✅ [Call 1] Basic data received!');

    // 🔥 CALL 2: /orgUsers/current/products/details/{code} - Full attributes!
    console.log('📡 [Call 2] Fetching from /details endpoint for full attributes...');
    const detailsResponse = await fetch(`${UROPA_API_BASE}/orgUsers/current/products/details/${productCode}?lang=en&curr=AUD`, {
      method: 'GET',
      headers: {
        'Authorization': formatAuthHeader(token),
        'Content-Type': 'application/json'
      }
    });

    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      console.error('❌ [Call 2] Details API error:', errorText);
      // Continue with basic data if details fail
      console.warn('⚠️ [Call 2] Continuing with basic data only');
    }

    const detailsData = detailsResponse.ok ? await detailsResponse.json() : null;
    console.log('✅ [Call 2] Details data received!');
    
    // 🔍 LOG THE FULL RAW RESPONSE to see exactly what we got
    console.log('📦 [Call 2] RAW DETAILS RESPONSE:', JSON.stringify(detailsData, null, 2));
    
    // 🔍 Check the EXACT structure from the details endpoint
    console.log('🔍 [Call 2] Details endpoint structure:', {
      hasProduct: !!detailsData?.product,
      hasFeatureAttributes: !!detailsData?.product?.featureAttributes,
      hasBreadcrumbs: !!detailsData?.breadcrumbs,
      rootKeys: detailsData ? Object.keys(detailsData).slice(0, 10) : [],
      productKeys: detailsData?.product ? Object.keys(detailsData.product).slice(0, 15) : []
    });

    // 🔥 Extract from product.featureAttributes!
    const featureAttributes = detailsData?.product?.featureAttributes || {};
    
    console.log('📝 [Query Product] FeatureAttributes keys:', Object.keys(featureAttributes));
    
    // Use details data for full product info (has attributes), fall back to basic
    const uropaData = detailsData || basicData;
    
    // 🔥 Extract the pre-organized arrays directly from featureAttributes
    const comparisonData = featureAttributes.comparisonData || [];
    const attributesData = featureAttributes.attributesData || [];
    const facetData = featureAttributes.facetData || [];
    const hazardData = featureAttributes.hazardData || [];
    
    console.log(`📊 [Query Product] Attributes found:`, {
      comparisonData: comparisonData.length,
      attributesData: attributesData.length,
      facetData: facetData.length,
      hazardData: hazardData.length,
    });

    // 🔍 DIAGNOSTIC: Return EVERYTHING so we can see what fields exist
    // ✅ Extract Uropa's SELLING price (this is YOUR COST/TRADE PRICE)
    // PRIORITY: For detailed endpoint, check product.price and product.priceDetail
    const uropaSellingPrice = 
      uropaData?.product?.price?.value ||                               // Product price (detailed endpoint)
      uropaData?.product?.priceDetail?.priceBreakdown?.[0]?.priceB ||  // B2B price
      uropaData?.product?.priceDetail?.salesPrice ||                    // Sales price
      uropaData?.priceDetail?.priceBreakdown?.[0]?.priceB ||           // B2B price (MOST ACCURATE)
      uropaData?.priceDetail?.salesPrice ||                             // Sales price
      uropaData?.price?.value ||                                        // Generic price
      uropaData?.priceDetail?.value ||                                  // Alternative
      uropaData?.priceRange?.minPrice?.value ||                         // Min price
      0;

    // ✅ Extract YOUR database trade price (what you currently pay Uropa)
    // PRIORITY: Check cost/baseCost fields first (most reliable), then tradePrice
    const dbTradePrice = parseFloat(
      product.baseCost ||
      product.cost ||
      product.costPrice ||
      product.basePrice ||
      product.tradePrice ||
      0
    );

    // ✅ Calculate difference
    const difference = uropaSellingPrice - dbTradePrice;
    const percentChange = dbTradePrice > 0 ? (difference / dbTradePrice * 100) : 0;

    // ✅ Calculate YOUR new selling price (if you updated to Uropa's current price)
    // PRIORITY: sellingPrice field is the most accurate calculated selling price
    const currentYourSellingPrice = parseFloat(
      product.sellingPrice || 
      product.salePrice || 
      product.calculatedPrice || 
      product.price || 
      0
    );
    
    // Get current pricing config
    const pricingConfig = await getPricingConfig();
    
    // ✅ Calculate CURRENT pricing (from existing tradePrice)
    const currentPricing = dbTradePrice > 0 
      ? calculateSellingPrice(dbTradePrice, pricingConfig)
      : null;
    
    // ✅ Calculate NEW pricing (if updated to Uropa's price)
    const newPricing = uropaSellingPrice > 0 
      ? calculateSellingPrice(uropaSellingPrice, pricingConfig)
      : null;

    return c.json({
      success: true,
      diagnostic: true,
      summary: {
        productCode: product.code,
        productName: product.name,
        // YOUR DATABASE - CURRENT
        dbTradePrice: dbTradePrice,              // What you PAY Uropa (cost)
        dbYourSellingPrice: currentYourSellingPrice,  // What you SELL for
        currentMarkup: currentPricing?.markup || null,
        currentMarkupPercent: currentPricing?.markupPercent || null,
        currentMarginPercent: currentPricing?.marginPercent || null,
        currentTierLabel: currentPricing?.tierLabel || null,
        // UROPA API
        uropaSellingPrice: uropaSellingPrice,    // What Uropa SELLS for (your NEW cost)
        // COMPARISON
        difference: difference,                   // Difference in COST
        percentChange: percentChange,            // % change in COST
        priceChanged: Math.abs(difference) > 0.01,
        // IF YOU UPDATE - NEW
        newYourSellingPrice: newPricing?.sellingPrice || null,
        newMarkup: newPricing?.markup || null,
        newMarkupPercent: newPricing?.markupPercent || null,
        newMarginPercent: newPricing?.marginPercent || null,
        newTierLabel: newPricing?.tierLabel || null,
        // SELLING PRICE IMPACT
        sellingPriceChange: newPricing && currentYourSellingPrice 
          ? newPricing.sellingPrice - currentYourSellingPrice 
          : 0,
      },
      database: {
        code: product.code,
        name: product.name,
        tradePrice: product.tradePrice,
        baseCost: product.baseCost,
        costPrice: product.costPrice,
        cost: product.cost,
        basePrice: product.basePrice,
        price: product.price,
        sellingPrice: product.sellingPrice,
        salePrice: product.salePrice,
        sellPrice: product.sellPrice,
        calculatedPrice: product.calculatedPrice,
        allFields: product,
      },
      uropa: {
        rawData: uropaData,
        extractedSellingPrice: uropaSellingPrice,
        // Support both endpoint structures
        priceDetail: uropaData?.priceDetail || uropaData?.product?.priceDetail,
        priceBreakdown: uropaData?.priceDetail?.priceBreakdown || uropaData?.product?.priceDetail?.priceBreakdown,
        priceValue: uropaData?.price?.value || uropaData?.product?.price?.value,
        priceB: uropaData?.priceDetail?.priceBreakdown?.[0]?.priceB || uropaData?.product?.priceDetail?.priceBreakdown?.[0]?.priceB,
        allPriceFields: {
          'product.price.value': uropaData?.product?.price?.value,
          'product.priceDetail.priceB': uropaData?.product?.priceDetail?.priceBreakdown?.[0]?.priceB,
          'price.value': uropaData?.price?.value,
          'priceDetail.value': uropaData?.priceDetail?.value,
          'priceDetail.salesPrice': uropaData?.priceDetail?.salesPrice,
          priceA: uropaData?.priceDetail?.priceBreakdown?.[0]?.priceA,
          priceB: uropaData?.priceDetail?.priceBreakdown?.[0]?.priceB,
          priceC: uropaData?.priceDetail?.priceBreakdown?.[0]?.priceC,
          priceD: uropaData?.priceDetail?.priceBreakdown?.[0]?.priceD,
          'priceRange.minPrice.value': uropaData?.priceRange?.minPrice?.value,
          'priceRange.maxPrice.value': uropaData?.priceRange?.maxPrice?.value,
        },
        // 🆕 ATTRIBUTES - Specifications and features
        attributes: {
          comparisonData: comparisonData,     // Specifications (Capacity, Dimensions, etc.)
          attributesData: attributesData,     // Product features/bullet points
          facetData: facetData,               // Filterable attributes
          hazardData: hazardData,             // Hazard information
        }
      }
    });

    /* COMMENTED OUT - Will re-enable after we see the data structure */

  } catch (error: any) {
    console.error('❌ [Query Product] Error:', error);
    return c.json({ 
      success: false, 
      error: error.message || String(error),
      stack: error.stack
    }, 500);
  }
});

// ✅ NEW: Query multiple products in bulk
priceSync.post('/query-bulk-products', async (c) => {
  try {
    console.log('🔍 [Bulk Query] Starting...');
    
    const { productCodes } = await c.req.json();
    console.log('🔍 [Bulk Query] Codes:', productCodes);

    if (!productCodes || !Array.isArray(productCodes) || productCodes.length === 0) {
      return c.json({
        success: false,
        error: 'Please provide an array of product codes'
      }, 400);
    }

    // ✅ LIMIT: Maximum 50 products to prevent timeouts
    if (productCodes.length > 50) {
      return c.json({
        success: false,
        error: `Too many products requested. Maximum is 50 products per query (you requested ${productCodes.length}). Please split into smaller batches.`
      }, 400);
    }

    // 🔥 FIX: Add timeout helper for fetch calls
    const fetchWithTimeout = async (url: string, options: any, timeoutMs = 10000) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(timeout);
        return response;
      } catch (error: any) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw error;
      }
    };

    // Fetch all products from database
    const allProducts = await kv.getByPrefix('products:');
    console.log(`🔍 [Bulk Query] Loaded ${allProducts.length} products from database`);
    
    // Debug: Show sample product fields
    if (allProducts.length > 0) {
      const sampleKeys = Object.keys(allProducts[0]).filter(k => 
        k.toLowerCase().includes('code') || k === 'sku' || k === 'id'
      );
      console.log(`🔍 [Bulk Query] Sample product ID fields:`, sampleKeys);
    }
    
    const results = [];
    
    // Get token once before the loop
    let token = null;
    try {
      token = await getToken();
    } catch (tokenError) {
      console.warn('⚠️ [Bulk Query] Could not get Uropa token:', tokenError);
    }

    // 🔥 FIX: Process products in smaller batches to prevent timeout
    const BATCH_SIZE = 10;
    for (let i = 0; i < productCodes.length; i += BATCH_SIZE) {
      const batch = productCodes.slice(i, i + BATCH_SIZE);
      console.log(`🔄 [Bulk Query] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(productCodes.length/BATCH_SIZE)} (${batch.length} products)...`);
      
      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async (code) => {
          try {
            const trimmedCode = code.trim().toUpperCase();
            console.log(`🔍 [Bulk Query] Looking for: "${trimmedCode}"`);
            
            // Find product in database - try multiple field variations
            const product = allProducts.find((p: any) => {
              const matches = 
                (p.code && p.code.toString().trim().toUpperCase() === trimmedCode) ||
                (p.productCode && p.productCode.toString().trim().toUpperCase() === trimmedCode) ||
                (p.sku && p.sku.toString().trim().toUpperCase() === trimmedCode) ||
                (p.id && p.id.toString().trim().toUpperCase() === trimmedCode);
              return matches;
            });

            if (!product) {
              console.log(`❌ [Bulk Query] Not found: "${trimmedCode}"`);
              return {
                productCode: code,
                found: false,
                error: 'Not found in database'
              };
            }

            console.log(`✅ [Bulk Query] Found: ${product.name || 'Unknown'}`);

            // Get current cost and selling prices
            const dbTradePrice = parseFloat(
              product.tradePrice || 
              product.baseCost || 
              product.costPrice || 
              product.cost ||
              product.basePrice || 
              0
            );

            const dbYourSellingPrice = parseFloat(
              product.price || 
              product.salePrice || 
              product.sellingPrice || 
              0
            );

            // Fetch from Uropa API
            let uropaSellingPrice = dbTradePrice; // Default to current if API fails
            let uropaData = null;

            // 🔥 TWO-CALL APPROACH: Basic product + Details with featureAttributes
            if (token) {
              try {
                console.log(`📡 [Bulk Query] Call 1: Basic product ${trimmedCode}...`);
                const basicResponse = await fetchWithTimeout(
                  `${UROPA_API_BASE}/products/${code.trim()}?lang=en&curr=AUD&fields=FULL`,
                  { 
                    method: 'GET',
                    headers: {
                      'Authorization': formatAuthHeader(token),
                      'Content-Type': 'application/json'
                    }
                  },
                  10000
                );

                if (!basicResponse.ok) {
                  console.log(`⚠️ [Bulk Query] Call 1 returned ${basicResponse.status} for ${trimmedCode}`);
                  // Continue without Uropa data
                } else {
                  const basicData = await basicResponse.json();

                  // 📡 CALL 2: Get full details including featureAttributes
                  console.log(`📡 [Bulk Query] Call 2: Details for ${trimmedCode}...`);
                  const detailsResponse = await fetchWithTimeout(
                    `${UROPA_API_BASE}/orgUsers/current/products/details/${code.trim()}?lang=en&curr=AUD`,
                    { 
                      method: 'GET',
                      headers: {
                        'Authorization': formatAuthHeader(token),
                        'Content-Type': 'application/json'
                      }
                    },
                    10000
                  );

                  const detailsData = detailsResponse.ok ? await detailsResponse.json() : null;
                  const uropaDataFull = detailsData || basicData;

                  // 🔥 Extract price using same logic as single query
                  uropaSellingPrice = parseFloat(
                    uropaDataFull?.product?.price?.value ||
                    uropaDataFull?.product?.priceDetail?.priceBreakdown?.[0]?.priceB ||
                    uropaDataFull?.product?.priceDetail?.salesPrice ||
                    uropaDataFull?.priceDetail?.priceBreakdown?.[0]?.priceB ||
                    uropaDataFull?.priceDetail?.salesPrice ||
                    uropaDataFull?.price?.value ||
                    dbTradePrice
                  );

                  // 🔥 Extract description for update
                  uropaData = uropaDataFull;
                  
                  console.log(`✅ [Bulk Query] Uropa price for ${trimmedCode}: $${uropaSellingPrice}`);
                }
              } catch (uropaError: any) {
                console.error(`❌ [Bulk Query] Uropa error for ${trimmedCode}:`, uropaError.message);
                // Continue with database price if Uropa fails
              }
            }

            // Get current pricing config
            const pricingConfig = await getPricingConfig();
            
            // Calculate what new prices would be if we update
            const currentPricing = calculateSellingPrice(dbTradePrice, pricingConfig);
            const newPricing = calculateSellingPrice(uropaSellingPrice, pricingConfig);

            const difference = Math.round((uropaSellingPrice - dbTradePrice) * 100) / 100;
            const percentChange = dbTradePrice > 0 
              ? Math.round(((uropaSellingPrice - dbTradePrice) / dbTradePrice) * 10000) / 100 
              : 0;

            // 🔥 Extract description from Uropa data
            const uropaDescription = uropaData?.product?.description || 
                                    uropaData?.description || 
                                    product.description || 
                                    '';
            const descriptionChanged = uropaDescription && uropaDescription !== product.description;

            return {
              productCode: code,
              productName: product.name || product.title || 'Unknown',
              found: true,
              priceChanged: Math.abs(difference) >= 0.01,
              descriptionChanged,
              
              // Current database values
              dbTradePrice,
              dbYourSellingPrice,
              dbDescription: product.description || '',
              
              // Uropa values
              uropaSellingPrice,
              uropaDescription,
              
              // Comparison
              difference,
              percentChange,
              
              // What would happen if we update
              newYourSellingPrice: newPricing.sellingPrice,
              sellingPriceChange: Math.round((newPricing.sellingPrice - dbYourSellingPrice) * 100) / 100,
              
              // Pricing details
              currentTierLabel: currentPricing.tierLabel,
              currentMarkup: currentPricing.markup,
              currentMarkupPercent: currentPricing.markupPercent,
              currentMarginPercent: currentPricing.marginPercent,
              
              newTierLabel: newPricing.tierLabel,
              newMarkup: newPricing.markup,
              newMarkupPercent: newPricing.markupPercent,
              newMarginPercent: newPricing.marginPercent,
            };

          } catch (error: any) {
            console.error(`❌ [Bulk Query] Error processing ${code}:`, error.message || error);
            return {
              productCode: code,
              found: false,
              error: error?.message || 'Unknown error'
            };
          }
        })
      );
      
      // Collect results from this batch
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        } else if (result.status === 'rejected') {
          console.error(`❌ [Bulk Query] Batch item rejected:`, result.reason);
          results.push({
            productCode: 'unknown',
            found: false,
            error: result.reason?.message || 'Processing failed'
          });
        }
      });
      
      // Small delay between batches to prevent overwhelming the API
      if (i + BATCH_SIZE < productCodes.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ [Bulk Query] Processed ${results.length} products`);
    console.log(`📊 [Bulk Query] Found: ${results.filter(r => r.found).length}, Not found: ${results.filter(r => !r.found).length}`);

    return c.json({
      success: true,
      results,
      summary: {
        total: results.length,
        found: results.filter(r => r.found).length,
        notFound: results.filter(r => !r.found).length,
        priceChanged: results.filter(r => r.priceChanged).length,
        upToDate: results.filter(r => r.found && !r.priceChanged).length,
      }
    });

  } catch (error: any) {
    console.error('❌ [Bulk Query] Error:', error);
    return c.json({ 
      success: false, 
      error: error?.message || String(error),
      stack: error?.stack || 'No stack trace available'
    }, 500);
  }
});

// ============================================
// POST /price-sync/bulk-update-costs - Bulk update product costs with batch processing
// ============================================
priceSync.post('/bulk-update-costs', async (c) => {
  console.log('⚡ [Bulk Update Costs] Route called!');
  
  try {
    const { updates } = await c.req.json();
    console.log('⚡ [Bulk Update Costs] Request body:', { updateCount: updates?.length });
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return c.json({
        success: false,
        error: 'Please provide an array of updates with productCode and newCost fields'
      }, 400);
    }

    // ⚠️ IMPORTANT: Limit bulk updates to prevent timeouts (Edge Functions have 60s limit)
    if (updates.length > 20) {
      return c.json({
        success: false,
        error: `Too many products to update at once (max 20, you requested ${updates.length}). Please select fewer products or update in smaller batches to avoid timeouts.`
      }, 400);
    }

    console.log(`⚡ [Bulk Update Costs] Updating ${updates.length} products...`);

    // Fetch all products from database ONCE
    const allProducts = await kv.getByPrefix('products:');
    console.log(`📦 [Bulk Update Costs] Loaded ${allProducts.length} products from database`);

    // Get pricing config ONCE before processing (avoid repeated calls)
    const pricingConfig = await getPricingConfig();
    console.log(`📐 [Bulk Update Costs] Loaded pricing config:`, pricingConfig);

    // Process in batches of 10 to prevent timeouts
    const BATCH_SIZE = 10;
    const batches: any[][] = [];
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      batches.push(updates.slice(i, i + BATCH_SIZE));
    }

    console.log(`📊 [Bulk Update Costs] Processing ${batches.length} batches of up to ${BATCH_SIZE} products each`);

    const results: any[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`🔄 [Bulk Update Costs] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} products)...`);

      // Process products in parallel within the batch
      const batchResults = await Promise.allSettled(
        batch.map(async (update: { productCode: string; newCost: number; newDescription?: string }) => {
          try {
            const { productCode, newCost, newDescription } = update;

            // Find the product in the pre-loaded array
            const product = allProducts.find((p: any) =>
              p.code === productCode ||
              p.productCode === productCode ||
              p.sku === productCode ||
              p.id === productCode
            );

            if (!product) {
              console.warn(`⚠️ [Bulk Update Costs] Product ${productCode} not found`);
              return {
                success: false,
                productCode,
                error: 'Product not found in database'
              };
            }

            // Store old cost for logging
            const oldCost = parseFloat(
              product.baseCost ||
              product.tradePrice ||  // 🔥 ADDED tradePrice
              product.costPrice ||
              product.cost ||
              product.basePrice ||
              product.price ||
              0
            );

            // Calculate new selling price with current tiered pricing (using pre-loaded config)
            const newPricing = calculateSellingPrice(newCost, pricingConfig);
            const oldPricing = calculateSellingPrice(oldCost, pricingConfig);

            // Update ALL price fields AND description if provided
            const updatedProduct = {
              ...product,
              // 🔥 Cost fields (what we pay supplier) - ALL set to Uropa price
              baseCost: newCost,
              costPrice: newCost,
              cost: newCost,
              basePrice: newCost,
              tradePrice: newCost,  // 🔥 ADDED tradePrice
              // Selling price fields (what customer pays)
              price: newPricing.sellingPrice,
              salePrice: newPricing.sellingPrice,
              sellingPrice: newPricing.sellingPrice,
              sellPrice: newPricing.sellingPrice,
              calculatedPrice: newPricing.sellingPrice,
              // Pricing metadata
              markup: newPricing.markup,
              markupPercent: newPricing.markupPercent,
              marginPercent: newPricing.marginPercent,
              tierLabel: newPricing.tierLabel,
              // 🔥 Update description if provided
              ...(newDescription && { description: newDescription }),
              // Timestamps
              lastPriceUpdate: new Date().toISOString(),
              lastSyncedWithUropa: new Date().toISOString()
            };

            // Save to KV store
            await kv.set(`products:${product.id}`, updatedProduct);

            // Simplified success logging
            console.log(`✅ [${productCode}] Cost: ${oldCost.toFixed(2)}→${newCost.toFixed(2)}, Sell: ${oldPricing.sellingPrice.toFixed(2)}→${newPricing.sellingPrice.toFixed(2)}`);

            return {
              success: true,
              productCode,
              oldCost,
              newCost,
              oldSellingPrice: oldPricing.sellingPrice,
              newSellingPrice: newPricing.sellingPrice
            };

          } catch (error: any) {
            console.error(`❌ [Bulk Update Costs] Error processing ${update.productCode}:`, error);
            return {
              success: false,
              productCode: update.productCode,
              error: error.message || 'Unknown error'
            };
          }
        })
      );

      // Collect results from this batch
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.success) {
            successCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
          results.push({
            success: false,
            error: result.reason?.message || 'Promise rejected'
          });
        }
      });

      console.log(`✅ [Bulk Update Costs] Batch ${batchIndex + 1}/${batches.length} complete. Success: ${successCount}, Failed: ${failCount}`);
    }

    console.log(`✅ [Bulk Update Costs] COMPLETE: Updated ${successCount} of ${updates.length} products. Failed: ${failCount}`);

    // Clear CMS cache to force price refresh
    try {
      await kv.del('cms:data');
      console.log('✅ [Bulk Update Costs] Cleared CMS cache');
    } catch (cacheError) {
      console.warn('⚠️ [Bulk Update Costs] Failed to clear cache:', cacheError);
    }

    return c.json({
      success: true,
      message: `Bulk update complete. Updated ${successCount} products, ${failCount} failed.`,
      results,
      summary: {
        total: updates.length,
        successCount,
        failCount,
        batches: batches.length
      }
    });

  } catch (error: any) {
    console.error('❌ [Bulk Update Costs] Error:', error);
    return c.json({
      success: false,
      error: error.message || 'Unknown error during bulk update'
    }, 500);
  }
});

// ============================================
// GET /price-sync/test-debug - Simple test endpoint
// ============================================
priceSync.get('/test-debug', async (c) => {
  console.log('🔍 [Test Debug] Endpoint hit!');
  return c.json({
    success: true,
    message: 'Debug endpoint is accessible',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// GET /price-sync/debug-product/:code - Debug Uropa API response for a product
// ============================================
priceSync.get('/debug-product/:code', async (c) => {
  try {
    const productCode = c.req.param('code');
    
    console.log(`🔍 [Debug Product] Fetching ${productCode} from Uropa API...`);
    
    const token = await getToken();
    if (!token) {
      return c.json({
        success: false,
        error: 'Uropa API token not configured',
      }, 400);
    }

    const uropaUrl = `${UROPA_API_BASE}/products/${productCode}?lang=en&curr=AUD&fields=FULL`;
    console.log(`🔍 [Debug Product] URL: ${uropaUrl}`);
    console.log(`🔍 [Debug Product] Auth: Bearer ${token.substring(0, 20)}...`);
    
    const response = await fetch(uropaUrl, {
      method: 'GET',
      headers: {
        'Authorization': formatAuthHeader(token),
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return c.json({
        success: false,
        error: `Uropa API returned ${response.status}`,
        details: errorText.substring(0, 500),
      }, 200);
    }

    const uropaProduct = await response.json();
    
    // Try all price extraction paths
    const priceExtraction = {
      'priceDetail.priceBreakdown[0].priceB': uropaProduct.priceDetail?.priceBreakdown?.[0]?.priceB,
      'priceDetail.salesPrice': uropaProduct.priceDetail?.salesPrice,
      'priceDetail.value': uropaProduct.priceDetail?.value,
      'priceDetail.price': uropaProduct.priceDetail?.price,
      'priceRange.minPrice.value': uropaProduct.priceRange?.minPrice?.value,
      'priceRange.maxPrice.value': uropaProduct.priceRange?.maxPrice?.value,
      'price.value': uropaProduct.price?.value,
      'basePrice.value': uropaProduct.basePrice?.value,
      'price': uropaProduct.price,
    };

    // Show the full price-related structure
    const priceStructure = {
      priceDetail: uropaProduct.priceDetail,
      priceRange: uropaProduct.priceRange,
      price: uropaProduct.price,
      basePrice: uropaProduct.basePrice,
    };

    return c.json({
      success: true,
      productCode,
      priceExtraction,
      priceStructure,
      topLevelKeys: Object.keys(uropaProduct),
    });

  } catch (error: any) {
    console.error('❌ [Debug Product] Error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

export default priceSync;