/**
 * PRICING CALCULATOR UTILITY
 * Calculates selling prices based on cost using tiered PERCENTAGE markup formulas
 */

// ✅ PERCENTAGE MARKUP TIERS (as specified in pricing-formula.md)
export const DEFAULT_PRICING = {
  tiers: [
    { min: 5000,  max: Infinity,   markup: 0.12,  label: '$5000+' },         // 12% markup
    { min: 2000,  max: 4999.99,    markup: 0.15,  label: '$2000-$4999' },    // 15% markup
    { min: 1000,  max: 1999.99,    markup: 0.20,  label: '$1000-$1999' },    // 20% markup
    { min: 500,   max: 999.99,     markup: 0.30,  label: '$500-$999' },      // 30% markup
    { min: 100,   max: 499.99,     markup: 0.40,  label: '$100-$499' },      // 40% markup
    { min: 50,    max: 99.99,      markup: 0.45,  label: '$50-$99' },        // 45% markup
    { min: 0,     max: 49.99,      markup: 0.50,  label: 'Under $50' }       // 50% markup
  ],
  minimumMargin: 0.15,  // 15% minimum margin floor (safety net)
  gstRate: 0.10         // 10% GST (for display only, all prices are ex GST)
};

/**
 * Calculate selling price from cost price using PERCENTAGE markups
 * @param baseCost - The cost price from supplier
 * @param pricingConfig - Optional custom pricing config
 * @returns Calculated selling price with markup metadata
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
  let markupDecimal = 0.12; // Default for $5000+
  let tierLabel = '$5000+';
  
  for (const tier of pricingConfig.tiers) {
    if (baseCost >= tier.min && baseCost <= tier.max) {
      markupDecimal = tier.markup;
      tierLabel = tier.label;
      break;
    }
  }
  
  // ✅ Calculate selling price: Cost × (1 + Markup %)
  const sellingPrice = baseCost * (1 + markupDecimal);
  
  // ✅ Apply minimum margin floor (15% minimum)
  const minPrice = baseCost * (1 + pricingConfig.minimumMargin);
  const finalSellingPrice = Math.max(sellingPrice, minPrice);
  
  // ✅ Calculate actual markup dollar amount
  const dollarMarkup = finalSellingPrice - baseCost;
  
  // ✅ Calculate markup percentage: (markup / cost) * 100
  const markupPercent = baseCost > 0 ? (dollarMarkup / baseCost) * 100 : 0;
  
  // ✅ Calculate margin percentage: (markup / sellingPrice) * 100
  const marginPercent = finalSellingPrice > 0 ? (dollarMarkup / finalSellingPrice) * 100 : 0;
  
  return {
    sellingPrice: Math.round(finalSellingPrice * 100) / 100, // Round to 2 decimals
    markup: Math.round(dollarMarkup * 100) / 100,            // Dollar amount
    markupPercent: Math.round(markupPercent * 100) / 100,
    marginPercent: Math.round(marginPercent * 100) / 100,
    tierLabel
  };
}