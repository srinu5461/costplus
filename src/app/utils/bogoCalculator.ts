import type { Special, AppliedSpecial, BOGOGroup } from '../../types/specials';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface CartItem {
  product: {
    code: string;
    name: string;
    price: number;
    brand?: string;
    categoryId?: string;
  };
  quantity: number;
}

export interface BOGOCalculationResult {
  appliedSpecials: AppliedSpecial[];
  totalDiscount: number;
  originalTotal: number;
  finalTotal: number;
}

// Cache for active specials (refresh every 5 minutes)
let specialsCache: Special[] | null = null;
let specialsCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Request deduplication: track in-flight request
let inflightRequest: Promise<Special[]> | null = null;

// Force clear cache on module load for testing
if (typeof window !== 'undefined') {
  console.log('[BOGO] Module loaded - clearing cache');
  specialsCache = null;
  specialsCacheTime = 0;
  inflightRequest = null;
}

/**
 * Fetch active specials from backend with caching and request deduplication
 */
async function getActiveSpecials(): Promise<Special[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (specialsCache && (now - specialsCacheTime) < CACHE_DURATION) {
    const cacheAge = Math.floor((now - specialsCacheTime) / 1000);
    console.log(`[BOGO] Using cached specials (${cacheAge}s old, ${specialsCache.length} specials)`);
    return specialsCache;
  }

  // If a request is already in flight, wait for it instead of starting a new one
  if (inflightRequest) {
    console.log(`[BOGO] ⏳ Request already in flight, waiting...`);
    return inflightRequest;
  }

  console.log(`[BOGO] Fetching fresh specials from API...`);

  // Start the request and store the promise
  inflightRequest = (async () => {
    try {
      const response = await fetch(`${API_URL}/specials/active`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      const data = await response.json();
      console.log(`[BOGO] API Response:`, data);

      if (data.success) {
        specialsCache = data.specials;
        specialsCacheTime = now;
        console.log(`[BOGO] ✅ Cached ${data.specials.length} active specials`);
        return data.specials;
      }
    } catch (error) {
      // Silently fail - expected in preview mode when backend is unavailable
      // Only log in development for debugging
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.log('[BOGO] ℹ️ Specials not available (backend may not be deployed)');
      }
    } finally {
      // Clear the in-flight request
      inflightRequest = null;
    }

    return [];
  })();

  return inflightRequest;
}

/**
 * Clear specials cache (call this when specials are updated)
 */
export function clearSpecialsCache() {
  specialsCache = null;
  specialsCacheTime = 0;
}

/**
 * Check if a product qualifies for a special
 */
function productQualifiesForSpecial(
  product: { code: string; brand?: string; categoryId?: string },
  special: Special
): boolean {
  if (special.applyTo === 'sitewide') {
    return true;
  }

  if (special.applyTo === 'product') {
    return special.targetIds.includes(product.code);
  }

  if (special.applyTo === 'brand' && product.brand) {
    // Case-insensitive brand matching
    const matches = special.targetIds.some(targetBrand =>
      targetBrand.toLowerCase() === product.brand!.toLowerCase()
    );
    if (!matches) {
      console.log(`[BOGO Match] Brand "${product.brand}" not in targetIds:`, special.targetIds);
    } else {
      console.log(`[BOGO Match] ✅ Brand "${product.brand}" MATCHES targetIds:`, special.targetIds);
    }
    return matches;
  }

  if (special.applyTo === 'category' && product.categoryId) {
    return special.targetIds.includes(product.categoryId);
  }

  return false;
}

/**
 * Calculate BOGO discount for a group of items
 */
function calculateBOGODiscount(
  items: Array<{ code: string; name: string; price: number; quantity: number }>,
  special: Special
): { discountAmount: number; affectedProducts: string[]; description: string } {
  const config = special.bogoConfig!;
  let totalDiscount = 0;
  const affectedProducts: string[] = [];

  // Flatten items array to include each individual item
  const individualItems: Array<{ code: string; name: string; price: number; index: number }> = [];
  items.forEach((item, idx) => {
    for (let i = 0; i < item.quantity; i++) {
      individualItems.push({ ...item, index: idx });
    }
  });

  // Sort by price (descending or ascending based on applyToLowest)
  if (config.applyToLowest) {
    individualItems.sort((a, b) => a.price - b.price); // Ascending (cheapest first)
  } else {
    individualItems.sort((a, b) => b.price - a.price); // Descending (most expensive first)
  }

  // Group items into BOGO sets
  const requiredForDiscount = config.buyQuantity + config.getQuantity;
  const numSets = Math.floor(individualItems.length / requiredForDiscount);

  for (let set = 0; set < numSets; set++) {
    const setStartIndex = set * requiredForDiscount;
    const buyItems = individualItems.slice(setStartIndex, setStartIndex + config.buyQuantity);
    const getItems = individualItems.slice(setStartIndex + config.buyQuantity, setStartIndex + requiredForDiscount);

    // Apply discount to "get" items
    getItems.forEach((item) => {
      let itemDiscount = 0;

      if (config.discountType === 'percentage') {
        itemDiscount = item.price * (config.discountValue / 100);
      } else if (config.discountType === 'fixed_amount') {
        itemDiscount = Math.min(config.discountValue, item.price); // Can't discount more than price
      } else if (config.discountType === 'free') {
        itemDiscount = item.price;
      }

      totalDiscount += itemDiscount;
      if (!affectedProducts.includes(item.code)) {
        affectedProducts.push(item.code);
      }
    });
  }

  // Create description
  let description = '';
  if (config.discountType === 'free') {
    description = `Buy ${config.buyQuantity} Get ${config.getQuantity} Free`;
  } else if (config.discountType === 'percentage') {
    description = `Buy ${config.buyQuantity} Get ${config.getQuantity} at ${config.discountValue}% off`;
  } else {
    description = `Buy ${config.buyQuantity} Get ${config.getQuantity} at $${config.discountValue} off`;
  }

  return {
    discountAmount: totalDiscount,
    affectedProducts,
    description: `${special.name} - ${description} (Saved $${totalDiscount.toFixed(2)})`
  };
}

/**
 * Main function: Calculate all BOGO and special discounts for cart
 */
export async function calculateBOGODiscounts(
  cart: CartItem[],
  customerDiscount?: { type: 'cost_price' | 'percentage'; value?: number }
): Promise<BOGOCalculationResult> {
  const specials = await getActiveSpecials();

  // Sort specials by priority (highest first)
  specials.sort((a, b) => b.priority - a.priority);

  const appliedSpecials: AppliedSpecial[] = [];
  let totalDiscount = 0;

  // Calculate original total
  const originalTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Process each special
  for (const special of specials) {
    // Check if this special can stack with customer discount
    if (customerDiscount && !special.stackWithCustomerDiscount) {
      continue; // Skip this special if customer has a discount and stacking is not allowed
    }

    if (special.type === 'bogo') {
      // Find all cart items that qualify for this BOGO
      const qualifyingItems = cart.filter(item =>
        productQualifiesForSpecial(item.product, special)
      );

      if (qualifyingItems.length === 0) continue;

      // Flatten to individual items for BOGO calculation
      const itemsForBOGO = qualifyingItems.map(item => ({
        code: item.product.code,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      }));

      // Calculate BOGO discount
      const bogoResult = calculateBOGODiscount(itemsForBOGO, special);

      if (bogoResult.discountAmount > 0) {
        appliedSpecials.push({
          specialId: special.id,
          specialName: special.name,
          type: special.type,
          discountAmount: bogoResult.discountAmount,
          affectedProductCodes: bogoResult.affectedProducts,
          description: bogoResult.description
        });

        totalDiscount += bogoResult.discountAmount;
      }
    } else if (special.type === 'percentage' || special.type === 'fixed_amount') {
      // Simple percentage or fixed amount discount
      const qualifyingItems = cart.filter(item =>
        productQualifiesForSpecial(item.product, special)
      );

      if (qualifyingItems.length === 0) continue;

      let specialDiscount = 0;
      const affectedProducts: string[] = [];

      qualifyingItems.forEach(item => {
        const itemTotal = item.product.price * item.quantity;

        if (special.type === 'percentage') {
          specialDiscount += itemTotal * (special.discountValue! / 100);
        } else if (special.type === 'fixed_amount') {
          specialDiscount += Math.min(special.discountValue! * item.quantity, itemTotal);
        }

        affectedProducts.push(item.product.code);
      });

      if (specialDiscount > 0) {
        appliedSpecials.push({
          specialId: special.id,
          specialName: special.name,
          type: special.type,
          discountAmount: specialDiscount,
          affectedProductCodes: affectedProducts,
          description: `${special.name} - Saved $${specialDiscount.toFixed(2)}`
        });

        totalDiscount += specialDiscount;
      }
    }
  }

  const finalTotal = Math.max(0, originalTotal - totalDiscount);

  return {
    appliedSpecials,
    totalDiscount,
    originalTotal,
    finalTotal
  };
}

/**
 * Get all active specials for a specific product (for display on product cards/detail)
 */
export async function getSpecialsForProduct(
  productCode: string,
  brand?: string,
  categoryId?: string
): Promise<Special[]> {
  const specials = await getActiveSpecials();

  return specials.filter(special =>
    productQualifiesForSpecial({ code: productCode, brand, categoryId }, special)
  );
}

/**
 * Get the best special badge to display for a product
 */
export async function getProductBadge(
  productCode: string,
  brand?: string,
  categoryId?: string
): Promise<{ text: string; color: string } | null> {
  console.log(`[BOGO Badge START] Code: ${productCode}, Brand: ${brand}, Category: ${categoryId}`);

  const specials = await getSpecialsForProduct(productCode, brand, categoryId);

  console.log(`[BOGO Badge] Found ${specials.length} specials for this product`);
  if (specials.length > 0) {
    console.log(`[BOGO Badge] Special details:`, specials.map(s => ({
      name: s.name,
      badge: s.badge,
      badgeColor: s.badgeColor,
      showOnProductCard: s.showOnProductCard,
      applyTo: s.applyTo,
      targetIds: s.targetIds
    })));
  }

  if (specials.length === 0) {
    console.log(`[BOGO Badge] No specials found - returning null`);
    return null;
  }

  // Return the highest priority special that shows on product cards
  const displaySpecial = specials.find(s => s.showOnProductCard);

  if (!displaySpecial) {
    console.log(`[BOGO Badge] No displayable special (showOnProductCard=false)`);
    return null;
  }

  console.log(`[BOGO Badge RESULT] ✅ Returning: "${displaySpecial.badge}" (${displaySpecial.badgeColor})`);

  return {
    text: displaySpecial.badge,
    color: displaySpecial.badgeColor
  };
}
