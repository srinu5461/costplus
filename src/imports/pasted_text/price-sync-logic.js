/**
 * 🔍 EXACT PRICE SYNC LOGIC - STEP BY STEP
 * What fields are used and how the comparison works
 */

// ============================================
// STEP 1: GET COST FROM DATABASE
// ============================================

/**
 * Database Product Fields (Priority Order):
 */
const dbCost = parseFloat(
  product.baseCost ||      // ← Check this FIRST (primary cost field)
  product.costPrice ||     // ← Check this second
  product.cost ||          // ← Check this third
  product.basePrice ||     // ← Check this fourth
  product.price ||         // ← FALLBACK ONLY (this might be selling price!)
  0                        // ← If nothing found, use 0
);

/**
 * IMPORTANT: We check "baseCost" FIRST because that's where we store
 * the original Uropa wholesale price. "product.price" is checked LAST
 * because it might contain the calculated SELLING price (cost + markup),
 * not the actual cost!
 */

// ============================================
// STEP 2: GET COST FROM UROPA API
// ============================================

/**
 * Call Uropa API:
 * GET https://p1-api.nisbets.com.au/occ/v2/uropa-au/products/{productCode}
 * 
 * Example Response:
 * {
 *   code: "CW933",
 *   name: "Commercial Oven",
 *   priceDetail: {
 *     priceBreakdown: [
 *       {
 *         priceB: 125.00,   ← THIS IS THE WHOLESALE/B2B COST!
 *         quantity: 1
 *       }
 *     ],
 *     salesPrice: 250.00,   ← This is the retail price (fallback)
 *     value: 250.00
 *   },
 *   priceRange: {
 *     minPrice: { value: 125.00 },
 *     maxPrice: { value: 250.00 }
 *   }
 * }
 */

/**
 * Extract Uropa Cost (Priority Order):
 */
const uropaCost = 
  uropaProduct.priceDetail?.priceBreakdown?.[0]?.priceB ||  // ← BEST: B2B wholesale price
  uropaProduct.priceDetail?.salesPrice ||                   // ← Retail/sales price
  uropaProduct.priceDetail?.value ||                        // ← Generic value
  uropaProduct.priceDetail?.price ||                        // ← Generic price
  uropaProduct.priceRange?.minPrice?.value ||               // ← Min price from range
  uropaProduct.priceRange?.maxPrice?.value ||               // ← Max price from range
  uropaProduct.price?.value ||                              // ← Direct price value
  uropaProduct.basePrice?.value ||                          // ← Base price value
  uropaProduct.price ||                                     // ← Direct price
  null;                                                     // ← No price found

/**
 * WHY CHECK "priceB" FIRST?
 * 
 * priceB = "Price B" = Business/Wholesale price
 * This is the actual cost you'd pay when buying from Uropa.
 * 
 * salesPrice = Retail price (what they sell to end customers)
 * We want the WHOLESALE price, not retail!
 */

// ============================================
// STEP 3: COMPARE COSTS
// ============================================

/**
 * Comparison Logic:
 */
const priceDifference = Math.abs(uropaCost - dbCost);

if (priceDifference < 0.01) {
  // No change (allow 1 cent rounding difference)
  console.log(`✅ No change: DB=$${dbCost}, Uropa=$${uropaCost}`);
  // Skip this product
}

if (priceDifference >= 0.01) {
  // Price changed!
  console.log(`💰 PRICE CHANGED: $${dbCost} → $${uropaCost}`);
  // Continue to update...
}

// ============================================
// STEP 4: CALCULATE NEW SELLING PRICE
// ============================================

/**
 * Use Tier Pricing to calculate selling price:
 */
function calculateSellingPrice(cost) {
  let markup = 0;
  
  // Determine which tier applies
  if (cost < 100) {
    markup = 200;      // Add $200
  } else if (cost < 300) {
    markup = 125;      // Add $125
  } else if (cost < 500) {
    markup = 100;      // Add $100
  } else if (cost < 1000) {
    markup = 55;       // Add $55
  } else {
    markup = 49;       // Add $49
  }
  
  const sellingPrice = cost + markup;
  const markupPercent = (markup / cost) * 100;
  const marginPercent = (markup / sellingPrice) * 100;
  
  return {
    sellingPrice: sellingPrice,
    markup: markup,
    markupPercent: markupPercent,
    marginPercent: marginPercent,
    tierLabel: `Tier: $${cost.toFixed(2)}`
  };
}

/**
 * Example:
 * Uropa Cost: $125.00
 * Tier: $100-$300 → Add $125
 * Selling Price: $125 + $125 = $250.00
 * Markup %: ($125 / $125) * 100 = 100%
 * Margin %: ($125 / $250) * 100 = 50%
 */

// ============================================
// STEP 5: UPDATE PRODUCT IN DATABASE
// ============================================

/**
 * Update ALL price-related fields:
 */
const updatedProduct = {
  ...product,  // Keep all existing fields
  
  // ═══════════════════════════════════════
  // COST FIELDS (Uropa wholesale price)
  // ═══════════════════════════════════════
  baseCost: uropaCost,          // ← PRIMARY cost field
  costPrice: uropaCost,         // ← Duplicate for compatibility
  cost: uropaCost,              // ← Duplicate for compatibility
  basePrice: uropaCost,         // ← Duplicate for compatibility
  
  // ═══════════════════════════════════════
  // SELLING PRICE FIELDS (Cost + Markup)
  // ═══════════════════════════════════════
  price: sellingPrice,          // ← Main price field (SELLING price)
  salePrice: sellingPrice,      // ← ProductCard checks this FIRST
  sellingPrice: sellingPrice,   // ← Calculated selling price
  sellPrice: sellingPrice,      // ← Duplicate
  calculatedPrice: sellingPrice,// ← Duplicate
  
  // ═══════════════════════════════════════
  // PRICING METADATA
  // ═══════════════════════════════════════
  markup: 125,                  // Dollar markup amount
  markupPercent: 100,           // Markup percentage
  marginPercent: 50,            // Profit margin percentage
  tierLabel: "Tier 2: $100-$300",
  
  // ═══════════════════════════════════════
  // TIMESTAMPS
  // ═══════════════════════════════════════
  lastPriceUpdate: "2026-03-28T10:30:00Z",
  lastSyncedWithUropa: "2026-03-28T10:30:00Z"
};

// Save to database
await kv.set(`products:${product.id}`, updatedProduct);

// ============================================
// STEP 6: LOG THE CHANGE
// ============================================

/**
 * Create detailed log entry:
 */
const changeLog = {
  productId: product.id,
  productName: product.name,
  productCode: "CW933",
  
  // Cost comparison
  oldCost: 120.00,      // Old database cost
  newCost: 125.00,      // New Uropa cost
  
  // Selling price comparison
  oldPrice: 245.00,     // Old selling price (120 + 125)
  newPrice: 250.00,     // New selling price (125 + 125)
  
  // Change amounts
  priceChange: 5.00,              // $250 - $245
  priceChangePercent: 2.04        // (5 / 245) * 100
};

// ============================================
// REAL WORLD EXAMPLE
// ============================================

/**
 * Product: Commercial Oven (Code: CW933)
 * 
 * BEFORE:
 * ┌─────────────────────────────────────┐
 * │ DATABASE                            │
 * ├─────────────────────────────────────┤
 * │ baseCost:    $120.00  ← Old cost    │
 * │ price:       $245.00  ← Old selling │
 * │ markup:      $125.00                │
 * └─────────────────────────────────────┘
 * 
 * UROPA API RETURNS:
 * ┌─────────────────────────────────────┐
 * │ priceDetail.priceBreakdown[0].priceB│
 * │ = $125.00  ← NEW wholesale cost!    │
 * └─────────────────────────────────────┘
 * 
 * COMPARISON:
 * Database Cost:  $120.00
 * Uropa Cost:     $125.00
 * Difference:     $5.00     ← CHANGED! Update needed
 * 
 * RECALCULATE SELLING PRICE:
 * New Cost:       $125.00
 * Tier:           $100-$300 (add $125)
 * New Selling:    $125 + $125 = $250.00
 * 
 * AFTER UPDATE:
 * ┌─────────────────────────────────────┐
 * │ DATABASE                            │
 * ├─────────────────────────────────────┤
 * │ baseCost:    $125.00  ← UPDATED!    │
 * │ price:       $250.00  ← UPDATED!    │
 * │ markup:      $125.00  ← Same        │
 * │ lastPriceUpdate: 2026-03-28         │
 * └─────────────────────────────────────┘
 */

// ============================================
// WHY WE SEPARATED COST vs SELLING PRICE
// ============================================

/**
 * OLD BUG (What we fixed):
 * ─────────────────────────────────────
 * We were comparing:
 *   Uropa Cost ($125) vs Database SELLING PRICE ($245)
 *   → Always showing as changed! ❌
 * 
 * NEW FIX:
 * ─────────────────────────────────────
 * We now compare:
 *   Uropa Cost ($125) vs Database COST ($120)
 *   → Only changes when supplier price changes! ✅
 * 
 * This is why we check "baseCost" FIRST, not "price"!
 */

// ============================================
// SUMMARY: THE 3 KEY FIELDS
// ============================================

/**
 * 1. DATABASE COST FIELD:
 *    product.baseCost (or costPrice, cost, basePrice as fallbacks)
 *    ↓
 *    This is the wholesale price we paid/saved
 * 
 * 2. UROPA API COST FIELD:
 *    uropaProduct.priceDetail.priceBreakdown[0].priceB
 *    ↓
 *    This is the current wholesale/B2B price from supplier
 * 
 * 3. CALCULATED SELLING PRICE:
 *    product.price (or salePrice, sellingPrice)
 *    ↓
 *    This is what we show to customers (cost + markup)
 */

export default {
  message: "This is the EXACT logic used in Price Sync Manager",
  
  keyFields: {
    database: ["baseCost", "costPrice", "cost", "basePrice"],
    uropaAPI: "priceDetail.priceBreakdown[0].priceB",
    selling: ["price", "salePrice", "sellingPrice"]
  },
  
  flow: [
    "1. Get product.baseCost from database",
    "2. Get priceBreakdown[0].priceB from Uropa API",
    "3. Compare: if different by more than $0.01, update",
    "4. Recalculate selling price with tier markup",
    "5. Update ALL price fields in database",
    "6. Log the change with before/after values"
  ]
};
