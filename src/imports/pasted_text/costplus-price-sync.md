/**
 * 📋 COSTPLUS100 - PRICE SYNC DOCUMENTATION
 * 
 * This document explains how the price synchronization system works,
 * what endpoints are called, and how the Uropa API integration functions.
 */

// ============================================
// 1. UROPA API DETAILS
// ============================================

/**
 * API Base URL:
 * https://p1-api.nisbets.com.au/occ/v2/uropa-au
 * 
 * This is the official Nisbets/Uropa API endpoint (Hybris/SAP Commerce Cloud)
 */

/**
 * Authentication:
 * - Token Type: Bearer Token
 * - Storage: 
 *   1. Primary: KV Store (key: 'uropa_api_token') - saved via Price Sync Manager UI
 *   2. Fallback: Environment variable 'UROPA_API_TOKEN'
 * 
 * The system checks KV store FIRST (where users save tokens via UI),
 * then falls back to environment variable if not found.
 */

/**
 * Product Endpoint Pattern:
 * GET https://p1-api.nisbets.com.au/occ/v2/uropa-au/products/{productCode}
 * 
 * Headers:
 * - Authorization: Bearer {token}
 * - Content-Type: application/json
 * - Accept: application/json
 * - Accept-Language: en-AU,en;q=0.9
 * - User-Agent: Mozilla/5.0...
 * - Origin: https://www.nisbets.com.au
 * - Referer: https://www.nisbets.com.au/
 */

// ============================================
// 2. PRICE SYNC ENDPOINTS (Backend)
// ============================================

/**
 * All endpoints are prefixed with: /make-server-577b3f26/price-sync
 * (Will be /costplus-main/price-sync in new system)
 */

const PRICE_SYNC_ENDPOINTS = {
  
  // Get current sync status and configuration
  'GET /price-sync/status': {
    description: 'Get last sync run details and configuration',
    returns: {
      lastRun: {
        timestamp: 'ISO date string',
        status: 'success | partial | error',
        pricesChanged: 'number',
        errors: 'number'
      },
      config: {
        enabled: 'boolean',
        schedule: 'daily | weekly | manual',
        time: 'HH:MM'
      }
    }
  },

  // Get sync history logs
  'GET /price-sync/logs': {
    description: 'Get historical sync logs (newest first)',
    query: {
      limit: 'number (default: 10)'
    },
    returns: {
      logs: 'SyncLog[]',
      total: 'number'
    }
  },

  // Run full price sync
  'POST /price-sync/run': {
    description: 'Manually trigger price sync for ALL products',
    process: [
      '1. Fetch all products from database',
      '2. Get Uropa API token',
      '3. Process products in batches of 50',
      '4. For each product:',
      '   - Fetch from Uropa API by product code',
      '   - Extract wholesale cost (priceDetail.priceBreakdown[0].priceB)',
      '   - Compare with database cost',
      '   - If changed: recalculate selling price with markup',
      '   - Update product in database',
      '5. Log all changes',
      '6. Return summary'
    ],
    returns: {
      success: 'boolean',
      log: {
        totalProducts: 'number',
        productsChecked: 'number',
        pricesChanged: 'number',
        pricesUpdated: 'number',
        errors: 'number',
        duration: 'milliseconds',
        changes: 'Array of detailed changes'
      }
    }
  },

  // Test sync with specific products
  'POST /price-sync/test': {
    description: 'Test price sync with specific product codes',
    body: {
      productCodes: ['CW933', 'DM505', '...']
    },
    returns: {
      results: [
        {
          code: 'string',
          status: 'success | not_in_db | api_error | no_price | error',
          priceChanged: 'boolean',
          database: {
            cost: 'number',
            sellingPrice: 'number',
            markup: 'percent'
          },
          uropa: {
            cost: 'number',
            sellingPrice: 'number',
            markup: 'percent'
          },
          difference: {
            cost: 'number',
            costPercent: 'percent',
            sellingPrice: 'number'
          }
        }
      ],
      summary: {
        total: 'number',
        pricesChanged: 'number',
        errors: 'number'
      }
    }
  },

  // Test and auto-update prices
  'POST /price-sync/test-and-update': {
    description: 'Check Uropa prices AND automatically update if changed',
    body: {
      productCodes: ['CW933', 'DM505', '...']
    },
    returns: 'Same as /test but with updated=true when prices are updated'
  },

  // Manual cost update (no API call)
  'POST /price-sync/manual-update-cost': {
    description: 'Manually update a product cost without calling Uropa API',
    body: {
      productCode: 'string',
      newCost: 'number'
    },
    process: [
      '1. Find product by code',
      '2. Recalculate selling price with new cost',
      '3. Update product in database',
      '4. Return updated product'
    ]
  },

  // List all products (for bulk operations)
  'GET /price-sync/list-products': {
    description: 'Get all products with their codes and prices',
    query: {
      limit: 'number (default: 100)'
    },
    returns: {
      products: [
        {
          code: 'string',
          name: 'string',
          cost: 'number',
          price: 'number (selling price)',
          markup: 'percent',
          lastUpdated: 'ISO date'
        }
      ]
    }
  },

  // Test API connection
  'GET /price-sync/test-api': {
    description: 'Test if Uropa API token is valid',
    returns: {
      success: 'boolean',
      message: 'string',
      token_source: 'kv_store | environment | none'
    }
  },

  // Clear saved credentials
  'POST /price-sync/clear-credentials': {
    description: 'Clear saved token from KV store (fallback to env var)',
    returns: {
      success: 'boolean',
      message: 'Credentials cleared'
    }
  },

  // Debug endpoints
  'GET /price-sync/debug-tokens': {
    description: 'Debug: check token sources without showing full token'
  },
  'GET /price-sync/debug': {
    description: 'Debug: show all price sync data'
  }
};

// ============================================
// 3. PRICE EXTRACTION LOGIC
// ============================================

/**
 * Uropa API Response Structure:
 * {
 *   code: "CW933",
 *   name: "Product Name",
 *   priceDetail: {
 *     priceBreakdown: [
 *       {
 *         priceB: 123.45,  // ← WHOLESALE/B2B PRICE (PRIMARY)
 *         quantity: 1
 *       }
 *     ],
 *     salesPrice: 150.00,  // ← Retail price (FALLBACK)
 *     value: 150.00
 *   },
 *   priceRange: {
 *     minPrice: { value: 123.45 },
 *     maxPrice: { value: 150.00 }
 *   }
 * }
 */

/**
 * Price Extraction Priority (in order):
 * 1. priceDetail.priceBreakdown[0].priceB  ← Wholesale/B2B price (BEST)
 * 2. priceDetail.salesPrice                ← Current sales price
 * 3. priceDetail.value
 * 4. priceDetail.price
 * 5. priceRange.minPrice.value
 * 6. priceRange.maxPrice.value
 * 7. price.value
 * 8. basePrice.value
 * 9. price
 */

// ============================================
// 4. DATABASE STRUCTURE
// ============================================

/**
 * Product Fields:
 * 
 * COST FIELDS (Uropa wholesale price):
 * - baseCost      ← Primary cost field
 * - costPrice     ← Duplicate for compatibility
 * - cost          ← Duplicate for compatibility
 * - basePrice     ← Duplicate for compatibility
 * 
 * SELLING PRICE FIELDS (Cost + Markup):
 * - price         ← Main selling price (displayed to customers)
 * - salePrice     ← ProductCard checks this FIRST
 * - sellingPrice  ← Calculated selling price
 * - sellPrice     ← Duplicate
 * - calculatedPrice ← Duplicate
 * 
 * PRICING METADATA:
 * - markup        ← Dollar amount added (e.g., 200.00)
 * - markupPercent ← Markup percentage (e.g., 159.89%)
 * - marginPercent ← Profit margin (e.g., 61.52%)
 * - tierLabel     ← Which tier applied (e.g., "Tier 2: $100-$300")
 * 
 * TIMESTAMPS:
 * - lastPriceUpdate       ← When price was last changed
 * - lastSyncedWithUropa   ← When last checked against Uropa API
 */

// ============================================
// 5. PRICING TIERS (Markup System)
// ============================================

const PRICING_TIERS = [
  { min: 0,     max: 100,   markup: 200 },  // Products under $100: add $200
  { min: 100,   max: 300,   markup: 125 },  // $100-$300: add $125
  { min: 300,   max: 500,   markup: 100 },  // $300-$500: add $100
  { min: 500,   max: 1000,  markup: 55 },   // $500-$1000: add $55
  { min: 1000,  max: Infinity, markup: 49 } // Over $1000: add $49
];

/**
 * Example Calculation:
 * 
 * Product: Commercial Oven
 * Uropa Cost: $125.00
 * Tier: $100-$300 (add $125)
 * 
 * Selling Price = $125.00 + $125.00 = $250.00
 * Markup % = ($125 / $125) * 100 = 100%
 * Margin % = ($125 / $250) * 100 = 50%
 */

// ============================================
// 6. FRONTEND PAGES
// ============================================

/**
 * Main Price Sync Page: /admin/price-sync
 * Component: /src/app/pages/admin/PriceSyncManager.tsx
 * 
 * Features:
 * - View last sync status
 * - Run full sync (all products)
 * - Test specific product codes
 * - Test and auto-update
 * - Manual cost updates
 * - View sync logs
 * - Bulk product list viewer
 * - API token management
 */

// ============================================
// 7. HOW TO USE
// ============================================

/**
 * STEP 1: Set up Uropa API Token
 * - Go to /admin/price-sync
 * - The system uses the token stored in KV (key: 'uropa_api_token')
 * - Fallback: Environment variable UROPA_API_TOKEN
 * - You can test the connection with "Test API Connection" button
 * 
 * STEP 2: Test with Sample Products
 * - Enter product codes (e.g., CW933, DM505)
 * - Click "Test Selected Products"
 * - Review price comparisons
 * 
 * STEP 3: Run Full Sync
 * - Click "Run Price Sync"
 * - System processes all products in batches
 * - Updates changed prices automatically
 * - View detailed log of changes
 * 
 * STEP 4: Manual Updates (Optional)
 * - Use "Manual Cost Update" for individual products
 * - No API call needed
 * - Immediately recalculates selling price
 */

// ============================================
// 8. IMPORTANT NOTES
// ============================================

/**
 * ⚠️ CRITICAL: Cost vs Selling Price
 * 
 * Database stores TWO prices:
 * 1. COST (baseCost, costPrice, cost) = Uropa wholesale price
 * 2. SELLING PRICE (price, salePrice) = Cost + Markup
 * 
 * The price sync compares Uropa costs with database COST fields,
 * NOT selling prices!
 * 
 * Old bug: We were comparing Uropa cost with selling price,
 * which caused incorrect updates.
 */

/**
 * 📊 Performance:
 * - Batch size: 50 products per batch
 * - 1 second delay between batches (rate limiting)
 * - Parallel processing within batches
 * - Full sync of 50,000 products: ~20-30 minutes
 */

/**
 * 🔒 Security:
 * - Token stored in KV with key 'uropa_api_token'
 * - Environment variable UROPA_API_TOKEN as fallback
 * - Admin auth required for all price sync endpoints
 */

export default {
  API_BASE: 'https://p1-api.nisbets.com.au/occ/v2/uropa-au',
  TOKEN_KV_KEY: 'uropa_api_token',
  TOKEN_ENV_VAR: 'UROPA_API_TOKEN',
  ENDPOINTS: PRICE_SYNC_ENDPOINTS,
  PRICING_TIERS
};
