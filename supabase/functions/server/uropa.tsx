// Uropa API integration for price sync
import * as kv from './kv_custom.tsx';

/**
 * Calculate selling price based on cost price using tiered profit margins
 */
async function calculateSellingPrice(costPrice: number): Promise<number> {
  // Get profit margins from settings
  const margins = await kv.get('profit_margins_577b3f26');
  
  // Default margins if not set
  const defaultMargins = {
    under50: 50,
    '50to100': 40,
    '100to500': 30,
    '500to1000': 20,
    '1000to5000': 15,
    over5000: 12
  };
  
  const profitMargins = margins || defaultMargins;
  
  // Determine which tier the cost price falls into
  let marginPercent = 0;
  
  if (costPrice < 50) {
    marginPercent = profitMargins.under50;
  } else if (costPrice < 100) {
    marginPercent = profitMargins['50to100'];
  } else if (costPrice < 500) {
    marginPercent = profitMargins['100to500'];
  } else if (costPrice < 1000) {
    marginPercent = profitMargins['500to1000'];
  } else if (costPrice < 5000) {
    marginPercent = profitMargins['1000to5000'];
  } else {
    marginPercent = profitMargins.over5000;
  }
  
  // Calculate selling price: cost + (cost * margin%)
  const sellingPrice = costPrice * (1 + marginPercent / 100);
  
  // Apply minimum 15% margin floor
  const minMarginPrice = costPrice * 1.15;
  
  return Math.round(Math.max(sellingPrice, minMarginPrice) * 100) / 100; // Round to 2 decimal places
}

/**
 * Get Uropa API token from environment variable
 */
export function getUropaToken(): string {
  const token = Deno.env.get('UROPA_API_TOKEN');
  if (!token) {
    throw new Error('UROPA_API_TOKEN not configured in environment variables');
  }
  return token;
}

/**
 * Get Uropa API URL from environment variable (with fallback)
 */
export function getUropaApiUrl(): string {
  return Deno.env.get('UROPA_API_URL') || 'https://api.uropa.com.au';
}

/**
 * Normalize token - remove "Bearer " prefix if present
 */
function normalizeToken(token: string): string {
  if (!token) return token;
  // Remove "Bearer " prefix if present (case insensitive)
  return token.replace(/^bearer\s+/i, '').trim();
}

/**
 * Format token for Authorization header
 */
function formatAuthHeader(token: string): string {
  const normalized = normalizeToken(token);
  return `Bearer ${normalized}`;
}

/**
 * Get saved Uropa API configuration
 */
export async function getConfig() {
  // Check KV storage first (where UI saves token)
  const savedToken = await kv.get('uropa_api_token');
  
  // Get from environment variables
  const envToken = Deno.env.get('UROPA_API_TOKEN');
  const envApiUrl = Deno.env.get('UROPA_API_URL');
  
  const token = savedToken || envToken || '';
  const apiUrl = envApiUrl || 'https://p1-api.nisbets.com.au/occ/v2/uropa-au';
  
  return {
    apiUrl,
    token,
    hasEnvToken: !!envToken,
    hasEnvApiUrl: !!envApiUrl,
    lastVerified: null
  };
}

/**
 * Save Uropa API configuration (both URL and token)
 */
export async function saveConfig(token: string, apiUrl: string) {
  console.log('💾 [saveConfig] Saving Uropa configuration...');
  console.log('💾 [saveConfig] Token length:', token ? token.length : 0);
  console.log('💾 [saveConfig] Token preview:', token ? token.substring(0, 30) + '...' : 'null');
  console.log('💾 [saveConfig] API URL:', apiUrl);
  
  const config = {
    token,
    apiUrl,
    lastVerified: new Date().toISOString()
  };
  
  // Save full config
  console.log('💾 [saveConfig] Saving to uropa_config_577b3f26...');
  await kv.set('uropa_config_577b3f26', config);
  console.log('✅ [saveConfig] Saved uropa_config_577b3f26 successfully');
  
  // ALSO save token separately for easy access by price-sync routes
  console.log('💾 [saveConfig] Saving to uropa_api_token...');
  await kv.set('uropa_api_token', token);
  console.log('✅ [saveConfig] Saved uropa_api_token successfully');
  
  // Verify what was actually saved
  console.log('🔍 [saveConfig] Verifying saved data...');
  const savedToken = await kv.get('uropa_api_token');
  console.log('🔍 [saveConfig] Retrieved token:', savedToken ? `${String(savedToken).substring(0, 30)}... (length: ${String(savedToken).length})` : 'null');
  
  return {
    ...config,
    hasEnvToken: !!Deno.env.get('UROPA_API_TOKEN'),
    hasEnvApiUrl: !!Deno.env.get('UROPA_API_URL')
  };
}

/**
 * Delete Uropa API configuration
 */
export async function deleteConfig() {
  await kv.del('uropa_config_577b3f26');
  await kv.del('uropa_api_token'); // Also delete the standalone token
}

/**
 * Verify Uropa API token and URL
 */
export async function verifyToken(token: string, apiUrl: string) {
  try {
    console.log('🔍 [verifyToken] Starting verification...');
    console.log('🔍 [verifyToken] API URL:', apiUrl);
    console.log('🔍 [verifyToken] Token preview:', token ? `${token.substring(0, 20)}...` : 'null');
    
    const authHeader = formatAuthHeader(token);
    console.log('🔍 [verifyToken] Authorization header:', authHeader.substring(0, 30) + '...');
    
    // Use the tealium/data/category endpoint which is known to work (POST request)
    const requestUrl = `${apiUrl}/tealium/data/category?lang=en&curr=AUD&vatToggle=EXVAT`;
    console.log('🔍 [verifyToken] Full request URL:', requestUrl);
    
    // Test the token by making a simple API call (POST with empty body)
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    console.log('📡 [verifyToken] Response status:', response.status);
    console.log('📡 [verifyToken] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [verifyToken] Error response:', errorText);
      return { 
        valid: false, 
        error: `API returned status ${response.status}: ${errorText.substring(0, 200)}` 
      };
    }
    
    // If we get here, token is valid
    const data = await response.json();
    console.log('✅ [verifyToken] Success! Response data:', JSON.stringify(data).substring(0, 200));
    return { 
      valid: true, 
      message: 'Successfully connected to Uropa API',
      data 
    };
  } catch (error) {
    console.error('❌ [verifyToken] Exception:', error);
    return { valid: false, error: String(error) };
  }
}

/**
 * Search Uropa API for products by codes
 */
export async function searchUropaProducts(codes: string[]) {
  const config = await getConfig();
  
  if (!config) {
    throw new Error('Uropa API not configured. Please add your API token first.');
  }
  
  console.log('🌐 [searchUropaProducts] API Configuration:');
  console.log('   API URL:', config.apiUrl);
  console.log('   Token exists:', !!config.token);
  console.log('   Token length:', config.token ? config.token.length : 0);
  console.log('   Token preview:', config.token ? `${config.token.substring(0, 30)}...` : 'null');
  
  try {
    const authHeader = formatAuthHeader(config.token);
    
    // ✅ FIX: Use individual product GET requests instead of bulk POST
    // Uropa API: GET /products/{code} for single product lookup
    console.log('🌐 [searchUropaProducts] Fetching', codes.length, 'products individually...');
    
    const products = [];
    
    for (const code of codes) {
      try {
        const endpoint = `${config.apiUrl}/products/${code}?lang=en&curr=AUD&fields=FULL`;
        console.log('   Fetching:', endpoint);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`   Response for ${code}:`, response.status);
        
        if (response.ok) {
          const productData = await response.json();
          products.push(productData);
        } else {
          console.warn(`   ⚠️ Product ${code} not found (${response.status})`);
        }
      } catch (err) {
        console.error(`   ❌ Error fetching ${code}:`, err);
      }
    }
    
    console.log('✅ [searchUropaProducts] Success! Received:', products.length, 'products');
    
    return products;
  } catch (error) {
    console.error('❌ [searchUropaProducts] Exception:', error);
    throw error;
  }
}

/**
 * Analyze all prices in database
 */
export async function analyzePrices() {
  // Get products from the main products array
  const allProducts = await kv.get('products') || [];
  
  console.log(`📊 Analyzing ${allProducts.length} products...`);
  
  let withPrice = 0;
  let withoutPrice = 0;
  let withZeroPrice = 0;
  let withCostPrice = 0;
  let totalPrice = 0;
  let totalCostPrice = 0;
  let minPrice = Infinity;
  let maxPrice = 0;
  let priceCount = 0;
  let costPriceCount = 0;
  
  const priceRanges = {
    under50: 0,
    '50to100': 0,
    '100to500': 0,
    '500to1000': 0,
    '1000to5000': 0,
    over5000: 0
  };
  
  allProducts.forEach((product: any) => {
    const price = parseFloat(product.price || 0);
    const costPrice = parseFloat(product.costPrice || 0);
    
    // Price statistics
    if (price > 0) {
      withPrice++;
      totalPrice += price;
      priceCount++;
      minPrice = Math.min(minPrice, price);
      maxPrice = Math.max(maxPrice, price);
      
      // Price range distribution
      if (costPrice > 0) {
        if (costPrice < 50) priceRanges.under50++;
        else if (costPrice < 100) priceRanges['50to100']++;
        else if (costPrice < 500) priceRanges['100to500']++;
        else if (costPrice < 1000) priceRanges['500to1000']++;
        else if (costPrice < 5000) priceRanges['1000to5000']++;
        else priceRanges.over5000++;
      }
    } else if (price === 0) {
      withZeroPrice++;
    } else {
      withoutPrice++;
    }
    
    // Cost price statistics
    if (costPrice > 0) {
      withCostPrice++;
      totalCostPrice += costPrice;
      costPriceCount++;
    }
  });
  
  console.log(`✅ Analysis complete: ${allProducts.length} total, ${withPrice} with price, ${withCostPrice} with cost price`);
  
  return {
    total: allProducts.length,
    withPrice,
    withoutPrice,
    withZeroPrice,
    withCostPrice,
    avgPrice: priceCount > 0 ? parseFloat((totalPrice / priceCount).toFixed(2)) : 0,
    avgCostPrice: costPriceCount > 0 ? parseFloat((totalCostPrice / costPriceCount).toFixed(2)) : 0,
    minPrice: minPrice === Infinity ? 0 : parseFloat(minPrice.toFixed(2)),
    maxPrice: parseFloat(maxPrice.toFixed(2)),
    priceRanges
  };
}

/**
 * Compare prices between database and Uropa by product codes
 */
export async function comparePricesByCode(codes: string[]) {
  console.log('='.repeat(80));
  console.log('🔍 STEP 1: FETCHING PRODUCTS FROM YOUR DATABASE');
  console.log('='.repeat(80));
  console.log(`📋 Product codes to search: ${codes.join(', ')}`);
  
  // 🔥 FIX: Use getByPrefix instead of get (products are stored individually)
  const allProducts = await kv.getByPrefix('products:') || [];
  
  console.log(`✅ Retrieved ${allProducts.length} total products from YOUR database`);
  
  if (allProducts.length === 0) {
    console.error('❌ ERROR: No products found in database! Database might be empty.');
    return { 
      comparisons: [], 
      stats: { total: 0, increased: 0, decreased: 0, unchanged: 0 },
      error: 'No products found in database'
    };
  }
  
  // Debug: Show sample product structure
  if (allProducts.length > 0) {
    const sample = allProducts[0];
    console.log(`📝 Sample product structure:`, {
      id: sample.id,
      sku: sample.sku,
      code: sample.code,
      productCode: sample.productCode,
      name: sample.name?.substring(0, 50),
      costPrice: sample.costPrice,
      baseCost: sample.baseCost,
      price: sample.price
    });
  }
  
  console.log('');
  console.log('🔍 Searching for matching products by code...');
  
  // Filter products that match the provided codes
  const dbProducts = allProducts.filter((p: any) => {
    const matches = codes.some(code => {
      const codeMatch = 
        p.sku?.toLowerCase() === code.toLowerCase() ||
        p.productCode?.toLowerCase() === code.toLowerCase() ||
        p.code?.toLowerCase() === code.toLowerCase();
      
      if (codeMatch) {
        console.log(`✅ FOUND: ${code} matches product:`, {
          id: p.id,
          sku: p.sku,
          code: p.code,
          productCode: p.productCode,
          name: p.name?.substring(0, 50),
          costPrice: p.costPrice,
          baseCost: p.baseCost
        });
      }
      
      return codeMatch;
    });
    return matches;
  });
  
  console.log('');
  console.log(`✅ STEP 1 COMPLETE: Found ${dbProducts.length} matching products in YOUR database`);
  
  if (dbProducts.length === 0) {
    console.error('❌ ERROR: No products found matching the codes you entered!');
    console.log('🔍 Codes searched:', codes);
    console.log('💡 TIP: Check if the product code exactly matches sku, code, or productCode field');
    return { 
      comparisons: [], 
      stats: { total: 0, increased: 0, decreased: 0, unchanged: 0 },
      error: `No products found in database matching codes: ${codes.join(', ')}`
    };
  }
  
  // 🔥 NEW: Filter to only products WITH cost price and extract their codes
  console.log('');
  console.log('💰 Checking which products have cost prices...');
  const productsWithCost = dbProducts.filter((p: any) => {
    const costPrice = parseFloat(
      p.costPrice || 
      p.baseCost || 
      p.cost ||
      p.basePrice ||
      0
    );
    
    const hasCost = costPrice > 0;
    console.log(`   ${p.sku || p.code}: ${hasCost ? `✅ $${costPrice}` : '❌ No cost price'}`);
    
    return hasCost;
  });
  
  console.log('');
  console.log(`✅ Found ${productsWithCost.length} products WITH cost prices`);
  
  if (productsWithCost.length === 0) {
    console.error('❌ ERROR: None of the matched products have cost prices in database!');
    console.log('💡 TIP: Import products with cost prices first, or use CSV import feature');
    return { 
      comparisons: [], 
      stats: { total: 0, increased: 0, decreased: 0, unchanged: 0 },
      error: `Found ${dbProducts.length} products but none have cost prices. Please set cost prices first.`
    };
  }
  
  // 🔥 Extract codes from products that have cost prices
  const codesToSearch = productsWithCost.map((p: any) => 
    p.productCode || p.code || p.sku
  ).filter((code: string) => !!code);
  
  console.log('');
  console.log('📋 Codes to send to Uropa API:', codesToSearch.join(', '));
  
  console.log('');
  console.log('='.repeat(80));
  console.log('🌐 STEP 2: FETCHING PRODUCTS FROM UROPA API');
  console.log('='.repeat(80));
  
  // Search Uropa for matching products - ONLY for products with cost prices
  const uropaProducts = await searchUropaProducts(codesToSearch);
  
  console.log(`✅ STEP 2 COMPLETE: Received ${uropaProducts.length} products from Uropa API`);
  
  if (uropaProducts.length === 0) {
    console.error('❌ ERROR: No products returned from Uropa API!');
    return { 
      comparisons: [], 
      stats: { total: 0, increased: 0, decreased: 0, unchanged: 0 },
      error: 'No products found in Uropa API'
    };
  }
  
  // Create a map of Uropa products by code for quick lookup
  const uropaMap = new Map();
  uropaProducts.forEach((up: any) => {
    const code = up.code || up.sku || up.productCode;
    if (code) {
      uropaMap.set(code.toLowerCase(), up);
      console.log(`📦 Uropa product mapped: ${code}`);
    }
  });
  
  console.log('');
  console.log('='.repeat(80));
  console.log('📊 STEP 3: COMPARING PRICES');
  console.log('='.repeat(80));
  
  // Compare prices
  const comparisons = [];
  let stats = { total: 0, increased: 0, decreased: 0, unchanged: 0 };
  
  for (const dbProduct of dbProducts) {
    const productCode = dbProduct.productCode || dbProduct.code || dbProduct.sku;
    
    console.log('');
    console.log(`🔍 Processing product: ${productCode}`);
    console.log(`   Database product name: ${dbProduct.name}`);
    
    const uropaProduct = uropaMap.get(productCode?.toLowerCase());
    
    if (!uropaProduct) {
      // Product not found in Uropa, skip
      console.log(`❌ Product ${productCode} not found in Uropa API response`);
      continue;
    }
    
    // ✅ STEP 3A: Get COST PRICE from YOUR database
    const currentCostPrice = parseFloat(
      dbProduct.costPrice || 
      dbProduct.baseCost || 
      dbProduct.cost ||
      dbProduct.basePrice ||
      0
    );
    
    const costField = dbProduct.costPrice ? 'costPrice' : 
                      dbProduct.baseCost ? 'baseCost' : 
                      dbProduct.cost ? 'cost' : 
                      dbProduct.basePrice ? 'basePrice' : 'NONE';
    
    console.log(`   📋 YOUR DATABASE Cost: $${currentCostPrice} (from ${costField})`);
    
    // ✅ STEP 3B: Get COST PRICE from Uropa API
    const uropaCostPrice = 
      uropaProduct.priceDetail?.priceBreakdown?.[0]?.priceB || // B2B wholesale price
      uropaProduct.priceDetail?.salesPrice || // Current sales price
      uropaProduct.priceDetail?.value || 
      uropaProduct.priceDetail?.price || 
      uropaProduct.priceRange?.minPrice?.value ||
      uropaProduct.priceRange?.maxPrice?.value ||
      uropaProduct.price?.value || 
      uropaProduct.basePrice?.value || 
      uropaProduct.costPrice ||
      uropaProduct.price || 
      0;
    
    console.log(`   🌐 UROPA API Cost: $${uropaCostPrice}`);
    
    // ✅ STEP 3C: Compare the two cost prices
    const priceDifference = uropaCostPrice - currentCostPrice;
    const percentageChange = currentCostPrice > 0 
      ? (priceDifference / currentCostPrice) * 100 
      : 0;
    
    console.log(`   📊 DIFFERENCE: $${priceDifference.toFixed(2)} (${percentageChange.toFixed(2)}%)`);
    
    // ✅ STEP 3D: Calculate new selling price based on Uropa cost (with tiered pricing)
    const newSellingPrice = await calculateSellingPrice(uropaCostPrice);
    
    console.log(`   💰 Current Selling Price: $${dbProduct.price}`);
    console.log(`   💰 NEW Selling Price: $${newSellingPrice} (calculated with tiered pricing formula)`);
    
    comparisons.push({
      productId: dbProduct.id,
      sku: dbProduct.sku || '',
      productCode: productCode || '',
      name: dbProduct.name,
      brand: dbProduct.brand || 'Unknown',
      currentCostPrice,
      uropaCostPrice,
      priceDifference,
      percentageChange,
      currentSellingPrice: parseFloat(dbProduct.price || 0),
      newSellingPrice,
      selected: false
    });
    
    // Update stats
    stats.total++;
    if (priceDifference > 0.01) {
      stats.increased++;
    } else if (priceDifference < -0.01) {
      stats.decreased++;
    } else {
      stats.unchanged++;
    }
  }
  
  console.log(`✅ Comparison complete: ${comparisons.length} products compared`);
  
  return { comparisons, stats };
}

/**
 * Update product prices in database
 */
export async function updateProductPrices(updates: Array<{ productId: string, newCostPrice: number, newSellingPrice: number }>) {
  // 🔥 FIX: Use getByPrefix to get individual products
  const allProducts = await kv.getByPrefix('products:') || [];
  
  console.log(`💾 Updating prices for ${updates.length} products...`);
  console.log(`📦 Found ${allProducts.length} total products in database`);
  
  // Create a map of updates for quick lookup
  const updateMap = new Map();
  updates.forEach(u => updateMap.set(u.productId, u));
  
  // Update products
  let updatedCount = 0;
  
  for (const product of allProducts) {
    const update = updateMap.get(product.id);
    
    if (update) {
      updatedCount++;
      console.log(`✏️ Updating ${product.sku || product.id}:`);
      console.log(`   Cost: ${product.costPrice} → ${update.newCostPrice}`);
      console.log(`   Selling Price: ${product.price} → ${update.newSellingPrice}`);
      
      // 🔥 Update BOTH cost price AND selling price
      const updatedProduct = {
        ...product,
        costPrice: update.newCostPrice,  // ✅ Update cost price from Uropa
        price: update.newSellingPrice,    // ✅ Update selling price (recalculated)
        lastUpdated: new Date().toISOString()
      };
      
      // Save individual product with its key
      await kv.set(`products:${product.id}`, updatedProduct);
      console.log(`✅ Saved products:${product.id}`);
    }
  }
  
  console.log(`✅ Successfully updated ${updatedCount} products`);
  
  return { updated: updatedCount };
}