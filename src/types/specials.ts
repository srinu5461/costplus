// Specials & BOGO Promotions Type Definitions

export type SpecialType =
  | 'percentage'           // 15% off
  | 'fixed_amount'         // $50 off
  | 'bogo'                 // Buy One Get One deals
  | 'fixed_price';         // Was $299, Now $199

export type BOGODiscountType =
  | 'percentage'           // 50% off
  | 'fixed_amount'         // $10 off
  | 'free';                // 100% off (free)

export type SpecialApplyTo =
  | 'product'              // Specific products
  | 'category'             // All products in category
  | 'brand'                // All products from brand
  | 'sitewide';            // All products

export interface BOGOConfig {
  buyQuantity: number;              // Buy this many items
  getQuantity: number;              // Get this many items with discount
  discountType: BOGODiscountType;   // How to discount
  discountValue: number;            // Amount or percentage
  applyToLowest: boolean;           // true = discount cheapest, false = discount all
  allowSameItem: boolean;           // true = can buy 2 of same product, false = must be different items
  allowMixMatch: boolean;           // true = any items in target qualify, false = specific items only
}

export interface Special {
  id: string;
  name: string;                     // "Thor Brand BOGO - Buy 1 Get 2nd Half Price"
  type: SpecialType;
  active: boolean;

  // Date range
  startDate: string;                // ISO date string
  endDate: string;                  // ISO date string

  // What to apply to
  applyTo: SpecialApplyTo;
  targetIds: string[];              // Product codes, category IDs, or brand names

  // Simple discount (for percentage/fixed_amount/fixed_price types)
  discountValue?: number;           // 15 for 15% or $15
  fixedPrice?: number;              // For fixed_price type: new price

  // BOGO configuration (for bogo type)
  bogoConfig?: BOGOConfig;

  // Priority and stacking
  priority: number;                 // Higher number = applied first
  stackWithMultibuy: boolean;       // Can combine with multibuy discounts?
  stackWithCustomerDiscount: boolean; // Can combine with customer-level discounts?

  // Display
  badge: string;                    // Badge text on product cards
  badgeColor: string;               // Hex color for badge
  showOnProductCard: boolean;       // Show badge on product listing?

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface SpecialSummary {
  id: string;
  name: string;
  type: SpecialType;
  active: boolean;
  startDate: string;
  endDate: string;
  applyTo: SpecialApplyTo;
  targetCount: number;              // Number of products/categories/brands affected
  badge: string;
}

// For cart calculation
export interface AppliedSpecial {
  specialId: string;
  specialName: string;
  type: SpecialType;
  discountAmount: number;
  affectedProductCodes: string[];   // Which products got the discount
  description: string;              // "Buy 1 Get 2nd Half Price - Saved $99.99"
}

// BOGO group for cart calculation
export interface BOGOGroup {
  items: {
    productCode: string;
    productName: string;
    price: number;
    quantity: number;
  }[];
  discountedItems: string[];        // Product codes that get discount
  totalDiscount: number;
}
