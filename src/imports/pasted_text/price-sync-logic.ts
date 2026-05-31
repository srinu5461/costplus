/**
 * 🔄 PRICE SYNC - QUICK REFERENCE
 * What happens during a price sync operation
 */

// ═══════════════════════════════════════════════════════════════
// STEP 1: READ FROM DATABASE
// ═══════════════════════════════════════════════════════════════

const product = await kv.get('products:prod_123');

// WHAT WE READ:
const productCode = product.code;        // "CW933" - to query Uropa API
const dbCost = product.baseCost || product.costPrice || product.cost || product.tradePrice || product.basePrice || product.price; // 120.00 - current cost in DB

// ═══════════════════════════════════════════════════════════════
// STEP 2: FETCH FROM UROPA API
// ═══════════════════════════════════════════════════════════════

const response = await fetch(
  `https://p1-api.nisbets.com.au/occ/v2/uropa-au/products/${productCode}`
);
const uropaProduct = await response.json();

// WHAT WE GET:
const uropaCost = uropaProduct.priceDetail.priceBreakdown[0].priceB; // 125.00

// ═══════════════════════════════════════════════════════════════
// STEP 3: COMPARE
// ═══════════════════════════════════════════════════════════════

if (Math.abs(uropaCost - dbCost) < 0.01) {
  // NO CHANGE
  console.log('✅ No change: $120 = $120');
  return; // Skip update
}

// PRICE CHANGED!
console.log('💰 CHANGED: $120 → $125');

// ═══════════════════════════════════════════════════════════════
// STEP 4: CALCULATE NEW SELLING PRICE
// ═══════════════════════════════════════════════════════════════

// New cost: $125
// Tier: $100-$499 → 40% markup
const newSellingPrice = 125.00 * 1.40; // = $175.00

// ═══════════════════════════════════════════════════════════════
// STEP 5: UPDATE DATABASE - 15 FIELDS CHANGED
// ═══════════════════════════════════════════════════════════════

await kv.set('products:prod_123', {
  ...product, // Keep all existing fields
  
  // 🔥 COST FIELDS (4 updated)
  baseCost: 125.00,        // ✏️ 120.00 → 125.00
  costPrice: 125.00,       // ✏️ 120.00 → 125.00
  cost: 125.00,            // ✏️ 120.00 → 125.00
  basePrice: 125.00,       // ✏️ 120.00 → 125.00
  
  // 🔥 SELLING PRICE FIELDS (5 updated)
  price: 175.00,           // ✏️ 168.00 → 175.00
  salePrice: 175.00,       // ✏️ 168.00 → 175.00
  sellingPrice: 175.00,    // ✏️ 168.00 → 175.00
  sellPrice: 175.00,       // ✏️ 168.00 → 175.00
  calculatedPrice: 175.00, // ✏️ 168.00 → 175.00
  
  // 🔥 METADATA FIELDS (4 updated)
  markup: 0.40,            // ✏️ Recalculated
  markupPercent: 40,       // ✏️ Recalculated
  marginPercent: 28.57,    // ✏️ Recalculated
  tierLabel: "$100-$499",  // ✏️ Recalculated
  
  // 🔥 TIMESTAMP FIELDS (2 updated)
  lastPriceUpdate: "2026-03-28T10:30:00Z",     // ✏️ New timestamp
  lastSyncedWithUropa: "2026-03-28T10:30:00Z", // ✏️ New timestamp
});

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

export const PRICE_SYNC_FIELDS = {
  // Fields READ from database:
  read: [
    'code',           // Product identifier for Uropa API query
    'sku',            // Alternate identifier
    'productCode',    // Alternate identifier
    'baseCost',       // Current cost (priority 1)
    'costPrice',      // Current cost (priority 2)
    'cost',           // Current cost (priority 3)
    'basePrice',      // Current cost (priority 4)
    'price',          // Current cost (priority 5, fallback)
  ],
  
  // Fields FETCHED from Uropa API:
  fetch: [
    'priceDetail.priceBreakdown[0].priceB',  // Wholesale/B2B cost (primary)
    'priceDetail.salesPrice',                // Retail price (fallback 1)
    'priceDetail.value',                     // Generic value (fallback 2)
    'priceRange.minPrice.value',             // Min price (fallback 3)
  ],
  
  // Fields UPDATED in database (15 total):
  update: {
    costFields: [
      'baseCost',      // Uropa cost
      'costPrice',     // Uropa cost
      'cost',          // Uropa cost
      'basePrice',     // Uropa cost
    ],
    sellingPriceFields: [
      'price',         // Calculated: cost × (1 + markup)
      'salePrice',     // Calculated: cost × (1 + markup)
      'sellingPrice',  // Calculated: cost × (1 + markup)
      'sellPrice',     // Calculated: cost × (1 + markup)
      'calculatedPrice', // Calculated: cost × (1 + markup)
    ],
    metadataFields: [
      'markup',        // Tier markup as decimal (0.40)
      'markupPercent', // Tier markup as % (40)
      'marginPercent', // Profit margin % (28.57)
      'tierLabel',     // Tier name ("$100-$499")
    ],
    timestampFields: [
      'lastPriceUpdate',      // ISO timestamp
      'lastSyncedWithUropa',  // ISO timestamp
    ],
  },
  
  // Fields that REMAIN UNCHANGED:
  unchanged: [
    'id',
    'name',
    'description',
    'images',
    'category',
    'brand',
    'stock',
    'weight',
    'dimensions',
    '... all other product fields'
  ],
};

// ═══════════════════════════════════════════════════════════════
// EXAMPLE: BEFORE → AFTER
// ═══════════════════════════════════════════════════════════════

export const EXAMPLE_SYNC = {
  before: {
    code: 'CW933',
    baseCost: 120.00,
    price: 168.00,
    lastPriceUpdate: '2026-03-20T08:15:00Z',
  },
  
  uropaAPI: {
    priceDetail: {
      priceBreakdown: [
        { priceB: 125.00 } // ← New cost from Uropa
      ]
    }
  },
  
  comparison: {
    dbCost: 120.00,
    uropaCost: 125.00,
    difference: 5.00,
    changed: true, // ← Update needed!
  },
  
  calculation: {
    newCost: 125.00,
    tier: '$100-$499',
    markup: 0.40,
    newSellingPrice: 125.00 * 1.40, // = 175.00
  },
  
  after: {
    code: 'CW933',              // ✅ Same
    baseCost: 125.00,           // ✏️ 120.00 → 125.00
    price: 175.00,              // ✏️ 168.00 → 175.00
    markup: 0.40,               // ✏️ Recalculated
    lastPriceUpdate: '2026-03-28T10:30:00Z', // ✏️ Updated
  },
};

// ═══════════════════════════════════════════════════════════════
// KEY INSIGHT
// ═══════════════════════════════════════════════════════════════

/**
 * We compare COST to COST, not COST to SELLING PRICE!
 * 
 * ✅ CORRECT:
 * Compare: dbCost (baseCost: 120) vs uropaCost (priceB: 125)
 * 
 * ❌ WRONG:
 * Compare: dbPrice (price: 168) vs uropaCost (priceB: 125)
 * 
 * This is why we check "baseCost" FIRST when reading from database!
 */