import { Link } from 'react-router';
import { Star, ShoppingCart, Check, Tag, AlertCircle, Truck, Phone } from 'lucide-react';
import { Product } from '../types/product';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useCart } from '../context/CartContext';
import { memo, useState, useEffect } from 'react';
import { getProductBadge, getSpecialsForProduct } from '../utils/bogoCalculator';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface ProductCardProps {
  product: Product;
  sectionTag?: 'featured' | 'popular' | 'promotion';
  priority?: boolean; // ⚡ NEW: For priority loading of first 4 images
}

interface Promotion {
  id: string;
  productId: string;
  promotionalPrice: number;
  active: boolean;
}

// ⚡ OPTIMIZATION: Wrap in React.memo to prevent unnecessary re-renders
export const ProductCard = memo(function ProductCard({ product, sectionTag, priority }: ProductCardProps) {
  const { addToCart } = useCart();

  // 🎯 BOGO/Special badge state
  const [specialBadge, setSpecialBadge] = useState<{ text: string; color: string } | null>(null);
  const [activeSpecial, setActiveSpecial] = useState<any>(null);

  // 🎯 Promotional pricing from separate promotions API
  const [promotion, setPromotion] = useState<Promotion | null>(null);

  // 🎯 Customer Pricing (VIP, Cost Price, or Cost+$100)
  const [customerDiscountPercentage, setCustomerDiscountPercentage] = useState(0);
  const [canBuyAtCostPrice, setCanBuyAtCostPrice] = useState(false);
  const [hasCostPlusHundredAccess, setHasCostPlusHundredAccess] = useState(false);
  // 🌍 Global Cost+$100 toggle — admin controlled via Settings page
  const [universalCostPlusEnabled, setUniversalCostPlusEnabled] = useState(true);

  // Check for customer pricing and global settings
  useEffect(() => {
    try {
      const customerStr = localStorage.getItem('customer');
      if (customerStr) {
        const customer = JSON.parse(customerStr);
        const costPriceAccess = customer?.can_see_cost_price || false;
        const discountPercentage = customer?.discount_percentage || 0;
        const costPlusHundredAccess = customer?.cost_plus_hundred_access || false;

        setCanBuyAtCostPrice(costPriceAccess);
        setHasCostPlusHundredAccess(costPlusHundredAccess);
        // Only show VIP discount for discount % customers (not cost price or cost+$100 customers)
        if (!costPriceAccess && !costPlusHundredAccess && discountPercentage > 0) {
          setCustomerDiscountPercentage(discountPercentage);
        }
      }
    } catch (e) {
      // Ignore errors
    }

    // Read global Cost+$100 toggle (default: enabled)
    const globalToggle = localStorage.getItem('costplus100_universal_pricing_enabled');
    if (globalToggle === 'false') {
      setUniversalCostPlusEnabled(false);
    }
  }, []);

  // Fetch promotional pricing for this product (only if not already attached)
  useEffect(() => {
    // If promotional price is already on the product, use it directly
    if ((product as any).promotionalPrice) {
      console.log(`[ProductCard] ✅ Using pre-attached promotional price for ${product.name}: $${(product as any).promotionalPrice}`);
      setPromotion({
        id: 'attached',
        productId: product.id,
        promotionalPrice: (product as any).promotionalPrice,
        active: true
      });
      return;
    }

    // Otherwise fetch from API
    const fetchPromotion = async () => {
      try {
        console.log(`[ProductCard] Fetching promotion for product ${product.id} (${product.name})`);
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/promotions/product/${product.id}`,
          {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log(`[ProductCard] Promotion response for ${product.name}:`, data);
          if (data && data.active) {
            setPromotion(data);
            console.log(`[ProductCard] ✅ Set active promotion for ${product.name}:`, data);
          } else {
            console.log(`[ProductCard] No active promotion for ${product.name}`);
          }
        } else {
          console.log(`[ProductCard] Failed to fetch promotion for ${product.name}:`, response.status);
        }
      } catch (error) {
        // Silently skip promotion fetch errors - product will display without promotion
        console.log(`[ProductCard] Promotion unavailable for ${product.name}, continuing without promotion`);
      }
    };

    fetchPromotion();
  }, [product.id, (product as any).promotionalPrice]);

  // Fetch special badge and special data for this product
  useEffect(() => {
    const fetchSpecialData = async () => {
      const productCode = product.code || product.sku || '';
      const brand = product.brand;
      const categoryId = product.categoryId;

      console.log(`[Badge Debug] ${product.name?.substring(0, 30)} - Code: ${productCode}, Brand: ${brand}`);

      if (productCode || brand || categoryId) {
        // Fetch badge
        const badge = await getProductBadge(productCode, brand, categoryId);
        console.log(`[Badge Result] ${productCode}:`, badge);
        setSpecialBadge(badge);

        // Fetch actual special data for pricing
        const specials = await getSpecialsForProduct(productCode, brand, categoryId);
        if (specials && specials.length > 0) {
          // Use the first (highest priority) special
          setActiveSpecial(specials[0]);
          console.log(`[Special Data] Found special for ${product.name}:`, specials[0]);
        }
      }
    };

    fetchSpecialData();
  }, [product.code, product.sku, product.brand, product.categoryId]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();

    console.log('[ProductCard] handleAddToCart - Current state:', {
      productName: product.name,
      productId: product.id,
      promotion: promotion,
      hasPromotion: hasPromotion,
      promotionState: promotion
    });

    // Attach promotional price to product if it exists
    const productWithPromo = hasPromotion
      ? { ...product, promotionalPrice: promotion.promotionalPrice }
      : product;

    console.log('[ProductCard] Adding to cart:', {
      name: product.name,
      hasPromotion,
      promotion: promotion,
      promotionalPrice: hasPromotion ? promotion.promotionalPrice : 'none',
      regularPrice: product.price,
      productWithPromo
    });

    addToCart(productWithPromo);
  };
  
  // Defensive checks for product properties
  const productName = product?.name || 'Unnamed Product';
  const productImage = product?.image || 'https://via.placeholder.com/400x300?text=No+Image';
  const productPrice = product?.price || 0;
  const productRating = product?.rating || 0;
  const productBrand = product?.brand || '';
  const productInStock = product?.inStock ?? true;
  const productBrandLogo = product?.brandLogo || product?.brandLogoUrl;
  const productCode = product?.code || product?.sku || '';
  const hasMultibuy = product?.multiBuyOptions && product.multiBuyOptions.length > 0;

  // Promotional pricing (from separate promotions system)
  // Compare promotion.promotionalPrice with current DB price (product.price)
  const hasPromotion = promotion !== null;
  const promotionalPrice = hasPromotion ? promotion.promotionalPrice : null;
  const promotionalSavings = hasPromotion ? (productPrice - promotion.promotionalPrice) : null;
  const wasPrice = hasPromotion ? productPrice : null; // Current DB price becomes "was price"

  // Fallback: Old wasPrice system (for backwards compatibility)
  const hasWasPrice = !hasPromotion && product?.wasPrice && parseFloat(String(product.wasPrice)) > productPrice;
  const oldWasPrice = hasWasPrice ? parseFloat(String(product.wasPrice)) : null;
  const isPromotion = sectionTag === 'promotion';

  // Special discount pricing (from specials system - BOGO, percentage, etc.)
  let specialDiscountPrice = null;
  let specialDiscountSavings = null;
  let specialDiscountPercent = null;
  if (activeSpecial && !hasPromotion) {
    if (activeSpecial.type === 'percentage' && activeSpecial.discountValue) {
      specialDiscountPercent = activeSpecial.discountValue;
      specialDiscountPrice = productPrice * (1 - activeSpecial.discountValue / 100);
      specialDiscountSavings = productPrice - specialDiscountPrice;
    } else if (activeSpecial.type === 'fixed_amount' && activeSpecial.discountValue) {
      specialDiscountPrice = Math.max(0, productPrice - activeSpecial.discountValue);
      specialDiscountSavings = activeSpecial.discountValue;
    }
  }

  // Customer Pricing (Cost Price, Cost+$100, or VIP)
  const costPrice = product?.costPrice || product?.tradePrice || product?.baseCost || 0;
  const hasCostPrice = canBuyAtCostPrice && costPrice > 0;
  const hasVipDiscount = !canBuyAtCostPrice && customerDiscountPercentage > 0;

  // 🌍 Universal Cost+$100 pricing: applies to ALL customers when global toggle is on
  // Range: $500–$10,000 product price. Above $10,000 → "Call for Quote"
  const inCostPlusRange = productPrice >= 500 && productPrice <= 10000;
  const isCallForQuote = universalCostPlusEnabled && productPrice > 10000;
  const showUniversalCostPlus = universalCostPlusEnabled && inCostPlusRange && costPrice > 0;
  const universalCostPlusPrice = costPrice + 100;

  // Legacy per-customer Cost+$100 (used when global toggle is off)
  const costPlusHundredCategories = ['refrigeration', 'ice machines', 'commercial kitchen machines'];
  const productCategory = (product.category as string)?.toLowerCase() || '';
  const isInCostPlusHundredCategory = costPlusHundredCategories.some(cat => productCategory.includes(cat));
  const meetsMinimumPriceThreshold = costPrice >= 500;
  const costPlusHundredPrice = costPrice + 100;
  const showLegacyCostPlus = !universalCostPlusEnabled && hasCostPlusHundredAccess && isInCostPlusHundredCategory && meetsMinimumPriceThreshold;

  // Calculate display price based on priority:
  // 1. Promotional price
  // 2. Special discount
  // 3. Universal Cost+$100 ($500–$10,000, all customers)
  // 4. Legacy Cost+$100 (per-customer permission, only when universal toggle off)
  // 5. Cost price (for cost price customers)
  // 6. VIP discounted price
  // 7. Regular price
  let displayPrice = productPrice;
  if (hasPromotion) {
    displayPrice = promotionalPrice!;
  } else if (specialDiscountPrice !== null) {
    displayPrice = specialDiscountPrice;
  } else if (showUniversalCostPlus) {
    displayPrice = universalCostPlusPrice;
  } else if (showLegacyCostPlus) {
    displayPrice = costPlusHundredPrice;
  } else if (hasCostPrice) {
    displayPrice = costPrice;
  } else if (hasVipDiscount) {
    displayPrice = productPrice * (1 - customerDiscountPercentage / 100);
  }

  return (
    <Link to={`/products/${product.id}`}>
      <Card className="h-full hover:shadow-xl transition-all border hover:border-primary/50 group bg-white flex flex-col overflow-hidden">
        {/* Product Name on top */}
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 border-b">
          <h3 className="line-clamp-2 min-h-[2.5rem] group-hover:text-[#E31837] transition-colors font-semibold text-sm sm:text-base break-words">
            {productName}
          </h3>
        </div>

        {/* Image Section */}
        <div className="relative overflow-hidden bg-slate-50">
          <img
            src={productImage}
            alt={productName}
            loading={priority ? "eager" : "lazy"}
            fetchpriority={priority ? "high" : undefined}
            className="w-full h-40 sm:h-48 md:h-56 lg:h-64 object-contain p-1 sm:p-2 group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* 🎯 SPECIAL/BOGO Badge - Takes priority over section tag */}
          {specialBadge ? (
            <div
              className="absolute top-2 left-2 text-white text-xs font-bold px-3 py-1 rounded shadow-lg z-10"
              style={{ backgroundColor: specialBadge.color }}
            >
              {specialBadge.text}
            </div>
          ) : sectionTag && (
            <Badge className={`absolute top-2 left-2 font-bold shadow-lg text-xs ${
              sectionTag === 'featured'
                ? 'bg-blue-600 hover:bg-blue-600'
                : sectionTag === 'popular'
                ? 'bg-purple-600 hover:bg-purple-600'
                : 'bg-[#E31837] hover:bg-[#E31837]'
            }`}>
              {sectionTag === 'featured' && '⭐ Featured'}
              {sectionTag === 'popular' && '🔥 Popular'}
              {sectionTag === 'promotion' && '🎉 Promo'}
            </Badge>
          )}
          
          {!productInStock && (
            <Badge variant="secondary" className="absolute top-2 right-2 bg-red-100 text-red-800 font-semibold shadow-md text-xs">
              Out of Stock
            </Badge>
          )}
          {productInStock && (
            <div className="absolute bottom-2 left-2">
              <Badge className="bg-green-600 hover:bg-green-600 font-semibold shadow-md text-xs">
                <Check className="size-3 mr-1" />
                In Stock
              </Badge>
            </div>
          )}
          {hasMultibuy && (
            <div className="absolute bottom-2 right-2">
              <Badge className="bg-orange-600 hover:bg-orange-600 font-semibold shadow-md text-xs">
                <Tag className="size-3 mr-1" />
                MultiBuy
              </Badge>
            </div>
          )}
          {product.ageRestricted && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-orange-500 hover:bg-orange-500 font-bold shadow-lg text-xs">
                <AlertCircle className="size-3 mr-1" />
                18+
              </Badge>
            </div>
          )}
        </div>

        {/* Content Section */}
        <CardContent className="p-2 sm:p-3 flex-1 flex flex-col">
          {/* Brand Logo, Code, and Price with separators */}
          <div className="mb-2 space-y-1">
            {/* Brand Logo */}
            {productBrandLogo && (
              <div className="flex items-center justify-center py-0.5">
                <img
                  src={productBrandLogo}
                  alt={productBrand}
                  className="h-6 object-contain max-w-[100px]"
                />
              </div>
            )}

            {/* Separator */}
            {productBrandLogo && <div className="border-t border-slate-200" />}

            {/* Code */}
            {productCode && (
              <>
                <div className="flex items-center justify-center py-0.5">
                  <span className="text-xs sm:text-sm font-medium text-slate-600">Code: <span className="font-semibold text-slate-900">{productCode}</span></span>
                </div>
                <div className="border-t border-slate-200" />
              </>
            )}

            {/* Price */}
            <div className="py-0.5">
              {isCallForQuote ? (
                // Price > $10,000 → show regular price + "Call for Quote" option
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold text-[#E31837] whitespace-nowrap">
                      ${productPrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Ex GST</span>
                  </div>
                  <div className="flex items-center gap-1 justify-center">
                    <Phone className="size-3 text-slate-500 shrink-0" />
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">or Call for Quote</span>
                  </div>
                </div>
              ) : hasPromotion ? (
                // Promotional pricing (from promotions system)
                // Show DB price as "was", promotional price as current
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="text-sm sm:text-base font-semibold text-slate-400 line-through whitespace-nowrap">
                      ${wasPrice!.toFixed(2)}
                    </span>
                    <Badge className="bg-[#E31837] hover:bg-[#E31837] text-[10px] sm:text-xs font-bold whitespace-nowrap">
                      SAVE ${promotionalSavings!.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold text-[#E31837] whitespace-nowrap">
                      ${displayPrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Ex GST</span>
                  </div>
                </div>
              ) : specialDiscountPrice !== null ? (
                // Special discount pricing (BOGO, percentage off, etc.)
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="text-sm sm:text-base font-semibold text-slate-400 line-through whitespace-nowrap">
                      ${productPrice.toFixed(2)}
                    </span>
                    <Badge className="bg-purple-600 hover:bg-purple-600 text-[10px] sm:text-xs font-bold whitespace-nowrap">
                      {specialDiscountPercent ? `${specialDiscountPercent}% OFF` : `SAVE $${specialDiscountSavings!.toFixed(2)}`}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold text-[#E31837] whitespace-nowrap">
                      ${displayPrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Ex GST</span>
                  </div>
                </div>
              ) : (showUniversalCostPlus || showLegacyCostPlus) ? (
                // Cost+$100 Pricing (universal for all customers $500–$10k, or legacy per-customer)
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="text-sm sm:text-base font-semibold text-slate-400 line-through whitespace-nowrap">
                      ${productPrice.toFixed(2)}
                    </span>
                    <Badge className="bg-purple-600 hover:bg-purple-600 text-[10px] sm:text-xs font-bold whitespace-nowrap">
                      COST+$100
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold text-[#E31837] whitespace-nowrap">
                      ${displayPrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Ex GST</span>
                  </div>
                </div>
              ) : hasCostPrice ? (
                // Cost Price Customer
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="text-sm sm:text-base font-semibold text-slate-400 line-through whitespace-nowrap">
                      ${productPrice.toFixed(2)}
                    </span>
                    <Badge className="bg-amber-600 hover:bg-amber-600 text-[10px] sm:text-xs font-bold whitespace-nowrap">
                      COST PRICE
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold text-[#E31837] whitespace-nowrap">
                      ${displayPrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Ex GST</span>
                  </div>
                </div>
              ) : hasVipDiscount ? (
                // VIP Customer Pricing
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="text-sm sm:text-base font-semibold text-slate-400 line-through whitespace-nowrap">
                      ${productPrice.toFixed(2)}
                    </span>
                    <Badge className="bg-green-600 hover:bg-green-600 text-[10px] sm:text-xs font-bold whitespace-nowrap">
                      -{customerDiscountPercentage}% VIP
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold text-[#E31837] whitespace-nowrap">
                      ${displayPrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Ex GST</span>
                  </div>
                </div>
              ) : isPromotion && oldWasPrice ? (
                // Promotional pricing with old price strikethrough (backwards compatibility)
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="text-sm sm:text-base font-semibold text-slate-400 line-through whitespace-nowrap">
                      ${oldWasPrice.toFixed(2)}
                    </span>
                    <Badge className="bg-[#E31837] hover:bg-[#E31837] text-[10px] sm:text-xs font-bold whitespace-nowrap">
                      SAVE ${(oldWasPrice - productPrice).toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold text-[#E31837] whitespace-nowrap">
                      ${productPrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Ex GST</span>
                  </div>
                </div>
              ) : (
                // Regular pricing
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold text-[#E31837] whitespace-nowrap">
                    ${productPrice.toFixed(2)}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Ex GST</span>
                </div>
              )}
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center justify-center gap-1 mb-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`size-3 ${
                    i < Math.floor(productRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground ml-1">({productRating})</span>
          </div>

          {/* Add to Cart Button */}
          <Button
            className="w-full bg-[#2D3748] hover:bg-[#2D3748]/90 text-white font-semibold mt-auto text-sm"
            onClick={handleAddToCart}
            disabled={!productInStock}
          >
            {productInStock ? (
              <>
                <ShoppingCart className="size-4 mr-2" />
                Add to Cart
              </>
            ) : (
              'Out of Stock'
            )}
          </Button>

          {/* Call for Quote link for high-value items */}
          {isCallForQuote && (
            <a
              href="/contact"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-1.5 mt-1.5 text-[10px] sm:text-xs text-[#E31837] hover:underline font-semibold"
            >
              <Phone className="size-3" />
              Prefer a quote? Call us
            </a>
          )}

          {/* Dispatched by Supplier */}
          <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-slate-500">
            <Truck className="size-3" />
            <span>Dispatched by Supplier</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});