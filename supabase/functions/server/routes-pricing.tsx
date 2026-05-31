/**
 * PRICING MANAGEMENT ROUTES
 * Endpoints for managing pricing tiers and bulk price updates
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';
import { calculateSellingPrice, DEFAULT_PRICING } from './pricing-calculator.tsx';

const pricing = new Hono();

// ============================================
// GET /pricing/config - Get current pricing configuration
// ============================================
pricing.get('/config', async (c) => {
  console.log('📡 [GET /pricing/config] Request received');

  try {
    // For now, just return defaults to bypass KV issue
    const config = DEFAULT_PRICING;

    console.log('📡 [GET /pricing/config] Returning default config');

    return c.json({
      success: true,
      config,
    });
  } catch (error: any) {
    console.error('❌ [GET /pricing/config] Error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// POST /pricing/config - Save pricing configuration
// ============================================
pricing.post('/config', async (c) => {
  try {
    const config = await c.req.json();

    // Validate config structure
    if (!config.tiers || !Array.isArray(config.tiers)) {
      return c.json({
        success: false,
        error: 'Invalid configuration: tiers must be an array',
      }, 400);
    }

    // Save to KV store
    await kv.set('pricing:config', config);

    console.log('✅ Pricing configuration saved:', config);

    return c.json({
      success: true,
      message: 'Pricing configuration saved successfully',
      config,
    });
  } catch (error: any) {
    console.error('❌ Error saving pricing config:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// POST /pricing/bulk-update - Process one batch of products (chunked approach)
// ============================================
pricing.post('/bulk-update', async (c) => {
  try {
    const body = await c.req.json();
    const { offset = 0, batchSize = 500 } = body;

    console.log(`🚀 [Bulk Update] Processing batch at offset ${offset}`);

    // Get current pricing config
    const savedConfig = await kv.get('pricing:config');
    const pricingConfig = savedConfig || DEFAULT_PRICING;

    // Get all products
    const allProducts = await kv.getByPrefix('products:');
    const totalProducts = allProducts.length;

    console.log(`📦 [Bulk Update] Total ${totalProducts} products, processing from offset ${offset}`);

    // Get this batch
    const batchProducts = allProducts.slice(offset, offset + batchSize);
    const batchNumber = Math.floor(offset / batchSize) + 1;
    const totalBatches = Math.ceil(totalProducts / batchSize);

    if (batchProducts.length === 0) {
      return c.json({
        success: true,
        completed: true,
        total: totalProducts,
        processed: totalProducts,
        message: 'All products processed'
      });
    }

    console.log(`📦 [Bulk Update] Processing batch ${batchNumber}/${totalBatches} (${batchProducts.length} products)`);

    const keysToUpdate: string[] = [];
    const valuesToUpdate: any[] = [];
    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    // Process each product in this batch
    for (const product of batchProducts) {
      try {
        const rawCost = product.tradePrice ||
                       product.baseCost ||
                       product.costPrice ||
                       product.cost ||
                       product.basePrice ||
                       0;

        const costPrice = parseFloat(rawCost);

        if (!costPrice || isNaN(costPrice) || costPrice <= 0) {
          unchanged++;
          continue;
        }

        const currentSellingPrice = parseFloat(
          product.sellingPrice ||
          product.salePrice ||
          product.price ||
          0
        );

        const newPricing = calculateSellingPrice(costPrice, pricingConfig);
        const priceChanged = Math.abs(newPricing.sellingPrice - currentSellingPrice) >= 0.01;

        if (priceChanged) {
          const updatedProduct = {
            ...product,
            tradePrice: product.tradePrice || costPrice,
            baseCost: costPrice,
            costPrice: costPrice,
            cost: costPrice,
            basePrice: costPrice,
            price: newPricing.sellingPrice,
            salePrice: newPricing.sellingPrice,
            sellingPrice: newPricing.sellingPrice,
            sellPrice: newPricing.sellingPrice,
            calculatedPrice: newPricing.sellingPrice,
            markup: newPricing.markup,
            markupPercent: newPricing.markupPercent,
            marginPercent: newPricing.marginPercent,
            tierLabel: newPricing.tierLabel,
            lastPriceUpdate: new Date().toISOString(),
            lastBulkUpdate: new Date().toISOString(),
          };

          keysToUpdate.push(`products:${product.id}`);
          valuesToUpdate.push(updatedProduct);
          updated++;
        } else {
          unchanged++;
        }
      } catch (error: any) {
        console.error(`❌ [Bulk Update] Error processing product ${product.code}:`, error);
        errors++;
      }
    }

    // Write updates in sub-batches of 100
    if (keysToUpdate.length > 0) {
      console.log(`💾 [Bulk Update] Writing ${keysToUpdate.length} updates...`);

      const WRITE_BATCH_SIZE = 100;
      for (let i = 0; i < keysToUpdate.length; i += WRITE_BATCH_SIZE) {
        const writeBatchKeys = keysToUpdate.slice(i, i + WRITE_BATCH_SIZE);
        const writeBatchValues = valuesToUpdate.slice(i, i + WRITE_BATCH_SIZE);

        try {
          await kv.mset(writeBatchKeys, writeBatchValues);
        } catch (error: any) {
          console.error(`❌ [Bulk Update] Error writing batch:`, error);
          errors += writeBatchKeys.length;
        }
      }
    }

    const processed = offset + batchProducts.length;
    const progress = Math.round((processed / totalProducts) * 100);
    const completed = processed >= totalProducts;

    console.log(`✅ [Bulk Update] Batch complete: ${processed}/${totalProducts} (${progress}%)`);

    return c.json({
      success: true,
      completed,
      total: totalProducts,
      processed,
      updated,
      unchanged,
      errors,
      progress,
      nextOffset: completed ? null : offset + batchSize,
      batchNumber,
      totalBatches,
      message: `Processed batch ${batchNumber}/${totalBatches}`
    });

  } catch (error: any) {
    console.error('❌ [Bulk Update] Error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// POST /pricing/test-single - Test price recalculation for single product (preview only)
// ============================================
pricing.post('/test-single', async (c) => {
  try {
    const body = await c.req.json();
    const { productCode } = body;
    
    console.log(`🧪 [Test Single Product] Testing product: ${productCode}`);
    
    // Find the product
    const allProducts = await kv.getByPrefix('products:');
    const product = allProducts.find((p: any) => 
      p.code === productCode || 
      p.productCode === productCode || 
      p.sku === productCode
    );
    
    if (!product) {
      return c.json({
        success: false,
        error: `Product not found with code: ${productCode}`
      }, 404);
    }
    
    console.log(`✅ [Test Single Product] Found product: ${product.name || product.id}`);
    
    // Get cost price
    // Check tradePrice first (from Uropa sync), then other cost fields
    const costPrice = parseFloat(
      product.tradePrice ||
      product.baseCost ||
      product.costPrice ||
      product.cost ||
      product.basePrice ||
      0
    );
    
    if (costPrice <= 0) {
      return c.json({
        success: false,
        error: `Product has no valid cost price (cost: ${costPrice})`
      }, 400);
    }
    
    // Get current selling price
    const currentSellingPrice = parseFloat(
      product.price ||
      product.sellingPrice ||
      product.salePrice ||
      0
    );
    
    // Get current pricing config
    const savedConfig = await kv.get('pricing:config');
    const pricingConfig = savedConfig || DEFAULT_PRICING;
    
    // Calculate NEW selling price
    const newPricing = calculateSellingPrice(costPrice, pricingConfig);
    
    console.log(`📊 [Test Single Product] Results:`,{
      costPrice,
      currentSellingPrice,
      newSellingPrice: newPricing.sellingPrice,
      difference: newPricing.sellingPrice - currentSellingPrice,
      tierUsed: newPricing.tierLabel
    });
    
    return c.json({
      success: true,
      product: {
        code: product.code || product.productCode || product.sku,
        name: product.name,
        id: product.id
      },
      before: {
        costPrice: costPrice.toFixed(2),
        sellingPrice: currentSellingPrice.toFixed(2)
      },
      after: {
        sellingPrice: newPricing.sellingPrice.toFixed(2),
        tierLabel: newPricing.tierLabel,
        markupPercent: newPricing.markupPercent.toFixed(2),
        marginPercent: newPricing.marginPercent.toFixed(2)
      },
      difference: (newPricing.sellingPrice - currentSellingPrice).toFixed(2),
      percentageChange: currentSellingPrice > 0 
        ? (((newPricing.sellingPrice - currentSellingPrice) / currentSellingPrice) * 100).toFixed(2)
        : '0',
      note: 'This is a preview only - no changes have been made to the database'
    });
    
  } catch (error: any) {
    console.error('❌ [Test Single Product] Error:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// ============================================
// POST /pricing/calculate - Calculate price for a given cost
// ============================================
pricing.post('/calculate', async (c) => {
  try {
    const { cost } = await c.req.json();

    if (!cost || cost <= 0) {
      return c.json({
        success: false,
        error: 'Invalid cost value',
      }, 400);
    }

    // Get current pricing config
    const savedConfig = await kv.get('pricing:config');
    const pricingConfig = savedConfig || DEFAULT_PRICING;

    // Calculate pricing
    const result = calculateSellingPrice(parseFloat(cost), pricingConfig);

    return c.json({
      success: true,
      cost: parseFloat(cost),
      result,
    });
  } catch (error: any) {
    console.error('❌ Error calculating price:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// GET /pricing/logs - Get bulk update history
// ============================================
pricing.get('/logs', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    
    const allLogs = await kv.getByPrefix('pricing:bulk-update-log:');
    
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
    console.error('❌ Error getting pricing logs:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default pricing;