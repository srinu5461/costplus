export interface MultiBuyOption {
  quantity: number;
  price: number;
  discount?: number; // percentage discount
}

export interface SizeVariant {
  size: string; // e.g., "S", "M", "L", "XL", "2XL"
  price: number;
  inStock?: boolean;
  sku?: string;
  // Measurements
  inches?: string; // e.g., "38-40"
  cm?: string; // e.g., "96-102"
  waist?: string; // Waist measurement
  chest?: string; // Chest measurement
  multiBuyOptions?: Array<{ quantity: number; price: number; costPrice: number; markupPercent: number }>;
}

export interface Product {
  id: string;
  code?: string;
  sku?: string;
  name: string;
  category: string; // Main category display name (Level 1)
  wholePath?: string; // Full category path (e.g., "Cooking Equipment > Ovens > Convection Ovens")
  
  // Category hierarchy (Names)
  categoryLevel1?: string; // e.g., "Kitchenware And Storage"
  categoryLevel2?: string; // e.g., "Kitchen Storage And Shelving"
  categoryLevel3?: string; // e.g., "Kitchen Wall Shelves"
  categoryLevel4?: string;
  
  // Category hierarchy (IDs) - Required for correct path resolution
  categoryLevel1Id?: string; // e.g., "G5"
  categoryLevel2Id?: string; // e.g., "C86"
  categoryLevel3Id?: string; // e.g., "13479"
  categoryLevel4Id?: string;
  
  categoryId?: string; // The deepest category ID
  categoryName?: string;
  
  price: number;
  baseCost?: number;
  tradePrice?: number;
  wasPrice?: string | number;
  
  image: string;
  mainImageUrl?: string;
  allImages?: string[];
  galleryImages?: string[];
  
  description: string;
  fullDescription?: string;
  shortDescription?: string;
  
  specifications?: string; // Product specifications/details
  features: string[];
  
  // Related products/accessories
  accessories?: string[]; // Array of product IDs for accessories
  relatedProducts?: string[]; // Array of product IDs for related products
  
  inStock: boolean;
  stockStatus?: string;
  stockQuantity?: number;
  
  // Age restriction
  ageRestricted?: boolean; // true = requires age verification (18+)
  ageRestrictionNote?: string; // Optional custom message
  
  status?: boolean; // true = enabled, false = disabled
  rating: number;
  
  brand?: string;
  manufacturer?: string;
  brandLogo?: string;
  brandLogoUrl?: string;
  brandLogoAlt?: string;
  
  multiBuyOptions?: MultiBuyOption[]; // Bulk pricing tiers
  pricingTiers?: Array<{ price: number; minQty: number }>;
  hasVolumePricing?: boolean;

  // Size variants (for clothing, aprons, footwear)
  sizeVariants?: SizeVariant[]; // Available sizes with their prices
  hasSizeVariants?: boolean; // Quick flag to check if product has size options
  selectedSize?: string; // Selected size when added to cart

  url?: string;
  productUrl?: string;
  
  importedAt?: string;
  updatedAt?: string;
  importSource?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}