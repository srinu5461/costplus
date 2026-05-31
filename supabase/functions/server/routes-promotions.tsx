import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';

const app = new Hono();
const PROMOTIONS_KEY = 'product_promotions_v1';

// Get all active promotions
app.get('/', async (c) => {
  try {
    const promotions = await kv.get(PROMOTIONS_KEY) || [];
    return c.json(promotions);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return c.json({ error: 'Failed to fetch promotions' }, 500);
  }
});

// Get promotion for specific product
app.get('/product/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');
    const promotions = await kv.get(PROMOTIONS_KEY) || [];
    const promotion = promotions.find((p: any) => p.productId === productId);

    return c.json(promotion || null);
  } catch (error) {
    console.error('Error fetching promotion:', error);
    return c.json({ error: 'Failed to fetch promotion' }, 500);
  }
});

// Add or update single promotion
app.post('/', async (c) => {
  try {
    console.log('[Promotions] POST / - Adding single promotion');
    const body = await c.req.json();
    console.log('[Promotions] Request body:', body);

    const { productId, productCode, productName, promotionalPrice } = body;

    if (!productId || !promotionalPrice) {
      console.error('[Promotions] Missing required fields:', { productId, promotionalPrice });
      return c.json({ error: 'Missing required fields' }, 400);
    }

    console.log('[Promotions] Fetching existing promotions...');
    const promotions = await kv.get(PROMOTIONS_KEY) || [];
    console.log('[Promotions] Current promotions count:', promotions.length);

    const newPromotion = {
      id: `promo_${productId}_${Date.now()}`,
      productId,
      productCode,
      productName,
      promotionalPrice,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('[Promotions] Created new promotion:', newPromotion);

    // Remove existing promotion for this product
    const filtered = promotions.filter((p: any) => p.productId !== productId);
    filtered.push(newPromotion);

    console.log('[Promotions] Saving promotions array (count:', filtered.length, ')');
    await kv.set(PROMOTIONS_KEY, filtered);
    console.log('[Promotions] ✅ Promotion saved successfully');

    return c.json({ success: true, promotion: newPromotion });
  } catch (error) {
    console.error('[Promotions] ❌ Error adding promotion:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Bulk add/update promotions
app.post('/bulk', async (c) => {
  try {
    console.log('[Promotions] POST /bulk - Bulk update promotions');
    const body = await c.req.json();
    const { promotions: newPromotions } = body;

    console.log('[Promotions] Received', newPromotions?.length, 'promotions');

    if (!newPromotions || !Array.isArray(newPromotions)) {
      console.error('[Promotions] Invalid promotions array');
      return c.json({ error: 'Invalid promotions array' }, 400);
    }

    console.log('[Promotions] Fetching existing promotions...');
    const existingPromotions = await kv.get(PROMOTIONS_KEY) || [];
    console.log('[Promotions] Current promotions count:', existingPromotions.length);

    // Process new promotions - just store the promotional price
    const formattedPromotions = newPromotions.map((promo: any) => {
      return {
        id: `promo_${promo.productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: promo.productId,
        productCode: promo.productCode,
        productName: promo.productName,
        promotionalPrice: promo.promotionalPrice,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    console.log('[Promotions] Formatted', formattedPromotions.length, 'new promotions');

    // Remove existing promotions for these products
    const productIds = new Set(formattedPromotions.map((p: any) => p.productId));
    const filtered = existingPromotions.filter((p: any) => !productIds.has(p.productId));

    // Add new promotions
    const allPromotions = [...filtered, ...formattedPromotions];

    console.log('[Promotions] Saving', allPromotions.length, 'total promotions to KV store...');
    await kv.set(PROMOTIONS_KEY, allPromotions);
    console.log('[Promotions] ✅ Bulk promotions saved successfully');

    return c.json({
      success: true,
      count: formattedPromotions.length,
      promotions: formattedPromotions
    });
  } catch (error) {
    console.error('[Promotions] ❌ Error bulk adding promotions:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete promotion
app.delete('/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');
    const promotions = await kv.get(PROMOTIONS_KEY) || [];

    const filtered = promotions.filter((p: any) => p.productId !== productId);

    await kv.set(PROMOTIONS_KEY, filtered);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    return c.json({ error: 'Failed to delete promotion' }, 500);
  }
});

// Clear all promotions
app.delete('/', async (c) => {
  try {
    await kv.set(PROMOTIONS_KEY, []);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error clearing promotions:', error);
    return c.json({ error: 'Failed to clear promotions' }, 500);
  }
});

export default app;
