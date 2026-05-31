import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const PROMOTIONS_TABLE = 'product_promotions_d1fbc049';

// Create promotions table if it doesn't exist
export async function ensurePromotionsTable(supabase: any) {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS ${PROMOTIONS_TABLE} (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        product_code TEXT,
        discount_percentage REAL NOT NULL,
        original_price REAL NOT NULL,
        promotional_price REAL NOT NULL,
        savings REAL NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id)
      );
      CREATE INDEX IF NOT EXISTS idx_promotions_product_id ON ${PROMOTIONS_TABLE}(product_id);
      CREATE INDEX IF NOT EXISTS idx_promotions_active ON ${PROMOTIONS_TABLE}(active);
    `
  });

  if (error && !error.message.includes('already exists')) {
    console.error('Error creating promotions table:', error);
  }
}

// Get all active promotions
export async function getActivePromotions(supabase: any) {
  const { data, error } = await supabase
    .from(PROMOTIONS_TABLE)
    .select('*')
    .eq('active', true);

  if (error) {
    console.error('Error fetching promotions:', error);
    return [];
  }

  return data || [];
}

// Get promotions for specific products
export async function getPromotionsForProducts(supabase: any, productIds: string[]) {
  const { data, error } = await supabase
    .from(PROMOTIONS_TABLE)
    .select('*')
    .in('product_id', productIds)
    .eq('active', true);

  if (error) {
    console.error('Error fetching promotions for products:', error);
    return [];
  }

  return data || [];
}

// Add or update promotion
export async function upsertPromotion(
  supabase: any,
  productId: string,
  productCode: string,
  discountPercentage: number,
  originalPrice: number
) {
  const promotionalPrice = originalPrice * (1 - discountPercentage / 100);
  const savings = originalPrice - promotionalPrice;

  const promotion = {
    id: `promo_${productId}_${Date.now()}`,
    product_id: productId,
    product_code: productCode,
    discount_percentage: discountPercentage,
    original_price: originalPrice,
    promotional_price: promotionalPrice,
    savings: savings,
    active: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(PROMOTIONS_TABLE)
    .upsert(promotion, { onConflict: 'product_id' })
    .select();

  if (error) {
    console.error('Error upserting promotion:', error);
    throw error;
  }

  return data;
}

// Remove promotion
export async function removePromotion(supabase: any, productId: string) {
  const { error } = await supabase
    .from(PROMOTIONS_TABLE)
    .delete()
    .eq('product_id', productId);

  if (error) {
    console.error('Error removing promotion:', error);
    throw error;
  }
}

// Bulk upsert promotions
export async function bulkUpsertPromotions(supabase: any, promotions: any[]) {
  const formattedPromotions = promotions.map(promo => ({
    id: `promo_${promo.product_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    product_id: promo.product_id,
    product_code: promo.product_code,
    discount_percentage: promo.discount_percentage,
    original_price: promo.original_price,
    promotional_price: promo.original_price * (1 - promo.discount_percentage / 100),
    savings: promo.original_price * (promo.discount_percentage / 100),
    active: true,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from(PROMOTIONS_TABLE)
    .upsert(formattedPromotions, { onConflict: 'product_id' })
    .select();

  if (error) {
    console.error('Error bulk upserting promotions:', error);
    throw error;
  }

  return data;
}

// Clear all promotions
export async function clearAllPromotions(supabase: any) {
  const { error } = await supabase
    .from(PROMOTIONS_TABLE)
    .delete()
    .neq('id', '');

  if (error) {
    console.error('Error clearing promotions:', error);
    throw error;
  }
}
