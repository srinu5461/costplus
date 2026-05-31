/**
 * PRICING CALCULATOR UTILITY
 * Calculates selling prices based on cost using tiered markup formulas
 */

// Default pricing tiers (matches routes-pricing.tsx)
export const DEFAULT_PRICING = {
  tiers: [
    { min: 5000, max: null, markup: 0.12, label: '$5000+' },
    { min: 2000, max: 4999.99, markup: 0.15, label: '$2000-$4999' },
    { min: 1000, max: 1999.99, markup: 0.20, label: '$1000-$1999' },
    { min: 500, max: 999.99, markup: 0.30, label: '$500-$999' },
    { min: 100, max: 499.99, markup: 0.40, label: '$100-$499' },
    { min: 50, max: 99.99, markup: 0.45, label: '$50-$99' },
    { min: 0, max: 49.99, markup: 0.50, label: 'Under $50' }
  ],
  minimumMargin: 0.15, // 15% minimum margin floor
  gstRate: 0.10 // 10% GST (for display only, prices are ex GST)
};

/**
 * Calculate selling price from cost price
 * @param baseCost - The cost price from supplier
 * @param pricingConfig - Optional custom pricing config
 * @returns Calculated selling price with markup and minimum margin applied
 */
export function calculateSellingPrice(
  baseCost: number,
  pricingConfig = DEFAULT_PRICING
): {
  sellingPrice: number;
  markup: number;
  markupPercent: number;
  marginPercent: number;
  tierLabel: string;
} {
  // Find applicable tier
  let markup = 0.50; // Default 50%
  let tierLabel = 'Under $50';
  
  for (const tier of pricingConfig.tiers) {
    if (baseCost >= tier.min && (tier.max === null || baseCost <= tier.max)) {
      markup = tier.markup;
      tierLabel = tier.label;
      break;
    }
  }
  
  // Calculate price with markup
  const calculatedPrice = baseCost * (1 + markup);
  
  // Apply minimum margin floor (15%)
  const minPrice = baseCost * (1 + pricingConfig.minimumMargin);
  const finalPrice = Math.max(calculatedPrice, minPrice);
  
  // Calculate actual margin percentage
  const marginPercent = ((finalPrice - baseCost) / finalPrice) * 100;
  
  return {
    sellingPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimals
    markup,
    markupPercent: markup * 100,
    marginPercent: Math.round(marginPercent * 100) / 100,
    tierLabel
  };
}

/**
 * Generate volume pricing tiers with different markups for quantity ranges
 * @param baseCost - The cost price from supplier
 * @param pricingConfig - Optional custom pricing config
 * @returns Array of volume pricing tiers
 */
export function generateVolumePricingTiers(
  baseCost: number,
  pricingConfig = DEFAULT_PRICING
): Array<{
  minQty: number;
  maxQty: number | null;
  price: number;
  markup: number;
  discount: string;
}> {
  // Standard pricing (1-4 units)
  const standardPrice = calculateSellingPrice(baseCost, pricingConfig);
  
  // Volume pricing (5+ units) - reduce markup by 5% or use next lower tier
  let volumeMarkup = standardPrice.markup - 0.05; // 5% less markup
  if (volumeMarkup < pricingConfig.minimumMargin) {
    volumeMarkup = pricingConfig.minimumMargin;
  }
  
  const volumePrice = baseCost * (1 + volumeMarkup);
  const minVolumePrice = baseCost * (1 + pricingConfig.minimumMargin);
  const finalVolumePrice = Math.max(volumePrice, minVolumePrice);
  
  const discount = ((standardPrice.sellingPrice - finalVolumePrice) / standardPrice.sellingPrice * 100).toFixed(1);
  
  return [
    {
      minQty: 1,
      maxQty: 4,
      price: Math.round(standardPrice.sellingPrice * 100) / 100,
      markup: standardPrice.markup,
      discount: '0%'
    },
    {
      minQty: 5,
      maxQty: null,
      price: Math.round(finalVolumePrice * 100) / 100,
      markup: volumeMarkup,
      discount: `${discount}% off`
    }
  ];
}

/**
 * Calculate price with custom markup percentage
 * @param baseCost - The cost price
 * @param customMarkup - Custom markup as decimal (0.30 = 30%)
 * @param minimumMargin - Minimum margin floor (default 15%)
 * @returns Final price with custom markup applied
 */
export function calculateWithCustomMarkup(
  baseCost: number,
  customMarkup: number,
  minimumMargin = 0.15
): number {
  const calculatedPrice = baseCost * (1 + customMarkup);
  const minPrice = baseCost * (1 + minimumMargin);
  return Math.round(Math.max(calculatedPrice, minPrice) * 100) / 100;
}
