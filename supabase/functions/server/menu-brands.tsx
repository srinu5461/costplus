import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';

const menuBrands = new Hono();

const MENU_BRANDS_KEY_PREFIX = 'menu-brand:';
const MENU_BRANDS_LIST_KEY = 'menu-brands:list';

interface MenuBrand {
  id: string;
  name: string;
  slug: string;
  path?: string; // Custom path (optional, defaults to /brands/{slug})
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Helper to generate unique ID
function generateId(): string {
  return `brand-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get all menu brands
menuBrands.get('/make-server-d1fbc049/menu-brands', async (c) => {
  try {
    console.log('📋 Fetching all menu brands...');

    // Get list of brand IDs
    const brandIds = await kv.get(MENU_BRANDS_LIST_KEY) as string[] || [];
    
    if (brandIds.length === 0) {
      // Initialize with default brands if none exist
      console.log('⚡ No brands found, creating defaults...');
      const defaultBrands: MenuBrand[] = [
        {
          id: generateId(),
          name: 'Polar Refrigeration',
          slug: 'polar',
          sortOrder: 0,
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: generateId(),
          name: 'Thor Range',
          slug: 'thor',
          sortOrder: 1,
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: generateId(),
          name: 'Apuro Range',
          slug: 'apuro',
          sortOrder: 2,
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      // Save default brands
      const newBrandIds = defaultBrands.map(b => b.id);
      await kv.set(MENU_BRANDS_LIST_KEY, newBrandIds);
      
      for (const brand of defaultBrands) {
        await kv.set(`${MENU_BRANDS_KEY_PREFIX}${brand.id}`, brand);
      }

      return c.json({ brands: defaultBrands });
    }

    // Fetch all brands
    const brands = await kv.mget(brandIds.map(id => `${MENU_BRANDS_KEY_PREFIX}${id}`)) as MenuBrand[];
    
    // Filter out null values and sort by sortOrder
    const validBrands = brands
      .filter(b => b !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    console.log(`✅ Found ${validBrands.length} menu brands`);
    return c.json({ brands: validBrands });
  } catch (error) {
    console.error('❌ Error fetching menu brands:', error);
    return c.json({ error: 'Failed to fetch menu brands', brands: [] }, 500);
  }
});

// Create new menu brand
menuBrands.post('/make-server-d1fbc049/menu-brands', async (c) => {
  try {
    const { name, slug, path, enabled = true } = await c.req.json();

    if (!name || !slug) {
      return c.json({ error: 'Name and slug are required' }, 400);
    }

    console.log(`➕ Creating new menu brand: ${name} (${slug})`);

    // Get existing brand IDs
    const brandIds = await kv.get(MENU_BRANDS_LIST_KEY) as string[] || [];

    // Create new brand
    const newBrand: MenuBrand = {
      id: generateId(),
      name,
      slug: slug.toLowerCase(),
      path: path || undefined, // Custom path or undefined (will default to /brands/{slug})
      sortOrder: brandIds.length, // Add to end
      enabled,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save brand
    await kv.set(`${MENU_BRANDS_KEY_PREFIX}${newBrand.id}`, newBrand);

    // Update brand IDs list
    brandIds.push(newBrand.id);
    await kv.set(MENU_BRANDS_LIST_KEY, brandIds);

    console.log(`✅ Menu brand created: ${newBrand.id}`);
    return c.json({ brand: newBrand });
  } catch (error) {
    console.error('❌ Error creating menu brand:', error);
    return c.json({ error: 'Failed to create menu brand' }, 500);
  }
});

// Update menu brand
menuBrands.put('/make-server-d1fbc049/menu-brands/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { name, slug, path, enabled } = await c.req.json();

    console.log(`✏️ Updating menu brand: ${id}`);

    // Get existing brand
    const existingBrand = await kv.get(`${MENU_BRANDS_KEY_PREFIX}${id}`) as MenuBrand;

    if (!existingBrand) {
      return c.json({ error: 'Brand not found' }, 404);
    }

    // Update brand
    const updatedBrand: MenuBrand = {
      ...existingBrand,
      name: name || existingBrand.name,
      slug: slug ? slug.toLowerCase() : existingBrand.slug,
      path: path !== undefined ? (path || undefined) : existingBrand.path, // Allow clearing path
      enabled: enabled !== undefined ? enabled : existingBrand.enabled,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`${MENU_BRANDS_KEY_PREFIX}${id}`, updatedBrand);

    console.log(`✅ Menu brand updated: ${id}`);
    return c.json({ brand: updatedBrand });
  } catch (error) {
    console.error('❌ Error updating menu brand:', error);
    return c.json({ error: 'Failed to update menu brand' }, 500);
  }
});

// Delete menu brand
menuBrands.delete('/make-server-d1fbc049/menu-brands/:id', async (c) => {
  try {
    const id = c.req.param('id');

    console.log(`🗑️ Deleting menu brand: ${id}`);

    // Get existing brand IDs
    const brandIds = await kv.get(MENU_BRANDS_LIST_KEY) as string[] || [];
    
    // Remove from list
    const newBrandIds = brandIds.filter(brandId => brandId !== id);
    
    // Delete brand data
    await kv.del(`${MENU_BRANDS_KEY_PREFIX}${id}`);
    
    // Update list
    await kv.set(MENU_BRANDS_LIST_KEY, newBrandIds);

    console.log(`✅ Menu brand deleted: ${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting menu brand:', error);
    return c.json({ error: 'Failed to delete menu brand' }, 500);
  }
});

// Toggle enabled status
menuBrands.patch('/make-server-d1fbc049/menu-brands/:id/toggle', async (c) => {
  try {
    const id = c.req.param('id');
    const { enabled } = await c.req.json();

    console.log(`🔄 Toggling menu brand: ${id} -> ${enabled}`);

    // Get existing brand
    const existingBrand = await kv.get(`${MENU_BRANDS_KEY_PREFIX}${id}`) as MenuBrand;
    
    if (!existingBrand) {
      return c.json({ error: 'Brand not found' }, 404);
    }

    // Update enabled status
    const updatedBrand: MenuBrand = {
      ...existingBrand,
      enabled,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`${MENU_BRANDS_KEY_PREFIX}${id}`, updatedBrand);

    console.log(`✅ Menu brand toggled: ${id}`);
    return c.json({ brand: updatedBrand });
  } catch (error) {
    console.error('❌ Error toggling menu brand:', error);
    return c.json({ error: 'Failed to toggle menu brand' }, 500);
  }
});

// Reorder brands
menuBrands.post('/make-server-d1fbc049/menu-brands/reorder', async (c) => {
  try {
    const { brands } = await c.req.json();

    console.log('🔄 Reordering menu brands...');

    // Update sortOrder for each brand
    for (const { id, sortOrder } of brands) {
      const existingBrand = await kv.get(`${MENU_BRANDS_KEY_PREFIX}${id}`) as MenuBrand;
      
      if (existingBrand) {
        const updatedBrand: MenuBrand = {
          ...existingBrand,
          sortOrder,
          updatedAt: new Date().toISOString(),
        };
        
        await kv.set(`${MENU_BRANDS_KEY_PREFIX}${id}`, updatedBrand);
      }
    }

    console.log('✅ Menu brands reordered');
    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Error reordering menu brands:', error);
    return c.json({ error: 'Failed to reorder menu brands' }, 500);
  }
});

export default menuBrands;
