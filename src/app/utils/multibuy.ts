import { Product, MultiBuyOption } from '../types/product';

/**
 * Get customer pricing level from localStorage
 */
function getCustomerPricingLevel() {
  // Ensure we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { canBuyAtCostPrice: false, discountPercentage: 0, hasCostPlusHundredAccess: false };
  }

  try {
    const customerStr = localStorage.getItem('customer');
    if (!customerStr) return { canBuyAtCostPrice: false, discountPercentage: 0, hasCostPlusHundredAccess: false };

    const customer = JSON.parse(customerStr);
    return {
      canBuyAtCostPrice: customer?.can_see_cost_price || false,
      discountPercentage: customer?.discount_percentage || 0,
      hasCostPlusHundredAccess: customer?.cost_plus_hundred_access || false
    };
  } catch (e) {
    return { canBuyAtCostPrice: false, discountPercentage: 0, hasCostPlusHundredAccess: false };
  }
}

/**
 * Get the base price for a product based on customer level
 */
function getBasePrice(product: Product): number {
  const { canBuyAtCostPrice } = getCustomerPricingLevel();

  if (canBuyAtCostPrice) {
    // Cost price customers pay trade price (supplier's cost to us)
    return product.tradePrice || product.baseCost || product.costPrice || product.price;
  }

  // Regular and discount % customers pay regular price
  return product.price;
}

/**
 * Calculate the effective price per unit based on quantity and multibuy options
 * PRIORITY ORDER:
 * 1. Promotional price (if exists on product.promotionalPrice)
 * 2. Cost+$100 price (for specific categories)
 * 3. Cost price (for wholesale customers)
 * 4. Multibuy discount price
 * 5. Regular price
 */
export function getEffectivePrice(product: Product, quantity: number): number {
  // PRIORITY 1: Promotional price (attached to product at cart-add time)
  const promoPrice = (product as any).promotionalPrice;
  const promoPriceNum = typeof promoPrice === 'number' ? promoPrice : parseFloat(String(promoPrice));
  if (promoPrice !== undefined && promoPrice !== null && !isNaN(promoPriceNum) && promoPriceNum > 0) {
    return promoPriceNum;
  }

  const { canBuyAtCostPrice, hasCostPlusHundredAccess } = getCustomerPricingLevel();
  const costPrice = product.tradePrice || product.baseCost || product.costPrice || 0;
  const productPrice = product.price || 0;

  // PRIORITY 2: Universal Cost+$100 — all customers, $500–$10,000 range, toggle on
  const universalEnabled = typeof localStorage !== 'undefined' &&
    localStorage.getItem('costplus100_universal_pricing_enabled') !== 'false';
  const inCostPlusRange = productPrice >= 500 && productPrice <= 10000;
  if (universalEnabled && inCostPlusRange && costPrice > 0) {
    return (costPrice + 150) * 1.025;
  }

  // PRIORITY 3: Legacy per-customer Cost+$100 (when universal toggle is off)
  if (!universalEnabled && hasCostPlusHundredAccess) {
    const costPlusHundredCategories = ['refrigeration', 'ice machines', 'commercial kitchen machines'];
    const productCategory = (product.category as string)?.toLowerCase() || '';
    const isInCostPlusHundredCategory = costPlusHundredCategories.some(cat => productCategory.includes(cat));
    if (isInCostPlusHundredCategory && costPrice >= 500) {
      return (costPrice + 150) * 1.025;
    }
  }

  // PRIORITY 4: Cost price customers: NO multibuys, just cost price
  if (canBuyAtCostPrice) {
    const costPrice = getBasePrice(product);
    return costPrice;
  }

  // PRIORITY 4: Regular/Discount customers: Apply multibuy logic
  // If no multibuy options, return regular price
  if (!product.multiBuyOptions || product.multiBuyOptions.length === 0) {
    return product.price;
  }

  // Sort multibuy options by quantity in descending order
  const sortedOptions = [...product.multiBuyOptions].sort((a, b) => b.quantity - a.quantity);

  // Find the first multibuy option where quantity qualifies
  for (const option of sortedOptions) {
    if (quantity >= option.quantity) {
      return option.price;
    }
  }

  // PRIORITY 5: If quantity doesn't qualify for any multibuy, return regular price
  return product.price;
}

/**
 * Get the applicable multibuy option for a given quantity
 */
export function getApplicableMultibuyOption(product: Product, quantity: number): MultiBuyOption | null {
  if (!product.multiBuyOptions || product.multiBuyOptions.length === 0) {
    return null;
  }

  const sortedOptions = [...product.multiBuyOptions].sort((a, b) => b.quantity - a.quantity);

  for (const option of sortedOptions) {
    if (quantity >= option.quantity) {
      return option;
    }
  }

  return null;
}

/**
 * Calculate total savings from multibuy pricing
 */
export function calculateMultibuySavings(product: Product, quantity: number): number {
  const effectivePrice = getEffectivePrice(product, quantity);
  const regularTotal = product.price * quantity;
  const multibuyTotal = effectivePrice * quantity;
  
  return regularTotal - multibuyTotal;
}