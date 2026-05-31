import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx'; // Using custom kv with correct table name
import { createClient } from 'jsr:@supabase/supabase-js@2.49.8';

const app = new Hono();

console.log('🔄 Specials routes loaded - VERSION 4.0 - ALL ROUTES USE KV_CUSTOM');

const supabaseClient = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Get all specials
app.get('/', async (c) => {
  try {
    const allSpecials = await kv.getByPrefixWithKeys('special:');

    const parsedSpecials = allSpecials.map((item: any) => ({
      id: item.key.replace('special:', ''),
      ...item.value
    }));

    // Sort by priority (highest first), then by creation date
    parsedSpecials.sort((a: any, b: any) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return c.json({ success: true, specials: parsedSpecials });
  } catch (error) {
    console.error('Error fetching specials:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get active specials only
app.get('/active', async (c) => {
  try {
    const allSpecials = await kv.getByPrefixWithKeys('special:');
    const now = new Date();

    const activeSpecials = allSpecials
      .map((item: any) => ({
        id: item.key.replace('special:', ''),
        ...item.value
      }))
      .filter((special: any) => {
        if (!special.active) return false;

        const startDate = new Date(special.startDate);
        const endDate = new Date(special.endDate);

        return now >= startDate && now <= endDate;
      })
      .sort((a: any, b: any) => b.priority - a.priority);

    return c.json({ success: true, specials: activeSpecials });
  } catch (error) {
    console.error('Error fetching active specials:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get specials for a specific product/brand/category
app.get('/for/:type/:id', async (c) => {
  try {
    const type = c.req.param('type'); // 'product', 'brand', 'category'
    const id = c.req.param('id');

    const allSpecials = await kv.getByPrefixWithKeys('special:');
    const now = new Date();

    const applicableSpecials = allSpecials
      .map((item: any) => ({
        id: item.key.replace('special:', ''),
        ...item.value
      }))
      .filter((special: any) => {
        // Must be active
        if (!special.active) return false;

        // Must be within date range
        const startDate = new Date(special.startDate);
        const endDate = new Date(special.endDate);
        if (now < startDate || now > endDate) return false;

        // Must apply to this type
        if (special.applyTo === 'sitewide') return true;
        if (special.applyTo !== type) return false;

        // Must include this ID in targets
        return special.targetIds.includes(id);
      })
      .sort((a: any, b: any) => b.priority - a.priority);

    return c.json({ success: true, specials: applicableSpecials });
  } catch (error) {
    console.error('Error fetching specials for item:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Search for products containing a keyword (must be before /:id)
app.get('/search/:keyword', async (c) => {
  try {
    const keyword = c.req.param('keyword').toLowerCase();
    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from('kv_store_d1fbc049')
      .select('key, value')
      .like('key', 'products:%')
      .limit(2000);

    if (error) throw error;

    const matches: any[] = [];

    (data || []).forEach((item: any) => {
      const product = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
      const productStr = JSON.stringify(product).toLowerCase();

      if (productStr.includes(keyword)) {
        matches.push({
          code: item.key.replace('products:', ''),
          name: product.name,
          brand: product.brand,
          manufacturer: product.manufacturer,
          allFields: Object.keys(product)
        });
      }
    });

    return c.json({
      success: true,
      keyword: keyword,
      count: matches.length,
      matches: matches.slice(0, 10),
      sampleMatch: matches[0]
    });
  } catch (error) {
    console.error('Error searching products:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get list of all brands (must be before /:id)
app.get('/brands', async (c) => {
  try {
    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from('kv_store_d1fbc049')
      .select('key, value')
      .like('key', 'products:%')
      .limit(2000);

    if (error) throw error;

    const brandSet = new Set<string>();
    let samplePolarProduct = null;
    let sampleProduct = null;
    let rawSampleItem = null;

    (data || []).forEach((item: any, index: number) => {
      // Capture first raw item
      if (index === 0) rawSampleItem = item;

      const product = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;

      // Capture first product as sample
      if (!sampleProduct && product) sampleProduct = product;

      // Look for Polar in product name
      if (!samplePolarProduct && product && product.name && product.name.toLowerCase().includes('polar')) {
        samplePolarProduct = product;
      }

      if (product && product.brand) brandSet.add(product.brand);
    });

    const brands = Array.from(brandSet).sort();

    return c.json({
      success: true,
      count: brands.length,
      brands: brands,
      rawSampleItem: rawSampleItem,
      sampleProduct: sampleProduct,
      samplePolarProduct: samplePolarProduct
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get a single special by ID (must be AFTER specific routes like /search, /brands)
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const special = await kv.get(`special:${id}`);

    if (!special) {
      return c.json({ success: false, error: 'Special not found' }, 404);
    }

    return c.json({
      success: true,
      special: {
        id,
        ...special
      }
    });
  } catch (error) {
    console.error('Error fetching special:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create a new special
app.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.name || !body.type || !body.applyTo) {
      return c.json({
        success: false,
        error: 'Missing required fields: name, type, applyTo'
      }, 400);
    }

    // Generate ID
    const id = `special-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create special object
    const special = {
      name: body.name,
      type: body.type,
      active: body.active ?? true,
      startDate: body.startDate || new Date().toISOString(),
      endDate: body.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
      applyTo: body.applyTo,
      targetIds: body.targetIds || [],
      discountValue: body.discountValue,
      fixedPrice: body.fixedPrice,
      bogoConfig: body.bogoConfig,
      priority: body.priority ?? 1,
      stackWithMultibuy: body.stackWithMultibuy ?? false,
      stackWithCustomerDiscount: body.stackWithCustomerDiscount ?? true,
      badge: body.badge || 'SPECIAL',
      badgeColor: body.badgeColor || '#E31837',
      showOnProductCard: body.showOnProductCard ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: body.createdBy || 'admin'
    };

    // Save to database
    await kv.set(`special:${id}`, special);

    // Also add to active index if active
    if (special.active) {
      const activeList = await kv.get('specials_active') || [];
      if (!activeList.includes(id)) {
        activeList.push(id);
        await kv.set('specials_active', activeList);
      }
    }

    return c.json({
      success: true,
      special: { id, ...special },
      message: 'Special created successfully'
    });
  } catch (error) {
    console.error('Error creating special:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update a special
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    // Get existing special
    const existing = await kv.get(`special:${id}`);
    if (!existing) {
      return c.json({ success: false, error: 'Special not found' }, 404);
    }

    // Update special
    const updated = {
      ...existing,
      ...body,
      updatedAt: new Date().toISOString()
    };

    // Save to database
    await kv.set(`special:${id}`, updated);

    // Update active index
    const activeList = await kv.get('specials_active') || [];
    if (updated.active && !activeList.includes(id)) {
      activeList.push(id);
      await kv.set('specials_active', activeList);
    } else if (!updated.active && activeList.includes(id)) {
      const filtered = activeList.filter((sid: string) => sid !== id);
      await kv.set('specials_active', filtered);
    }

    return c.json({
      success: true,
      special: { id, ...updated },
      message: 'Special updated successfully'
    });
  } catch (error) {
    console.error('Error updating special:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete a special
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // Check if exists
    const existing = await kv.get(`special:${id}`);
    if (!existing) {
      return c.json({ success: false, error: 'Special not found' }, 404);
    }

    // Delete from database
    await kv.del(`special:${id}`);

    // Remove from active index
    const activeList = await kv.get('specials_active') || [];
    const filtered = activeList.filter((sid: string) => sid !== id);
    await kv.set('specials_active', filtered);

    return c.json({
      success: true,
      message: 'Special deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting special:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Preview - get products affected by a special
app.post('/preview', async (c) => {
  try {
    const body = await c.req.json();
    const { applyTo, targetIds } = body;

    // EXACT COPY from description-sync line 614
    const allProducts = await kv.getByPrefix('products:');
    console.log(`📦 [Preview] Total products in database: ${allProducts.length}`);

    let filteredProducts: any[] = [];

    // EXACT COPY from description-sync line 619-622
    if (applyTo === 'brand') {
      filteredProducts = allProducts.filter((p: any) =>
        targetIds.some((brand: string) =>
          (p.brand || p.manufacturer || '').toLowerCase() === brand.toLowerCase()
        )
      );
      console.log(`🏷️ [Preview] Filtered by brand "${targetIds.join(', ')}": ${filteredProducts.length} products`);
    } else if (applyTo === 'product') {
      filteredProducts = allProducts.filter((p: any) =>
        targetIds.includes(p.code || p.sku || p.model)
      );
    } else if (applyTo === 'sitewide') {
      filteredProducts = allProducts;
    } else if (applyTo === 'category') {
      filteredProducts = allProducts.filter((p: any) =>
        targetIds.includes(p.categoryId)
      );
    }

    // Map to preview format (first 50 only for display)
    const affectedProducts = filteredProducts.slice(0, 50).map((p: any) => ({
      code: p.code || p.sku || p.model,
      name: p.name,
      price: p.price || p.salePrice,
      brand: p.brand
    }));

    return c.json({
      success: true,
      count: filteredProducts.length, // Full count
      products: affectedProducts // First 50 for display
    });
  } catch (error) {
    console.error('Error previewing special:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default app;
