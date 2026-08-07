import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';
import { calculateSellingPrice, DEFAULT_PRICING } from './pricing-calculator.tsx';

const sizeSync = new Hono();

const UROPA_API_BASE = 'https://p1-api.nisbets.com.au/occ/v2/uropa-au';

const SIZE_SUFFIXES = [
  // Clothing sizes
  '-xs', '-s', '-m', '-l', '-xl', '-xxl', '-2xl', '-3xl',
  '-sm', '-med', '-lg', '-xlg', '-one-size', '-os',
  // Women's AU clothing sizes
  '-6', '-8', '-10', '-12', '-14', '-16', '-18', '-20',
  // EU shoe sizes
  '-35', '-36', '-37', '-38', '-39', '-40', '-41', '-42', '-43', '-44', '-45', '-46', '-47', '-48',
];

const SIZE_LABELS: Record<string, string> = {
  '-xs': 'XS', '-s': 'S', '-m': 'M', '-l': 'L', '-xl': 'XL',
  '-xxl': 'XXL', '-2xl': '2XL', '-3xl': '3XL',
  '-sm': 'SM', '-med': 'MED', '-lg': 'LG', '-xlg': 'XLG',
  '-one-size': 'One Size', '-os': 'One Size',
  '-6': '6', '-8': '8', '-10': '10', '-12': '12',
  '-14': '14', '-16': '16', '-18': '18', '-20': '20',
  '-35': 'EU 35', '-36': 'EU 36', '-37': 'EU 37', '-38': 'EU 38',
  '-39': 'EU 39', '-40': 'EU 40', '-41': 'EU 41', '-42': 'EU 42',
  '-43': 'EU 43', '-44': 'EU 44', '-45': 'EU 45', '-46': 'EU 46',
  '-47': 'EU 47', '-48': 'EU 48',
};

const TARGET_CATEGORIES = ['consumable', 'cleaning and hygiene', 'clothing aprons and footwear', 'clothing', 'apron', 'footwear'];
const CLOTHING_CATEGORIES = ['clothing aprons and footwear', 'clothing', 'apron', 'footwear'];

function formatAuthHeader(token: string): string {
  return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
}

async function getToken(): Promise<string> {
  const savedToken = await kv.get('uropa_api_token');
  if (savedToken && typeof savedToken === 'string' && savedToken.length > 0) return savedToken;
  return Deno.env.get('UROPA_API_TOKEN') || '';
}

async function getPricingConfig() {
  return (await kv.get('pricing:config')) || DEFAULT_PRICING;
}

function extractUropaCost(uropaProduct: any): number {
  const raw =
    uropaProduct.priceDetail?.priceBreakdown?.[0]?.priceB ||
    uropaProduct.priceDetail?.salesPrice ||
    uropaProduct.priceDetail?.value ||
    uropaProduct.priceDetail?.price ||
    uropaProduct.priceRange?.minPrice?.value ||
    uropaProduct.price?.value ||
    uropaProduct.price ||
    0;
  return parseFloat(String(raw)) || 0;
}

function extractStock(uropaProduct: any) {
  const status =
    uropaProduct.stock?.stockLevelStatus ||
    uropaProduct.stockStatus ||
    uropaProduct.availability?.stockLevelStatus ||
    'unknown';
  const level = parseInt(
    uropaProduct.stock?.stockLevel ??
    uropaProduct.stockLevel ??
    uropaProduct.availability?.stockLevel ??
    0
  ) || 0;
  return { stockStatus: status, stockLevel: level, inStock: status === 'inStock' };
}

function buildVariant(suffix: string, fullCode: string, data: any, costPrice: number, pricing: any, stock: any) {
  const sellingPrice = pricing?.sellingPrice ?? 0;
  const now = new Date().toISOString();
  return {
    code: suffix.replace('-', '').toUpperCase(),
    fullCode,
    label: SIZE_LABELS[suffix] || suffix.replace('-', '').toUpperCase(),
    name: data.name || data.summary || fullCode,
    baseCost: costPrice, costPrice, cost: costPrice, basePrice: costPrice,
    price: sellingPrice, salePrice: sellingPrice, sellingPrice, sellPrice: sellingPrice, calculatedPrice: sellingPrice,
    markup: pricing?.markup ?? 0,
    markupPercent: pricing?.markupPercent ?? 0,
    marginPercent: pricing?.marginPercent ?? 0,
    tierLabel: pricing?.tierLabel ?? '',
    ...stock,
    lastPriceUpdate: now,
    lastSyncedWithUropa: now,
  };
}

function extractMultiBuy(uropaProduct: any, pricingConfig: any): Array<{ quantity: number; costPrice: number; price: number; markupPercent: number }> {
  const breakdown = uropaProduct.priceDetail?.priceBreakdown;
  if (!breakdown || breakdown.length <= 1) return [];
  return breakdown
    .filter((tier: any) => tier.quantity >= 1 && tier.priceB > 0)
    .map((tier: any) => {
      const costPrice = parseFloat(String(tier.priceB)) || 0;
      const pricing = calculateSellingPrice(costPrice, pricingConfig);
      return { quantity: tier.quantity, costPrice, price: pricing.sellingPrice, markupPercent: pricing.markupPercent };
    })
    .sort((a: any, b: any) => a.quantity - b.quantity);
}

function getCatString(product: any): string {
  return [
    product.category, product.categoryName,
    product.categoryLevel1, product.categoryLevel2,
    product.categoryLevel3, product.wholePath,
  ].filter(Boolean).join(' ').toLowerCase();
}

function isTargetCategory(product: any): boolean {
  return TARGET_CATEGORIES.some(k => getCatString(product).includes(k));
}

function isClothingCategory(product: any): boolean {
  return CLOTHING_CATEGORIES.some(k => getCatString(product).includes(k));
}

async function probeSizes(baseCode: string, token: string, pricingConfig: any) {
  // Try both with and without P_ prefix — some products use P_ in Uropa, some don't
  const strippedCode = baseCode.replace(/^P_/i, '');
  const prefixedCode = strippedCode !== baseCode ? baseCode : null; // only if original had P_

  const results = await Promise.allSettled(
    SIZE_SUFFIXES.map(async (suffix) => {
      // Try stripped code first, then prefixed if available
      const codesToTry = prefixedCode
        ? [`${strippedCode}${suffix}`, `${prefixedCode}${suffix}`]
        : [`${strippedCode}${suffix}`];

      let data: any = null;
      let fullCode = `${strippedCode}${suffix}`;
      for (const code of codesToTry) {
        const res = await fetch(`${UROPA_API_BASE}/products/${code}?lang=en&curr=AUD&fields=FULL`, {
          headers: { 'Authorization': formatAuthHeader(token) }
        });
        if (res.ok) {
          const json = await res.json();
          // Verify Uropa returned the size variant, not the base product (redirect/fallback)
          const returnedCode = (json.code || json.sku || json.productCode || '').toLowerCase();
          const requestedSuffix = suffix.replace('-', '').toLowerCase();
          if (returnedCode && !returnedCode.includes(requestedSuffix) && !returnedCode.endsWith(suffix.toLowerCase())) {
            continue; // Uropa returned base product, not the size variant
          }
          data = json; fullCode = code; break;
        }
      }
      if (!data) return null;
      const costPrice = extractUropaCost(data);
      const stock = extractStock(data);
      const pricing = costPrice > 0 ? calculateSellingPrice(costPrice, pricingConfig) : null;
      const variant = buildVariant(suffix, fullCode, data, costPrice, pricing, stock);
      // Also extract multi-buy tiers per size variant
      const multiBuyOptions = extractMultiBuy(data, pricingConfig);
      if (multiBuyOptions.length > 0) {
        variant.multiBuyOptions = multiBuyOptions;
        variant.hasMultiBuy = true;
      }
      return variant;
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

// ============================================
// GET /size-sync/debug-clothing — show first 5 clothing products raw fields
// ============================================
sizeSync.get('/debug-clothing', async (c) => {
  try {
    const all = await kv.getByPrefixWithKeys('products:');
    const clothing = all.filter(({ value }: any) => isClothingCategory(value)).slice(0, 5);
    return c.json({
      total: clothing.length,
      products: clothing.map(({ key, value: p }: any) => ({
        key,
        id: p.id,
        code: p.code,
        sku: p.sku,
        productCode: p.productCode,
        category: p.category,
        hasSizeOptions: p.hasSizeOptions,
        lastSizeSyncedWithUropa: p.lastSizeSyncedWithUropa,
      }))
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// GET /size-sync/debug-batch — run one batch chunk and return detailed results
// ============================================
sizeSync.get('/debug-batch', async (c) => {
  try {
    const token = await getToken();
    if (!token) return c.json({ success: false, error: 'No token' }, 400);
    const pricingConfig = await getPricingConfig();
    const allEntries = await kv.getByPrefixWithKeys('products:');
    const eligible = allEntries.filter(({ value }: any) => isTargetCategory(value));
    const clothing = eligible.filter(({ value }: any) => isClothingCategory(value));
    const chunk = clothing.slice(0, 3); // just first 3 clothing products

    const results = [];
    for (const { key, value: product } of chunk) {
      const rawCode = product.code || product.id;
      const baseCode = String(rawCode).replace(/^P_/i, '');
      try {
        const sizeVariants = await probeSizes(baseCode, token, pricingConfig);
        const updates: Record<string, any> = { lastSizeSyncedWithUropa: new Date().toISOString() };
        if (sizeVariants.length > 0) { updates.sizeOptions = sizeVariants; updates.hasSizeOptions = true; }
        await kv.set(key, { ...product, ...updates });
        results.push({ code: rawCode, key, sizesFound: sizeVariants.length, saved: true });
      } catch (err: any) {
        results.push({ code: rawCode, error: err.message });
      }
    }

    return c.json({ success: true, clothingTotal: clothing.length, tested: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// GET /size-sync/check/:code — show what category fields a product has in DB
// ============================================
sizeSync.get('/check/:code', async (c) => {
  const rawCode = c.req.param('code');
  try {
    const all = await kv.getByPrefixWithKeys('products:');
    const found = all.find(({ value: p }: any) =>
      p.code === rawCode || p.id === rawCode || p.sku === rawCode ||
      p.code === `P_${rawCode}` || p.id === `P_${rawCode}` ||
      String(p.code || '').replace(/^P_/i, '') === rawCode
    );
    const product = found?.value;
    if (!product) return c.json({ success: false, error: 'Not found' }, 404);
    return c.json({
      success: true,
      code: rawCode,
      categoryFields: {
        category: product.category,
        categoryName: product.categoryName,
        categoryLevel1: product.categoryLevel1,
        categoryLevel2: product.categoryLevel2,
        categoryLevel3: product.categoryLevel3,
        wholePath: product.wholePath,
      },
      catString: getCatString(product),
      isTarget: isTargetCategory(product),
      isClothing: isClothingCategory(product),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// POST /size-sync/reset — clear offset and ID cache to force full re-scan
// ============================================
sizeSync.post('/reset', async (c) => {
  await kv.set('size-sync:cron-offset', 0);
  await kv.del('size-sync:eligible-ids');
  return c.json({ success: true, message: 'Reset. Cron will rebuild ID list and re-scan all products.' });
});

// ============================================
// POST /size-sync/run-batch — process 50 products per cron tick, saves offset
// ============================================
sizeSync.post('/run-batch', async (c) => {
  const BATCH_SIZE = 50;
  const startTime = Date.now();

  try {
    const token = await getToken();
    if (!token) return c.json({ success: false, error: 'Uropa API token not configured' }, 400);

    const pricingConfig = await getPricingConfig();

    // Use getByPrefixWithKeys so we know the exact KV key to write back to
    const allEntries = await kv.getByPrefixWithKeys('products:');
    const total = allEntries.length; // ALL products, no category filter

    const offset = ((await kv.get('size-sync:cron-offset')) as number) ?? 0;

    if (offset >= total) {
      await kv.set('size-sync:cron-offset', 0);
      console.log(`✅ [Size Batch] Cycle complete, reset`);
      return c.json({ success: true, status: 'cycle_complete', total });
    }

    const chunk = allEntries.slice(offset, offset + BATCH_SIZE);
    const clothingChunk = chunk.filter(({ value }: any) => isClothingCategory(value));
    const otherChunk = chunk.filter(({ value }: any) => !isClothingCategory(value));

    const results = { synced: 0, sizesFound: 0, multiBuyFound: 0, errors: 0 };

    // Non-clothing: parallel (1 API call each)
    await Promise.allSettled(otherChunk.map(async ({ key, value: product }: any) => {
      const rawCode = product.code || product.productCode || product.sku || product.id;
      if (!rawCode) return;
      const baseCode = String(rawCode).replace(/^P_/i, '');
      try {
        const res = await fetch(`${UROPA_API_BASE}/products/${baseCode}?lang=en&curr=AUD&fields=FULL`, {
          headers: { 'Authorization': formatAuthHeader(token) }
        });
        if (!res.ok) return;
        const data = await res.json();
        const actualProduct = data?.products?.[0] || data;
        const multiBuyOptions = extractMultiBuy(data, pricingConfig);
        const updates: Record<string, any> = { lastSizeSyncedWithUropa: new Date().toISOString() };
        // Sync stock status
        const stockCode = actualProduct?.stock?.stockLevelStatus || actualProduct?.stockLevelStatus || '';
        if (stockCode) {
          updates.stockStatus = stockCode;
          updates.stockLevel = actualProduct?.stock?.stockLevel ?? null;
          updates.inStock = !['outOfStock', 'discontinued', 'discontinuedOutOfStock'].includes(stockCode);
        }
        if (multiBuyOptions.length > 0) { updates.multiBuyOptions = multiBuyOptions; updates.hasMultiBuy = true; results.multiBuyFound++; }
        await kv.set(key, { ...product, ...updates });
        results.synced++;
      } catch (err: any) { results.errors++; }
    }));

    // Clothing: sequential — get sizes AND multibuy, whatever exists
    for (const { key, value: product } of clothingChunk) {
      const rawCode = product.code || product.productCode || product.sku || product.id;
      if (!rawCode) continue;
      const baseCode = String(rawCode).replace(/^P_/i, '');
      try {
        const updates: Record<string, any> = { lastSizeSyncedWithUropa: new Date().toISOString() };

        // 1. Try base product for multibuy (aprons, fixed-size items)
        const baseRes = await fetch(`${UROPA_API_BASE}/products/${baseCode}?lang=en&curr=AUD&fields=FULL`, {
          headers: { 'Authorization': formatAuthHeader(token) }
        });
        if (baseRes.ok) {
          const baseData = await baseRes.json();
          const baseProduct = baseData?.products?.[0] || baseData;
          const multiBuyOptions = extractMultiBuy(baseData, pricingConfig);
          if (multiBuyOptions.length > 0) { updates.multiBuyOptions = multiBuyOptions; updates.hasMultiBuy = true; }
          // Sync stock status
          const stockCode = baseProduct?.stock?.stockLevelStatus || baseProduct?.stockLevelStatus || '';
          if (stockCode) {
            updates.stockStatus = stockCode;
            updates.stockLevel = baseProduct?.stock?.stockLevel ?? null;
            updates.inStock = !['outOfStock', 'discontinued', 'discontinuedOutOfStock'].includes(stockCode);
          }
        }

        // 2. Try size variants (chef jackets, pants etc.)
        const sizeVariants = await probeSizes(rawCode, token, pricingConfig);
        if (sizeVariants.length > 0) {
          updates.sizeOptions = sizeVariants;
          updates.hasSizeOptions = true;
          results.sizesFound++;
          // If size variants have their own multibuy, override base multibuy
          const anyVariantMultiBuy = sizeVariants.some((v: any) => v.hasMultiBuy);
          if (anyVariantMultiBuy) { delete updates.multiBuyOptions; updates.hasMultiBuy = true; }
        }

        if (updates.hasMultiBuy) results.multiBuyFound++;
        await kv.set(key, { ...product, ...updates });
        results.synced++;
        console.log(`✅ ${rawCode}: ${sizeVariants.length} sizes, multibuy=${!!updates.hasMultiBuy}`);
      } catch (err: any) {
        console.error(`❌ ${rawCode}:`, err.message);
        results.errors++;
      }
    }

    const newOffset = offset + chunk.length;
    console.log(`🔄 clothing=${clothingChunk.length} other=${otherChunk.length} sizes=${results.sizesFound} mb=${results.multiBuyFound}`);
    await kv.set('size-sync:cron-offset', newOffset);
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`🔄 [Size Batch] ${offset}→${newOffset}/${total} in ${duration}s`);

    return c.json({
      success: true, status: 'in_progress',
      progress: `${newOffset}/${total} (${Math.round(newOffset / total * 100)}%)`,
      chunk: chunk.length, clothing: clothingChunk.length, other: otherChunk.length,
      results, durationSeconds: duration,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// POST /size-sync/run — sync all eligible products, same pattern as price sync
// Processes 50 at a time with 1s sleep between batches — runs ~40 min for 1969 products
// ============================================
sizeSync.post('/run', async (c) => {
  const startTime = Date.now();
  try {
    const token = await getToken();
    if (!token) return c.json({ success: false, error: 'Uropa API token not configured' }, 400);

    const pricingConfig = await getPricingConfig();
    const allEntries = await kv.getByPrefixWithKeys('products:');

    console.log(`🔄 [Size Sync] ${allEntries.length} total products`);

    const results = { synced: 0, sizesFound: 0, multiBuyFound: 0, errors: 0 };
    const BATCH_SIZE = 50;

    for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
      const batch = allEntries.slice(i, i + BATCH_SIZE);

      const clothingBatch = batch.filter(({ value }: any) => isClothingCategory(value));
      const otherBatch = batch.filter(({ value }: any) => !isClothingCategory(value));

      // Non-clothing: parallel
      await Promise.allSettled(otherBatch.map(async ({ key, value: product }: any) => {
        const rawCode = product.code || product.productCode || product.sku || product.id;
        if (!rawCode) return;
        const baseCode = String(rawCode).replace(/^P_/i, '');
        try {
          const res = await fetch(`${UROPA_API_BASE}/products/${baseCode}?lang=en&curr=AUD&fields=FULL`, {
            headers: { 'Authorization': formatAuthHeader(token) }
          });
          if (!res.ok) return;
          const data = await res.json();
          const multiBuyOptions = extractMultiBuy(data, pricingConfig);
          const updates: Record<string, any> = { lastSizeSyncedWithUropa: new Date().toISOString() };
          if (multiBuyOptions.length > 0) { updates.multiBuyOptions = multiBuyOptions; updates.hasMultiBuy = true; results.multiBuyFound++; }
          await kv.set(key, { ...product, ...updates });
          results.synced++;
        } catch (err: any) { results.errors++; }
      }));

      // Clothing: sequential — get sizes AND multibuy, whatever exists
      for (const { key, value: product } of clothingBatch) {
        const rawCode = product.code || product.productCode || product.sku || product.id;
        if (!rawCode) continue;
        const baseCode = String(rawCode).replace(/^P_/i, '');
        try {
          const updates: Record<string, any> = { lastSizeSyncedWithUropa: new Date().toISOString() };

          // 1. Try base product for multibuy
          const baseRes = await fetch(`${UROPA_API_BASE}/products/${baseCode}?lang=en&curr=AUD&fields=FULL`, {
            headers: { 'Authorization': formatAuthHeader(token) }
          });
          if (baseRes.ok) {
            const baseData = await baseRes.json();
            const multiBuyOptions = extractMultiBuy(baseData, pricingConfig);
            if (multiBuyOptions.length > 0) { updates.multiBuyOptions = multiBuyOptions; updates.hasMultiBuy = true; }
          }

          // 2. Try size variants
          const sizeVariants = await probeSizes(rawCode, token, pricingConfig);
          if (sizeVariants.length > 0) {
            updates.sizeOptions = sizeVariants;
            updates.hasSizeOptions = true;
            results.sizesFound++;
            const anyVariantMultiBuy = sizeVariants.some((v: any) => v.hasMultiBuy);
            if (anyVariantMultiBuy) { delete updates.multiBuyOptions; updates.hasMultiBuy = true; }
          }

          if (updates.hasMultiBuy) results.multiBuyFound++;
          await kv.set(key, { ...product, ...updates });
          results.synced++;
          console.log(`✅ ${rawCode}: ${sizeVariants.length} sizes, multibuy=${!!updates.hasMultiBuy}`);
        } catch (err: any) {
          console.error(`❌ ${rawCode}:`, err.message);
          results.errors++;
        }
      }

      // 1 second sleep between batches — same as price sync, keeps CPU usage low
      if (i + BATCH_SIZE < eligible.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ [Size Sync] Done in ${duration}s`);

    return c.json({
      success: true,
      summary: { total: allEntries.length, synced: results.synced, sizesFound: results.sizesFound, multiBuyFound: results.multiBuyFound, errors: results.errors, durationSeconds: duration }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// GET /size-sync/stats — count synced, multibuy, sizes so far
// ============================================
sizeSync.get('/stats', async (c) => {
  try {
    const allEntries = await kv.getByPrefixWithKeys('products:');
    const allProducts = allEntries.map(({ value }: any) => value);
    const synced = allProducts.filter((p: any) => p.lastSizeSyncedWithUropa);
    const withMultiBuy = allProducts.filter((p: any) => p.hasMultiBuy === true);
    const withSizes = allProducts.filter((p: any) => p.hasSizeOptions === true);
    return c.json({
      success: true,
      total: allProducts.length,
      synced: synced.length,
      withMultiBuy: withMultiBuy.length,
      withSizes: withSizes.length,
      notYetSynced: allProducts.length - synced.length,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// GET /size-sync/test/:code — preview, no DB write
// ============================================
sizeSync.get('/test/:code', async (c) => {
  const rawCode = c.req.param('code');
  try {
    const token = await getToken();
    if (!token) return c.json({ success: false, error: 'Uropa API token not configured' }, 400);
    const baseCode = rawCode.replace(/^P_/i, '');
    const pricingConfig = await getPricingConfig();
    const baseRes = await fetch(`${UROPA_API_BASE}/products/${baseCode}?lang=en&curr=AUD&fields=FULL`, {
      headers: { 'Authorization': formatAuthHeader(token) }
    });
    const baseData = baseRes.ok ? await baseRes.json() : null;
    const multiBuyOptions = baseData ? extractMultiBuy(baseData, pricingConfig) : [];
    const sizeVariants = await probeSizes(baseCode, token, pricingConfig);
    return c.json({
      success: true, preview: true, dbWritten: false,
      productCode: rawCode, baseCode,
      sizeVariantsFound: sizeVariants.length > 0, sizeVariants,
      multiBuyFound: multiBuyOptions.length > 0, multiBuyOptions,
      message: `Found ${sizeVariants.length} size variant(s) and ${multiBuyOptions.length} multi-buy tier(s). Use GET /size-sync/single/${rawCode} to save.`
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// GET /size-sync/single/:code — probe + save
// ============================================
sizeSync.get('/single/:code', async (c) => {
  const rawCode = c.req.param('code');
  try {
    const token = await getToken();
    if (!token) return c.json({ success: false, error: 'Uropa API token not configured' }, 400);
    const allEntries = await kv.getByPrefixWithKeys('products:');
    const entry = allEntries.find(({ value: p }: any) =>
      p.code === rawCode || p.productCode === rawCode || p.sku === rawCode || p.id === rawCode ||
      p.code === rawCode.replace(/^P_/i, '') || String(p.id).replace(/^P_/i, '') === rawCode.replace(/^P_/i, '')
    );
    if (!entry) return c.json({ success: false, error: `Product ${rawCode} not found` }, 404);
    const { key: productKey, value: product } = entry;
    const baseCode = rawCode.replace(/^P_/i, '');
    const pricingConfig = await getPricingConfig();
    const baseRes = await fetch(`${UROPA_API_BASE}/products/${baseCode}?lang=en&curr=AUD&fields=FULL`, {
      headers: { 'Authorization': formatAuthHeader(token) }
    });
    const baseData = baseRes.ok ? await baseRes.json() : null;
    const multiBuyOptions = baseData ? extractMultiBuy(baseData, pricingConfig) : [];
    const sizeVariants = await probeSizes(baseCode, token, pricingConfig);
    const now = new Date().toISOString();
    const updates: Record<string, any> = { lastSizeSyncedWithUropa: now };
    if (sizeVariants.length > 0) { updates.sizeOptions = sizeVariants; updates.hasSizeOptions = true; }
    if (multiBuyOptions.length > 0) { updates.multiBuyOptions = multiBuyOptions; updates.hasMultiBuy = true; }
    await kv.set(productKey, { ...product, ...updates });
    return c.json({
      success: true, dbWritten: true, productCode: rawCode,
      sizeVariantsFound: sizeVariants.length > 0, sizeVariants,
      multiBuyFound: multiBuyOptions.length > 0, multiBuyOptions,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// GET /size-sync/raw/:code — raw Uropa priceDetail for debugging
// ============================================
sizeSync.get('/raw/:code', async (c) => {
  const rawCode = c.req.param('code');
  try {
    const token = await getToken();
    if (!token) return c.json({ success: false, error: 'No token' }, 400);
    const baseCode = rawCode.replace(/^P_/i, '');
    const res = await fetch(`${UROPA_API_BASE}/products/${baseCode}?lang=en&curr=AUD&fields=FULL`, {
      headers: { 'Authorization': formatAuthHeader(token) }
    });
    if (!res.ok) return c.json({ success: false, status: res.status });
    const data = await res.json();
    return c.json({ code: baseCode, hasPriceBreaks: data.priceDetail?.hasPriceBreaks, priceBreakdown: data.priceDetail?.priceBreakdown, priceDetail: data.priceDetail, stock: data.stock, stockStatus: data.stockStatus, stockLevel: data.stockLevel, availability: data.availability });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default sizeSync;
