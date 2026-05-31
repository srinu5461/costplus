/**
 * AUTOMATED PRICE SYNC SYSTEM
 * Compares Uropa API prices with database and updates changed prices
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';
import { calculateSellingPrice, DEFAULT_PRICING } from './pricing-calculator.tsx';

const priceSync = new Hono();

const UROPA_API_BASE = 'https://p1-api.nisbets.com.au/occ/v2/uropa-au';

// Helper to format Authorization header
function formatAuthHeader(token: string): string {
  return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
}

// Helper to get Uropa API token
async function getToken(): Promise<string> {
  // ✅ PRIORITY FIX: Use KV storage FIRST (where user saves token via UI)
  try {
    const savedToken = await kv.get('uropa_api_token');
    if (savedToken) {
      console.log('🔑 [getToken] Using token from KV storage (user-saved via UI)');
      return savedToken;
    }
  } catch (error) {
    console.warn('Could not check KV store for token:', error);
  }
  
  // Fallback to environment variable
  const envToken = Deno.env.get('UROPA_API_TOKEN');
  if (envToken) {
    console.log('🔑 [getToken] Using UROPA_API_TOKEN from environment variable (fallback)');
    return envToken;
  }
  
  console.warn('⚠️ [getToken] No token found in KV or environment!');
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

    // 🔥 FIX: Use ONLY Authorization header (no saved headers)
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
            const uropaUrl = `${UROPA_API_BASE}/products/${productCode}`;
            const response = await fetch(uropaUrl, { headers });

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

            // Calculate new selling price using tier pricing
            const pricingResult = calculateSellingPrice(uropaCost, DEFAULT_PRICING);
            const oldPricingResult = calculateSellingPrice(dbCost, DEFAULT_PRICING);

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

    // 🔥 FIX: Use ONLY Authorization header (no saved headers)
    const headers = {
      'Authorization': formatAuthHeader(token)
    };

    const results: any[] = [];

    // ✅ PERFORMANCE FIX: Fetch all products ONCE before the loop
    const allProducts = await kv.getByPrefix('products:');
    console.log(`📦 [Price Sync Test] Loaded ${allProducts.length} products from database`);

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

        // Get from Uropa API
        const uropaUrl = `${UROPA_API_BASE}/products/${code}`;
        console.log(`🌐 [Price Sync Test] Calling: ${uropaUrl}`);
        
        const response = await fetch(uropaUrl, { headers });
        console.log(`📡 [Price Sync Test] Response status for ${code}: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ [Price Sync Test] Uropa API error for ${code}:`, errorText.substring(0, 200));
          
          results.push({
            code,
            status: 'api_error',
            error: `Uropa API returned ${response.status}: ${errorText.substring(0, 100)}`,
          });
          continue;
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
          // Enhanced error with actual response structure
          console.error(`❌ [Price Sync Test] No price found for ${code}. Response keys:`, Object.keys(uropaProduct));
          console.error(`❌ [Price Sync Test] priceDetail:`, uropaProduct.priceDetail);
          console.error(`❌ [Price Sync Test] priceRange:`, uropaProduct.priceRange);
          results.push({
            code,
            status: 'no_price',
            error: 'No price found in Uropa API response',
            debug: {
              responseKeys: Object.keys(uropaProduct),
              sampleData: JSON.stringify(uropaProduct).substring(0, 500),
              priceDetail: uropaProduct.priceDetail,
              priceRange: uropaProduct.priceRange,
            },
          });
          continue;
        }
        
        console.log(`✅ [Price Sync Test] Extracted price for ${code}: $${uropaCost} (from ${uropaProduct.priceDetail?.priceBreakdown?.[0]?.priceB ? 'priceB (wholesale)' : 'salesPrice'})`);

        // ✅ CRITICAL FIX: Compare with COST PRICE in database (baseCost is the Uropa cost we scraped)
        // DO NOT use product.price first - that's the calculated selling price!
        const dbCost = parseFloat(
          dbProduct.baseCost || 
          dbProduct.costPrice || 
          dbProduct.cost ||
          dbProduct.basePrice ||
          dbProduct.price || // Fallback only if no cost fields exist
          0
        );
        const priceDiff = uropaCost - dbCost;
        const priceChanged = Math.abs(priceDiff) >= 0.01;

        const newPricing = calculateSellingPrice(uropaCost, DEFAULT_PRICING);
        const oldPricing = calculateSellingPrice(dbCost, DEFAULT_PRICING);

        results.push({
          code,
          status: 'success',
          priceChanged,
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
          difference: {
            cost: Math.round(priceDiff * 100) / 100,
            costPercent: dbCost > 0 ? Math.round((priceDiff / dbCost) * 10000) / 100 : 0,
            sellingPrice: Math.round((newPricing.sellingPrice - oldPricing.sellingPrice) * 100) / 100,
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

    const headers = {
      'Authorization': formatAuthHeader(token)
    };
    
    const results: any[] = [];
    let pricesUpdated = 0;

    // 🔥 PERFORMANCE FIX: Fetch products individually instead of loading all 50,000+
    // Process in parallel batches of 5 to speed things up
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < productCodes.length; i += BATCH_SIZE) {
      const batch = productCodes.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (code) => {
          try {
            // 🔥 FIX: Try multiple key patterns to find the product
            let dbProduct = null;
            
            // Try direct lookup by code first
            const possibleKeys = [
              `products:${code}`,
              `products:${code.toUpperCase()}`,
              `products:${code.toLowerCase()}`,
            ];
            
            for (const key of possibleKeys) {
              try {
                dbProduct = await kv.get(key);
                if (dbProduct) {
                  console.log(`✅ [Auto-Update] Found ${code} with key: ${key}`);
                  break;
                }
              } catch (e) {
                // Key doesn't exist, try next
              }
            }
            
            // If still not found, search by fields (slower but necessary)
            if (!dbProduct) {
              console.log(`🔍 [Auto-Update] Searching for ${code} in all products...`);
              const allProducts = await kv.getByPrefix('products:');
              dbProduct = allProducts.find((p: any) => 
                p.code === code || 
                p.productCode === code || 
                p.sku === code ||
                p.id === code
              );
            }

            if (!dbProduct) {
              return {
                code,
                status: 'not_in_db',
                error: 'Product not found in database',
              };
            }

            // Get from Uropa API
            const uropaUrl = `${UROPA_API_BASE}/products/${code}`;
            console.log(`🌐 [Auto-Update] Calling: ${uropaUrl}`);
            
            const response = await fetch(uropaUrl, { headers });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`❌ [Auto-Update] API error for ${code}:`, errorText.substring(0, 200));
              
              return {
                code,
                status: 'api_error',
                error: `Uropa API error: ${response.status}`,
              };
            }

            const uropaProduct = await response.json();
            
            const uropaCost = 
              uropaProduct.priceDetail?.priceBreakdown?.[0]?.priceB ||
              uropaProduct.priceDetail?.salesPrice ||
              uropaProduct.priceDetail?.value ||
              uropaProduct.priceRange?.minPrice?.value ||
              null;

            if (!uropaCost) {
              return {
                code,
                status: 'no_price',
                error: 'No price found in Uropa API',
              };
            }

            const dbCost = parseFloat(
              dbProduct.baseCost || 
              dbProduct.costPrice || 
              dbProduct.cost ||
              dbProduct.price ||
              0
            );

            const priceDiff = uropaCost - dbCost;
            const priceChanged = Math.abs(priceDiff) >= 0.01;

            const newPricing = calculateSellingPrice(uropaCost, DEFAULT_PRICING);
            const oldPricing = calculateSellingPrice(dbCost, DEFAULT_PRICING);

            // 🔥 AUTO-UPDATE if price changed
            if (priceChanged) {
              console.log(`💰 [Auto-Update] UPDATING ${code}: $${dbCost.toFixed(2)} → $${uropaCost.toFixed(2)}`);
              
              // Update product with new cost and recalculated selling price
              const updatedProduct = {
                ...dbProduct,
                baseCost: uropaCost,
                cost: uropaCost,
                costPrice: uropaCost,
                price: newPricing.sellingPrice,
                markup: newPricing.markupPercent,
                lastUpdated: new Date().toISOString(),
              };

              await kv.set(`products:${dbProduct.id}`, updatedProduct);
              
              console.log(`✅ [Auto-Update] Updated ${code} in database!`);
            } else {
              console.log(`✓ [Auto-Update] No change for ${code} (already $${dbCost.toFixed(2)})`);
            }

            return {
              code,
              status: 'success',
              priceChanged,
              updated: priceChanged,
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
              difference: {
                cost: Math.round(priceDiff * 100) / 100,
                costPercent: dbCost > 0 ? Math.round((priceDiff / dbCost) * 10000) / 100 : 0,
                sellingPrice: Math.round((newPricing.sellingPrice - oldPricing.sellingPrice) * 100) / 100,
              },
            };

          } catch (error: any) {
            return {
              code,
              status: 'error',
              error: error.message,
            };
          }
        })
      );
      
      // Collect results from batch
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.priceChanged) {
            pricesUpdated++;
          }
        } else {
          results.push({
            code: 'unknown',
            status: 'error',
            error: result.reason?.message || 'Unknown error',
          });
        }
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

    // 🔥 FIX: Use search endpoint with ONLY Authorization header
    const testUrl = `${UROPA_API_BASE}/products/search?pageSize=1`;
    
    const response = await fetch(testUrl, { 
      headers: {
        'Authorization': formatAuthHeader(token)
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return c.json({
        success: false,
        error: `Uropa API returned ${response.status}: ${errorText.substring(0, 100)}`,
        status: response.status,
      }, 200);
    }

    const data = await response.json();

    return c.json({
      success: true,
      message: 'Uropa API connection successful!',
      testProduct: {
        code: data.products?.[0]?.code || 'TEST',
        name: data.products?.[0]?.name || 'Test Product',
      },
    });

  } catch (error: any) {
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
          '1. Environment Variable (UROPA_API_TOKEN) - NEW PRIORITY',
          '2. KV Storage (uropa_api_token) - Fallback',
          '3. KV Headers JSON (uropa_api_headers.authorization) - Used by buildUropaHeaders if exists'
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
      cost: p.cost || p.costPrice || 0,
      price: p.price || p.sellingPrice || 0,
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

    // Recalculate selling price
    const newPricing = calculateSellingPrice(newCost, DEFAULT_PRICING);
    const oldPricing = calculateSellingPrice(oldCost, DEFAULT_PRICING);

    // ✅ CRITICAL: Update ALL possible field names to ensure consistency
    const updatedProduct = {
      ...product,
      // 🔥 COST FIELDS - Store the Uropa wholesale/cost price
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
    await kv.set(`products:${product.id}`, updatedProduct);

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
          price: newCost,
          baseCost: newCost,
          costPrice: newCost,
          cost: newCost,
          basePrice: newCost,
          sellingPrice: newPricing.sellingPrice,
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

export default priceSync;