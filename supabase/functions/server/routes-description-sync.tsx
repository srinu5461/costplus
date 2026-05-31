/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRODUCT DESCRIPTION & FEATURES SYNC SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Fetches product descriptions, specifications, images, and age restriction from Uropa API
 *
 * 📖 DATA FIELDS TO SYNC (ONLY THESE 4):
 *
 * 1️⃣  DESCRIPTION:
 *     - API Field: description
 *     - Store as: description
 *
 * 2️⃣  SPECIFICATIONS (from attributes):
 *     - API Field: attributes[] (filtered by fieldType)
 *     - Store as: specifications (formatted array)
 *
 * 3️⃣  IMAGES:
 *     - API Field: images[] (array of objects with url field)
 *     - Store as: images (array of image URLs)
 *
 * 4️⃣  AGE RESTRICTED:
 *     - API Field: ageRestricted
 *     - Store as: ageRestricted
 *
 * ⚠️ IMPORTANT: Does NOT modify prices or other fields!
 *
 * 🔄 SYNC ENDPOINTS:
 *     • GET /description-sync/products?brand={brand}&page={page}&limit={limit} - Get products list
 *     • POST /description-sync/test - Check products (no update)
 *     • POST /description-sync/run - Batch sync with 50 products limit
 *     • POST /description-sync/single/:code - Sync single product
 *     • GET /description-sync/debug/:productId - Debug single product data
 *     • GET /description-sync/test-uropa/:code - Test Uropa API directly (returns raw response)
 *     • GET /description-sync/test-token - Test if Uropa API token is valid
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';

const descriptionSync = new Hono();

const UROPA_API_BASE = 'https://p1-api.nisbets.com.au/occ/v2/uropa-au';

// Helper to strip HTML tags and decode entities
function stripHtml(html: string): string {
  if (!html) return '';
  
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '...')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™');
  
  // Clean up multiple spaces and trim
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// Helper to sanitize HTML (keep safe HTML, remove scripts/styles)
function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Remove script tags and their content
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove style tags and their content
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove event handlers (onclick, onload, etc.)
  clean = clean.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\son\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  clean = clean.replace(/javascript:/gi, '');
  
  // 🔥 PRODUCTION FIX: Clean up excessive line breaks and spacing
  // Replace multiple consecutive <br> tags with a single one
  clean = clean.replace(/(<br\s*\/?>[\s\n]*){3,}/gi, '<br>');
  
  // Replace multiple consecutive newlines with a single newline
  clean = clean.replace(/\n{3,}/g, '\n\n');
  
  // Clean up excessive spaces (but preserve intentional spacing)
  clean = clean.replace(/ {3,}/g, '  ');
  
  return clean.trim();
}

// Helper to format Authorization header
function formatAuthHeader(token: string): string {
  return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
}

// Helper to get Uropa API token (same as price sync)
async function getToken(): Promise<string> {
  try {
    console.log('🔍 [getToken] Checking KV storage for uropa_api_token...');
    const savedToken = await kv.get('uropa_api_token');
    
    if (savedToken && typeof savedToken === 'string' && savedToken.length > 0) {
      console.log('✅ [getToken] Using token from KV storage');
      return savedToken;
    }
  } catch (error) {
    console.warn('❌ [getToken] Could not check KV store for token:', error);
  }
  
  // Fallback to environment variable
  const envToken = Deno.env.get('UROPA_API_TOKEN');
  if (envToken) {
    console.log('🔑 [getToken] Using UROPA_API_TOKEN from environment variable');
    return envToken;
  }
  
  console.error('⛔ [getToken] No token found!');
  return '';
}

// ============================================
// 🔥 SHARED FUNCTION: Fetch product data from Uropa API
// ============================================
// This function is used by ALL sync endpoints to ensure consistent results
async function fetchProductFromUropa(productCode: string, token: string, timeoutMs = 5000): Promise<{
  description: string;
  specifications: Array<{ name: string; value: any; type: string }>;
  ageRestricted: boolean;
  images: string[];
  rawProduct: any;
}> {
  const headers = {
    'Authorization': formatAuthHeader(token),
    'Content-Type': 'application/json'
  };
  
  // 🔥 ALWAYS use carousel endpoint - it returns complete attribute data
  const uropaUrl = `${UROPA_API_BASE}/productRecommendations/productCarousel?vatToggle=EXVAT&productCodes=${productCode}&productIds=${productCode}&slotName=homeRecsTop&lang=en&curr=AUD`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  const response = await fetch(uropaUrl, { 
    method: 'GET', 
    headers,
    signal: controller.signal 
  });
  clearTimeout(timeoutId);
  
  if (!response.ok) {
    throw new Error(`Uropa API error: ${response.status} ${response.statusText}`);
  }
  
  const uropaResponse = await response.json();
  const uropaProduct = uropaResponse.products?.[0] || uropaResponse;
  
  // 🔍 DEBUG: Log what we received
  console.log(`🔍 [fetchProductFromUropa] ${productCode} - Uropa Response:`, {
    hasDescription: !!uropaProduct.description,
    hasAttributes: !!uropaProduct.attributes,
    attributesCount: uropaProduct.attributes?.length || 0,
    attributeTypes: [...new Set(uropaProduct.attributes?.map((a: any) => a.fieldType) || [])],
    ageRestricted: uropaProduct.ageRestricted,
  });
  
  // Extract description
  const rawDescription = uropaProduct.description || '';
  const rawSummary = uropaProduct.summary || '';
  
  // Combine description and summary
  let combinedDescription = '';
  if (rawDescription && rawSummary && rawDescription !== rawSummary) {
    combinedDescription = `${rawDescription}\n\n${rawSummary}`;
  } else if (rawDescription) {
    combinedDescription = rawDescription;
  } else if (rawSummary) {
    combinedDescription = rawSummary;
  }
  
  const description = combinedDescription ? sanitizeHtml(combinedDescription) : '';
  
  // Extract age restriction
  const ageRestricted = uropaProduct.ageRestricted === true;
  
  // Extract specifications from attributes
  const allAttributes = uropaProduct.attributes || [];
  
  // 🔥 CRITICAL: Use EXACT filter logic - this determines what specs we get!
  const specifications = allAttributes
    .filter((a: any) => {
      const validTypes = ['COMPARISONDATA', 'ATTRIBUTESDATA', 'FACETDATA'];
      return validTypes.includes(a.fieldType) && a.value;
    })
    .map((attr: any) => {
      const rawValue = attr.value || '';
      const cleanValue = typeof rawValue === 'string' ? sanitizeHtml(rawValue) : rawValue;
      
      return {
        name: attr.fieldName || attr.fieldCode || attr.name || attr.code,
        value: cleanValue,
        type: attr.fieldType,
      };
    });
  
  console.log(`✅ [fetchProductFromUropa] ${productCode} - Extracted ${specifications.length} specifications`);

  // Extract ONLY unique image URLs (no duplicates)
  const images: string[] = [];
  const seenUrls = new Set<string>();

  if (Array.isArray(uropaProduct.images) && uropaProduct.images.length > 0) {
    uropaProduct.images.forEach((img: any) => {
      if (typeof img === 'object' && img.url && !seenUrls.has(img.url)) {
        seenUrls.add(img.url);
        images.push(img.url);
      }
    });
  }

  console.log(`✅ [fetchProductFromUropa] ${productCode} - Extracted ${images.length} unique image URLs (removed duplicates)`);

  return {
    description,
    specifications,
    ageRestricted,
    images,
    rawProduct: uropaProduct,
  };
}

interface DescriptionSyncLog {
  timestamp: string;
  totalProducts: number;
  productsChecked: number;
  descriptionsUpdated: number;
  specificationsUpdated: number;
  ageRestrictedUpdated: number;
  errors: number;
  duration: number;
  status: 'success' | 'partial' | 'error';
  errorDetails?: string[];
  updates?: Array<{
    productId: string;
    productName: string;
    productCode: string;
    updatedFields: string[];
    hadDescription: boolean;
    hadSpecifications: boolean;
    hadAgeRestricted: boolean;
  }>;
}

// ============================================
// GET /description-sync/compare/:productId - Compare database vs Uropa
// ============================================
descriptionSync.get('/compare/:productId', async (c) => {
  try {
    const productIdOrCode = c.req.param('productId');
    console.log(`📊 [Compare] Comparing database vs Uropa for product: ${productIdOrCode}`);
    
    const productCode = productIdOrCode;
    console.log(`✅ [Compare] Using product code: ${productCode}`);

    // 🔥 STEP 1: Fetch from DATABASE (only valid products)
    const allProducts = await kv.getProducts();
    const dbProduct = allProducts.find((p: any) =>
      p.code === productCode ||
      p.productCode === productCode || 
      p.sku === productCode
    );
    
    if (!dbProduct) {
      return c.json({ error: `Product ${productCode} not found in database` }, 404);
    }
    
    // 🔥 STEP 2: Fetch from UROPA
    const token = await getToken();
    if (!token) {
      return c.json({ error: 'Uropa API token not configured' }, 400);
    }
    
    const uropaData = await fetchProductFromUropa(productCode, token, 10000);
    
    // 🔥 STEP 3: Build comparison
    
    // Helper: Compare specifications arrays properly (ignore property order)
    const specificationsMatch = (db: any[], uropa: any[]) => {
      if (db.length !== uropa.length) return false;
      
      // Sort both arrays by name for consistent comparison
      const sortedDb = [...db].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      const sortedUropa = [...uropa].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      // Compare each specification
      for (let i = 0; i < sortedDb.length; i++) {
        const dbSpec = sortedDb[i];
        const uropaSpec = sortedUropa[i];
        
        // Compare the actual data (name, value, type) regardless of property order
        if (dbSpec.name !== uropaSpec.name ||
            dbSpec.value !== uropaSpec.value ||
            dbSpec.type !== uropaSpec.type) {
          return false;
        }
      }
      
      return true;
    };
    
    const dbSpecs = dbProduct.specifications || [];
    const uropaSpecs = uropaData.specifications;
    
    const comparison = {
      description: {
        database: {
          value: dbProduct.description || '',
          length: (dbProduct.description || '').length,
          exists: !!(dbProduct.description || '').trim(),
        },
        uropa: {
          value: uropaData.description,
          length: uropaData.description.length,
          exists: !!uropaData.description.trim(),
        },
        different: (dbProduct.description || '') !== uropaData.description,
      },
      specifications: {
        database: {
          value: dbSpecs,
          count: dbSpecs.length,
          exists: !!dbSpecs.length,
        },
        uropa: {
          value: uropaSpecs,
          count: uropaSpecs.length,
          exists: !!uropaSpecs.length,
        },
        different: !specificationsMatch(dbSpecs, uropaSpecs),
      },
      ageRestricted: {
        database: dbProduct.ageRestricted || false,
        uropa: uropaData.ageRestricted,
        different: (dbProduct.ageRestricted || false) !== uropaData.ageRestricted,
      },
    };
    
    // Build update summary
    const wouldUpdate: string[] = [];
    
    if (comparison.description.different) {
      if (comparison.description.uropa.exists) {
        wouldUpdate.push(`✏️  Description: Would UPDATE (DB: ${comparison.description.database.length} chars → Uropa: ${comparison.description.uropa.length} chars)`);
      } else {
        wouldUpdate.push(`❌ Description: Uropa has no content (DB has ${comparison.description.database.length} chars)`);
      }
    } else {
      wouldUpdate.push(`✅ Description: Already in sync (${comparison.description.database.length} chars)`);
    }
    
    if (comparison.specifications.different) {
      if (comparison.specifications.uropa.exists) {
        wouldUpdate.push(`✏️  Specifications: Would UPDATE (DB: ${comparison.specifications.database.count} items → Uropa: ${comparison.specifications.uropa.count} items)`);
      } else {
        wouldUpdate.push(`❌ Specifications: Uropa has no attributes (DB has ${comparison.specifications.database.count} items)`);
      }
    } else {
      wouldUpdate.push(`✅ Specifications: Already in sync (${comparison.specifications.database.count} items)`);
    }
    
    if (comparison.ageRestricted.different) {
      wouldUpdate.push(`✏️  Age Restricted: Would UPDATE (DB: ${comparison.ageRestricted.database} → Uropa: ${comparison.ageRestricted.uropa})`);
    } else {
      wouldUpdate.push(`✅ Age Restricted: Already in sync (${comparison.ageRestricted.database})`);
    }
    
    return c.json({
      success: true,
      productCode,
      productName: dbProduct.name,
      database: {
        description: comparison.description.database.value,
        descriptionLength: comparison.description.database.length,
        specifications: comparison.specifications.database.value,
        specificationsCount: comparison.specifications.database.count,
        ageRestricted: comparison.ageRestricted.database,
      },
      uropa: {
        description: comparison.description.uropa.value,
        descriptionLength: comparison.description.uropa.length,
        specifications: comparison.specifications.uropa.value,
        specificationsCount: comparison.specifications.uropa.count,
        ageRestricted: comparison.ageRestricted.uropa,
        attributesCount: uropaData.rawProduct.attributes?.length || 0,
      },
      comparison: {
        descriptionDifferent: comparison.description.different,
        specificationsDifferent: comparison.specifications.different,
        ageRestrictedDifferent: comparison.ageRestricted.different,
        anyDifference: comparison.description.different || comparison.specifications.different || comparison.ageRestricted.different,
      },
      wouldUpdate,
      fullUropaProduct: uropaData.rawProduct,
    });
    
  } catch (error) {
    console.error('❌ [Compare] Error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// GET /description-sync/test-token - Test if Uropa API token is valid
// ============================================
descriptionSync.get('/test-token', async (c) => {
  try {
    console.log('🔑 [Test Token] Checking Uropa API token...');
    
    const token = await getToken();
    
    if (!token) {
      return c.json({
        hasToken: false,
        source: 'none',
        tokenLength: 0,
        error: 'No token found in KV storage or environment',
      });
    }
    
    const headers = {
      'Authorization': formatAuthHeader(token),
      'Content-Type': 'application/json'
    };
    
    // Test with a simple product endpoint
    const testUrl = `${UROPA_API_BASE}/productRecommendations/productCarousel?vatToggle=EXVAT&productCodes=CB734&productIds=CB734&slotName=homeRecsTop&lang=en&curr=AUD`;
    
    console.log('🔑 Testing URL:', testUrl);
    console.log('🔑 Auth header:', formatAuthHeader(token).substring(0, 30) + '...');
    
    const testResponse = await fetch(testUrl, { method: 'GET', headers });
    
    console.log('🔑 Test response status:', testResponse.status);
    
    return c.json({
      hasToken: true,
      source: 'environment or KV',
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...',
      testUrl,
      testStatus: testResponse.status,
      testStatusText: testResponse.statusText,
      testOk: testResponse.ok,
      error: !testResponse.ok ? `Token test failed with status ${testResponse.status}` : null,
    });
    
  } catch (error) {
    console.error('❌ [Test Token] Error:', error);
    return c.json({ 
      hasToken: false,
      error: String(error) 
    }, 500);
  }
});

// ============================================
// GET /description-sync/test-uropa/:code - Test Uropa API directly (returns raw response)
// ============================================
descriptionSync.get('/test-uropa/:code', async (c) => {
  try {
    const productCode = c.req.param('code');
    console.log(`🌐 [Test Uropa API] Testing product: ${productCode}`);

    const token = await getToken();
    if (!token) {
      return c.json({ error: 'Uropa API token not configured' }, 400);
    }

    const headers = {
      'Authorization': formatAuthHeader(token),
      'Content-Type': 'application/json'
    };

    // Fetch from Uropa carousel endpoint
    const uropaUrl = `${UROPA_API_BASE}/productRecommendations/productCarousel?vatToggle=EXVAT&productCodes=${productCode}&productIds=${productCode}&slotName=homeRecsTop&lang=en&curr=AUD`;
    console.log(`🌐 Fetching: ${uropaUrl}`);

    const response = await fetch(uropaUrl, { method: 'GET', headers });

    if (!response.ok) {
      return c.json({
        error: `Uropa API error: ${response.status}`,
        url: uropaUrl,
      }, response.status);
    }

    const uropaResponse = await response.json();
    const uropaProduct = uropaResponse.products?.[0] || uropaResponse;

    // Extract specs
    const allAttributes = uropaProduct.attributes || [];
    const comparisonData = allAttributes.filter((a: any) =>
      a.fieldType === 'COMPARISONDATA' && a.isFeature === true
    );

    // 🔥 ENSURE BOOLEAN: Convert to proper boolean (not truthy/falsy)
    const uropaAgeRestricted = uropaProduct.ageRestricted === true;

    // 🖼️ EXTRACT IMAGE DATA - Check all possible image fields
    const imageFields = {
      images: uropaProduct.images,
      imagesType: typeof uropaProduct.images,
      imagesIsArray: Array.isArray(uropaProduct.images),
      imagesLength: Array.isArray(uropaProduct.images) ? uropaProduct.images.length : 0,
      firstImage: Array.isArray(uropaProduct.images) ? uropaProduct.images[0] : null,
      primaryImageUrl: uropaProduct.primaryImageUrl,
      image: uropaProduct.image,
      thumbnail: uropaProduct.thumbnail,
      imageUrl: uropaProduct.imageUrl,
      galleryImages: uropaProduct.galleryImages,
    };

    // Parse images array structure
    let parsedImages: any[] = [];
    if (Array.isArray(uropaProduct.images) && uropaProduct.images.length > 0) {
      parsedImages = uropaProduct.images.map((img: any) => {
        if (typeof img === 'string') {
          return { type: 'string', url: img };
        } else if (typeof img === 'object') {
          return {
            type: 'object',
            fields: Object.keys(img),
            galleryUrl: img.galleryUrl,
            url: img.url,
            imageUrl: img.imageUrl,
            superZoom: img.superZoom,
            zoom: img.zoom,
            product: img.product,
            thumbnail: img.thumbnail,
            fullObject: img
          };
        }
        return { type: typeof img, value: img };
      });
    }

    // Return full response for inspection
    return c.json({
      success: true,
      productCode,
      url: uropaUrl,
      description: uropaProduct.description,
      descriptionLength: uropaProduct.description?.length || 0,
      descriptionPreview: uropaProduct.description?.substring(0, 200),
      ageRestricted: uropaAgeRestricted,
      ageRestrictedRaw: uropaProduct.ageRestricted,
      ageRestrictedType: typeof uropaProduct.ageRestricted,
      attributesCount: allAttributes.length,
      comparisonDataCount: comparisonData.length,
      sampleAttributes: allAttributes.slice(0, 3),
      sampleComparisonData: comparisonData.slice(0, 3),
      imageFields, // 🖼️ All image-related fields
      parsedImages, // 🖼️ Detailed breakdown of images array
      fullResponse: uropaProduct, // Full raw response
    });

  } catch (error) {
    console.error('❌ [Test Uropa API] Error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// GET /description-sync/debug/:productId - Debug single product data
// ============================================
descriptionSync.get('/debug/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');
    
    console.log(`🔍 [Description Sync Debug] Fetching product: ${productId}`);
    
    // Get product from database
    const product = await kv.get(`products:${productId}`);
    
    if (!product) {
      return c.json({ 
        error: 'Product not found',
        productId,
      }, 404);
    }
    
    return c.json({
      success: true,
      productId,
      productCode: product.code || product.productCode || product.sku,
      productName: product.name,
      data: {
        description: product.description,
        descriptionLength: product.description?.length || 0,
        descriptionPreview: product.description?.substring(0, 200),
        specifications: product.specifications,
        specificationsCount: Array.isArray(product.specifications) ? product.specifications.length : 0,
        ageRestricted: product.ageRestricted === true, // ✅ Ensure boolean
        ageRestrictedRaw: product.ageRestricted, // Show raw value for debugging
        ageRestrictedType: typeof product.ageRestricted,
        lastDescriptionSync: product.lastDescriptionSync,
      },
      fullProduct: product, // Return full product for inspection
    });
    
  } catch (error) {
    console.error('❌ [Description Sync Debug] Error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// GET /description-sync/brands - Get all brands
// ============================================
descriptionSync.get('/brands', async (c) => {
  try {
    console.log(`📋 [Description Sync] Fetching all brands...`);

    // Get only valid products (excludes sections/categories/metadata)
    const allProducts = await kv.getProducts();
    console.log(`📦 [Description Sync] Total valid products in database: ${allProducts.length}`);
    
    // Extract unique brands
    const brands = [...new Set(allProducts.map((p: any) => p.brand || p.manufacturer).filter(Boolean))].sort();
    
    console.log(`✅ [Description Sync] Found ${brands.length} unique brands`);
    
    return c.json({
      success: true,
      brands,
      totalBrands: brands.length,
      totalProducts: allProducts.length,
    });
    
  } catch (error) {
    console.error('❌ [Description Sync] Error fetching brands:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// GET /description-sync/products - Get products list with filters
// ============================================
descriptionSync.get('/products', async (c) => {
  try {
    const brand = c.req.query('brand') || '';
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 1000); // Cap at 1000 to prevent timeout
    const skipWithDescription = c.req.query('skipWithDescription') === 'true';
    
    console.log(`📋 [Description Sync] Fetching products - Brand: ${brand || 'All'}, Page: ${page}, Limit: ${limit}`);

    // Get only valid products (excludes sections/categories/metadata)
    const allProducts = await kv.getProducts();
    console.log(`📦 [Description Sync] Total valid products in database: ${allProducts.length}`);
    
    // Filter by brand if specified
    let filteredProducts = allProducts;
    if (brand) {
      filteredProducts = allProducts.filter((p: any) => 
        (p.brand || p.manufacturer || '').toLowerCase() === brand.toLowerCase()
      );
      console.log(`🏷️ [Description Sync] Filtered by brand "${brand}": ${filteredProducts.length} products`);
    }
    
    // Skip products that already have description if requested
    if (skipWithDescription) {
      filteredProducts = filteredProducts.filter((p: any) => 
        !p.description || p.description.trim().length < 20
      );
      console.log(`📝 [Description Sync] Filtered without description: ${filteredProducts.length} products`);
    }
    
    // Calculate pagination
    const totalProducts = filteredProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    // Get unique brands for filter dropdown
    const brands = [...new Set(allProducts.map((p: any) => p.brand || p.manufacturer).filter(Boolean))].sort();
    
    console.log(`✅ [Description Sync] Returning ${paginatedProducts.length} products (page ${page}/${totalPages})`);
    
    return c.json({
      success: true,
      products: paginatedProducts.map((p: any) => ({
        id: p.id,
        code: p.code || p.productCode || p.sku,
        name: p.name,
        brand: p.brand || p.manufacturer,
        hasDescription: !!(p.description && p.description.length >= 20),
        hasSpecifications: !!(p.specifications && p.specifications.length > 0),
        ageRestricted: p.ageRestricted || false,
        descriptionLength: p.description?.length || 0,
        specificationsCount: p.specifications?.length || 0,
        lastDescriptionSync: p.lastDescriptionSync || null,
      })),
      pagination: {
        page,
        limit,
        totalProducts,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        brand,
        skipWithDescription,
        availableBrands: brands,
      }
    });
    
  } catch (error) {
    console.error('❌ [Description Sync] Error fetching products:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// POST /description-sync/batch - Batch sync with options  
// ============================================
descriptionSync.post('/batch', async (c) => {
  const startTime = Date.now();
  
  try {
    const body = await c.req.json();
    const { productCodes, skipWithDescription, forceUpdate } = body;
    
    if (!productCodes || !Array.isArray(productCodes) || productCodes.length === 0) {
      return c.json({ error: 'Product codes array required' }, 400);
    }
    
    // Limit to 50 products per batch
    const limitedCodes = productCodes.slice(0, 50);
    if (productCodes.length > 50) {
      console.log(`⚠️ [Description Sync Batch] Limiting from ${productCodes.length} to 50 products`);
    }
    
    console.log(`📝 [Description Sync Batch] Syncing ${limitedCodes.length} products... ${forceUpdate ? '(FORCE MODE)' : ''}`);
    
    const token = await getToken();
    if (!token) {
      return c.json({ error: 'Uropa API token not configured' }, 400);
    }
    
    const headers = {
      'Authorization': formatAuthHeader(token),
      'Content-Type': 'application/json'
    };
    
    // 🔥 NO LONGER LOADING ALL PRODUCTS - get them individually as needed
    
    const results: any[] = [];
    let descriptionsUpdated = 0;
    let specificationsUpdated = 0;
    let ageRestrictedUpdated = 0;
    let imagesUpdated = 0;
    let skipped = 0;
    let errors = 0;
    
    // 🔥 PARALLEL PROCESSING: Process 5 products at a time to speed up
    const PARALLEL_LIMIT = 5;
    for (let i = 0; i < limitedCodes.length; i += PARALLEL_LIMIT) {
      const batch = limitedCodes.slice(i, i + PARALLEL_LIMIT);
      console.log(`🔄 Processing batch ${Math.floor(i / PARALLEL_LIMIT) + 1}/${Math.ceil(limitedCodes.length / PARALLEL_LIMIT)} (${batch.length} products)...`);
      
      await Promise.all(batch.map(async (productCode) => {
        try {
          // 🔥 Get product directly by code (much faster than loading all products)
          const product = await kv.get(`products:${productCode}`);

          if (!product) {
            console.log(`⚠️ [Batch Sync] Product not found: ${productCode}`);
            results.push({
              productCode,
              error: 'Product not found in database',
              skipped: true,
            });
            skipped++;
            return;
          }

          // 🔥 Validate that it's an actual product, not metadata
          if (!kv.isValidProduct(product)) {
            console.log(`⚠️ [Batch Sync] Skipping non-product entry: ${productCode} (sections/metadata)`);
            results.push({
              productCode,
              error: 'Not a valid product (sections/categories/metadata)',
              skipped: true,
            });
            skipped++;
            return;
          }
          
          // 🔥 ONLY skip if skipWithDescription is true AND forceUpdate is false
          if (skipWithDescription && !forceUpdate && product.description && product.description.length >= 20) {
            console.log(`⏭️ [Description Sync Batch] Skipping ${productCode} - already has description`);
            results.push({
              productCode,
              productName: product.name,
              skipped: true,
              reason: 'Already has description',
            });
            skipped++;
            return;
          }
          
          // 🔥 USE SHARED FUNCTION - guarantees same logic as /compare endpoint!
          let uropaData;
          try {
            uropaData = await fetchProductFromUropa(productCode, token, 5000);
          } catch (error) {
            results.push({
              productCode,
              productName: product.name,
              error: String(error),
            });
            errors++;
            return;
          }
          
          // 🔥 Extract data from shared function (guarantees same logic as /compare!)
          const uropaDescription = uropaData.description;
          const specifications = uropaData.specifications;
          const uropaAgeRestricted = uropaData.ageRestricted;
          const uropaImages = uropaData.images;

          // 🔍 DEBUG: Log what we extracted
          console.log(`🔍 [Batch Sync] ${productCode} - Extracted Data:`, {
            descriptionLength: uropaDescription.length,
            specificationsCount: specifications.length,
            ageRestricted: uropaAgeRestricted,
            imagesCount: uropaImages.length,
            allSpecifications: specifications,
          });
          
          // 🔥 TRACK WHAT ACTUALLY CHANGED
          const updatedFields: string[] = [];

          // Track description update if we have one from Uropa
          if (uropaDescription && uropaDescription.length > 0) {
            updatedFields.push('description');
          }

          // Track specifications update if we have any from Uropa
          if (specifications && specifications.length > 0) {
            updatedFields.push('specifications');
          }

          // Track age restriction update if it changed (or is being set for the first time)
          const currentAgeRestricted = product.ageRestricted === true;
          if (uropaAgeRestricted !== currentAgeRestricted) {
            updatedFields.push('ageRestricted');
          }

          // Track images update if we have any from Uropa
          if (uropaImages && uropaImages.length > 0) {
            updatedFields.push('images');
          }

          console.log(`✅ [Batch Sync] ${productCode} - Updating: ${updatedFields.join(', ')}`);

          // 🔥 UPDATE: Just update the target fields, keep everything else
          const updatedProduct = {
            ...product, // Keep ALL existing fields
            description: uropaDescription || product.description,
            specifications: specifications.length > 0 ? specifications : product.specifications,
            ageRestricted: uropaAgeRestricted,
            images: uropaImages.length > 0 ? uropaImages : product.images,
            lastDescriptionSync: new Date().toISOString(),
          };

          // 🔍 DEBUG: Log EXACTLY what we're saving
          console.log(`💾 [Batch Sync] ${productCode} - SAVING TO DATABASE:`, {
            productCode,
            descriptionLength: updatedProduct.description?.length || 0,
            specificationsCount: updatedProduct.specifications?.length || 0,
            specificationsPreview: updatedProduct.specifications?.slice(0, 3) || [],
            ageRestricted: updatedProduct.ageRestricted,
            imagesCount: updatedProduct.images?.length || 0,
            imagesPreview: updatedProduct.images?.slice(0, 2) || [],
            allFields: Object.keys(updatedProduct),
          });

          // 🔥 CRITICAL: Save using productCode (not product.id) to ensure we save to the same key we read from
          await kv.set(`products:${productCode}`, updatedProduct);
          
          // 🔍 VERIFY: Read back what we just saved to confirm it's correct
          const verifyRead = await kv.get(`products:${productCode}`);
          console.log(`✅ [Batch Sync] ${productCode} - VERIFIED READ BACK:`, {
            specificationsCount: verifyRead?.specifications?.length || 0,
            specificationsMatch: JSON.stringify(verifyRead?.specifications) === JSON.stringify(updatedProduct.specifications),
          });
          
          results.push({
            productCode,
            productName: product.name,
            updatedFields,
            success: true,
            improvements: {
              description: updatedFields.includes('description') ? {
                before: product.description?.length || 0,
                after: uropaDescription.length,
                gain: uropaDescription.length - (product.description?.length || 0),
              } : null,
              specifications: updatedFields.includes('specifications') ? {
                before: product.specifications?.length || 0,
                after: specifications.length,
                gain: specifications.length - (product.specifications?.length || 0),
              } : null,
              images: updatedFields.includes('images') ? {
                before: product.images?.length || 0,
                after: uropaImages.length,
                gain: uropaImages.length - (product.images?.length || 0),
              } : null,
            },
          });

          console.log(`✅ [Description Sync Batch] Updated ${productCode}: ${updatedFields.join(', ')}`);

          // Track counts for summary
          if (updatedFields.includes('description')) descriptionsUpdated++;
          if (updatedFields.includes('specifications')) specificationsUpdated++;
          if (updatedFields.includes('ageRestricted')) ageRestrictedUpdated++;
          if (updatedFields.includes('images')) imagesUpdated++;
          
          // 🔥 NO DELAY - parallel processing handles rate limiting
          
        } catch (error) {
          const errorMessage = error instanceof Error && error.name === 'AbortError' 
            ? 'Request timeout (>5s)'
            : String(error);
          
          results.push({
            productCode,
            error: errorMessage,
          });
          errors++;
          console.error(`❌ [Description Sync Batch] Error for ${productCode}:`, errorMessage);
        }
      }));
    }
    
    const duration = Date.now() - startTime;

    // REMOVED: Master products array update (caused memory limit exceeded)
    // Individual products are already updated above with kv.set(productKey, updatedProduct)
    // Frontend now reads from individual keys via kv.getProducts(), not from master array
    
    // 🔥 INVALIDATE CACHE AFTER SYNC
    // Make a request to force cache refresh
    try {
      console.log('🔄 Invalidating CMS cache after sync...');
      await fetch(`${c.req.url.split('/description-sync')[0]}/cms/data?force=true`, {
        method: 'GET',
        headers: {
          'Authorization': c.req.header('Authorization') || '',
        },
      });
      console.log('✅ Cache invalidated successfully');
    } catch (error) {
      console.error('⚠️ Failed to invalidate cache:', error);
      // Don't fail the whole request if cache invalidation fails
    }
    
    return c.json({
      success: true,
      message: `Batch sync complete. Updated ${descriptionsUpdated} descriptions, ${specificationsUpdated} specifications, ${ageRestrictedUpdated} age restrictions, ${imagesUpdated} image sets.`,
      cacheInvalidated: true, // ✅ Tell frontend that server cache was cleared
      summary: {
        total: limitedCodes.length,
        updated: descriptionsUpdated + specificationsUpdated + ageRestrictedUpdated + imagesUpdated,
        descriptionsUpdated,
        specificationsUpdated,
        ageRestrictedUpdated,
        imagesUpdated,
        skipped,
        errors,
        duration,
      },
      results,
    });
    
  } catch (error) {
    console.error('❌ [Description Sync Batch] Error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// POST /description-sync/run - Full description sync
// ============================================
descriptionSync.post('/run', async (c) => {
  const startTime = Date.now();
  const syncLog: DescriptionSyncLog = {
    timestamp: new Date().toISOString(),
    totalProducts: 0,
    productsChecked: 0,
    descriptionsUpdated: 0,
    specificationsUpdated: 0,
    ageRestrictedUpdated: 0,
    errors: 0,
    duration: 0,
    status: 'success',
    errorDetails: [],
    updates: [],
  };

  try {
    console.log('📝 [Description Sync] Starting description & features synchronization...');

    // Get only valid products (excludes sections/categories/metadata)
    const allProducts = await kv.getProducts();
    syncLog.totalProducts = allProducts.length;
    console.log(`📦 [Description Sync] Found ${allProducts.length} valid products in database`);

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

    const headers = {
      'Authorization': formatAuthHeader(token),
      'Content-Type': 'application/json'
    };

    // Batch process products
    const BATCH_SIZE = 50; // Smaller batches to avoid overwhelming API
    const batches: any[][] = [];
    
    for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
      batches.push(allProducts.slice(i, i + BATCH_SIZE));
    }

    console.log(`📊 [Description Sync] Processing ${batches.length} batches of ${BATCH_SIZE} products each`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`🔄 [Description Sync] Processing batch ${batchIndex + 1}/${batches.length}...`);

      // Process products in parallel within batch
      const batchResults = await Promise.allSettled(
        batch.map(async (product) => {
          syncLog.productsChecked++;

          try {
            const productCode = product.code || product.productCode || product.sku || product.id;
            
            if (!productCode) {
              console.log(`⚠️ [Description Sync] Product has no code/SKU:`, product);
              return null;
            }

            // Fetch product from Uropa API with FULL fields
            // 🔥 IMPORTANT: Use the CAROUSEL endpoint to get attributes!
            const uropaUrl = `${UROPA_API_BASE}/productRecommendations/productCarousel?vatToggle=EXVAT&productCodes=${productCode}&productIds=${productCode}&slotName=homeRecsTop&lang=en&curr=AUD`;
            console.log(`📡 [Description Sync] Fetching from CAROUSEL endpoint: ${uropaUrl}`);
            
            const response = await fetch(uropaUrl, { 
              method: 'GET',
              headers
            });

            if (!response.ok) {
              console.log(`⚠️ [Description Sync] Product ${productCode} not found in Uropa API (${response.status})`);
              return null;
            }

            const uropaResponse = await response.json();
            
            // 🔥 The carousel endpoint returns: { products: [...] }
            const uropaProduct = uropaResponse.products && uropaResponse.products.length > 0 ? uropaResponse.products[0] : uropaResponse;
            
            // 📝 Extract description and features from Uropa response
            const uropaDescription = uropaProduct.description || '';
            const uropaShortDescription = uropaProduct.summary || '';
            const uropaWarranty = uropaProduct.warranty || '';
            
            // 🏷️ Extract features from attributes array - Raw attributes from carousel endpoint
            const allAttributes = uropaProduct.attributes || [];
            
            // 🔥 FILTER by fieldType since carousel returns raw array
            const comparisonDataArray = allAttributes.filter((a: any) => 
              a.fieldType === 'COMPARISONDATA' && a.isFeature === true
            );
            const attributesDataArray = allAttributes.filter((a: any) => 
              a.fieldType === 'ATTRIBUTESDATA' && a.isFeature === true
            );
            const facetDataArray = allAttributes.filter((a: any) => 
              a.fieldType === 'FACETDATA'
            );
            const hazardDataArray = allAttributes.filter((a: any) => 
              a.fieldType === 'HAZARDDATA'
            );
            
            console.log(`📊 [Description Sync] ${productCode} attributes:`, {
              total: allAttributes.length,
              comparisonData: comparisonDataArray.length,
              attributesData: attributesDataArray.length,
              facetData: facetDataArray.length,
              hazardData: hazardDataArray.length,
            });
            
            // 📊 Build comparison data object from comparisonData array
            const uropaComparisonData: any = {};
            comparisonDataArray.forEach((attr: any) => {
              uropaComparisonData[attr.fieldName || attr.fieldCode || attr.name] = attr.value;
            });
            
            // 🔧 Build features array from attributesData array
            const uropaFeatures = attributesDataArray.map((attr: any) => attr.value);
            
            // 🏷️ Combine all attributes for reference (fallback to old structure if needed)
            const combinedAttributes = uropaProduct.attributes || [
              ...comparisonDataArray,
              ...attributesDataArray,
              ...facetDataArray,
              ...hazardDataArray
            ];
            
            // Legacy fields (keep for compatibility)
            const uropaSpecifications = uropaProduct.specifications || uropaProduct.technicalDetails || [];
            
            // Track what changed
            const updatedFields: string[] = [];
            let needsUpdate = false;

            // Check if description needs update
            if (uropaDescription && uropaDescription !== product.description) {
              updatedFields.push('description');
              needsUpdate = true;
            }

            // Check if features/attributes need update
            const hasNewFeatures = (combinedAttributes.length > 0 || uropaFeatures.length > 0) && 
              (!product.attributes || !product.features || 
               JSON.stringify(product.attributes) !== JSON.stringify(combinedAttributes) ||
               JSON.stringify(product.features) !== JSON.stringify(uropaFeatures));
            
            if (hasNewFeatures) {
              updatedFields.push('features/attributes');
              needsUpdate = true;
            }

            // Check if comparison data needs update
            const hasNewComparisonData = uropaComparisonData && 
              JSON.stringify(product.comparisonData) !== JSON.stringify(uropaComparisonData);
            
            if (hasNewComparisonData) {
              updatedFields.push('comparisonData');
              needsUpdate = true;
            }

            // Skip if nothing changed
            if (!needsUpdate) {
              console.log(`✅ [Description Sync] No changes for ${productCode}`);
              return null;
            }

            console.log(`📝 [Description Sync] Updating ${productCode}: ${updatedFields.join(', ')}`);

            // Update product in database (ONLY description/features fields, NO PRICE CHANGES!)
            const updatedProduct = {
              ...product, // Keep ALL existing fields (including prices!)
              
              // 📝 DESCRIPTION FIELDS
              description: uropaDescription || product.description,
              fullDescription: uropaDescription || product.fullDescription,
              shortDescription: uropaShortDescription || product.shortDescription,
              
              // 🏷️ FEATURES & ATTRIBUTES
              attributes: combinedAttributes.length > 0 ? combinedAttributes : product.attributes,
              features: uropaFeatures.length > 0 ? uropaFeatures : 
                       combinedAttributes.length > 0 ? combinedAttributes.map((attr: any) => attr.name || attr.value || attr) : 
                       product.features,
              
              // 📊 COMPARISON DATA
              comparisonData: uropaComparisonData || product.comparisonData,
              
              // 🔧 SPECIFICATIONS
              specifications: uropaSpecifications.length > 0 ? uropaSpecifications : product.specifications,
              
              // 🕐 METADATA
              lastDescriptionSync: new Date().toISOString(),
              descriptionSyncedWithUropa: true,
            };

            // 🔥 CRITICAL: Save using productCode to ensure consistency
            await kv.set(`products:${productCode}`, updatedProduct);

            // Track updates
            if (updatedFields.includes('description')) syncLog.descriptionsUpdated++;
            if (updatedFields.includes('features/attributes')) syncLog.featuresUpdated++;
            if (updatedFields.includes('comparisonData')) syncLog.comparisonDataUpdated++;

            syncLog.updates?.push({
              productId: product.id,
              productName: product.name,
              productCode: productCode,
              updatedFields,
              hadDescription: !!product.description,
              hadFeatures: !!(product.features || product.attributes),
              hadComparisonData: !!product.comparisonData,
            });

            console.log(`✅ [Description Sync] Updated ${productCode} successfully`);
            return updatedProduct;

          } catch (error) {
            syncLog.errors++;
            const errorMsg = `Error processing product ${product.code || product.id}: ${error}`;
            console.error(`❌ [Description Sync] ${errorMsg}`);
            syncLog.errorDetails?.push(errorMsg);
            return null;
          }
        })
      );

      // Small delay between batches to be nice to the API
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Calculate duration
    syncLog.duration = Date.now() - startTime;

    // Determine status
    if (syncLog.errors === 0) {
      syncLog.status = 'success';
    } else if (syncLog.descriptionsUpdated > 0 || syncLog.featuresUpdated > 0) {
      syncLog.status = 'partial';
    } else {
      syncLog.status = 'error';
    }

    console.log(`✅ [Description Sync] Complete: ${syncLog.descriptionsUpdated} descriptions, ${syncLog.featuresUpdated} features, ${syncLog.comparisonDataUpdated} comparison data updated`);
    console.log(`⏱️ [Description Sync] Duration: ${(syncLog.duration / 1000).toFixed(2)}s`);

    // Clear CMS cache to force refresh
    try {
      await kv.del('cms:data');
      console.log('🗑️ [Description Sync] Cleared CMS cache');
    } catch (error) {
      console.warn('⚠️ Could not clear CMS cache:', error);
    }

    return c.json({
      success: true,
      message: `Description sync complete. Updated ${syncLog.descriptionsUpdated} descriptions, ${syncLog.featuresUpdated} features, ${syncLog.comparisonDataUpdated} comparison data.`,
      log: syncLog,
    });

  } catch (error) {
    console.error('❌ [Description Sync] Critical error:', error);
    syncLog.duration = Date.now() - startTime;
    syncLog.status = 'error';
    
    return c.json({
      success: false,
      error: String(error),
      log: syncLog,
    }, 500);
  }
});

// ============================================
// POST /description-sync/test - Test sync (no updates)
// ============================================
descriptionSync.post('/test', async (c) => {
  try {
    const body = await c.req.json();
    const productCodes = body.productCodes || [];
    
    if (productCodes.length === 0) {
      return c.json({ error: 'No product codes provided' }, 400);
    }

    console.log(`🧪 [Description Sync Test] Testing ${productCodes.length} products...`);

    const token = await getToken();
    if (!token) {
      return c.json({ error: 'Uropa API token not configured' }, 400);
    }

    const headers = {
      'Authorization': formatAuthHeader(token),
      'Content-Type': 'application/json'
    };

    const results = [];

    for (const code of productCodes) {
      try {
        // Get from database (only valid products)
        const allProducts = await kv.getProducts();
        const dbProduct = allProducts.find((p: any) =>
          p.code === code || p.productCode === code || p.sku === code
        );

        if (!dbProduct) {
          results.push({
            code,
            error: 'Product not found in database',
          });
          continue;
        }

        // 🔥 TRY MULTIPLE ENDPOINT VARIATIONS
        const endpointsToTry = [
          // 🔥 CAROUSEL/RECOMMENDATIONS ENDPOINT (from user's discovery!)
          { url: `${UROPA_API_BASE}/productRecommendations/productCarousel?vatToggle=EXVAT&productCodes=${code}&productIds=${code}&slotName=homeRecsTop&lang=en&curr=AUD`, type: 'carousel-recommendations' },
          
          // 🔥 SEARCH ENDPOINTS (returns products array with attributes!)
          { url: `${UROPA_API_BASE}/products/search?query=:code:${code}:&lang=en&curr=AUD`, type: 'search-query' },
          { url: `${UROPA_API_BASE}/products/search?query=${code}&lang=en&curr=AUD`, type: 'search-simple' },
          { url: `${UROPA_API_BASE}/search?query=${code}&lang=en&curr=AUD`, type: 'search-global' },
          
          // Details endpoints
          { url: `${UROPA_API_BASE}/orgUsers/current/products/details/${code}`, type: 'details-no-params' },
          { url: `${UROPA_API_BASE}/orgUsers/current/products/details/${code}?lang=en&curr=AUD`, type: 'details-with-params' },
          
          // Basic endpoints
          { url: `${UROPA_API_BASE}/products/${code}`, type: 'basic-no-params' },
          { url: `${UROPA_API_BASE}/products/${code}?fields=FULL`, type: 'basic-full-fields' },
          { url: `${UROPA_API_BASE}/products/${code}?fields=DEFAULT`, type: 'basic-default-fields' },
        ];

        let uropaData = null;
        let endpoint = '';
        let detailsStatusCode = 0;
        let rawResponse = null;
        let successfulUrl = '';
        let endpointType = '';
        
        for (const testEndpoint of endpointsToTry) {
          console.log(`🔄 [Test] Trying: ${testEndpoint.url}`);
          const testResponse = await fetch(testEndpoint.url, { method: 'GET', headers });
          detailsStatusCode = testResponse.status;
          
          console.log(`   Status: ${testResponse.status} ${testResponse.ok ? '✅' : '❌'}`);
          
          if (testResponse.ok) {
            const jsonData = await testResponse.json();
            rawResponse = jsonData;
            successfulUrl = testEndpoint.url;
            endpointType = testEndpoint.type;
            
            // 🔥 IMPORTANT: Check multiple response structures
            if (jsonData.products && Array.isArray(jsonData.products) && jsonData.products.length > 0) {
              // CAROUSEL/SEARCH RESPONSE: { products: [...] }
              endpoint = `${testEndpoint.type}-products-array`;
              uropaData = jsonData.products[0]; // Get first product from array
              console.log(`✅ [Test] SUCCESS! Response has products[] array with ${jsonData.products.length} items`);
            } else if (jsonData.product) {
              // DETAILS RESPONSE: { product: {...} }
              endpoint = `${testEndpoint.type}-product-wrapper`;
              uropaData = jsonData.product;
              console.log(`✅ [Test] SUCCESS! Response has product wrapper`);
            } else {
              // BASIC RESPONSE: Direct product data
              endpoint = `${testEndpoint.type}-direct`;
              uropaData = jsonData;
              console.log(`✅ [Test] SUCCESS! Response is direct product data`);
            }
            
            console.log(`🎉 [Test] Working endpoint: ${testEndpoint.url}`);
            break; // Stop trying once we succeed
          }
        }
        
        if (!uropaData) {
          results.push({
            code,
            error: `All ${endpointsToTry.length} endpoint variations failed`,
            lastStatusCode: detailsStatusCode,
          });
          continue;
        }

        console.log(`🔍 [Test] Raw response structure:`, {
          successfulUrl,
          hasProduct: !!rawResponse.product,
          hasBreadcrumbs: !!rawResponse.breadcrumbs,
          hasPdpUrl: !!rawResponse.pdpUrl,
          topLevelKeys: Object.keys(rawResponse).slice(0, 15),
        });
        
        // 🔍 ANALYZE THE STRUCTURE
        const analysis = {
          endpoint,
          detailsStatusCode,
          structure: {
            hasAttributes: !!uropaData.attributes,
            attributesIsArray: Array.isArray(uropaData.attributes),
            attributesLength: uropaData.attributes?.length || 0,
            hasFeatureAttributes: !!uropaData.featureAttributes,
            featureAttributesIsObject: typeof uropaData.featureAttributes === 'object',
            hasHasFeatureAttributes: !!uropaData.hasFeatureAttributes,
          },
          // 🔥 LOG FIRST 3 ATTRIBUTES TO SEE STRUCTURE
          sampleAttributes: uropaData.attributes?.slice(0, 3) || [],
          // 🔥 LOG ALL ROOT KEYS
          rootKeys: Object.keys(uropaData).sort(),
        };

        console.log(`��� [Test] ${code} - Full structure analysis:`, JSON.stringify(analysis, null, 2));
        
        // 🏷️ Extract attributes using CORRECT structure
        let comparisonData: any[] = [];
        let attributesData: any[] = [];
        let facetData: any[] = [];
        let hazardData: any[] = [];

        // Check if featureAttributes exists (pre-organized)
        if (uropaData.featureAttributes && typeof uropaData.featureAttributes === 'object') {
          console.log(`✅ [Test] Using featureAttributes object for ${code}`);
          comparisonData = uropaData.featureAttributes.comparisonData || [];
          attributesData = uropaData.featureAttributes.attributesData || [];
          facetData = uropaData.featureAttributes.facetData || [];
          hazardData = uropaData.featureAttributes.hazardData || [];
        } 
        // Fallback: Filter from attributes array
        else if (Array.isArray(uropaData.attributes)) {
          console.log(`✅ [Test] Filtering attributes array for ${code}`);
          comparisonData = uropaData.attributes.filter((a: any) => 
            a.fieldType === 'COMPARISONDATA' && a.isFeature === true
          );
          attributesData = uropaData.attributes.filter((a: any) => 
            a.fieldType === 'ATTRIBUTESDATA' && a.isFeature === true
          );
          facetData = uropaData.attributes.filter((a: any) => 
            a.fieldType === 'FACETDATA'
          );
          hazardData = uropaData.attributes.filter((a: any) => 
            a.fieldType === 'HAZARDDATA'
          );
        }

        results.push({
          code,
          endpoint,
          successfulUrl, // 🔥 Show which URL actually worked!
          analysis,
          database: {
            description: dbProduct.description || 'No description',
            descriptionLength: dbProduct.description?.length || 0,
            features: dbProduct.features || [],
            featuresCount: dbProduct.features?.length || 0,
          },
          uropa: {
            description: uropaData.description || 'No description',
            descriptionLength: uropaData.description?.length || 0,
            summary: uropaData.summary || '',
            comparisonDataCount: comparisonData.length,
            attributesDataCount: attributesData.length,
            facetDataCount: facetData.length,
            hazardDataCount: hazardData.length,
            sampleComparisonData: comparisonData.slice(0, 2),
            sampleAttributesData: attributesData.slice(0, 3),
          }
        });

      } catch (error) {
        results.push({
          code,
          error: String(error),
        });
      }
    }

    return c.json({
      success: true,
      tested: productCodes.length,
      results,
    });

  } catch (error) {
    console.error('❌ [Description Sync Test] Error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// POST /description-sync/single/:code - Sync single product
// ============================================
descriptionSync.post('/single/:code', async (c) => {
  try {
    const productCode = c.req.param('code');
    console.log(`📝 [Description Sync Single] Syncing product: ${productCode}`);

    const token = await getToken();
    if (!token) {
      return c.json({ error: 'Uropa API token not configured' }, 400);
    }

    // Get product from database (only valid products)
    const allProducts = await kv.getProducts();
    const dbProduct = allProducts.find((p: any) =>
      p.code === productCode || p.productCode === productCode || p.sku === productCode
    );

    if (!dbProduct) {
      return c.json({ error: 'Product not found in database' }, 404);
    }

    // 🔥 USE SHARED FUNCTION - same as /compare endpoint!
    const uropaData = await fetchProductFromUropa(productCode, token, 10000);
    
    // Extract data from shared function
    const uropaDescription = uropaData.description;
    const specifications = uropaData.specifications;
    const uropaAgeRestricted = uropaData.ageRestricted;
    const uropaImages = uropaData.images;
    const uropaProduct = uropaData.rawProduct;
    const allAttributes = uropaProduct.attributes || [];
    
    // 🔍 LOG RAW UROPA DATA
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔍 [SINGLE SYNC DEBUG] Product Code: ${productCode}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 RAW UROPA DATA:');
    console.log('  Description:', uropaDescription?.substring(0, 200) + '...');
    console.log('  Total Attributes:', allAttributes.length);
    console.log('\n📊 ALL ATTRIBUTES FROM UROPA:');
    allAttributes.forEach((attr: any, idx: number) => {
      console.log(`  [${idx}] Type: ${attr.fieldType} | Name: ${attr.fieldName || attr.name} | Value: ${String(attr.value).substring(0, 50)}`);
    });
    
    // 🔍 Already extracted by shared function
    console.log(`\n🔍 [Single Sync] ${productCode} - Extracted:`, {
      totalAttributes: allAttributes.length,
      specificationsCount: specifications.length,
      ageRestricted: uropaAgeRestricted,
      imagesCount: uropaImages.length,
    });
    
    console.log('\n📝 PROCESSED SPECIFICATIONS (will be saved):');
    specifications.forEach((spec: any, idx: number) => {
      console.log(`  [${idx}] ${spec.name}: ${String(spec.value).substring(0, 80)}`);
    });
    
    console.log('\n📦 BEFORE UPDATE (Current DB data):');
    console.log('  Description:', dbProduct.description?.substring(0, 100));
    console.log('  Specifications Count:', dbProduct.specifications?.length || 0);
    if (dbProduct.specifications && dbProduct.specifications.length > 0) {
      console.log('  Current Specifications Sample:');
      dbProduct.specifications.slice(0, 5).forEach((spec: any, idx: number) => {
        const name = spec.name || spec.label || spec.key || 'unnamed';
        const value = spec.value || spec.val || spec;
        console.log(`    [${idx}] ${name}: ${String(value).substring(0, 80)}`);
      });
    }

    // Update product
    const updatedProduct = {
      ...dbProduct,
      description: uropaDescription || dbProduct.description,
      specifications: specifications.length > 0 ? specifications : dbProduct.specifications,
      ageRestricted: uropaAgeRestricted,
      images: uropaImages.length > 0 ? uropaImages : dbProduct.images,
      lastDescriptionSync: new Date().toISOString(),
      descriptionSyncedWithUropa: true,
    };
    
    console.log('\n✅ AFTER UPDATE (Will be saved):');
    console.log('  Description:', updatedProduct.description?.substring(0, 100));
    console.log('  Short Description:', updatedProduct.shortDescription?.substring(0, 100));
    console.log('  Specifications Count:', updatedProduct.specifications?.length || 0);
    if (updatedProduct.specifications && updatedProduct.specifications.length > 0) {
      console.log('  NEW Specifications Sample:');
      updatedProduct.specifications.slice(0, 5).forEach((spec: any, idx: number) => {
        const name = spec.name || spec.label || spec.key || 'unnamed';
        const value = spec.value || spec.val || spec;
        console.log(`    [${idx}] ${name}: ${String(value).substring(0, 80)}`);
      });
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 🔥 CRITICAL: Save using productCode to ensure consistency
    await kv.set(`products:${productCode}`, updatedProduct);

    // 🔥 CRITICAL: Also update the master products array (same as batch sync!)
    try {
      console.log('🔄 [Single Sync] Updating master products array...');
      const allProducts = await kv.get('products');
      
      if (Array.isArray(allProducts) && allProducts.length > 0) {
        console.log(`📦 [Single Sync] Found master array with ${allProducts.length} products`);
        
        // Find and update the product in the master array
        const productIndex = allProducts.findIndex((p: any) => {
          const pCode = p.code || p.productCode || p.sku || p.id;
          return pCode === productCode;
        });
        
        if (productIndex >= 0) {
          console.log(`✅ [Single Sync] Found product at index ${productIndex} - updating`);
          allProducts[productIndex] = updatedProduct;
          await kv.set('products', allProducts);
          console.log(`✅ [Single Sync] Master products array updated with fresh ${productCode} data`);
        } else {
          console.warn(`⚠️ [Single Sync] Product ${productCode} not found in master array`);
        }
      } else {
        console.log('⚠️ [Single Sync] No master products array found - using individual keys only');
      }
    } catch (error) {
      console.error('⚠️ [Single Sync] Failed to update master products array:', error);
      // Don't fail the whole request
    }

    // 🔥 Clear CMS cache to force frontend refresh
    try {
      await kv.del('cms:data');
      console.log('🗑️ [Description Sync Single] Cleared CMS cache');
    } catch (error) {
      console.warn('⚠️ Could not clear CMS cache:', error);
    }

    console.log(`✅ [Description Sync Single] Updated ${productCode} successfully`);

    return c.json({
      success: true,
      message: `Product ${productCode} description and features updated`,
      productCode: productCode,
      before: {
        description: dbProduct.description || '',
        descriptionLength: (dbProduct.description || '').length,
        specifications: (dbProduct.specifications || []).map((s: any) => ({
          label: s.name || s.label || s.key || 'Unknown',
          value: s.value || s.val || s,
        })),
        specificationsCount: (dbProduct.specifications || []).length,
        ageRestricted: dbProduct.ageRestricted || false,
        imagesCount: (dbProduct.images || []).length,
      },
      uropa: {
        attributesCount: allAttributes.length,
        descriptionLength: uropaDescription.length,
        descriptionSample: uropaDescription.substring(0, 300),
        specificationsCount: specifications.length,
        specificationsSample: specifications.slice(0, 20).map((s: any) => ({
          label: s.name,
          value: s.value,
        })),
        ageRestricted: uropaProduct.ageRestricted || false,
        imagesCount: uropaImages.length,
        imagesSample: uropaImages.slice(0, 3),
        rawAttributesSample: allAttributes.slice(0, 10).map((a: any) => ({
          fieldType: a.fieldType,
          fieldName: a.fieldName || a.name,
          value: String(a.value).substring(0, 100),
        })),
      },
      after: {
        description: updatedProduct.description || '',
        descriptionLength: (updatedProduct.description || '').length,
        specifications: (updatedProduct.specifications || []).map((s: any) => ({
          label: s.name || s.label || s.key || 'Unknown',
          value: s.value || s.val || s,
        })),
        specificationsCount: (updatedProduct.specifications || []).length,
        ageRestricted: updatedProduct.ageRestricted || false,
        imagesCount: (updatedProduct.images || []).length,
      },
    });

  } catch (error) {
    console.error('❌ [Description Sync Single] Error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

export default descriptionSync;