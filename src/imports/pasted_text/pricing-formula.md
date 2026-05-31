 💰 COSTPLUS100 - TIERED PRICING FORMULA

## Our Pricing Tiers (Percentage Markup)

```javascript
{
  tiers: [
    { min: 5000,  max: null,      markup: 0.12,  label: '$5000+' },         // 12% markup
    { min: 2000,  max: 4999.99,   markup: 0.15,  label: '$2000-$4999' },    // 15% markup
    { min: 1000,  max: 1999.99,   markup: 0.20,  label: '$1000-$1999' },    // 20% markup
    { min: 500,   max: 999.99,    markup: 0.30,  label: '$500-$999' },      // 30% markup
    { min: 100,   max: 499.99,    markup: 0.40,  label: '$100-$499' },      // 40% markup
    { min: 50,    max: 99.99,     markup: 0.45,  label: '$50-$99' },        // 45% markup
    { min: 0,     max: 49.99,     markup: 0.50,  label: 'Under $50' }       // 50% markup
  ],
  minimumMargin: 0.15,  // 15% minimum margin floor (safety net)
  gstRate: 0.10         // 10% GST (for display only, all prices are ex GST)
}
```

## Formula

```
Selling Price = Cost Price × (1 + Markup %)

With minimum margin floor:
Selling Price = MAX(Cost × (1 + Markup %), Cost × 1.15)
```

## Real Examples

### Example 1: Commercial Refrigerator
```
Cost:           $3,200.00
Tier:           $2000-$4999 → 15% markup
Calculation:    $3,200 × (1 + 0.15) = $3,200 × 1.15 = $3,680.00
Selling Price:  $3,680.00

Profit:         $3,680 - $3,200 = $480.00
Margin %:       ($480 / $3,680) × 100 = 13.04%
```

### Example 2: Small Kitchen Tool
```
Cost:           $35.00
Tier:           Under $50 → 50% markup
Calculation:    $35 × (1 + 0.50) = $35 × 1.50 = $52.50
Selling Price:  $52.50

Profit:         $52.50 - $35.00 = $17.50
Margin %:       ($17.50 / $52.50) × 100 = 33.33%
```

### Example 3: Commercial Oven
```
Cost:           $850.00
Tier:           $500-$999 → 30% markup
Calculation:    $850 × (1 + 0.30) = $850 × 1.30 = $1,105.00
Selling Price:  $1,105.00

Profit:         $1,105 - $850 = $255.00
Margin %:       ($255 / $1,105) × 100 = 23.08%
```

### Example 4: High-End Equipment
```
Cost:           $6,500.00
Tier:           $5000+ → 12% markup
Calculation:    $6,500 × (1 + 0.12) = $6,500 × 1.12 = $7,280.00
Selling Price:  $7,280.00

Profit:         $7,280 - $6,500 = $780.00
Margin %:       ($780 / $7,280) × 100 = 10.71%
```

### Example 5: Edge Case - Minimum Margin Protection
```
Cost:           $100.00
Tier:           $100-$499 → 40% markup
Calculation:    $100 × (1 + 0.40) = $100 × 1.40 = $140.00
Min Price:      $100 × 1.15 = $115.00
Selling Price:  MAX($140.00, $115.00) = $140.00

✅ Standard markup applies (40% > 15% minimum)
```

## What Gets Saved to Database

When a product is priced (via import, manual entry, or price sync), these fields are saved:

```javascript
{
  // ═══════════════════════════════════════
  // COST FIELDS (from Uropa API)
  // ═══════════════════════════════════════
  baseCost: 850.00,       // Primary cost field
  costPrice: 850.00,      // Duplicate for compatibility
  cost: 850.00,           // Duplicate for compatibility
  basePrice: 850.00,      // Duplicate for compatibility

  // ═══════════════════════════════════════
  // SELLING PRICE FIELDS (calculated)
  // ═══════════════════════════════════════
  price: 1105.00,         // Main selling price (shown to customers)
  salePrice: 1105.00,     // ProductCard checks this FIRST
  sellingPrice: 1105.00,  // Calculated selling price
  sellPrice: 1105.00,     // Duplicate
  calculatedPrice: 1105.00, // Duplicate

  // ═══════════════════════════════════════
  // PRICING METADATA
  // ═══════════════════════════════════════
  markup: 0.30,           // Markup as decimal (30% = 0.30)
  markupPercent: 30,      // Markup as percentage (30%)
  marginPercent: 23.08,   // Profit margin percentage
  tierLabel: "$500-$999", // Which tier was applied

  // ═══════════════════════════════════════
  // TIMESTAMPS
  // ═══════════════════════════════════════
  lastPriceUpdate: "2026-03-28T10:30:00Z",
  lastSyncedWithUropa: "2026-03-28T10:30:00Z"
}
```

## Why Multiple Price Fields?

We store the same price in multiple fields for **compatibility** with different parts of the system:

- `price` - Main field used by most components
- `salePrice` - ProductCard component checks this FIRST
- `sellingPrice` - Admin panels use this
- `baseCost` - Primary cost field (compared with Uropa API)
- `costPrice` - Some legacy components use this

This ensures that no matter which field a component checks, it gets the correct price.

## Key Concepts

### Markup vs Margin

**Markup** = Added on top of cost
```
Markup % = (Profit / Cost) × 100
Example: Cost $100, Profit $40 → Markup = 40%
```

**Margin** = Profit as % of selling price
```
Margin % = (Profit / Selling Price) × 100
Example: Sell $140, Profit $40 → Margin = 28.57%
```

### Why Lower % for Higher Prices?

The higher the cost, the lower the markup percentage:
- **$35 item:** 50% markup = $17.50 profit (good margin)
- **$6,500 item:** 12% markup = $780 profit (good dollar amount)

This is standard retail practice:
- ✅ Small items need high % to make worthwhile profit
- ✅ Big items generate good profit even with low %
- ✅ Competitive pricing on expensive equipment

### The 15% Minimum Margin Floor

Every product is guaranteed **at least** 15% profit margin:

```javascript
const minPrice = cost × 1.15;  // 15% minimum
const finalPrice = MAX(calculatedPrice, minPrice);
```

This protects against:
- ❌ Selling below cost
- ❌ Razor-thin margins
- ✅ Ensures minimum profitability

## Pricing Tiers Chart

```
Cost Range          | Markup % | Example Cost | Example Sell | Profit  | Margin %
--------------------|----------|--------------|--------------|---------|----------
$0 - $49.99        | 50%      | $35.00       | $52.50       | $17.50  | 33.33%
$50 - $99.99       | 45%      | $75.00       | $108.75      | $33.75  | 31.03%
$100 - $499.99     | 40%      | $250.00      | $350.00      | $100.00 | 28.57%
$500 - $999.99     | 30%      | $750.00      | $975.00      | $225.00 | 23.08%
$1000 - $1999.99   | 20%      | $1,500.00    | $1,800.00    | $300.00 | 16.67%
$2000 - $4999.99   | 15%      | $3,000.00    | $3,450.00    | $450.00 | 13.04%
$5000+             | 12%      | $6,000.00    | $6,720.00    | $720.00 | 10.71%
```

## Where This Formula is Used

1. **Product Import** - When importing products from Uropa API
2. **Price Sync** - When syncing prices with Uropa API
3. **Manual Updates** - When admin manually updates a cost
4. **Bulk Operations** - When processing multiple products
5. **API Endpoints** - `/pricing/calculate` endpoint

## How to Update Pricing Tiers

The pricing tiers are defined in:
- `/supabase/functions/server/pricing-calculator.tsx`

To change them:
1. Edit the `DEFAULT_PRICING.tiers` array
2. Adjust markup percentages or price ranges
3. Redeploy the edge function
4. Run price sync to recalculate all products

## Volume Pricing (Bonus Feature)

Products also support volume discounts:

```javascript
Quantity 1-4:    Standard price (e.g., $1,105.00)
Quantity 5+:     5% less markup (e.g., $1,062.50)
                 Minimum 15% margin still applies
```

This is calculated dynamically in the frontend for quantity selection.

## Summary

✅ **7 pricing tiers** based on cost ranges  
✅ **12% to 50%** markup depending on tier  
✅ **15% minimum margin** floor for protection  
✅ **Multiple price fields** saved for compatibility  
✅ **Automatic recalculation** on price sync  
✅ **Volume discounts** for bulk orders  

The formula ensures:
- Profitable margins on all products
- Competitive pricing for expensive items
- Good profit on small items
- Consistent markup across categories
 