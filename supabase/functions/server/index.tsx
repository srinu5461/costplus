// Server version: 2026-04-14T12:30
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_custom.tsx'; // Using custom kv with correct table name
import payment from './payment.tsx';
import email, { sendOrderConfirmationEmail } from './email.tsx';
import customers from './customers.tsx';
import { calculateShipping } from './shipping.tsx';
import * as uropa from './uropa.tsx';
import priceSync from './routes-price-sync.tsx';
import descriptionSync from './routes-description-sync.tsx'; // NEW: Description & features sync
import pricing from './routes-pricing.tsx';
import specials from './routes-specials.tsx'; // NEW: Specials & BOGO promotions
import imageScraper from './routes-image-scraper.tsx'; // NEW: Image scraper
import promotions from './routes-promotions.tsx'; // NEW: Promotional pricing (doesn't modify products)
import vouchers from './vouchers.tsx'; // NEW: Vouchers & gift cards
import seo from './seo.tsx';
import ai from './ai.tsx';
import legal from './legal.tsx';
import cms from './cms.tsx';
import quotations from './quotations.tsx';
import invoices from './invoices.tsx';
import reports from './reports.tsx';
import returns from './returns.tsx';
import settings from './settings.tsx';
import orders from './orders.tsx';
import pickupLocations from './pickup-locations.tsx';
import menuBrands from './menu-brands.tsx';
import syncProducts from './sync-products.tsx';
import importSimco from './routes-import-simco.ts';
import { registerSitemapRoute } from './sitemap.tsx';

const app = new Hono();

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ⚡ IN-MEMORY CACHE for products (speeds up related products, search, etc.)
let productsCache: any[] | null = null;
let productsCacheTimestamp: number = 0;
const PRODUCTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getAllProducts(): Promise<any[]> {
  // Check if cache is valid
  const now = Date.now();
  if (productsCache && (now - productsCacheTimestamp) < PRODUCTS_CACHE_TTL) {
    console.log(`[Cache] Using in-memory products cache (${productsCache.length} products, age: ${Math.round((now - productsCacheTimestamp) / 1000)}s)`);
    return productsCache;
  }

  console.log('[Cache] Products cache expired or missing, loading from database...');

  // Try to get products as array first (fast)
  let products = await kv.get('products');

  // If not found, try to get individual products by prefix (slower)
  if (!products || !Array.isArray(products)) {
    console.log('[Cache] Products not in single key, loading via prefix search...');
    products = await kv.getByPrefix('products:');
  }

  if (products && Array.isArray(products)) {
    productsCache = products;
    productsCacheTimestamp = Date.now();
    console.log(`[Cache] Loaded and cached ${products.length} products`);
    return products;
  }

  console.warn('[Cache] No products found in database');
  return [];
}

// DISABLE logger to prevent crashes
// app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key", "Cache-Control", "Pragma", "Expires"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

// Explicit OPTIONS handler for preflight requests
app.options("/*", (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, Cache-Control, Pragma, Expires",
      "Access-Control-Max-Age": "600",
    }
  });
});

// Log ALL incoming requests for debugging with timeout protection
app.use('*', async (c, next) => {
  const method = c.req.method;
  const url = c.req.url;
  const path = new URL(url).pathname;
  console.log(`\n>>> INCOMING REQUEST: ${method} ${path}`);
  
  // Create timeout promise (60 seconds max for large data fetches)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout after 60s')), 60000);
  });
  
  try {
    // Race between request and timeout
    await Promise.race([next(), timeoutPromise]);
    console.log(`<<< RESPONSE COMPLETE for ${method} ${path}\n`);
  } catch (error) {
    // Check for connection errors (client disconnected) - SUPPRESS THESE
    const errorMessage = String(error);
    const errorName = error?.name || '';
    
    // These are NORMAL client disconnection errors - don't log as errors
    if (errorMessage.includes('connection closed') || 
        errorMessage.includes('broken pipe') ||
        errorMessage.includes('EPIPE') ||
        errorName === 'Http' ||
        errorMessage.includes('writing a body to connection')) {
      // Client disconnected - this is normal (user navigated away, closed tab, etc.)
      console.log(`[Client Disconnect] ${method} ${path} - connection already closed`);
      // Return a proper response to prevent the error from bubbling up
      return new Response(null, { status: 499 }); // 499 Client Closed Request
    }
    
    // Handle timeout errors
    if (errorMessage.includes('timeout')) {
      console.error(`[TIMEOUT] ${method} ${path} - request took too long`);
      if (!c.finalized) {
        return c.json({ error: 'Request timeout' }, 504);
      }
      return new Response(null, { status: 504 });
    }
    
    // For actual errors, log them
    console.error(`<<< ERROR in ${method} ${path}:`, error);
    
    // Check if response was already sent
    if (c.finalized) {
      console.log('Response already finalized, skipping error handler');
      return new Response(null, { status: 500 });
    }
    
    // Send error response for other errors
    try {
      return c.json({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error),
        path: path
      }, 500);
    } catch (responseError) {
      console.error('Failed to send error response:', responseError);
      return new Response(JSON.stringify({ error: 'Server error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
});

// Simple API key verification for admin operations
function verifyApiKey(apiKey: string | undefined): boolean {
  // The correct Supabase anon key (public, not sensitive)
  const expectedKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjYwMDIsImV4cCI6MjA4ODM0MjAwMn0.WtWmz2qJ2NNMx7LHnkrYnJqR9b8cC-IDTVyKaWs9Ta4';
  const isValid = apiKey === expectedKey;
  if (!isValid) {
    console.log('API key validation failed:', { provided: !!apiKey, match: isValid });
  }
  return isValid;
}

// Health check endpoint
app.get("/make-server-d1fbc049/health", (c) => {
  return c.json({ status: "ok" });
});

// Test PUT endpoint to verify PUT requests work
app.put("/make-server-d1fbc049/test-put", (c) => {
  console.log('TEST PUT ENDPOINT HIT!');
  return c.json({ status: "PUT endpoint works!" });
});

// Database connection test
app.get("/make-server-d1fbc049/db/test", async (c) => {
  try {
    console.log('Testing database connection...');
    
    const testKey = 'db_test_' + Date.now();
    const testValue = { test: true, timestamp: new Date().toISOString() };
    
    await kv.set(testKey, testValue);
    const result = await kv.get(testKey);
    await kv.del(testKey);
    
    return c.json({ 
      status: 'ok',
      message: 'Database connection successful',
      kvStoreWorking: true
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return c.json({ 
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      kvStoreWorking: false
    }, 500);
  }
});

// Check what keys exist in database
app.get("/make-server-d1fbc049/db/keys", async (c) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('kv_store_577b3f26')
      .select('key')
      .limit(100);
    
    if (error) throw error;
    
    const keys = data?.map(d => d.key) || [];
    const hasProducts = keys.some(k => k === 'products' || k.startsWith('products:'));
    const hasCategories = keys.some(k => k === 'categories');
    
    return c.json({ 
      status: 'ok',
      totalKeys: keys.length,
      hasProducts,
      hasCategories,
      sampleKeys: keys.slice(0, 20)
    });
  } catch (error) {
    console.error('Keys check failed:', error);
    return c.json({ 
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ============= DIAGNOSTIC ENDPOINT =============

app.get("/make-server-d1fbc049/db/keys", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Get a sample of keys from the database
    const { data: allKeys, error } = await supabase
      .from('kv_store_577b3f26')
      .select('key')
      .limit(100);
    
    if (error) {
      throw new Error(`Database query error: ${error.message}`);
    }
    
    // Count products and categories
    const { data: productKeys, error: prodError } = await supabase
      .from('kv_store_577b3f26')
      .select('key, value')
      .like('key', 'products:%')
      .limit(5);
    
    const { data: categoryKeys, error: catError } = await supabase
      .from('kv_store_577b3f26')
      .select('key, value')
      .like('key', 'categories:%')
      .limit(5);
    
    const { count: productCount } = await supabase
      .from('kv_store_577b3f26')
      .select('*', { count: 'exact', head: true })
      .like('key', 'products:%');
    
    const { count: categoryCount } = await supabase
      .from('kv_store_577b3f26')
      .select('*', { count: 'exact', head: true })
      .like('key', 'categories:%');
    
    return c.json({
      keys: {
        'Sample keys': {
          exists: true,
          type: 'array',
          count: allKeys?.length || 0,
          sample: allKeys?.slice(0, 10).map(k => k.key)
        },
        'products:* pattern': {
          exists: (productCount || 0) > 0,
          type: 'prefix',
          count: productCount || 0,
          sample: productKeys?.map(k => ({ key: k.key, value: k.value }))
        },
        'categories:* pattern': {
          exists: (categoryCount || 0) > 0,
          type: 'prefix',
          count: categoryCount || 0,
          sample: categoryKeys?.map(k => ({ key: k.key, value: k.value }))
        }
      }
    });
  } catch (error) {
    console.log('DB diagnostic error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============= CMS DATA ENDPOINTS =============

// ⚡ SERVER-SIDE CACHE (No time expiration - only cleared manually by admin)
let cmsDataCache: any = null;
let homepageDataCache: any = null;

// Cache invalidation function - ONLY way to clear cache
async function invalidateCMSCache(reason: string = 'Manual invalidation') {
  console.log(`🔄 [SERVER CACHE] Invalidation triggered: ${reason}`);
  cmsDataCache = null;
  homepageDataCache = null;

  // Also clear KV caches
  try {
    await Promise.all([
      kv.del('cache:filtered:featured'),
      kv.del('cache:filtered:popular'),
      kv.del('cache:filtered:promotion')
    ]);
    console.log('✅ [KV CACHE] Filtered product caches cleared');
  } catch (err) {
    console.error('Failed to clear KV caches:', err);
  }

  console.log('✅ [SERVER CACHE] All caches cleared');
}

app.get("/make-server-d1fbc049/cms/data", async (c) => {
  try {
    console.log('=== CMS DATA FETCH START (Server Cache - No Expiration) ===');
    const startTime = Date.now();
    const REQUEST_TIMEOUT = 50000; // 50 seconds max

    // Check if force refresh is requested via URL parameter
    const url = new URL(c.req.url);
    const forceRefresh = url.searchParams.get('force') === 'true';

    if (forceRefresh) {
      console.log('🔄 Force refresh requested - bypassing cache');
      await invalidateCMSCache('Force refresh via URL parameter');
    }

    // ⚡ Check server-side cache (NO TIME EXPIRATION - only manual invalidation)
    if (cmsDataCache && !forceRefresh) {
      console.log(`✅ [SERVER CACHE HIT] Returning cached metadata (products loaded separately)`);
      return c.json(cmsDataCache, 200, {
        'Cache-Control': 'public, max-age=31536000', // 1 year (effectively forever)
        'X-Cache': 'HIT',
        'X-Cache-Source': 'SERVER'
      });
    }

    console.log('⚠️ [SERVER CACHE MISS] Fetching fresh data from database...');

    // ⚡ DON'T LOAD PRODUCTS - causes memory overflow with large catalogs
    // Products are loaded separately via /products endpoint or CDN JSON files
    const dataFetchPromise = Promise.all([
      Promise.resolve([]), // Skip products to avoid memory issues
      kv.get('categories').catch((e) => { console.log('categories fetch error:', e); return null; }),
      kv.get('header').catch((e) => { console.log('header fetch error:', e); return null; }),
      kv.get('footer').catch((e) => { console.log('footer fetch error:', e); return null; }),
      kv.get('homepage').catch((e) => { console.log('homepage fetch error:', e); return null; }),
      kv.get('category_tree').catch((e) => { console.log('category_tree fetch error:', e); return null; })
    ]);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), REQUEST_TIMEOUT)
    );
    
    let dataResult;
    try {
      dataResult = await Promise.race([dataFetchPromise, timeoutPromise]);
    } catch (error) {
      console.log('⏰ Request timed out - returning stale cache or minimal data');
      // Return stale cache if available, otherwise minimal data
      if (cmsDataCache) {
        console.log('Returning stale cache (over 5 min old)');
        return c.json(cmsDataCache, 200, {
          'Cache-Control': 'public, max-age=60',
          'X-Cache': 'STALE'
        });
      }
      // No cache - return minimal response
      return c.json({
        products: [],
        categories: ['All Equipment'],
        categoryTree: [],
        header: { title: 'Costplus100', description: 'Catering Equipment' },
        footer: { about: 'Costplus100 - Catering Equipment Supplier' },
        homepage: { title: 'Welcome to Costplus100' },
      }, 200, {
        'Cache-Control': 'public, max-age=60',
        'X-Cache': 'TIMEOUT-EMPTY'
      });
    }
    
    const [
      singleProducts,
      singleCategories,
      header,
      footer,
      homepage,
      singleCategoryTree
    ] = dataResult;
    
    const fetchTime = Date.now() - startTime;
    console.log(`✅ Primary data fetched in ${fetchTime}ms`);

    // ⚡ SKIP PRODUCTS LOADING - too large for /cms/data endpoint
    // Products are loaded via /products endpoint or /homepage-data (featured/popular only)
    let products = [];
    console.log('ℹ️  Products skipped in /cms/data to prevent memory overflow');
    console.log('ℹ️  Use /products or /homepage-data endpoints to load products');
    
    // Process categories - use single key
    let categories = singleCategories;
    console.log('Categories result:', categories ? `Found array with ${categories.length} items` : 'Not found');
    
    // ⚡ SKIP PREFIX FALLBACK - too slow
    if (!categories || !Array.isArray(categories)) {
      console.log('⚠️ Categories not found - using default');
      categories = ['All Equipment'];
    }
    
    // Process category tree
    let categoryTree = singleCategoryTree;
    console.log('Category tree result:', categoryTree ? `Found ${categoryTree.length} nodes` : 'Not found');
    
    // ⚡ SKIP PREFIX FALLBACK - too slow  
    if (!categoryTree || !Array.isArray(categoryTree) || categoryTree.length === 0) {
      console.log('⚠️ Category tree not found - using empty array');
      categoryTree = [];
    }
    
    // Ensure level fields are numbers
    const normalizedTree = categoryTree && Array.isArray(categoryTree) 
      ? categoryTree.map((node: any) => ({
          ...node,
          level: typeof node.level === 'number' ? node.level : parseInt(node.level) || 1,
          productCount: typeof node.productCount === 'number' ? node.productCount : parseInt(node.productCount) || 0,
        }))
      : [];
    
    const totalTime = Date.now() - startTime;
    console.log('=== CMS DATA FETCH COMPLETE ===');
    console.log(`✅ Total time: ${totalTime}ms`);
    console.log(`Returning: ${products?.length || 0} products, ${categories?.length || 0} categories, ${normalizedTree?.length || 0} category tree nodes`);
    
    // Build response with defaults
    const response = {
      products: products || [],
      categories: categories || ['All Equipment'],
      categoryTree: normalizedTree || [],
      header: header || { title: 'Costplus100', description: 'Catering Equipment' },
      footer: footer || { about: 'Costplus100 - Catering Equipment Supplier' },
      homepage: homepage || { title: 'Welcome to Costplus100' },
    };
    
    // ⚡ Cache the response (NO EXPIRATION - stays until admin clears)
    // Note: products array is empty to avoid memory issues - loaded separately
    cmsDataCache = response;
    console.log(`✅ [SERVER CACHE STORED] Data cached (metadata only - products loaded separately)`);
    
    console.log('Sending CMS response...');
    return c.json(response, 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate', // ✅ Don't cache in browser
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Cache': 'MISS',
      'Content-Type': 'application/json'
    });
  } catch (error) {
    console.error('CRITICAL ERROR in /cms/data:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Check if it's a client disconnection error
    const errorMessage = String(error);
    const errorName = error?.name || '';
    if (errorMessage.includes('connection closed') || 
        errorMessage.includes('broken pipe') ||
        errorMessage.includes('EPIPE') ||
        errorName === 'Http') {
      console.log('[Client Disconnect] in /cms/data - this is normal');
      return new Response(null, { status: 499 }); // 499 Client Closed Request
    }
    
    // Always send a response, even if there's an error
    try {
      return c.json({ 
        error: 'Failed to fetch CMS data',
        details: error instanceof Error ? error.message : String(error),
        products: [],
        categories: ['All Equipment'],
        categoryTree: [],
        header: { title: 'Costplus100', description: 'Catering Equipment' },
        footer: { about: 'Costplus100 - Catering Equipment Supplier' },
        homepage: { title: 'Welcome to Costplus100' },
      }, 500);
    } catch (responseError) {
      console.error('Failed to send error response:', responseError);
      // Last resort - try to send minimal response
      return new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
});

// ⚡ NEW: Lightweight homepage data endpoint - loads ONLY essential data for instant page load
// Returns: L1 categories, banners, featured products (8), popular products (8)
app.get("/make-server-d1fbc049/homepage-data", async (c) => {
  try {
    console.log('⚡ HOMEPAGE DATA FETCH - Lightweight endpoint');
    const startTime = Date.now();

    // ⚡ DISABLE SERVER MEMORY CACHE - it's causing stale data
    // Always fetch fresh from KV store
    console.log('⚡ Server memory cache DISABLED - always loading fresh from KV');

    console.log('⚠️ [SERVER CACHE MISS] Fetching lightweight homepage data...');

    // ⚡ TRY DATABASE CACHE FIRST (fast, one query)
    const dbCache = await kv.get('cache:homepage').catch(() => null);
    let header, footer, homepage, categoryTree, bannersData, sectionsData;

    if (dbCache && dbCache.categoryTree && dbCache.categoryTree.length > 0) {
      console.log('✅ [DB CACHE HIT] Loading from cache:homepage');
      header = dbCache.header;
      footer = dbCache.footer;
      homepage = dbCache.homepage;
      categoryTree = dbCache.categoryTree;
      bannersData = null; // Load separately
      sectionsData = null; // Load separately

      // Load banners and sections separately
      [bannersData, sectionsData] = await Promise.all([
        kv.get('banners').catch(() => null),
        kv.get('sections_config').catch(() => null)
      ]);
    } else {
      console.log('⚠️ [DB CACHE MISS] Loading from individual keys');
      // Fall back to loading individual keys
      [header, footer, homepage, categoryTree, bannersData, sectionsData] = await Promise.all([
        kv.get('header').catch(() => null),
        kv.get('footer').catch(() => null),
        kv.get('homepage').catch(() => null),
        kv.get('category_tree').catch(() => null),
        kv.get('banners').catch(() => null),
        kv.get('sections_config').catch(() => null)
      ]);
    }
    
    // Extract L1 categories for categories array (names only)
    let l1Categories: any[] = [];
    if (categoryTree && Array.isArray(categoryTree)) {
      l1Categories = categoryTree
        .filter((cat: any) => !cat.parent && cat.enabled !== false)
        .slice(0, 20); // Limit to 20 top categories
    }

    // Full category tree for navigation (includes all L1 + L2 with children)
    const fullCategoryTree = categoryTree && Array.isArray(categoryTree) ? categoryTree : [];
    
    // Get featured, popular, and promotional products
    // ⚡ Load from featured_sections (admin-curated product IDs)
    let featuredProducts: any[] = [];
    let popularProducts: any[] = [];
    let promotionalProducts: any[] = [];
    
    try {
      // Load featured sections (contains product IDs)
      const featuredSectionsData = await kv.get('featured_sections').catch(() => null);
      const featuredIds = featuredSectionsData?.featured || [];
      const popularIds = featuredSectionsData?.popular || [];
      const promotionIds = featuredSectionsData?.promotion || [];
      
      console.log('🔍 DIAGNOSTIC: featuredSectionsData:', JSON.stringify(featuredSectionsData));
      console.log('🔍 DIAGNOSTIC: Featured IDs (first 5):', featuredIds.slice(0, 5));
      console.log('🔍 DIAGNOSTIC: Popular IDs (first 5):', popularIds.slice(0, 5));
      console.log('🔍 DIAGNOSTIC: Promo IDs (first 5):', promotionIds.slice(0, 5));
      console.log(`📦 Featured sections IDs: ${featuredIds.length} featured, ${popularIds.length} popular, ${promotionIds.length} promo`);
      
      // If we have IDs, try to load from section product caches
      // ⚡ TRY CACHE FIRST - Load filtered products from cache
      if (featuredIds.length > 0 || popularIds.length > 0 || promotionIds.length > 0) {
        // Try to get cached filtered products
        const [cachedFeatured, cachedPopular, cachedPromo] = await Promise.all([
          kv.get('cache:filtered:featured').catch(() => null),
          kv.get('cache:filtered:popular').catch(() => null),
          kv.get('cache:filtered:promotion').catch(() => null)
        ]);

        if (cachedFeatured && cachedPopular !== undefined && cachedPromo !== undefined) {
          console.log('✅ [CACHE HIT] Using cached filtered products');
          featuredProducts = Array.isArray(cachedFeatured) ? cachedFeatured.slice(0, 20) : [];
          popularProducts = Array.isArray(cachedPopular) ? cachedPopular.slice(0, 20) : [];
          promotionalProducts = Array.isArray(cachedPromo) ? cachedPromo.slice(0, 20) : [];
          console.log(`📦 Cached: ${featuredProducts.length} featured, ${popularProducts.length} popular, ${promotionalProducts.length} promo`);
        } else {
          console.log('⚠️ [CACHE MISS] Loading products by ID...');

          // Load specific products by ID (FAST - no need to load all 13k products)
          const loadProductsByIds = async (ids: string[]) => {
            const products = await Promise.all(
              ids.map(id => kv.get(`products:${id}`).catch(() => null))
            );
            return products.filter(p => p !== null);
          };

          // Load products for each section
          const [featured, popular, promo] = await Promise.all([
            loadProductsByIds(featuredIds),
            loadProductsByIds(popularIds),
            loadProductsByIds(promotionIds)
          ]);

          featuredProducts = featured.slice(0, 20);
          popularProducts = popular.slice(0, 20);
          promotionalProducts = promo.slice(0, 20);

          console.log(`✅ Loaded: ${featuredProducts.length} featured, ${popularProducts.length} popular, ${promotionalProducts.length} promo`);

          // Save to cache (don't await - let it happen in background)
          kv.mset(
            ['cache:filtered:featured', 'cache:filtered:popular', 'cache:filtered:promotion'],
            [featuredProducts, popularProducts, promotionalProducts]
          ).then(() => {
            console.log('💾 Cached filtered products for next request');
          }).catch((err) => {
            console.error('Failed to cache filtered products:', err);
          });
        }
      } else {
        console.log('⚠️ No featured sections configured');
      }
    } catch (error) {
      console.log('⚠️  Error loading featured sections:', error);
      // Return empty arrays - admin hasn't configured sections yet
    }
    
    const response = {
      // Data expected by Home.tsx
      featured: featuredProducts,
      popular: popularProducts,
      promotion: promotionalProducts,
      categories: l1Categories.map((c: any) => c.name),
      categoryTree: fullCategoryTree, // ⚡ Return FULL tree (L1 + L2 with children)
      banners: Array.isArray(bannersData) ? bannersData : [],
      sectionsConfig: Array.isArray(sectionsData) ? sectionsData : [],

      // Also include for CMSContext
      header: header || { title: 'Costplus100', description: 'Catering Equipment' },
      footer: footer || { about: 'Costplus100 - Catering Equipment Supplier' },
      homepage: homepage || { title: 'Welcome to Costplus100' },
      timestamp: new Date().toISOString()
    };

    // ⚡ DISABLED: Don't cache in server memory - causes stale data issues
    // homepageDataCache = response;

    const fetchTime = Date.now() - startTime;
    console.log(`✅ [NO CACHE] Homepage data loaded fresh from KV in ${fetchTime}ms:`, {
      categories: l1Categories.length,
      categoryTree: fullCategoryTree.length,
      featured: featuredProducts.length,
      popular: popularProducts.length,
      promotion: promotionalProducts.length,
      banners: response.banners.length,
      firstFeaturedCode: featuredProducts[0]?.code
    });
    
    return c.json(response, 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate', // ✅ Don't cache in browser
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Cache': 'MISS',
      'Content-Type': 'application/json'
    });
  } catch (error) {
    console.error('Error in /homepage-data:', error);
    return c.json({ 
      error: 'Failed to fetch homepage data',
      details: error instanceof Error ? error.message : String(error),
      featured: [],
      popular: [],
      promotion: [],
      categories: [],
      categoryTree: [],
      banners: [],
      sectionsConfig: [],
      header: { title: 'Costplus100', description: 'Catering Equipment' },
      footer: { about: 'Costplus100 - Catering Equipment Supplier' },
      homepage: { title: 'Welcome to Costplus100' }
    }, 500);
  }
});

// ⚡ NEW: Rebuild section product caches for fast homepage loading
// This should be called after products are updated OR after featured sections are changed
app.post("/make-server-d1fbc049/rebuild-section-cache", async (c) => {
  try {
    console.log('🔄 Rebuilding section product caches...');
    const startTime = Date.now();
    
    // Load featured sections (contains product IDs configured by admin)
    const featuredSectionsData = await kv.get('featured_sections').catch(() => null);
    const featuredIds = featuredSectionsData?.featured || [];
    const popularIds = featuredSectionsData?.popular || [];
    const promotionIds = featuredSectionsData?.promotion || [];
    
    console.log(`📦 Featured sections: ${featuredIds.length} featured, ${popularIds.length} popular, ${promotionIds.length} promo`);
    console.log('🔍 Featured IDs sample (first 10):', featuredIds.slice(0, 10));
    console.log('🔍 Featured IDs type check:', featuredIds.slice(0, 3).map((id: any) => ({ value: id, type: typeof id, isNumeric: typeof id === 'number' || !isNaN(Number(id)) })));

    // Load specific products by ID (FAST)
    const loadProductsByIds = async (ids: string[]) => {
      const products = await Promise.all(
        ids.map(id => kv.get(`products:${id}`).catch(() => null))
      );
      return products.filter(p => p !== null);
    };

    console.log(`🔄 Loading ${featuredIds.length} featured, ${popularIds.length} popular, ${promotionIds.length} promo products...`);

    // Load products for each section in parallel
    const [featuredProducts, popularProducts, promotionalProducts] = await Promise.all([
      loadProductsByIds(featuredIds),
      loadProductsByIds(popularIds),
      loadProductsByIds(promotionIds)
    ]);

    console.log(`✅ Loaded ${featuredProducts.length} featured, ${popularProducts.length} popular, ${promotionalProducts.length} promo`);
    
    console.log('💾 Caching filtered products:', featuredProducts.map(p => p.code).slice(0, 5).join(', '));

    // Store filtered products in cache
    await kv.mset(
      ['cache:filtered:featured', 'cache:filtered:popular', 'cache:filtered:promotion'],
      [featuredProducts, popularProducts, promotionalProducts]
    );

    console.log('✅ Filtered products cached');
    
    const buildTime = Date.now() - startTime;
    console.log(`✅ Section caches rebuilt in ${buildTime}ms:`, {
      featured: featuredProducts.length,
      popular: popularProducts.length,
      promotion: promotionalProducts.length
    });
    
    return c.json({
      success: true,
      buildTime,
      counts: {
        featured: featuredProducts.length,
        popular: popularProducts.length,
        promotion: promotionalProducts.length
      }
    });
  } catch (error) {
    console.error('Error rebuilding section cache:', error);
    return c.json({
      error: 'Failed to rebuild section cache',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

app.post("/make-server-d1fbc049/cms/initialize", async (c) => {
  try {
    const apiKey = c.req.header('X-API-Key');
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { products, categories, header, footer, homepage } = await c.req.json();
    
    await kv.mset(
      ['products', 'categories', 'header', 'footer', 'homepage'],
      [products, categories, header, footer, homepage]
    );
    
    // Clear cache after initialization
    await invalidateCMSCache('CMS data initialization');
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Initialize CMS error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Build and store consolidated cache in database
app.post("/make-server-d1fbc049/cms/build-cache", async (c) => {
  try {
    console.log('🔨 Building consolidated cache...');
    const startTime = Date.now();

    // Load all data from individual keys (categories + navigation only, NOT products)
    const [categories, categoryTree, header, footer, homepage] = await Promise.all([
      kv.get('categories').catch(() => []),
      kv.get('category_tree').catch(() => []),
      kv.get('header').catch(() => null),
      kv.get('footer').catch(() => null),
      kv.get('homepage').catch(() => null),
    ]);

    // Build consolidated cache (categories + navigation, products use IndexedDB on client)
    const homepageCache = {
      categories: categories || [],
      categoryTree: categoryTree || [],
      header: header || {},
      footer: footer || {},
      homepage: homepage || {},
      timestamp: new Date().toISOString(),
    };

    // Store in cache keys
    await kv.set('cache:homepage', homepageCache);

    // Clear in-memory cache to force reload
    await invalidateCMSCache('Cache rebuilt from database');

    const buildTime = Date.now() - startTime;
    console.log(`✅ Cache built and stored in ${buildTime}ms`);

    return c.json({
      success: true,
      message: `Cache built successfully in ${buildTime}ms`,
      stats: {
        categories: homepageCache.categories.length,
        categoryTree: homepageCache.categoryTree.length,
        buildTime,
      },
    });
  } catch (error) {
    console.error('Build cache error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Clear server cache endpoint
app.post("/make-server-d1fbc049/cms/clear-cache", async (c) => {
  try {
    await invalidateCMSCache('Manual cache clear via API');

    // Also clear database cache keys
    await Promise.all([
      kv.del('cache:homepage').catch(() => {}),
    ]);

    return c.json({ success: true, message: 'Cache invalidated - all instances will rebuild' });
  } catch (error) {
    console.error('Clear cache error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// 🔍 DIAGNOSTIC: Check how products are stored
app.get("/make-server-d1fbc049/diagnostic/products-storage", async (c) => {
  try {
    console.log('🔍 DIAGNOSTIC: Checking products storage...');

    // Try single key
    const singleKey = await kv.get('products').catch(() => null);

    // Try prefix pattern (get first 5)
    let prefixProducts = [];
    try {
      const allPrefix = await kv.getByPrefix('products:');
      prefixProducts = allPrefix.slice(0, 5);
    } catch (e) {
      console.error('Error with prefix:', e);
    }

    // Try section caches
    const [featured, popular, promotion] = await Promise.all([
      kv.get('products:section:featured').catch(() => null),
      kv.get('products:section:popular').catch(() => null),
      kv.get('products:section:promotion').catch(() => null)
    ]);

    // Try featured_sections IDs
    const featuredSections = await kv.get('featured_sections').catch(() => null);

    return c.json({
      success: true,
      storage: {
        singleKeyExists: !!singleKey,
        singleKeyCount: Array.isArray(singleKey) ? singleKey.length : 0,
        singleKeySample: Array.isArray(singleKey) ? singleKey.slice(0, 2) : null,

        prefixPatternCount: prefixProducts.length,
        prefixSample: prefixProducts.map((p: any) => ({
          code: p.code || p.sku,
          name: p.name,
          id: p.id
        })),

        sectionCaches: {
          featured: Array.isArray(featured) ? featured.length : 0,
          popular: Array.isArray(popular) ? popular.length : 0,
          promotion: Array.isArray(promotion) ? promotion.length : 0,
          featuredSample: Array.isArray(featured) ? featured.slice(0, 2).map((p: any) => p.name) : null
        },

        featuredSectionsIDs: {
          featured: featuredSections?.featured?.length || 0,
          popular: featuredSections?.popular?.length || 0,
          promotion: featuredSections?.promotion?.length || 0,
          featuredSample: featuredSections?.featured?.slice(0, 5) || []
        }
      }
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 🔍 DIAGNOSTIC: Check cache status
app.get("/make-server-d1fbc049/cms/cache-status", async (c) => {
  try {
    console.log('🔍 Checking cache status...');

    // Check in-memory cache
    const memoryCache = {
      cmsData: !!cmsDataCache,
      homepageData: !!homepageDataCache,
      cmsDataProducts: cmsDataCache?.products?.length || 0,
      homepageDataCategories: homepageDataCache?.categoryTree?.length || 0,
    };

    // Check if products exist in database
    const productsInDB = await kv.get('products').catch(() => null);
    const productsExist = productsInDB && Array.isArray(productsInDB) && productsInDB.length > 0;

    // Check database cache
    const dbCache = await kv.get('cache:homepage').catch(() => null);
    const dbCacheStatus = {
      exists: !!dbCache,
      categories: dbCache?.categories?.length || 0,
      categoryTree: dbCache?.categoryTree?.length || 0,
      timestamp: dbCache?.timestamp || null,
    };

    return c.json({
      memory: memoryCache,
      database: dbCacheStatus,
      productsInDatabase: productsExist,
      productsCount: productsExist ? productsInDB.length : 0,
      recommendation: !productsExist
        ? '❌ No products in database - please import products via CSV'
        : dbCache
        ? '✅ Database cache exists - server will load from cache'
        : '⚠️ No database cache - server loading from individual keys (slower)',
    });
  } catch (error) {
    console.error('Cache status check error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// 🔍 DIAGNOSTIC: Check if products exist in database
app.get("/make-server-d1fbc049/cms/check-products", async (c) => {
  try {
    console.log('🔍 Checking product storage...');
    
    // Check single key
    const singleKey = await kv.get('products');
    console.log('Single key result:', singleKey ? `Array with ${singleKey.length} items` : 'null');
    
    // Check prefix (first 100 only for speed)
    const prefixKeys = await kv.getByPrefix('products:');
    console.log('Prefix key result:', prefixKeys ? `Array with ${prefixKeys.length} items` : 'null');
    
    return c.json({
      singleKey: {
        exists: !!singleKey,
        count: singleKey?.length || 0
      },
      prefixKeys: {
        exists: !!prefixKeys && prefixKeys.length > 0,
        count: prefixKeys?.length || 0
      },
      recommendation: !singleKey && prefixKeys?.length > 0 
        ? 'Products stored as individual keys - getByPrefix is working'
        : singleKey 
        ? 'Products stored as single key - fast fetch'
        : 'NO PRODUCTS FOUND IN DATABASE'
    });
  } catch (error) {
    console.error('Check products error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============= BANNERS =============

// Upload banner image - Store in Supabase Storage, return public URL
app.post("/make-server-d1fbc049/banners/upload", async (c) => {
  try {
    let formData;
    try {
      formData = await c.req.formData();
    } catch (error) {
      return c.json({ error: 'Failed to read upload data' }, 400);
    }

    const authHeader = c.req.header('Authorization');
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : formData.get('apiKey') as string;

    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const file = formData.get('file') as File;
    if (!file) return c.json({ error: 'No file provided' }, 400);
    if (!file.type.startsWith('image/')) return c.json({ error: 'File must be an image' }, 400);
    if (file.size > 10 * 1024 * 1024) return c.json({ error: 'File size must be less than 10MB' }, 400);

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Ensure bucket exists
    const { error: bucketError } = await supabase.storage.createBucket('banners', { public: true });
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('Bucket error:', bucketError);
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `banner_${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('banners')
      .upload(fileName, arrayBuffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return c.json({ error: 'Failed to upload: ' + uploadError.message }, 500);
    }

    const { data: urlData } = supabase.storage.from('banners').getPublicUrl(fileName);

    return c.json({ success: true, url: urlData.publicUrl, filename: fileName });
  } catch (error) {
    console.error('Banner upload error:', error);
    return c.json({ error: 'Failed to upload image: ' + ((error as Error).message || 'Unknown error') }, 500);
  }
});

// Get all banners (PUBLIC - no auth required for viewing)
app.get("/make-server-d1fbc049/banners", async (c) => {
  console.log('=== GET BANNERS REQUEST RECEIVED ===');
  try {
    console.log('Fetching banners from KV store...');
    const banners = await kv.get('banners');
    console.log('KV get result:', banners);
    
    const result = banners || [];
    console.log(`Returning ${Array.isArray(result) ? result.length : 0} banners`);
    
    // Add cache control headers to reduce repeated requests
    return c.json(result, 200, {
      'Cache-Control': 'public, max-age=60',
    });
  } catch (error) {
    console.error('Get banners error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'no stack');
    return c.json({ error: String(error), message: 'Failed to fetch banners' }, 500);
  }
});

// Update all banners (SIMPLIFIED - no auth for prototype)
app.put("/make-server-d1fbc049/banners", async (c) => {
  console.log('=== PUT BANNERS REQUEST RECEIVED ===');
  try {
    console.log('Reading request body...');
    const banners = await c.req.json();
    console.log('Banners to save:', banners.length, 'items');
    
    console.log('Saving to KV store...');
    await kv.set('banners', banners);
    
    console.log('Banners saved successfully');
    return c.json({ success: true });
  } catch (error) {
    console.error('Update banners error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'no stack');
    return c.json({ error: String(error), message: 'Failed to save banners' }, 500);
  }
});

// ============= PRODUCTS =============

// Search products by term (for admin panel) with pagination
app.get("/make-server-d1fbc049/products/search", async (c) => {
  try {
    const url = new URL(c.req.url);
    const term = url.searchParams.get('q');
    const exclude = url.searchParams.get('exclude')?.split(',').filter(Boolean) || [];
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    if (!term || term.length < 2) {
      return c.json({ error: 'Search term must be at least 2 characters' }, 400);
    }
    
    console.log(`🔍 Searching products for: "${term}" (page ${page}, limit ${limit})`);
    
    // Fetch products using the prefix pattern
    const products = await kv.getByPrefix('products:').catch(() => []);
    
    if (!Array.isArray(products) || products.length === 0) {
      console.warn('⚠️  No products found in database');
      return c.json({ 
        products: [], 
        total: 0, 
        page: 1, 
        totalPages: 0,
        hasMore: false 
      });
    }
    
    const searchLower = term.toLowerCase();
    
    // Filter products matching search term and not in exclude list
    const filtered = products.filter((p: any) => {
      if (exclude.length > 0 && exclude.includes(p.code)) return false;
      
      return p.name?.toLowerCase().includes(searchLower) ||
             p.code?.toLowerCase().includes(searchLower) ||
             p.sku?.toLowerCase().includes(searchLower) ||
             p.brand?.toLowerCase().includes(searchLower);
    });
    
    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);
    
    console.log(`✅ Found ${total} matching products, returning page ${page}/${totalPages}`);
    
    return c.json({ 
      products: paginated,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Batch query products by codes (for admin panel)
app.post("/make-server-d1fbc049/products/batch", async (c) => {
  try {
    const { codes } = await c.req.json();

    if (!Array.isArray(codes) || codes.length === 0) {
      return c.json({ error: 'Invalid codes array' }, 400);
    }

    console.log(`📦 Batch fetching ${codes.length} products by code...`);

    // Fetch only valid products (excludes sections/categories/metadata)
    const products = await kv.getProducts().catch(() => []);

    if (!Array.isArray(products) || products.length === 0) {
      console.warn('⚠️  No products found in database');
      return c.json([]);
    }

    console.log(`📦 Loaded ${products.length} valid products from database`);

    // Filter to only requested codes, maintaining order
    const result = codes
      .map(code => products.find((p: any) => p.code === code || p.productCode === code || p.sku === code))
      .filter(Boolean);

    console.log(`✅ Found ${result.length}/${codes.length} products`);
    return c.json(result);
    
  } catch (error) {
    console.error('Batch query error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Query specific product by code
app.get("/make-server-d1fbc049/products/query/:code", async (c) => {
  try {
    const code = c.req.param('code');
    console.log(`=== QUERY PRODUCT: ${code} ===`);
    
    // Try to find product with the code-based key
    const productKey = `products:${code}`;
    console.log('Looking up product with key:', productKey);
    
    const product = await kv.get(productKey);
    
    if (!product) {
      console.log('Product not found with key:', productKey);
      return c.json({ error: 'Product not found', code }, 404);
    }
    
    console.log('Product found:', productKey);
    console.log('Full product data:', JSON.stringify(product, null, 2));
    
    return c.json({ 
      success: true, 
      product,
      key: productKey,
      allFields: Object.keys(product),
    });
  } catch (error) {
    console.error('Query product error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ⚡ Single product cache (edge caching for 5 minutes)
const singleProductCache = new Map<string, { product: any; timestamp: number }>();
const PRODUCT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ⚡ NEW: Fast single product lookup for direct URLs (Google Ads optimization)
app.get("/make-server-d1fbc049/product/:id", async (c) => {
  try {
    const id = c.req.param('id');
    console.log(`⚡ [Direct URL] Fetching single product: ${id}`);

    // Strategy 0: Check edge cache (fastest - ~1ms)
    const cached = singleProductCache.get(id);
    if (cached && (Date.now() - cached.timestamp) < PRODUCT_CACHE_TTL) {
      console.log(`⚡ [Edge Cache HIT] Product from cache (~1ms): ${cached.product.name || cached.product.code}`);
      return c.json(cached.product);
    }

    // Strategy 1: Try direct key lookup (fast - ~50ms)
    const directProduct = await kv.get(`products:${id}`);
    if (directProduct) {
      console.log(`✅ [Direct URL] Product found via direct key: ${directProduct.name || directProduct.code}`);

      // Cache for next request
      singleProductCache.set(id, { product: directProduct, timestamp: Date.now() });

      return c.json(directProduct);
    }

    // Strategy 2: Try to get all products from KV store
    let products = await kv.get('products');

    // Strategy 3: Fallback to getByPrefix if array not found
    if (!products || !Array.isArray(products)) {
      console.log('⚡ [Direct URL] Trying getByPrefix fallback...');
      products = await kv.getByPrefix('products:');
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      console.log('⚠️  [Direct URL] No products found in KV store');
      return c.json({ error: 'Product not found', code: id }, 404);
    }

    console.log(`⚡ [Direct URL] Searching ${products.length} products for: ${id}`);

    // Search for product by ID, code, or SKU
    const product = products.find((p: any) =>
      p.id === id ||
      p.code === id ||
      p.sku === id ||
      p.productCode === id
    );

    if (!product) {
      console.log(`⚠️  [Direct URL] Product not found in ${products.length} products`);
      return c.json({ error: 'Product not found', code: id, totalProducts: products.length }, 404);
    }

    console.log(`✅ [Direct URL] Product found: ${product.name || product.code}`);

    // Cache for next request
    singleProductCache.set(id, { product, timestamp: Date.now() });

    return c.json(product);
  } catch (error) {
    console.error('[Direct URL] Error fetching product:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get related products for a single product
app.get("/make-server-d1fbc049/product/:id/related", async (c) => {
  try {
    const id = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '4');
    console.log(`⚡ [Related Products] Fetching related products for: ${id} (limit: ${limit})`);

    // ⚡ OPTIMIZATION: Use in-memory cache for INSTANT response
    const allProducts = await getAllProducts();

    if (!allProducts || allProducts.length === 0) {
      console.log(`⚠️  [Related Products] No products found in database - returning empty array`);
      return c.json([]);
    }

    console.log(`✅ [Related Products] Using ${allProducts.length} products from cache`);

    // Find the product - log all possible IDs for debugging
    console.log(`[Related Products] Searching for product with ID: ${id}`);
    const product = allProducts.find((p: any) => {
      const matches = p.id === id || p.code === id || p.sku === id || p.productCode === id;
      if (matches) {
        console.log(`[Related Products] Match found! Product IDs: id=${p.id}, code=${p.code}, sku=${p.sku}, productCode=${p.productCode}`);
      }
      return matches;
    });

    if (!product) {
      console.log(`⚠️  [Related Products] Product not found with ID: ${id}`);
      console.log(`[Related Products] Sample product IDs from database:`, allProducts.slice(0, 3).map((p: any) => ({ id: p.id, code: p.code, sku: p.sku })));
      return c.json([]);
    }

    console.log(`✅ [Related Products] Found product: ${product.name}`);
    console.log(`[Related Products] Product category fields: category="${product.category}", categoryCode="${product.categoryCode}", categoryName="${product.categoryName}"`);

    // Find products in the same category, excluding the current product
    // Match by category, categoryCode, OR categoryName to handle different data formats
    const categoryProducts = allProducts
      .filter((p: any) => {
        const matchesCategory =
          p.category === product.category ||
          p.categoryCode === product.category ||
          p.category === product.categoryCode ||
          p.categoryCode === product.categoryCode ||
          p.categoryName === product.categoryName;
        const isDifferent = p.id !== product.id && p.code !== product.code;
        return matchesCategory && isDifferent;
      });

    // Shuffle the array to get random related products instead of always the same first 4
    const shuffled = categoryProducts.sort(() => Math.random() - 0.5);
    const relatedProducts = shuffled.slice(0, limit);

    console.log(`✅ [Related Products] Found ${relatedProducts.length} related products`);
    if (relatedProducts.length > 0) {
      console.log(`[Related Products] Sample related products:`, relatedProducts.slice(0, 2).map((p: any) => ({
        name: p.name,
        code: p.code,
        category: p.category,
        categoryCode: p.categoryCode
      })));
    } else {
      console.log(`⚠️  [Related Products] No related products found - checking why...`);
      const categoryMatches = allProducts.filter((p: any) => p.category === product.category).length;
      const categoryCodeMatches = allProducts.filter((p: any) => p.categoryCode === product.categoryCode).length;
      console.log(`[Related Products] Products with same category: ${categoryMatches}, same categoryCode: ${categoryCodeMatches}`);
    }

    return c.json(relatedProducts);
  } catch (error) {
    console.error('[Related Products] Error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-d1fbc049/products", async (c) => {
  try {
    // Get pagination params
    const url = new URL(c.req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    
    // Always fetch products using prefix pattern to get latest data
    // (individual products are stored as products:CODE)
    console.log('Fetching products by prefix pattern...');
    let allData = await kv.getByPrefix('products:');
    console.log(`Found ${allData?.length || 0} records with products: prefix`);

    // Filter out non-product entries (sections, categories, etc.)
    // Real products have name, code/id, and price fields
    let products = allData.filter((item: any) => {
      // Must be a valid object
      if (!item || typeof item !== 'object') {
        console.log('❌ Filtered: Not an object');
        return false;
      }

      // Must have a name (not empty, not just "Unnamed Product")
      if (!item.name || item.name === '' || item.name === 'Unnamed Product') {
        console.log('❌ Filtered: No valid name');
        return false;
      }

      // Must have at least one identifier
      if (!item.code && !item.id && !item.sku) {
        console.log('❌ Filtered: No identifier (code/id/sku)');
        return false;
      }

      // Must have price field defined (can be 0, but must exist)
      if (item.price === undefined || item.price === null) {
        console.log(`❌ Filtered: No price for ${item.name}`);
        return false;
      }

      // If it has "sections" or "categories" in the object, it's metadata
      if (item.sections || item.categories || item.sectionsConfig) {
        console.log(`❌ Filtered: Metadata object (has sections/categories)`);
        return false;
      }

      return true;
    });
    console.log(`✅ Filtered to ${products.length} actual products`);
    
    if (!products || !Array.isArray(products)) {
      return c.json({
        products: [],
        pagination: {
          total: 0,
          offset: 0,
          limit: limit,
          hasMore: false
        }
      });
    }
    
    // Filter by category if provided
    if (category) {
      products = products.filter((p: any) => 
        p.categoryPath?.includes(category) || 
        p.categoryId === category
      );
    }
    
    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter((p: any) => 
        p.name?.toLowerCase().includes(searchLower) || 
        p.code?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply pagination
    const total = products.length;
    const paginatedProducts = products.slice(offset, offset + limit);
    
    console.log(`Returning ${paginatedProducts.length} of ${total} products (offset: ${offset}, limit: ${limit})`);
    
    return c.json({
      products: paginatedProducts,
      pagination: {
        total,
        offset,
        limit,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.log('Get products error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-d1fbc049/products", async (c) => {
  try {
    console.log('=== POST /products REQUEST START ===');
    
    const product = await c.req.json();
    console.log('Product data received:', { id: product.id, name: product.name, code: product.code });
    
    // Use the individual key format like the old system: products:CODE
    const productKey = `products:${product.code || product.id}`;
    console.log('Storing product with key:', productKey);
    
    // Store using kv (which uses SERVICE_ROLE_KEY internally - bypasses RLS!)
    await kv.set(productKey, product);

    console.log('✅ Product stored successfully with key:', productKey);

    // Clear cache when product is added
    cmsDataCache = null;
    // Cache cleared by invalidateCMSCache

    // Trigger CDN sync in background (fire and forget)
    console.log('🔄 Triggering background CDN sync...');
    fetch(`${c.req.url.split('/make-server-d1fbc049')[0]}/make-server-d1fbc049/sync-products`, {
      method: 'POST',
      headers: {
        'Authorization': c.req.header('Authorization') || '',
      },
    }).catch(err => {
      console.error('Background CDN sync failed:', err);
    });

    console.log('=== POST /products REQUEST END ===');
    return c.json({ success: true, product, key: productKey, cdnSyncTriggered: true });
  } catch (error) {
    console.error('=== POST /products ERROR ===');
    console.error('Error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/make-server-d1fbc049/products/:id", async (c) => {
  try {
    console.log('=== PUT /products/:id REQUEST START ===');
    
    const id = c.req.param('id');
    const updatedProduct = await c.req.json();
    
    console.log('Updating product:', { urlId: id, productId: updatedProduct.id, productCode: updatedProduct.code });
    
    // IMPORTANT: We need to find the product by EITHER code OR id
    // The old system stores products with key: products:CODE
    // So we need to use the product.code from the body to find it
    const productCode = updatedProduct.code || id;
    const productKey = `products:${productCode}`;
    console.log('Looking up product with key:', productKey);
    
    // Check if product exists
    let existing = await kv.get(productKey);
    
    // If not found by code, try searching by ID in case old data exists
    if (!existing && updatedProduct.code !== id) {
      console.log('Product not found by code, trying by ID:', id);
      const altKey = `products:${id}`;
      existing = await kv.get(altKey);
      if (existing) {
        console.log('Found product by ID instead, will update at:', altKey);
        // If we found it by ID, update it there and also create the new code-based key
        await kv.set(altKey, updatedProduct);
        if (updatedProduct.code) {
          console.log('Also creating code-based key:', productKey);
          await kv.set(productKey, updatedProduct);
        }

        // Trigger CDN sync in background (fire and forget)
        console.log('🔄 Triggering background CDN sync...');
        fetch(`${c.req.url.split('/make-server-d1fbc049')[0]}/make-server-d1fbc049/sync-products`, {
          method: 'POST',
          headers: {
            'Authorization': c.req.header('Authorization') || '',
          },
        }).catch(err => {
          console.error('Background CDN sync failed:', err);
        });

        console.log('✅ Product updated successfully');
        console.log('=== PUT /products/:id REQUEST END ===');
        return c.json({ success: true, product: updatedProduct, key: altKey, cdnSyncTriggered: true });
      }
    }
    
    if (!existing) {
      console.log('Product not found with key:', productKey);
      return c.json({ error: 'Product not found' }, 404);
    }
    
    // Update using kv (which uses SERVICE_ROLE_KEY internally - bypasses RLS!)
    await kv.set(productKey, updatedProduct);

    // Clear cache when product is updated
    cmsDataCache = null;
    // Cache cleared by invalidateCMSCache

    // Trigger CDN sync in background (fire and forget)
    // This ensures the CDN JSON files are updated with the latest product data
    console.log('🔄 Triggering background CDN sync...');
    fetch(`${c.req.url.split('/make-server-d1fbc049')[0]}/make-server-d1fbc049/sync-products`, {
      method: 'POST',
      headers: {
        'Authorization': c.req.header('Authorization') || '',
      },
    }).catch(err => {
      console.error('Background CDN sync failed:', err);
      // Don't fail the update if sync fails
    });

    console.log('✅ Product updated successfully with key:', productKey);
    console.log('=== PUT /products/:id REQUEST END ===');
    return c.json({ success: true, product: updatedProduct, key: productKey, cdnSyncTriggered: true });
  } catch (error) {
    console.error('=== PUT /products/:id ERROR ===');
    console.error('Error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/make-server-d1fbc049/products/:id", async (c) => {
  try {
    const id = c.req.param('id');
    console.log('=== DELETE /products/:id REQUEST ===');
    console.log('Product ID to delete:', id);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let productKey: string | null = null;
    let productToDelete: any = null;

    // Strategy 1: Try direct lookup by ID (products:ID)
    console.log('Strategy 1: Trying direct lookup products:${id}');
    productKey = `products:${id}`;
    productToDelete = await kv.get(productKey);

    if (productToDelete) {
      console.log('✅ Found by direct ID lookup');
    } else {
      // Strategy 2: Search database for exact ID match using SQL filter
      console.log('Strategy 2: Searching database with SQL filter for ID field...');

      const { data, error } = await supabase
        .from('kv_store_577b3f26')
        .select('key, value')
        .like('key', 'products:%')
        .filter('value->id', 'eq', id)
        .limit(1);

      if (error) {
        console.error('Database search error:', error);
      } else if (data && data.length > 0) {
        productToDelete = data[0].value;
        productKey = data[0].key;
        console.log('✅ Found by SQL filter, key:', productKey);
      }
    }

    // Strategy 3: If still not found, scan in batches
    if (!productToDelete) {
      console.log('Strategy 3: Scanning in batches...');
      let offset = 0;
      const batchSize = 500;
      let found = false;

      while (!found && offset < 5000) { // Max 10 batches = 5000 products
        const { data, error } = await supabase
          .from('kv_store_577b3f26')
          .select('key, value')
          .like('key', 'products:%')
          .range(offset, offset + batchSize - 1);

        if (error) {
          console.error('Batch search error:', error);
          break;
        }

        if (!data || data.length === 0) break;

        const foundRow = data.find((row: any) => row.value?.id === id);
        if (foundRow) {
          productToDelete = foundRow.value;
          productKey = foundRow.key;
          found = true;
          console.log('✅ Found in batch at offset', offset, 'key:', productKey);
          break;
        }

        offset += batchSize;
        console.log(`Scanned ${offset} products, continuing...`);
      }
    }

    if (!productToDelete || !productKey) {
      console.log('❌ Product not found with ID:', id, 'after all strategies');
      return c.json({
        error: 'Product not found',
        details: `Searched using ID: ${id}. Product may have been already deleted or does not exist.`
      }, 404);
    }

    console.log('Deleting product:', {
      id: id,
      key: productKey,
      name: productToDelete.name,
      code: productToDelete.code
    });
    
    // Delete the individual product key
    try {
      await kv.del(productKey);
      console.log('✅ Product key deleted from database');
    } catch (delError) {
      console.error('❌ Error deleting product key:', delError);
      throw new Error(`Failed to delete product from database: ${delError}`);
    }

    // 🔥 Clear ALL caches when product is deleted
    try {
      await invalidateCMSCache('Product deleted');
      homepageDataCache = null;
      cacheVersion = Date.now();
      console.log('✅ All caches cleared after product deletion');
    } catch (cacheError) {
      console.error('⚠️ Cache clear failed (non-critical):', cacheError);
      // Don't fail the delete if cache clear fails
    }

    // Trigger CDN sync in background (fire and forget)
    console.log('🔄 Triggering background CDN sync...');
    fetch(`${c.req.url.split('/make-server-d1fbc049')[0]}/make-server-d1fbc049/sync-products`, {
      method: 'POST',
      headers: {
        'Authorization': c.req.header('Authorization') || '',
      },
    }).catch(err => {
      console.error('Background CDN sync failed:', err);
    });

    console.log('=== DELETE /products/:id SUCCESS ===');
    return c.json({
      success: true,
      message: 'Product deleted successfully',
      deletedKey: productKey,
      cdnSyncTriggered: true
    });
  } catch (error) {
    console.error('=== DELETE /products/:id ERROR ===');
    console.error('Error details:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({
      error: 'Failed to delete product',
      details: errorMessage,
      productId: c.req.param('id')
    }, 500);
  }
});

// Bulk import products from CSV
app.post("/make-server-d1fbc049/products/import-bulk", async (c) => {
  try {
    const apiKey = c.req.header('X-API-Key');
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const products = await c.req.json();
    
    if (!Array.isArray(products)) {
      return c.json({ error: 'Products must be an array' }, 400);
    }
    
    console.log(`Importing ${products.length} products...`);
    await kv.set('products', products);
    console.log(`Successfully imported ${products.length} products`);
    
    return c.json({ success: true, count: products.length });
  } catch (error) {
    console.log('Product import error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============= CATEGORIES =============

app.get("/make-server-d1fbc049/categories", async (c) => {
  try {
    // Try to get categories as array first (new format)
    let categories = await kv.get('categories');
    
    // If not found, try to get individual categories by prefix (old format)
    if (!categories || !Array.isArray(categories)) {
      console.log('Fetching categories by prefix pattern...');
      const categoryObjects = await kv.getByPrefix('categories:');
      console.log(`Found ${categoryObjects?.length || 0} categories by prefix`);
      
      // Extract just the names for the flat list
      if (categoryObjects && Array.isArray(categoryObjects)) {
        categories = ['All Equipment', ...categoryObjects.map((cat: any) => cat.name).filter(Boolean)];
      }
    }
    
    return c.json(categories || []);
  } catch (error) {
    console.log('Get categories error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/make-server-d1fbc049/categories", async (c) => {
  try {
    const apiKey = c.req.header('X-API-Key');
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const categories = await c.req.json();
    await kv.set('categories', categories);
    
    return c.json(categories);
  } catch (error) {
    console.log('Update categories error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/make-server-d1fbc049/categories/:id", async (c) => {
  try {
    const apiKey = c.req.header('X-API-Key');
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    const categories = await kv.get('categories') || [];
    const filtered = categories.filter((cat: any) => cat !== id);
    
    await kv.set('categories', filtered);
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Delete category error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Import hierarchical categories from CSV
app.post("/make-server-d1fbc049/categories/import-bulk", async (c) => {
  try {
    const apiKey = c.req.header('X-API-Key');
    if (!verifyApiKey(apiKey)) {
      console.log('Category import: Invalid API key');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const categoryNodes = await c.req.json();
    
    if (!Array.isArray(categoryNodes)) {
      console.log('Category import error: not an array');
      return c.json({ error: 'Categories must be an array' }, 400);
    }
    
    console.log(`Importing ${categoryNodes.length} hierarchical categories...`);

    // Preserve any Simco nodes
    const existingTreeImport = await kv.get('category_tree').catch(() => []) as any[] || [];
    const simcoImportNodes = existingTreeImport.filter((n: any) =>
      String(n.id).startsWith('SC-') || n.id === 'G-SIMCO'
    );
    const incomingImportIds = new Set(categoryNodes.map((n: any) => n.id));
    const simcoToAddImport = simcoImportNodes.filter((n: any) => !incomingImportIds.has(n.id));
    const mergedImport = [...categoryNodes, ...simcoToAddImport];

    // Store the full category tree structure
    await kv.set('category_tree', mergedImport);
    
    // Also create a flat list for backwards compatibility
    const flatCategories = ['All Equipment'];
    categoryNodes.forEach((node: any) => {
      if (node.name && !flatCategories.includes(node.name)) {
        flatCategories.push(node.name);
      }
    });
    
    await kv.set('categories', flatCategories);
    
    console.log(`Successfully imported ${categoryNodes.length} categories, created ${flatCategories.length} flat categories`);
    
    return c.json({ 
      success: true, 
      count: categoryNodes.length,
      flatCount: flatCategories.length 
    });
  } catch (error) {
    console.log('Import categories error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get category tree
app.get("/make-server-d1fbc049/categories/tree", async (c) => {
  try {
    const tree = await kv.get('category_tree') || [];
    
    // Add debugging info
    console.log('=== CATEGORY TREE DEBUG ===');
    console.log('Total nodes:', tree.length);
    
    if (tree.length > 0) {
      // Show samples from each level
      const l1 = tree.find((n: any) => n.level === 1);
      const l2 = tree.find((n: any) => n.level === 2);
      const l3 = tree.find((n: any) => n.level === 3);
      const l4 = tree.find((n: any) => n.level === 4);
      
      console.log('Level 1 sample:', l1 ? { name: l1.name, parent: l1.parent, path: l1.path } : 'None');
      console.log('Level 2 sample:', l2 ? { name: l2.name, parent: l2.parent, path: l2.path } : 'None');
      console.log('Level 3 sample:', l3 ? { name: l3.name, parent: l3.parent, path: l3.path } : 'None');
      console.log('Level 4 sample:', l4 ? { name: l4.name, parent: l4.parent, path: l4.path } : 'None');
    }
    
    return c.json(tree);
  } catch (error) {
    console.log('Get category tree error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Update category tree
app.put("/make-server-d1fbc049/categories/tree", async (c) => {
  try {
    console.log('=== UPDATE CATEGORY TREE REQUEST START ===');
    
    // Try to get API key from either X-API-Key or Authorization header
    let apiKey = c.req.header('X-API-Key');
    if (!apiKey) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }
    
    console.log('API Key received:', apiKey ? 'YES' : 'NO');
    
    if (!verifyApiKey(apiKey)) {
      const errorMsg = apiKey ? 'Invalid API key' : 'Missing authorization header';
      console.log('Auth failed:', errorMsg);
      return c.json({ error: errorMsg, code: 401, message: errorMsg }, 401);
    }
    
    console.log('Auth successful, parsing body...');
    const categoryTree = await c.req.json();
    
    if (!Array.isArray(categoryTree)) {
      console.log('Invalid body: not an array');
      return c.json({ error: 'Category tree must be an array' }, 400);
    }
    
    console.log(`Received ${categoryTree.length} category nodes, saving to KV store...`);

    // Preserve any Simco nodes that were added externally
    const existingTree = await kv.get('category_tree').catch(() => []) as any[] || [];
    const simcoNodes = existingTree.filter((n: any) =>
      String(n.id).startsWith('SC-') || n.id === 'G-SIMCO'
    );
    const incomingIds = new Set(categoryTree.map((n: any) => n.id));
    const simcoToAdd = simcoNodes.filter((n: any) => !incomingIds.has(n.id));
    const mergedTree = [...categoryTree, ...simcoToAdd];

    // Update the category tree
    await kv.set('category_tree', mergedTree);

    console.log(`Category tree saved: ${categoryTree.length} nodes + ${simcoToAdd.length} Simco nodes preserved`);

    return c.json({ success: true, count: mergedTree.length });
  } catch (error) {
    console.error('=== UPDATE CATEGORY TREE ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    return c.json({ 
      error: 'Failed to update category tree',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ============= HEADER =============

app.get("/make-server-d1fbc049/header", async (c) => {
  try {
    const header = await Promise.race([
      kv.get('header'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Get header timeout')), 5000))
    ]);
    return c.json(header || {});
  } catch (error) {
    console.log('Get header error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/make-server-d1fbc049/header", async (c) => {
  try {
    console.log('=== UPDATE HEADER REQUEST START ===');
    
    // Check for API key in both X-API-Key and Authorization headers
    let apiKey = c.req.header('X-API-Key');
    if (!apiKey) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      }
    }
    
    console.log('Header update - API key present:', !!apiKey);
    
    if (!verifyApiKey(apiKey)) {
      console.log('Header update: Unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    console.log('Reading header data...');
    const header = await c.req.json();
    console.log('Header data received:', Object.keys(header));
    
    console.log('Saving header to KV store with timeout protection...');
    await Promise.race([
      kv.set('header', header),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Header save timeout')), 8000))
    ]);
    
    console.log('Header saved successfully!');
    console.log('=== UPDATE HEADER REQUEST END ===');
    return c.json(header);
  } catch (error) {
    console.error('=== UPDATE HEADER ERROR ===');
    console.error('Update header error:', error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    return c.json({ error: String(error) }, 500);
  }
});

// ============= FOOTER =============

// Initialize footer with default data (one-time setup)
app.post("/make-server-d1fbc049/footer/initialize", async (c) => {
  console.log('=== INITIALIZE FOOTER DATA ===');
  
  try {
    const defaultFooter = {
      about: "Costplus100 is your trusted partner for professional catering equipment. We provide commercial-grade products from leading brands.",
      email: "info@costplus100.com.au",
      phone: "",
      address: "6/4 Loftus Street Bowral NSW 2576",
      socialMedia: {
        facebook: "",
        twitter: "",
        instagram: "",
        linkedin: ""
      }
    };
    
    console.log('Setting default footer data:', defaultFooter);
    
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Footer initialization timeout after 8s')), 8000);
    });
    
    const setPromise = kv.set('footer', defaultFooter);
    
    await Promise.race([setPromise, timeoutPromise]);
    
    console.log('Footer initialized successfully!');
    
    return c.json({ 
      success: true, 
      message: 'Footer initialized with default data',
      footer: defaultFooter 
    });
  } catch (error) {
    console.error('Footer initialization error:', error);
    
    // Return the default footer anyway so the UI can use it
    return c.json({ 
      success: true,
      message: 'Footer defaults returned (database save may have timed out)',
      footer: {
        about: "Costplus100 is your trusted partner for professional catering equipment. We provide commercial-grade products from leading brands.",
        email: "info@costplus100.com.au",
        phone: "",
        address: "6/4 Loftus Street Bowral NSW 2576",
        socialMedia: {
          facebook: "",
          twitter: "",
          instagram: "",
          linkedin: ""
        }
      }
    });
  }
});

app.get("/make-server-d1fbc049/footer", async (c) => {
  try {
    const footer = await Promise.race([
      kv.get('footer'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Get footer timeout')), 5000))
    ]);
    return c.json(footer || {});
  } catch (error) {
    console.log('Get footer error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/make-server-d1fbc049/footer", async (c) => {
  console.log('=== UPDATE FOOTER REQUEST START ===');
  console.log('Request URL:', c.req.url);
  console.log('Request method:', c.req.method);
  
  try {
    // Try to get API key from either X-API-Key or Authorization header (like other endpoints)
    let apiKey = c.req.header('X-API-Key');
    if (!apiKey) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }
    
    console.log('Footer update - API key present:', !!apiKey);
    console.log('Footer update - API key value (first 50):', apiKey?.substring(0, 50));
    console.log('Footer update - API key length:', apiKey?.length);
    
    if (!verifyApiKey(apiKey)) {
      const errorMsg = apiKey ? 'Invalid API key' : 'Missing authorization header';
      console.log('Footer update: Unauthorized -', errorMsg);
      return c.json({ error: errorMsg, code: 401, message: errorMsg }, 401);
    }
    
    console.log('Reading footer data from request body...');
    let footer;
    try {
      footer = await Promise.race([
        c.req.json(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request body parsing timeout')), 3000))
      ]);
    } catch (parseError) {
      console.error('Failed to parse footer data:', parseError);
      return c.json({ error: 'Failed to parse request body: ' + (parseError instanceof Error ? parseError.message : String(parseError)) }, 400);
    }
    
    console.log('Footer data received, fields:', Object.keys(footer));
    
    console.log('Saving footer to KV store...');
    try {
      // Add timeout protection to database save
      await Promise.race([
        kv.set('footer', footer),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Footer save timeout after 8s')), 8000))
      ]);
      console.log('Footer saved successfully!');
    } catch (kvError) {
      console.error('KV store error:', kvError);
      // Still return success so the UI can update, even if DB save failed
      console.log('Returning success despite save timeout to prevent UI hang');
      return c.json({ 
        success: true, 
        footer,
        warning: 'Data updated in memory but database save may have timed out'
      });
    }
    
    console.log('=== UPDATE FOOTER REQUEST END ===');
    return c.json({ success: true, footer });
  } catch (error) {
    console.error('=== UPDATE FOOTER ERROR ===');
    console.error('Update footer error:', error);
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return c.json({ 
      error: 'Failed to update footer',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ============= ABOUT US =============

app.get("/make-server-d1fbc049/cms/about", async (c) => {
  try {
    console.log('Fetching About content from KV store...');
    const about = await Promise.race([
      kv.get('about'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Get about timeout')), 5000))
    ]);
    console.log('About content fetched:', about ? 'SUCCESS' : 'NOT FOUND');
    return c.json({ about: about || null });
  } catch (error) {
    console.log('Get about error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/make-server-d1fbc049/cms/about", async (c) => {
  console.log('=== UPDATE ABOUT REQUEST START ===');
  console.log('Request URL:', c.req.url);
  console.log('Request method:', c.req.method);
  
  try {
    console.log('Reading About data from request body...');
    let requestData;
    try {
      requestData = await Promise.race([
        c.req.json(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request body parsing timeout')), 3000))
      ]);
    } catch (parseError) {
      console.error('Failed to parse About data:', parseError);
      return c.json({ error: 'Failed to parse request body: ' + (parseError instanceof Error ? parseError.message : String(parseError)) }, 400);
    }
    
    const { about } = requestData;
    console.log('About data received:', about ? 'YES' : 'NO');
    
    if (!about) {
      return c.json({ error: 'About content is required' }, 400);
    }
    
    console.log('Saving About to KV store...');
    try {
      await Promise.race([
        kv.set('about', about),
        new Promise((_, reject) => setTimeout(() => reject(new Error('About save timeout after 8s')), 8000))
      ]);
      console.log('About saved successfully!');
    } catch (kvError) {
      console.error('KV store error:', kvError);
      return c.json({ 
        success: true, 
        about,
        warning: 'Data updated in memory but database save may have timed out'
      });
    }
    
    console.log('=== UPDATE ABOUT REQUEST END ===');
    return c.json({ success: true, about });
  } catch (error) {
    console.error('=== UPDATE ABOUT ERROR ===');
    console.error('Update about error:', error);
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return c.json({ 
      error: 'Failed to update about',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ============= HOMEPAGE =============

app.get("/make-server-d1fbc049/homepage", async (c) => {
  try {
    const homepage = await kv.get('homepage');
    return c.json(homepage || {});
  } catch (error) {
    console.log('Get homepage error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/make-server-d1fbc049/homepage", async (c) => {
  try {
    const apiKey = c.req.header('X-API-Key');
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const homepage = await c.req.json();
    await kv.set('homepage', homepage);
    
    return c.json(homepage);
  } catch (error) {
    console.log('Update homepage error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============= MAINTENANCE MODE =============

// Get maintenance mode status
app.get("/make-server-d1fbc049/maintenance", async (c) => {
  try {
    const maintenance = await kv.get('maintenance_mode') || { enabled: false, message: '' };
    return c.json(maintenance);
  } catch (error) {
    console.log('Get maintenance mode error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Update maintenance mode
app.put("/make-server-d1fbc049/maintenance", async (c) => {
  try {
    console.log('=== MAINTENANCE MODE UPDATE REQUEST ===');
    
    // Try to get API key from either X-API-Key or Authorization header
    let apiKey = c.req.header('X-API-Key');
    if (!apiKey) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }
    
    console.log('API Key present:', !!apiKey);
    console.log('API Key matches:', apiKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjYwMDIsImV4cCI6MjA4ODM0MjAwMn0.WtWmz2qJ2NNMx7LHnkrYnJqR9b8cC-IDTVyKaWs9Ta4');
    
    if (!verifyApiKey(apiKey)) {
      const errorMsg = apiKey ? 'Invalid API key' : 'Missing authorization header';
      console.log('Auth failed:', errorMsg);
      return c.json({ error: errorMsg, code: 401, message: errorMsg }, 401);
    }
    
    console.log('API key verified, parsing request body...');
    const maintenanceData = await c.req.json();
    console.log('Maintenance data received:', maintenanceData);
    
    const dataToStore = {
      enabled: maintenanceData.enabled || false,
      message: maintenanceData.message || 'We are currently performing scheduled maintenance. Please check back soon!',
      updatedAt: new Date().toISOString()
    };
    
    console.log('Storing maintenance data:', dataToStore);
    await kv.set('maintenance_mode', dataToStore);
    
    console.log('Maintenance mode updated successfully!');
    console.log('=== MAINTENANCE MODE UPDATE COMPLETE ===');
    
    return c.json({ success: true });
  } catch (error) {
    console.error('=== MAINTENANCE MODE UPDATE ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    return c.json({ 
      error: 'Failed to update maintenance mode',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ============= FEATURED SECTIONS ENDPOINTS =============

// Cache for homepage data (featured products with full data)
// NOTE: This cache is managed by the homepage-data/clear and homepage-data/refresh endpoints
let homepageCache: any = null;
let homepageCacheTime = 0;
const HOMEPAGE_CACHE_DURATION = 3600000; // 1 hour cache

// Cache version - increments when admin clears cache  
let cacheVersion = Date.now(); // Use timestamp as version

// ⚠️ DUPLICATE /homepage-data ENDPOINT REMOVED
// The optimized endpoint is defined at line ~513 and includes banners & sectionsConfig
// This duplicate was causing the frontend to not receive banners/sections data

// Clear homepage cache (admin action)
app.post("/make-server-d1fbc049/homepage-data/clear", async (c) => {
  try {
    // Verify API key
    let apiKey = c.req.header('X-API-Key');
    if (!apiKey) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      }
    }
    
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Clear BOTH homepage caches
    homepageCache = null;
    homepageCacheTime = 0;
    homepageDataCache = null;
    // Cache cleared by invalidateCMSCache
    cacheVersion = Date.now(); // Increment cache version
    console.log('✅ Homepage caches cleared, new version:', cacheVersion);
    
    return c.json({ success: true, message: 'Homepage cache cleared' });
  } catch (error) {
    console.error('Failed to clear homepage cache:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Refresh homepage cache (admin action - clears and rebuilds)
app.post("/make-server-d1fbc049/homepage-data/refresh", async (c) => {
  try {
    // Verify API key
    let apiKey = c.req.header('X-API-Key');
    if (!apiKey) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      }
    }
    
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Clear BOTH homepage caches
    homepageCache = null;
    homepageCacheTime = 0;
    homepageDataCache = null;
    // Cache cleared by invalidateCMSCache
    cacheVersion = Date.now(); // Increment cache version
    console.log('✅ Homepage caches cleared, rebuilding..., new version:', cacheVersion);
    
    // Trigger a fresh fetch by calling the GET endpoint internally
    // This will rebuild the cache
    const featuredSections = await kv.get('featured_sections').catch(() => null);
    const featuredIds = featuredSections?.featured || [];
    const popularIds = featuredSections?.popular || [];
    const promotionIds = featuredSections?.promotion || [];
    
    // Get all products - try array format first, then prefix pattern
    let allProducts = await kv.get('products').catch(() => null);
    if (!allProducts || !Array.isArray(allProducts)) {
      console.log('⚠️  Products not found as single key, trying prefix pattern...');
      allProducts = await kv.getByPrefix('products:').catch(() => []);
      console.log(`Found ${allProducts?.length || 0} products by prefix`);
    }
    
    if (!Array.isArray(allProducts)) {
      allProducts = [];
    }
    
    // Filter products by IDs - check id, code, productCode, and sku fields
    const featuredProducts = allProducts.filter((p: any) => {
      if (!p) return false;
      return featuredIds.includes(p.id) || 
             featuredIds.includes(p.code) || 
             featuredIds.includes(p.productCode) ||
             featuredIds.includes(p.sku);
    });
    const popularProducts = allProducts.filter((p: any) => {
      if (!p) return false;
      return popularIds.includes(p.id) || 
             popularIds.includes(p.code) || 
             popularIds.includes(p.productCode) ||
             popularIds.includes(p.sku);
    });
    const promotionalProducts = allProducts.filter((p: any) => {
      if (!p) return false;
      return promotionIds.includes(p.id) || 
             promotionIds.includes(p.code) || 
             promotionIds.includes(p.productCode) ||
             promotionIds.includes(p.sku);
    });
    
    const categories = await kv.get('categories').catch(() => ['All Equipment']);
    const categoryTree = await kv.get('category_tree').catch(() => []);
    
    const response = {
      featured: featuredProducts,
      popular: popularProducts,
      promotion: promotionalProducts,
      categories: categories,
      categoryTree: categoryTree,
      cachedAt: new Date().toISOString()
    };
    
    homepageCache = response;
    homepageCacheTime = Date.now();
    
    console.log('✅ Homepage cache refreshed with new data');
    
    return c.json({ 
      success: true, 
      message: 'Homepage cache refreshed',
      stats: {
        featured: featuredProducts.length,
        popular: popularProducts.length,
        promotional: promotionalProducts.length,
        categories: categories.length,
        categoryTree: categoryTree.length
      }
    });
  } catch (error) {
    console.error('Failed to refresh homepage cache:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get featured sections
app.get("/make-server-d1fbc049/featured-sections", async (c) => {
  try {
    console.log('📦 Fetching featured sections from KV store...');
    const data = await kv.get('featured_sections');
    console.log('✅ Featured sections retrieved:', data);
    const response = data || { featured: [], popular: [], promotion: [] };
    return c.json(response);
  } catch (error) {
    console.error('❌ Failed to get featured sections:', error);
    // Always return valid JSON even on error
    return c.json({ featured: [], popular: [], promotion: [], error: String(error) }, 200);
  }
});

// Get homepage metadata (IDs + banners + sections config) - CACHED
app.get("/make-server-d1fbc049/homepage-metadata", async (c) => {
  try {
    console.log('📦 Fetching homepage metadata (IDs + banners + config)...');

    // Load all metadata in parallel
    const [featuredSections, banners, sectionsConfig] = await Promise.all([
      kv.get('featured_sections').catch(() => ({ featured: [], popular: [], promotion: [] })),
      kv.get('banners').catch(() => []),
      kv.get('sections_config').catch(() => [])
    ]);

    const response = {
      featuredIds: featuredSections?.featured || [],
      popularIds: featuredSections?.popular || [],
      promotionIds: featuredSections?.promotion || [],
      banners: Array.isArray(banners) ? banners : [],
      sectionsConfig: Array.isArray(sectionsConfig) ? sectionsConfig : []
    };

    console.log('✅ Metadata loaded:', {
      featuredIds: response.featuredIds.length,
      popularIds: response.popularIds.length,
      promotionIds: response.promotionIds.length,
      banners: response.banners.length,
      sectionsConfig: response.sectionsConfig.length
    });

    return c.json(response, 200, {
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
    });
  } catch (error) {
    console.error('❌ Failed to get homepage metadata:', error);
    return c.json({
      featuredIds: [],
      popularIds: [],
      promotionIds: [],
      banners: [],
      sectionsConfig: [],
      error: String(error)
    }, 200);
  }
});

// Update featured sections
app.put("/make-server-d1fbc049/featured-sections", async (c) => {
  try {
    // Try to get API key from either X-API-Key or Authorization header
    let apiKey = c.req.header('X-API-Key');
    if (!apiKey) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      }
    }
    
    if (!verifyApiKey(apiKey)) {
      const errorMsg = apiKey ? 'Invalid API key' : 'Missing authorization header';
      return c.json({ error: errorMsg, code: 401, message: errorMsg }, 401);
    }
    
    const sectionsData = await c.req.json();
    await kv.set('featured_sections', sectionsData);

    console.log('✅ Featured sections IDs saved:', {
      featured: sectionsData?.featured?.length || 0,
      popular: sectionsData?.popular?.length || 0,
      promotion: sectionsData?.promotion?.length || 0,
      firstFeatured: sectionsData?.featured?.[0]
    });

    // Clear filtered product caches
    await Promise.all([
      kv.del('cache:filtered:featured'),
      kv.del('cache:filtered:popular'),
      kv.del('cache:filtered:promotion')
    ]);
    console.log('🗑️ Cleared filtered product caches');
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to update featured sections:', error);
    return c.json({ 
      error: 'Failed to update featured sections',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ============= SECTIONS CONFIG ENDPOINTS =============

// Get sections configuration
app.get("/make-server-d1fbc049/sections-config", async (c) => {
  try {
    console.log('📦 Fetching sections configuration from KV store...');
    const data = await kv.get('sections_config');
    console.log('✅ Sections config retrieved:', data);
    
    // Default sections configuration
    const defaultConfig = [
      {
        id: 'featured',
        name: 'Featured Equipment',
        badge: '⭐ Featured',
        badgeColor: 'bg-blue-600',
        badgeIcon: '⭐',
        enabled: true,
        order: 1,
      },
      {
        id: 'popular',
        name: 'Popular Products',
        badge: '🔥 Popular',
        badgeColor: 'bg-purple-600',
        badgeIcon: '🔥',
        enabled: true,
        order: 2,
      },
      {
        id: 'promotion',
        name: 'Special Offers',
        badge: '🎉 Promo',
        badgeColor: 'bg-red-600',
        badgeIcon: '🎉',
        enabled: true,
        order: 3,
      },
    ];
    
    return c.json(data || defaultConfig);
  } catch (error) {
    console.error('❌ Failed to get sections config:', error);
    return c.json([], 200);
  }
});

// Update sections configuration
app.put("/make-server-d1fbc049/sections-config", async (c) => {
  try {
    const sectionsConfig = await c.req.json();
    console.log('💾 Updating sections configuration:', sectionsConfig);
    
    await kv.set('sections_config', sectionsConfig);
    console.log('✅ Sections configuration saved successfully');
    
    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Failed to update sections config:', error);
    return c.json({ 
      error: 'Failed to update sections configuration',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ============= DIAGNOSTIC ENDPOINT =============

// Debug endpoint to check featured_sections and product matching
app.get("/make-server-d1fbc049/debug-sections", async (c) => {
  try {
    // Get featured sections
    const featuredSections = await kv.get('featured_sections').catch(() => null);
    
    // Get sample products (first 5)
    const allProducts = await kv.get('products').catch(() => null);
    const sampleProducts = Array.isArray(allProducts) ? allProducts.slice(0, 5) : [];
    
    // Get sample product fields to see what IDs they have
    const productFields = sampleProducts.map((p: any) => ({
      id: p.id,
      code: p.code,
      sku: p.sku,
      productCode: p.productCode,
      name: p.name
    }));
    
    return c.json({
      featuredSections: featuredSections || 'NOT FOUND',
      totalProducts: Array.isArray(allProducts) ? allProducts.length : 0,
      sampleProductFields: productFields,
      diagnosis: {
        hasFeaturedSections: !!featuredSections,
        featuredIds: featuredSections?.featured || [],
        popularIds: featuredSections?.popular || [],
        promotionIds: featuredSections?.promotion || [],
        featuredCount: featuredSections?.featured?.length || 0,
        popularCount: featuredSections?.popular?.length || 0,
        promotionCount: featuredSections?.promotion?.length || 0
      }
    });
  } catch (error) {
    return c.json({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ============= BULK PRODUCT UPDATE ENDPOINT =============

// Bulk update products (for promotional pricing)
app.put("/make-server-d1fbc049/products/bulk-update", async (c) => {
  try {
    const { updates } = await c.req.json();
    console.log(`💾 Bulk updating ${updates.length} products...`);

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return c.json({ error: 'No updates provided' }, 400);
    }

    // Get all products using prefix pattern (products are stored as products:ID)
    console.log('Fetching products by prefix...');
    const allProducts = await kv.getByPrefix('products:');
    console.log(`Found ${allProducts.length} products`);

    // Create a map of updates by product ID
    const updateMap = new Map(updates.map((u: any) => [u.id, u]));
    console.log('Update map created with IDs:', Array.from(updateMap.keys()).slice(0, 5));

    // Prepare batch updates for kv.mset
    const keys: string[] = [];
    const values: any[] = [];
    let updatedCount = 0;

    // Find and update matching products
    for (const product of allProducts) {
      const update = updateMap.get(product.id);
      if (update) {
        const updatedProduct = { ...product, ...update };
        keys.push(`products:${product.id}`);
        values.push(updatedProduct);
        updatedCount++;
        console.log(`Updating product ${product.id}: price ${product.price} -> ${update.price}`);
      }
    }

    if (updatedCount === 0) {
      console.warn('⚠️ No matching products found to update');
      return c.json({ success: true, updated: 0, warning: 'No matching products found' });
    }

    // Save updated products using batch set
    console.log(`Saving ${updatedCount} updated products...`);
    await kv.mset(keys, values);
    console.log(`✅ Products bulk updated successfully (${updatedCount} products)`);

    return c.json({ success: true, updated: updatedCount });
  } catch (error) {
    console.error('❌ Failed to bulk update products:', error);
    return c.json({
      error: 'Failed to update product prices',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ============= AUTH ENDPOINTS =============

// Sign up endpoint
app.post("/make-server-d1fbc049/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    console.log('Signup request for email:', email);
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true // Auto-confirm since email server not configured
    });
    
    if (error) {
      console.error('Signup error:', error);
      return c.json({ 
        error: 'Signup failed', 
        details: error.message 
      }, 400);
    }
    
    console.log('Signup successful for:', email);
    return c.json({ 
      user: data.user,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Signup exception:', error);
    return c.json({ 
      error: 'Server error during signup',
      details: String(error)
    }, 500);
  }
});

// Sign in endpoint
app.post("/make-server-d1fbc049/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return c.json({ 
        error: 'Login failed', 
        details: error.message 
      }, 401);
    }
    
    return c.json({ 
      session: data.session,
      user: data.user
    });
  } catch (error) {
    return c.json({ 
      error: 'Server error during signin',
      details: String(error)
    }, 500);
  }
});

// Check session endpoint
app.get("/make-server-d1fbc049/auth/session", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ session: null }, 200);
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      return c.json({ session: null }, 200);
    }
    
    if (!data.user) {
      return c.json({ session: null }, 200);
    }
    
    return c.json({ 
      session: { access_token: token },
      user: data.user
    });
  } catch (error) {
    return c.json({ session: null }, 200);
  }
});

// ============= CONTACT FORM EMAIL =============

app.post("/make-server-d1fbc049/contact/send", async (c) => {
  try {
    const { name, email, subject, message } = await c.req.json();
    
    // Validate required fields
    if (!name || !email || !subject || !message) {
      return c.json({ error: 'All fields are required' }, 400);
    }
    
    // Store the contact form submission first (for backup)
    const submissions = await kv.get('contact_submissions') || [];
    const newSubmission = {
      id: `contact_${Date.now()}`,
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
      read: false
    };
    submissions.push(newSubmission);
    await kv.set('contact_submissions', submissions);
    
    console.log('Contact form submission stored successfully');
    
    // Get SMTP credentials from environment variables (already configured in Supabase)
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = Deno.env.get('SMTP_PORT');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    
    // Get optional configuration from database for recipient email and branding
    const emailConfig = await kv.get('email_config') || {};
    const companyInfo = await kv.get('company_info') || {};
    
    // Check if SMTP environment variables are configured
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      console.warn('SMTP environment variables not configured - email will not be sent');
      console.warn('Missing:', {
        SMTP_HOST: !smtpHost,
        SMTP_PORT: !smtpPort,
        SMTP_USER: !smtpUser,
        SMTP_PASSWORD: !smtpPassword
      });
      return c.json({ 
        success: true,
        message: 'Thank you for your message! We will get back to you soon.',
        note: 'Email notification pending SMTP configuration in Supabase environment variables.'
      });
    }
    
    // Determine recipient email
    // Priority: 1. emailConfig.adminEmail (from Admin > Email Settings)
    //          2. info@costplus100.com.au (default)
    const recipientEmail = emailConfig.adminEmail || 'info@costplus100.com.au';
    
    console.log('SMTP Configuration:', {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      recipientEmail: recipientEmail,
      passwordConfigured: !!smtpPassword
    });
    
    console.log('Sending contact form email to:', recipientEmail);
    
    // Prepare email content
    const emailSubject = `Contact Form: ${subject}`;
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2D3748; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .field { margin-bottom: 15px; }
    .field-label { font-weight: bold; color: #2D3748; }
    .field-value { margin-top: 5px; padding: 10px; background-color: white; border-left: 3px solid #E31837; }
    .message-box { margin-top: 20px; padding: 15px; background-color: white; border: 1px solid #ddd; min-height: 100px; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📨 New Contact Form Submission</h1>
    </div>
    <div class="content">
      <p>You've received a new message from your website contact form.</p>
      
      <div class="field">
        <div class="field-label">From:</div>
        <div class="field-value">${name}</div>
      </div>
      
      <div class="field">
        <div class="field-label">Email:</div>
        <div class="field-value"><a href="mailto:${email}">${email}</a></div>
      </div>
      
      <div class="field">
        <div class="field-label">Subject:</div>
        <div class="field-value">${subject}</div>
      </div>
      
      <div class="field">
        <div class="field-label">Date:</div>
        <div class="field-value">${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</div>
      </div>
      
      <div class="field">
        <div class="field-label">Message:</div>
        <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
      </div>
      
      <div class="footer">
        <p><strong>To reply:</strong> Simply hit "Reply" to respond directly to ${email}</p>
        <p>This message was sent from the ${companyInfo?.tradingName || 'Costplus100'} contact form.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
    
    try {
      // Import nodemailer dynamically
      const nodemailer = await import('npm:nodemailer@6.9.16');
      
      // Create transporter with SMTP settings from environment variables
      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || '587'),
        secure: smtpPort === '465',
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      console.log('Transporter created, attempting to send email...');
      
      // Send email
      const sendResult = await transporter.sendMail({
        from: `\"${companyInfo?.tradingName || 'Costplus100'}\" <${smtpUser}>`,
        to: recipientEmail,
        replyTo: email, // This allows the recipient to reply directly to the customer
        subject: emailSubject,
        html: emailHtml,
      });
      
      console.log('✅ Contact form email sent successfully!');
      console.log('Send result:', sendResult);
      console.log('Recipient:', recipientEmail);
      
      return c.json({ 
        success: true,
        message: 'Thank you for your message! We will get back to you soon.'
      });
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
      console.error('Error type:', emailError?.constructor?.name);
      console.error('Error message:', emailError instanceof Error ? emailError.message : String(emailError));
      console.error('Error stack:', emailError instanceof Error ? emailError.stack : 'No stack');
      
      // Even if email fails, we've stored the submission
      return c.json({ 
        success: true,
        message: 'Thank you for your message! We will get back to you soon.',
        note: `Email sending failed: ${emailError instanceof Error ? emailError.message : String(emailError)}. Your message has been saved and we will respond as soon as possible.`
      });
    }
  } catch (error) {
    console.error('Contact form error:', error);
    return c.json({ 
      error: 'Server error processing contact form',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get contact form submissions (admin only)
app.get("/make-server-d1fbc049/contact/submissions", async (c) => {
  try {
    const apiKey = c.req.header('X-API-Key');
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const submissions = await kv.get('contact_submissions') || [];
    return c.json(submissions);
  } catch (error) {
    console.error('Get contact submissions error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============= PROFIT MARGIN SETTINGS =============

// Get profit margin settings
app.get("/make-server-d1fbc049/settings/profit-margins", async (c) => {
  try {
    console.log('=== GET PROFIT MARGINS REQUEST ===');
    
    const margins = await kv.get('profit_margins_577b3f26');
    
    // Return saved margins or defaults
    const defaultMargins = {
      under50: 50,
      '50to100': 40,
      '100to500': 30,
      '500to1000': 20,
      '1000to5000': 15,
      over5000: 12
    };
    
    return c.json({ 
      margins: margins || defaultMargins 
    });
  } catch (error) {
    console.error('Get profit margins error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Update profit margin settings
app.put("/make-server-d1fbc049/settings/profit-margins", async (c) => {
  try {
    console.log('=== UPDATE PROFIT MARGINS REQUEST ===');
    
    const { margins } = await c.req.json();
    
    if (!margins) {
      return c.json({ error: 'Missing margins data' }, 400);
    }
    
    console.log('Saving profit margins:', margins);
    
    await kv.set('profit_margins_577b3f26', margins);
    
    console.log('Profit margins saved successfully');
    
    return c.json({ success: true, margins });
  } catch (error) {
    console.error('Update profit margins error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============= UROPA PRICE SYNC =============

// Get Uropa API configuration
app.get("/make-server-d1fbc049/uropa/config", async (c) => {
  try {
    console.log('=== GET UROPA CONFIG REQUEST ===');
    
    const config = await uropa.getConfig();
    
    return c.json({ config });
  } catch (error) {
    console.error('Get Uropa config error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Save Uropa API configuration
app.post("/make-server-d1fbc049/uropa/config", async (c) => {
  try {
    console.log('=== SAVE UROPA CONFIG REQUEST ===');
    
    const { token, apiUrl } = await c.req.json();
    
    if (!token || !apiUrl) {
      return c.json({ error: 'Both token and API URL are required' }, 400);
    }
    
    console.log('Saving Uropa config:', { apiUrl, tokenLength: token.length });
    
    const config = await uropa.saveConfig(token, apiUrl);
    
    return c.json({ success: true, config });
  } catch (error) {
    console.error('Save Uropa config error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete Uropa API configuration
app.delete("/make-server-d1fbc049/uropa/config", async (c) => {
  try {
    console.log('=== DELETE UROPA CONFIG REQUEST ===');
    
    await uropa.deleteConfig();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete Uropa config error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Debug: Check what's stored in KV for Uropa token
app.get("/make-server-d1fbc049/uropa/debug-token", async (c) => {
  try {
    console.log('=== DEBUG UROPA TOKEN REQUEST ===');
    
    // Check all possible token locations
    const kvToken = await kv.get('uropa_api_token');
    const kvConfig = await kv.get('uropa_config_577b3f26');
    const envToken = Deno.env.get('UROPA_API_TOKEN');
    
    console.log('🔍 KV Token:', kvToken ? `${String(kvToken).substring(0, 30)}... (length: ${String(kvToken).length})` : 'null');
    console.log('🔍 KV Config:', kvConfig ? 'EXISTS' : 'null');
    console.log('🔍 Env Token:', envToken ? `${envToken.substring(0, 30)}... (length: ${envToken.length})` : 'null');
    
    return c.json({
      success: true,
      debug: {
        kvToken: kvToken ? {
          exists: true,
          type: typeof kvToken,
          length: String(kvToken).length,
          preview: String(kvToken).substring(0, 50) + '...'
        } : { exists: false },
        kvConfig: kvConfig ? {
          exists: true,
          hasToken: !!kvConfig.token,
          hasApiUrl: !!kvConfig.apiUrl,
          tokenPreview: kvConfig.token ? `${kvConfig.token.substring(0, 50)}...` : 'null',
          apiUrl: kvConfig.apiUrl
        } : { exists: false },
        envToken: envToken ? {
          exists: true,
          length: envToken.length,
          preview: envToken.substring(0, 50) + '...'
        } : { exists: false },
        priorityOrder: [
          '1. KV Storage (uropa_api_token) - User saved via UI',
          '2. Environment Variable (UROPA_API_TOKEN) - Fallback'
        ]
      }
    });
  } catch (error) {
    console.error('Debug token error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Verify Uropa API token
app.post("/make-server-d1fbc049/uropa/verify-token", async (c) => {
  try {
    console.log('=== VERIFY UROPA TOKEN REQUEST ===');
    
    const { token, apiUrl } = await c.req.json();
    
    if (!token || !apiUrl) {
      return c.json({ error: 'Both token and API URL are required' }, 400);
    }
    
    const result = await uropa.verifyToken(token, apiUrl);
    
    return c.json(result);
  } catch (error) {
    console.error('Verify Uropa token error:', error);
    return c.json({ 
      valid: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});

// Analyze database prices
app.get("/make-server-d1fbc049/uropa/analyze-prices", async (c) => {
  try {
    console.log('=== ANALYZE PRICES REQUEST ===');
    
    const analysis = await uropa.analyzePrices();
    
    console.log('Analysis complete:', { total: analysis.total, withPrice: analysis.withPrice });
    
    return c.json(analysis);
  } catch (error) {
    console.error('Analyze prices error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Compare prices with Uropa
app.post("/make-server-d1fbc049/uropa/compare-prices", async (c) => {
  try {
    console.log('=== UROPA PRICE COMPARISON REQUEST ===');
    
    const { codes } = await c.req.json();
    
    console.log('Uropa search params:', { codesCount: codes?.length });
    
    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return c.json({ 
        error: 'Please provide product codes array' 
      }, 400);
    }
    
    const result = await uropa.comparePricesByCode(codes);
    
    console.log('Comparison result:', { 
      total: result.stats.total,
      increased: result.stats.increased,
      decreased: result.stats.decreased
    });
    
    return c.json(result);
  } catch (error) {
    console.error('Uropa comparison error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to compare prices with Uropa',
      details: String(error)
    }, 500);
  }
});

// Update prices from Uropa
app.post("/make-server-d1fbc049/uropa/update-prices", async (c) => {
  try {
    console.log('=== UROPA PRICE UPDATE REQUEST ===');
    
    const { updates } = await c.req.json();
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return c.json({ 
        error: 'No updates provided' 
      }, 400);
    }
    
    console.log('Updating prices for', updates.length, 'products');
    
    const result = await uropa.updateProductPrices(updates);
    
    console.log('Successfully updated', result.updated, 'products');
    
    return c.json(result);
  } catch (error) {
    console.error('Uropa price update error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to update prices',
      details: String(error)
    }, 500);
  }
});

// ============= SHIPPING CALCULATION =============

// Calculate shipping based on postcode, cart total, and product categories
app.post("/make-server-d1fbc049/shipping/calculate", async (c) => {
  try {
    console.log('=== SHIPPING CALCULATION REQUEST ===');
    
    const { postcode, cartTotal, categories } = await c.req.json();
    
    console.log('Shipping calculation params:', { postcode, cartTotal, categoriesCount: categories?.length });
    
    if (!postcode || cartTotal === undefined || !categories) {
      return c.json({ 
        error: 'Missing required fields',
        required: ['postcode', 'cartTotal', 'categories']
      }, 400);
    }
    
    // Calculate shipping using the shipping logic
    const result = calculateShipping(postcode, cartTotal, categories);
    
    console.log('Shipping calculation result:', result);
    
    return c.json(result);
  } catch (error) {
    console.error('Shipping calculation error:', error);
    return c.json({ 
      error: 'Failed to calculate shipping',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Debug route to check what routes are registered
app.get('/debug/routes', (c) => {
  return c.json({
    message: 'Registered routes (edge function strips function name from URL)',
    external: 'https://{project}.supabase.co/functions/v1/make-server-d1fbc049/payment/bank-transfer',
    internal: '/payment/bank-transfer',
    paymentRoutes: ['POST /payment/bank-transfer', 'GET /payment/test'],
  });
});

// Version check endpoint
app.get('/make-server-d1fbc049/version', (c) => {
  return c.json({
    version: 'v2.0-BANK-TRANSFER-FIX',
    deployed: new Date().toISOString(),
    routes: {
      bankTransfer: 'POST /make-server-d1fbc049/payment/bank-transfer (DIRECT ROUTE)',
      test: 'GET /make-server-d1fbc049/test',
    }
  });
});

// Simple test route to verify routing works AT ALL (NO AUTH REQUIRED)
console.log('📝 [SETUP] Registering test route: GET /make-server-d1fbc049/test');
app.get('/make-server-d1fbc049/test', (c) => {
  console.log('✅ [TEST] Test route hit! No auth needed.');
  return c.json({
    status: 'ok',
    message: 'Routing works!',
    timestamp: new Date().toISOString(),
    path: new URL(c.req.url).pathname
  });
});

// DIRECT bank transfer route - bypass sub-router
console.log('📝 [SETUP] Registering DIRECT route: POST /make-server-d1fbc049/payment/bank-transfer');
app.post('/make-server-d1fbc049/payment/bank-transfer', async (c) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏦 [DIRECT] Bank transfer route HIT!');
  console.log('🏦 [DIRECT] Method:', c.req.method);
  console.log('🏦 [DIRECT] URL:', c.req.url);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const orderData = await c.req.json();
    const { generateOrderNumber } = await import('./id_generator.tsx');
    const orderId = await generateOrderNumber();

    const order = {
      id: orderId,
      orderId,
      customerId: orderData.customerId || orderData.customer?.id || null,
      customer: orderData.customer,
      shipping: orderData.shipping ? [orderData.shipping] : [],
      order_items: orderData.items || [],
      items: orderData.items || [],
      subtotal: orderData.subtotal,
      tax_amount: orderData.gst,
      gst: orderData.gst,
      shipping_amount: orderData.shippingCost || 0,
      shippingCost: orderData.shippingCost || 0,
      total: orderData.total,
      total_amount: orderData.total,
      bogoDiscount: orderData.bogoDiscount || 0,
      payment_method: 'Bank Transfer',
      paymentMethod: 'Bank Transfer',
      payment_status: 'pending',
      paymentStatus: 'pending',
      status: 'pending-payment',
      shippingMethod: orderData.shippingMethod,
      shipping_method: orderData.shippingMethod,
      usePickup: orderData.usePickup || false,
      pickupLocation: orderData.pickupLocation || null,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Please transfer funds using Order ID as reference',
    };

    await kv.set(`order:${orderId}`, order);
    const orders = await kv.get('orders') || [];
    orders.push(order);
    await kv.set('orders', orders);

    // Send order confirmation email asynchronously (don't await - fire and forget)
    (async () => {
      try {
        const customerEmail = orderData.customer?.email || orderData.shipping?.email;
        if (customerEmail) {
          console.log('🏦 [DIRECT] Attempting to send order confirmation email to:', customerEmail);
          await sendOrderConfirmationEmail(customerEmail, order);
          console.log('✓ Bank transfer order confirmation email sent to:', customerEmail);
        } else {
          console.warn('⚠️ No customer email found for order:', orderId);
        }
      } catch (emailError) {
        console.error('❌ Failed to send bank transfer confirmation email:', emailError);
        // Email failure doesn't affect the order
      }
    })();

    return c.json({ success: true, orderId, order });
  } catch (error) {
    console.error('🏦 [DIRECT] Error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Mount all routes WITH function name prefix
// External: https://{project}.supabase.co/functions/v1/make-server-d1fbc049/payment/bank-transfer
// Internal path seen by function: /make-server-d1fbc049/payment/bank-transfer
app.route('/make-server-d1fbc049/payment', payment);
app.route('/make-server-d1fbc049/email', email);
app.route('/make-server-d1fbc049/customers', customers);
app.route('/make-server-d1fbc049/pricing', pricing);
app.route('/make-server-d1fbc049/price-sync', priceSync);
app.route('/make-server-d1fbc049/description-sync', descriptionSync);
app.route('/make-server-d1fbc049/specials', specials);
app.route('/make-server-d1fbc049/image-scraper', imageScraper);
app.route('/make-server-d1fbc049/promotions', promotions);
app.route('/make-server-d1fbc049/vouchers', vouchers);
app.route('/', syncProducts);

// Mount business routes
app.route('/make-server-d1fbc049/quotations', quotations);
app.route('/make-server-d1fbc049/invoices', invoices);
app.route('/make-server-d1fbc049/orders', orders);
app.route('/make-server-d1fbc049/reports', reports);
app.route('/make-server-d1fbc049/returns', returns);
app.route('/make-server-d1fbc049/settings', settings);
app.route('/make-server-d1fbc049/pickup-locations', pickupLocations);
app.route('/', menuBrands);
app.route('/make-server-d1fbc049/seo', seo);
registerSitemapRoute(app, kv);
app.route('/make-server-d1fbc049/ai', ai);
app.route('/make-server-d1fbc049/legal', legal);
app.route('/make-server-d1fbc049/cms', cms);
app.route('/make-server-d1fbc049/import-simco', importSimco);

// Legacy CMS routes for About page (kept for backwards compatibility)
app.get('/make-server-d1fbc049/cms/about', async (c) => {
  try {
    const about = await kv.get('about_page_content');
    return c.json({ about: about || null });
  } catch (error) {
    console.error('Get about page error:', error);
    return c.json({ error: 'Failed to get about page content' }, 500);
  }
});

app.put('/make-server-d1fbc049/cms/about', async (c) => {
  try {
    const { about } = await c.req.json();
    await kv.set('about_page_content', about);
    console.log('About page content saved successfully');
    return c.json({ success: true });
  } catch (error) {
    console.error('Save about page error:', error);
    return c.json({ error: 'Failed to save about page content' }, 500);
  }
});

// Simple HTML content format for About page (like legal pages)
app.get('/make-server-d1fbc049/cms/about-content', async (c) => {
  try {
    const aboutContent = await kv.get('about_page_html_content');

    if (aboutContent) {
      return c.json({
        success: true,
        content: aboutContent.content,
        lastUpdated: aboutContent.lastUpdated
      });
    } else {
      return c.json({
        success: true,
        content: '',
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Get about content error:', error);
    return c.json({ error: 'Failed to get about page content' }, 500);
  }
});

app.post('/make-server-d1fbc049/cms/about-content', async (c) => {
  try {
    const { content, lastUpdated } = await c.req.json();

    await kv.set('about_page_html_content', {
      content,
      lastUpdated: lastUpdated || new Date().toISOString()
    });

    console.log('About page HTML content saved successfully');
    return c.json({ success: true });
  } catch (error) {
    console.error('Save about content error:', error);
    return c.json({ error: 'Failed to save about page content' }, 500);
  }
});

// Sitemap available at /seo/sitemap.xml (28 URLs: pages, brands, categories)

// ============= ROOT-LEVEL SEO FILES (for direct browser/SEO tool access) =============
// OLD: Serve sitemap.xml from KV store (kept as fallback, but registerSitemapRoute above takes precedence)
app.get('/make-server-d1fbc049/sitemap.xml.old', async (c) => {
  console.log('=== SERVE ROOT SITEMAP ===');
  try {
    const sitemap = await kv.get('sitemap_xml');
    
    if (!sitemap) {
      console.log('⚠️ Sitemap not found in KV store');
      return c.text('Sitemap not generated yet. Please generate it in Admin → SEO Manager → Sitemap tab.', 404);
    }

    console.log(`✅ Serving sitemap (${sitemap.length} bytes)`);
    
    // Use Hono's context methods for proper header handling
    c.header('Content-Type', 'application/xml; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=3600');
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Content-Disposition', 'inline; filename="sitemap.xml"');
    
    return c.body(sitemap);
  } catch (error) {
    console.error('❌ Serve root sitemap error:', error);
    return c.text('Error serving sitemap', 500);
  }
});

// Serve robots.txt at root level for SEO
app.get('/make-server-d1fbc049/robots.txt', async (c) => {
  console.log('=== SERVE ROOT ROBOTS.TXT ===');
  try {
    const settings = await kv.get('seo_settings');
    const robotsTxt = settings?.robotsTxt || `User-agent: *
Allow: /
Disallow: /admin
Disallow: /checkout
Disallow: /cart

Sitemap: https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap.xml`;

    return new Response(robotsTxt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('❌ Serve root robots.txt error:', error);
    return c.text('Error serving robots.txt', 500);
  }
});

// ============= DEBUG ENDPOINT =============
// Get raw product data from database for debugging
app.get("/make-server-d1fbc049/debug/product/:code", async (c) => {
  try {
    const code = c.req.param('code');
    console.log(`🔍 [Debug] Looking up product: ${code}`);
    
    // Find the product
    const allProducts = await kv.getByPrefix('products:');
    const product = allProducts.find((p: any) => 
      p.code === code || 
      p.productCode === code || 
      p.sku === code
    );
    
    if (!product) {
      return c.json({
        success: false,
        error: `Product not found with code: ${code}`
      }, 404);
    }
    
    // Return raw product data
    return c.json({
      success: true,
      product: product,
      pricing: {
        price: product.price,
        sellingPrice: product.sellingPrice,
        sellPrice: product.sellPrice,
        salePrice: product.salePrice,
        baseCost: product.baseCost,
        costPrice: product.costPrice,
        tradePrice: product.tradePrice
      },
      timestamps: {
        lastManualUpdate: product.lastManualUpdate,
        lastPriceUpdate: product.lastPriceUpdate,
        lastBulkUpdate: product.lastBulkUpdate
      }
    });
  } catch (error) {
    console.error('Debug product error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Catch-all route for 404s - MUST be last
app.notFound((c) => {
  const url = new URL(c.req.url);
  console.error('❌ [404] Route not found:', {
    method: c.req.method,
    path: url.pathname,
    fullUrl: c.req.url,
  });

  return c.json({
    error: 'Route not found',
    path: c.req.url,
    method: c.req.method,
    receivedPath: url.pathname,
    availableRoutes: [
      'POST /make-server-d1fbc049/payment/bank-transfer (DIRECT)',
    ]
  }, 404);
});

// Global error handler
app.onError((err, c) => {
  console.error('Global error handler caught error:', err);
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);
  
  // Return a proper response to prevent connection hanging
  return c.json({ 
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  }, 500);
});

// Export the app for edge function usage
export { app };

// Only start standalone server if not imported as a module
// Edge functions will import app and serve it themselves
if (import.meta.main) {
  // Start server with proper error handling
  console.log('🚀 Starting Hono server on Deno...');
  console.log('📍 Server routes configured for prefix: /make-server-d1fbc049');
  console.log('📦 Server version: 2.0.0 - Deployment trigger');

  Deno.serve({
  port: 8000,
  onListen: ({ hostname, port }) => {
    console.log(`✅ Server listening on http://${hostname}:${port}`);
  },
  onError: (error) => {
    // Check if this is a client disconnection error (normal behavior)
    const errorMessage = String(error);
    const errorName = error?.name || '';
    
    if (errorMessage.includes('connection closed') || 
        errorMessage.includes('broken pipe') ||
        errorMessage.includes('EPIPE') ||
        errorName === 'Http' ||
        errorMessage.includes('writing a body to connection')) {
      // Client disconnected - this is NORMAL, don't log as error
      // (happens when users close tabs, navigate away, network issues, etc.)
      return new Response(null, { status: 499 }); // 499 = Client Closed Request
    }
    
    // Only log actual server errors
    console.error('❌ Deno server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  },
}, app.fetch);
}