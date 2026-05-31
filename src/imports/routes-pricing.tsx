/**
 * PRICING MANAGEMENT API ROUTES
 * Manage markup tiers and bulk price recalculation
 */

import { Hono } from 'npm:hono';
import * as kv from '/supabase/functions/server/kv_custom.tsx';

const pricing = new Hono();

// ============================================
// DEFAULT PRICING TIERS
// ============================================
const DEFAULT_PRICING_TIERS = [
  { min: 0, max: 50, markup: 50, label: 'Under $50' },
  { min: 50, max: 100, markup: 40, label: '$50 - $100' },
  { min: 100, max: 250, markup: 35, label: '$100 - $250' },
  { min: 250, max: 500, markup: 30, label: '$250 - $500' },
  { min: 500, max: 1000, markup: 25, label: '$500 - $1,000' },
  { min: 1000, max: 2500, markup: 20, label: '$1,000 - $2,500' },
  { min: 2500, max: 5000, markup: 15, label: '$2,500 - $5,000' },
  { min: 5000, max: Infinity, markup: 12, label: 'Over $5,000' }
];

const DEFAULT_MINIMUM_MARGIN = 15; // 15% minimum margin floor

// ============================================
// GET PRICING SETTINGS
// ============================================
pricing.get('/settings', async (c) => {
  try {
    let settings = await kv.get('pricing_settings');
    
    // Initialize with defaults if not exists
    if (!settings) {
      settings = {
        tiers: DEFAULT_PRICING_TIERS,
        minimumMargin: DEFAULT_MINIMUM_MARGIN,
        updatedAt: new Date().toISOString(),
        updatedBy: 'System'
      };
      await kv.set('pricing_settings', settings);
    }
    
    return c.json({ success: true, settings });
  } catch (error: any) {
    console.error('❌ Error fetching pricing settings:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// UPDATE PRICING SETTINGS
// ============================================
pricing.put('/settings', async (c) => {
  try {
    const body = await c.req.json();
    const { tiers, minimumMargin, updatedBy } = body;
    
    // Validate tiers
    if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
      return c.json({ success: false, error: 'Invalid pricing tiers' }, 400);
    }
    
    // Validate minimum margin
    if (minimumMargin === undefined || minimumMargin < 0 || minimumMargin > 100) {
      return c.json({ success: false, error: 'Minimum margin must be between 0 and 100' }, 400);
    }
    
    // Sort tiers by min value
    tiers.sort((a: any, b: any) => a.min - b.min);
    
    const settings = {
      tiers,
      minimumMargin,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Admin'
    };
    
    await kv.set('pricing_settings', settings);
    
    console.log('✅ Pricing settings updated');
    console.log('   Tiers:', tiers.length);
    console.log('   Minimum Margin:', minimumMargin + '%');
    console.log('   Updated By:', updatedBy);
    
    return c.json({ success: true, message: 'Pricing settings updated', settings });
  } catch (error: any) {
    console.error('❌ Error updating pricing settings:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// CALCULATE SELL PRICE FROM COST PRICE
// ============================================
export function calculateSellPrice(costPrice: number, pricingSettings?: any): number {
  if (!costPrice || costPrice <= 0) return 0;
  
  // Use provided settings or defaults
  const tiers = pricingSettings?.tiers || DEFAULT_PRICING_TIERS;
  const minimumMargin = pricingSettings?.minimumMargin || DEFAULT_MINIMUM_MARGIN;
  
  // Find applicable tier
  const tier = tiers.find((t: any) => costPrice >= t.min && costPrice < t.max);
  
  if (!tier) {
    console.warn('⚠️ No pricing tier found for cost price:', costPrice);
    // Fallback to last tier's markup
    const lastTier = tiers[tiers.length - 1];
    const markup = lastTier?.markup || 20;
    return costPrice * (1 + markup / 100);
  }
  
  // Calculate sell price with markup
  let sellPrice = costPrice * (1 + tier.markup / 100);
  
  // Apply minimum margin floor
  const minimumSellPrice = costPrice * (1 + minimumMargin / 100);
  if (sellPrice < minimumSellPrice) {
    sellPrice = minimumSellPrice;
  }
  
  // Round to 2 decimal places
  return Math.round(sellPrice * 100) / 100;
}

// ============================================
// CALCULATE MARGIN PERCENTAGE
// ============================================
export function calculateMargin(costPrice: number, sellPrice: number): number {
  if (!costPrice || costPrice <= 0 || !sellPrice || sellPrice <= 0) return 0;
  return Math.round(((sellPrice - costPrice) / costPrice) * 100 * 100) / 100;
}

// ============================================
// PREVIEW PRICING CHANGES (DRY RUN)
// ============================================
pricing.post('/preview', async (c) => {
  try {
    const body = await c.req.json();
    const { tiers, minimumMargin, sampleSize } = body;
    
    // Get all products
    const allProducts = await kv.getByPrefix('products:');
    
    // Limit sample size for preview
    const limit = sampleSize || 100;
    const products = allProducts.slice(0, limit);
    
    const previewSettings = { tiers, minimumMargin };
    
    const previews = products.map((product: any) => {
      const costPrice = product.costPrice || 0;
      const currentSellPrice = product.sellPrice || 0;
      const newSellPrice = calculateSellPrice(costPrice, previewSettings);
      
      const currentMargin = calculateMargin(costPrice, currentSellPrice);
      const newMargin = calculateMargin(costPrice, newSellPrice);
      
      const priceDifference = newSellPrice - currentSellPrice;
      const priceChangePercent = currentSellPrice > 0 
        ? Math.round((priceDifference / currentSellPrice) * 100 * 100) / 100
        : 0;
      
      return {
        productId: product.productId || product.id,
        name: product.name,
        sku: product.sku,
        costPrice,
        currentSellPrice,
        newSellPrice,
        currentMargin,
        newMargin,
        priceDifference,
        priceChangePercent
      };
    });
    
    // Calculate summary statistics
    const totalProducts = allProducts.length;
    const averagePriceChange = previews.reduce((sum, p) => sum + p.priceChangePercent, 0) / previews.length;
    const priceIncreases = previews.filter(p => p.priceDifference > 0).length;
    const priceDecreases = previews.filter(p => p.priceDifference < 0).length;
    const noChange = previews.filter(p => p.priceDifference === 0).length;
    
    const summary = {
      totalProducts,
      previewedProducts: previews.length,
      averagePriceChange: Math.round(averagePriceChange * 100) / 100,
      priceIncreases,
      priceDecreases,
      noChange
    };
    
    return c.json({ 
      success: true, 
      summary,
      previews,
      message: `Preview calculated for ${previews.length} of ${totalProducts} products`
    });
  } catch (error: any) {
    console.error('❌ Error generating pricing preview:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// BULK RECALCULATE ALL PRODUCT PRICES
// ============================================
pricing.post('/recalculate', async (c) => {
  try {
    const body = await c.req.json();
    const { useSavedSettings, customSettings, updatedBy } = body;
    
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('💰 BULK PRICE RECALCULATION STARTED');
    console.log('═══════════════════════════════════════════════');
    console.log('⏰ Started at:', new Date().toISOString());
    console.log('👤 Initiated by:', updatedBy || 'Admin');
    
    // Get pricing settings
    let pricingSettings;
    if (useSavedSettings) {
      pricingSettings = await kv.get('pricing_settings');
      if (!pricingSettings) {
        pricingSettings = {
          tiers: DEFAULT_PRICING_TIERS,
          minimumMargin: DEFAULT_MINIMUM_MARGIN
        };
      }
      console.log('📋 Using saved pricing settings');
    } else if (customSettings) {
      pricingSettings = customSettings;
      console.log('📋 Using custom pricing settings');
    } else {
      return c.json({ 
        success: false, 
        error: 'Either useSavedSettings or customSettings must be provided' 
      }, 400);
    }
    
    console.log('💵 Pricing Configuration:');
    console.log('   Tiers:', pricingSettings.tiers.length);
    console.log('   Minimum Margin:', pricingSettings.minimumMargin + '%');
    
    // Get all products
    const allProducts = await kv.getByPrefix('products:');
    console.log('📦 Total products found:', allProducts.length);
    
    if (allProducts.length === 0) {
      return c.json({ 
        success: false, 
        error: 'No products found in database' 
      }, 404);
    }
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const updates = [];
    
    // Process each product
    for (const product of allProducts) {
      try {
        const costPrice = product.costPrice || 0;
        
        if (costPrice <= 0) {
          skipped++;
          console.log(`⏭️  Skipped ${product.sku || product.productId}: No valid cost price`);
          continue;
        }
        
        const oldSellPrice = product.sellPrice || 0;
        const newSellPrice = calculateSellPrice(costPrice, pricingSettings);
        
        // Update product with new sell price
        product.sellPrice = newSellPrice;
        product.margin = calculateMargin(costPrice, newSellPrice);
        product.priceUpdatedAt = new Date().toISOString();
        product.priceUpdatedBy = updatedBy || 'Admin';
        
        // Save to database
        const productKey = `products:${product.productId || product.id}`;
        await kv.set(productKey, product);
        
        updated++;
        updates.push({
          productId: product.productId || product.id,
          sku: product.sku,
          name: product.name,
          costPrice,
          oldSellPrice,
          newSellPrice,
          difference: newSellPrice - oldSellPrice,
          margin: product.margin
        });
        
        // Log every 100 products
        if (updated % 100 === 0) {
          console.log(`✅ Progress: ${updated} products updated...`);
        }
      } catch (productError: any) {
        errors++;
        console.error(`❌ Error updating product ${product.sku || product.productId}:`, productError.message);
      }
    }
    
    // Create recalculation record
    const recalculationRecord = {
      recalculationId: `RECALC-${Date.now()}`,
      timestamp: new Date().toISOString(),
      updatedBy: updatedBy || 'Admin',
      pricingSettings,
      results: {
        totalProducts: allProducts.length,
        updated,
        skipped,
        errors
      },
      sampleUpdates: updates.slice(0, 50) // Store first 50 updates as sample
    };
    
    await kv.set(`price_recalculation:${recalculationRecord.recalculationId}`, recalculationRecord);
    
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('✅ BULK PRICE RECALCULATION COMPLETED');
    console.log('═══════════════════════════════════════════════');
    console.log('📊 Results:');
    console.log(`   Total Products: ${allProducts.length}`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('⏰ Completed at:', new Date().toISOString());
    console.log('');
    
    return c.json({ 
      success: true, 
      message: `Successfully recalculated prices for ${updated} products`,
      results: {
        totalProducts: allProducts.length,
        updated,
        skipped,
        errors
      },
      recalculationId: recalculationRecord.recalculationId,
      sampleUpdates: updates.slice(0, 20) // Return first 20 as sample
    });
  } catch (error: any) {
    console.error('❌ Error during bulk price recalculation:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// GET RECALCULATION HISTORY
// ============================================
pricing.get('/recalculation-history', async (c) => {
  try {
    const history = await kv.getByPrefix('price_recalculation:');
    
    // Sort by timestamp (newest first)
    history.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return c.json({ 
      success: true, 
      history,
      total: history.length
    });
  } catch (error: any) {
    console.error('❌ Error fetching recalculation history:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// CALCULATE SINGLE PRODUCT PRICE
// ============================================
pricing.post('/calculate-single', async (c) => {
  try {
    const body = await c.req.json();
    const { costPrice } = body;
    
    if (!costPrice || costPrice <= 0) {
      return c.json({ success: false, error: 'Valid cost price required' }, 400);
    }
    
    // Get current pricing settings
    let pricingSettings = await kv.get('pricing_settings');
    if (!pricingSettings) {
      pricingSettings = {
        tiers: DEFAULT_PRICING_TIERS,
        minimumMargin: DEFAULT_MINIMUM_MARGIN
      };
    }
    
    const sellPrice = calculateSellPrice(costPrice, pricingSettings);
    const margin = calculateMargin(costPrice, sellPrice);
    
    // Find which tier was applied
    const tier = pricingSettings.tiers.find((t: any) => 
      costPrice >= t.min && costPrice < t.max
    );
    
    return c.json({ 
      success: true, 
      costPrice,
      sellPrice,
      margin,
      tierApplied: tier || null,
      minimumMargin: pricingSettings.minimumMargin
    });
  } catch (error: any) {
    console.error('❌ Error calculating single product price:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default pricing;
