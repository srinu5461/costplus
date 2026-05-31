import { Link } from 'react-router';
import { ShoppingCart, Check, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { memo, useState, useEffect } from 'react';
import { resolveProductImage } from '../utils/opencartImages';
import { useCompare } from '../context/CompareContext';
import { VolumeDiscountBadge } from './VolumeDiscountBadge';
import { useAuth } from '../context/AuthContext';
import { getProductBadge } from '../app/utils/bogoCalculator';

interface ProductCardProps {
  product: {
    id: string;
    code?: string;
    sku?: string;
    model?: string;
    name: string;
    title?: string;
    price?: number;
    originalPrice?: number;
    salePrice?: number;
    costPrice?: number;
    rrp?: number;
    image?: string;
    imageUrl?: string;
    mainImage?: string;
    images?: string[];
    brand?: string;
    brand_logo_url?: string;
    brandLogoUrl?: string;
    category?: string;
    inStock?: boolean;
    in_stock?: boolean;
    stockLevel?: number;
    stock_qty?: number;
    pricingTiers?: Array<{ minQty: number; price: number }>;
    onPromotion?: boolean;
    promotion?: {
      originalPrice: number;
      discountPercentage: number;
      promotionalPrice: number;
      endDate: string;
      savings: number;
    };
    showMultibuyTag?: boolean; // 🔥 NEW: Manual control for multibuy badge
  };
  viewMode?: 'grid' | 'list';
  onAddToCart?: (product: any) => void;
  showAddToCart?: boolean;
  showCompare?: boolean;
}

export const ProductCard = memo(function ProductCard({ 
  product, 
  viewMode = 'grid', 
  onAddToCart,
  showAddToCart = true,
  showCompare = true
}: ProductCardProps) {
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const { user } = useAuth(); // 🔥 Get user from auth context
  const inCompare = isInCompare(product.id);

  // 🎯 BOGO/Special badge state
  const [specialBadge, setSpecialBadge] = useState<{ text: string; color: string } | null>(null);

  // Fetch special badge for this product
  useEffect(() => {
    const fetchBadge = async () => {
      const productCode = product.code || product.sku || '';
      const brand = product.brand;
      const categoryId = (product as any).categoryId;

      console.log(`[Badge Debug] ${product.name?.substring(0, 30)} - Code: ${productCode}, Brand: ${brand}`);

      if (productCode) {
        const badge = await getProductBadge(productCode, brand, categoryId);
        console.log(`[Badge Result] ${productCode}:`, badge);
        setSpecialBadge(badge);
      }
    };

    fetchBadge();
  }, [product.code, product.sku, product.brand, (product as any).categoryId]);

  // Helper to get product title
  const getTitle = () => product.title || product.name || 'Untitled Product';
  
  // Helper to get product code/SKU
  const getCode = () => {
    return product.sku || product.code || product.model || product.id || 'N/A';
  };
  
  // Helper to get URL-safe product identifier (for routing)
  const getProductId = () => {
    return product.code || product.sku || product.model || product.id;
  };
  
  // Helper to get product image (using OpenCart helper)
  const getImage = () => {
    // Use the smart resolver that handles OpenCart paths
    return resolveProductImage(product);
  };
  
  // 🔥 CONDITIONAL PRICING: Show cost price if user has permission
  const getPrice = (): number => {
    // 🔥 DEBUG: Log user and product data
    if (product.id === getProductId() || Math.random() < 0.01) { // Log first product or 1% randomly
      console.log('🔍 [ProductCard] Price Debug:', {
        productId: product.id,
        productCode: getCode(),
        hasUser: !!user,
        canSeeCostPrice: user?.canSeeCostPrice,
        hasCostPrice: !!product.costPrice,
        costPrice: product.costPrice,
        baseCost: (product as any).baseCost,
        price: product.price,
        salePrice: product.salePrice,
        allPriceFields: {
          costPrice: product.costPrice,
          price: product.price,
          salePrice: product.salePrice,
          baseCost: (product as any).baseCost,
          cost: (product as any).cost,
          basePrice: (product as any).basePrice
        }
      });
    }
    
    // If user has cost price access, show cost price
    // 🔥 FIX: Check both costPrice AND baseCost (backend stores as baseCost)
    if (user?.canSeeCostPrice) {
      const costValue = product.costPrice || (product as any).baseCost;
      if (costValue) {
        return typeof costValue === 'object' ? (costValue as any).value : costValue;
      }
    }
    
    // Otherwise show normal sell price
    // Try salePrice first (this is the marked-up price from CSV import)
    if (product.salePrice) {
      return typeof product.salePrice === 'object' ? (product.salePrice as any).value : product.salePrice;
    }
    
    // Fall back to price field
    if (product.price) {
      if (typeof product.price === 'object' && product.price !== null) {
        return (product.price as any).value || 0;
      }
      return product.price;
    }
    
    // Fall back to costPrice/baseCost if nothing else (for non-cost-price users)
    const costValue = product.costPrice || (product as any).baseCost;
    if (costValue) {
      return typeof costValue === 'object' ? (costValue as any).value : costValue;
    }
    
    return 0;
  };
  
  // Check if in stock
  const isInStock = product.inStock ?? product.in_stock ?? true;
  
  // Get stock quantity
  const stockQty = product.stockLevel ?? product.stock_qty ?? 0;
  
  const price = getPrice();
  const hasPrice = price > 0;
  
  // Calculate max discount from pricingTiers
  const getMaxDiscount = (): number => {
    if (!product.pricingTiers || product.pricingTiers.length === 0) {
      console.log(`⚠️ [ProductCard] Product ${product.id} has NO pricingTiers`, product.pricingTiers);
      return 0;
    }
    
    const basePrice = price;
    if (basePrice <= 0) return 0;
    
    // Find the lowest tier price
    const lowestTierPrice = Math.min(...product.pricingTiers.map(t => t.price));
    const maxDiscount = ((basePrice - lowestTierPrice) / basePrice) * 100;
    
    console.log(`✅ [ProductCard] Product ${product.id} HAS pricingTiers:`, product.pricingTiers, `Discount: ${maxDiscount.toFixed(1)}%`);
    
    return maxDiscount > 0 ? maxDiscount : 0;
  };
  
  const maxDiscount = getMaxDiscount();
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onAddToCart) {
      const cartItem = {
        id: product.id,
        name: getTitle(),
        code: getCode(),
        price: price,
        image: getImage(),
        category: product.category || product.categoryLevel1 || '',
        quantity: 1
      };
      
      console.log('🛒 Adding to cart:', cartItem);
      
      onAddToCart(cartItem);
      toast.success(`${getTitle()} added to cart`);
    }
  };

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (inCompare) {
      removeFromCompare(product.id);
    } else {
      addToCompare({
        id: product.id,
        name: getTitle(),
        price: price,
        image: getImage(),
        brand: product.brand,
        code: getCode(),
      });
    }
  };

  if (viewMode === 'list') {
    return (
      <Link
        to={`/product/${getProductId()}`}
        className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 group"
      >
        {/* Image */}
        <div className="w-full h-40 sm:w-32 sm:h-32 lg:w-40 lg:h-40 flex-shrink-0 bg-white flex items-center justify-center overflow-hidden rounded">
          <img
            src={getImage()}
            alt={getTitle()}
            loading="lazy"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Title - AT TOP */}
          <h3 className="font-semibold text-sm sm:text-base text-slate-800 line-clamp-2 mb-2">
            {getTitle()}
          </h3>
          
          {/* Brand Logo */}
          {(product.brand_logo_url || product.brandLogoUrl) ? (
            <div className="mb-2 flex items-center">
              <img
                src={product.brand_logo_url || product.brandLogoUrl}
                alt={product.brand || 'Brand'}
                className="h-5 sm:h-6 w-auto object-contain"
                loading="lazy"
              />
            </div>
          ) : product.brand ? (
            <p className="text-xs text-slate-600 uppercase mb-2">{product.brand}</p>
          ) : null}
          
          <div className="mt-auto">
            {/* Divider */}
            <div className="border-t border-gray-200 mb-2 sm:mb-3" />
            
            {/* Code */}
            <p className="text-xs sm:text-sm text-slate-700 font-medium mb-2">
              Code: <span className="font-semibold text-slate-800">{getCode()}</span>
            </p>
            
            {/* Divider */}
            <div className="border-t border-gray-200 mb-2 sm:mb-3" />
            
            {/* Price */}
            {hasPrice ? (
              <div className="mb-2 sm:mb-3">
                {/* 🔥 Cost Price Badge */}
                {user?.canSeeCostPrice && (product.costPrice || (product as any).baseCost) && (
                  <div className="mb-2">
                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">
                      COST PRICE
                    </span>
                  </div>
                )}
                
                {product.onPromotion && product.promotion ? (
                  <>
                    {/* Original Price - Strikethrough */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-500 line-through">
                        ${product.promotion.originalPrice.toFixed(2)}
                      </span>
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">
                        -{product.promotion.discountPercentage}%
                      </span>
                    </div>
                    {/* Promotional Price */}
                    <div className="flex items-baseline gap-1 sm:gap-2">
                      <span className="text-xl sm:text-2xl font-bold text-red-600">
                        ${price.toFixed(2)}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-700 font-medium">ex GST</span>
                    </div>
                    {/* Savings */}
                    <p className="text-xs text-green-600 font-semibold mt-1">
                      Save ${product.promotion.savings.toFixed(2)}
                    </p>
                  </>
                ) : (
                  <div className="flex items-baseline gap-1 sm:gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-red-600">
                      ${price.toFixed(2)}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-700 font-medium">ex GST</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm text-slate-600">Price on request</span>
              </div>
            )}
            
            {/* Divider */}
            <div className="border-t border-gray-200 mb-2 sm:mb-3" />
            
            {/* Stock Status */}
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              {isInStock ? (
                <>
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                  <span className="text-xs sm:text-sm font-medium text-green-600">In Stock</span>
                </>
              ) : (
                <span className="text-xs sm:text-sm font-medium text-red-600">Out of Stock</span>
              )}
            </div>
            
            {/* Volume Discount Badge */}
            {maxDiscount > 0 && (
              <div className="mb-3">
                <VolumeDiscountBadge maxDiscount={maxDiscount} size="small" />
              </div>
            )}
            
            {/* Add to Cart Button */}
            {showAddToCart && hasPrice && isInStock && onAddToCart && (
              <button
                onClick={handleAddToCart}
                className="w-full bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Grid View (Default - Nisbets Style)
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow overflow-hidden group relative">
      <Link to={`/product/${getProductId()}`} className="block">
        {/* Product Name - AT TOP */}
        <div className="p-3 sm:p-4 pb-2">
          <h3 className="font-semibold text-sm sm:text-base text-slate-800 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]">
            {getTitle()}
          </h3>
        </div>
        
        {/* Image */}
        <div className="bg-white px-3 sm:px-4 flex items-center justify-center h-48 sm:h-56 md:h-64 relative">
          {/* Promotion Badge - Positioned on Image */}
          {product.onPromotion && product.promotion && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded z-10 shadow-lg">
              SAVE {product.promotion.discountPercentage}%
            </div>
          )}

          {/* 🔥 MULTIBUY Badge - Positioned on Image */}
          {product.showMultibuyTag && !specialBadge && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded z-10 shadow-lg flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              MULTIBUY
            </div>
          )}

          {/* 🎯 SPECIAL/BOGO Badge - Takes priority over multibuy */}
          {specialBadge && (
            <div
              className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded z-10 shadow-lg"
              style={{ backgroundColor: specialBadge.color }}
            >
              {specialBadge.text}
            </div>
          )}

          {/* LOW PRICE Badge (optional - can be enabled based on discount %) */}
          {!product.onPromotion && product.rrp && price < product.rrp && !product.showMultibuyTag && !specialBadge && (
            <div className="absolute top-2 right-2 bg-slate-700 text-white text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded z-10">
              LOW PRICE
            </div>
          )}

          <img
            src={getImage()}
            alt={getTitle()}
            loading="lazy"
            className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Compare Checkbox - Bottom Right Overlay on Image */}
          {showCompare && (
            <label 
              className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded shadow-sm px-2 py-1.5 cursor-pointer hover:bg-white transition-colors z-10"
              onClick={handleCompareToggle}
            >
              <input 
                type="checkbox"
                checked={inCompare}
                onChange={() => {}} // Handled by label click
                className="w-3.5 h-3.5 text-slate-700 border-gray-300 rounded focus:ring-slate-700"
              />
              <span className="text-xs font-medium text-gray-700">Compare</span>
            </label>
          )}
        </div>
        
        {/* Content */}
        <div className="p-3 sm:p-4">
          {/* Brand Logo */}
          {(product.brand_logo_url || product.brandLogoUrl) && (
            <div className="mb-2 sm:mb-3 flex items-center justify-start">
              <img
                src={product.brand_logo_url || product.brandLogoUrl}
                alt={product.brand || 'Brand'}
                className="h-6 sm:h-8 w-auto object-contain"
                loading="lazy"
              />
            </div>
          )}
          
          {/* Divider */}
          <div className="border-t border-gray-200 mb-2 sm:mb-3" />
          
          {/* Code */}
          <p className="text-xs sm:text-sm text-slate-700 font-medium mb-2 sm:mb-3">
            Code: <span className="font-semibold text-slate-800">{getCode()}</span>
          </p>
          
          {/* Divider */}
          <div className="border-t border-gray-200 mb-2 sm:mb-3" />
          
          {/* Price */}
          {hasPrice ? (
            <div className="mb-2 sm:mb-3">
              {/* 🔥 Cost Price Badge */}
              {user?.canSeeCostPrice && (product.costPrice || (product as any).baseCost) && (
                <div className="mb-2">
                  <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">
                    COST PRICE
                  </span>
                </div>
              )}
              
              {product.onPromotion && product.promotion ? (
                <>
                  {/* Original Price - Strikethrough */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-500 line-through">
                      ${product.promotion.originalPrice.toFixed(2)}
                    </span>
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">
                      -{product.promotion.discountPercentage}%
                    </span>
                  </div>
                  {/* Promotional Price */}
                  <div className="flex items-baseline gap-1 sm:gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-red-600">
                      ${price.toFixed(2)}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-700 font-medium">ex GST</span>
                  </div>
                  {/* Savings */}
                  <p className="text-xs text-green-600 font-semibold mt-1">
                    Save ${product.promotion.savings.toFixed(2)}
                  </p>
                </>
              ) : (
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-red-600">
                    ${price.toFixed(2)}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-700 font-medium">ex GST</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-2 sm:mb-3">
              <span className="text-xs sm:text-sm text-slate-600">Price on request</span>
            </div>
          )}
          
          {/* Divider */}
          <div className="border-t border-gray-200 mb-2 sm:mb-3" />
          
          {/* Stock Status */}
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            {isInStock ? (
              <>
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <span className="text-xs sm:text-sm font-medium text-green-600">In Stock</span>
              </>
            ) : (
              <span className="text-xs sm:text-sm font-medium text-red-600">Out of Stock</span>
            )}
          </div>
          
          {/* Volume Discount Badge */}
          {maxDiscount > 0 && (
            <div className="mb-3">
              <VolumeDiscountBadge maxDiscount={maxDiscount} size="small" />
            </div>
          )}
        </div>
      </Link>
      
      {/* Add to Cart Button - Outside Link */}
      {showAddToCart && hasPrice && isInStock && onAddToCart && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <button
            onClick={handleAddToCart}
            className="w-full bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            Add to Cart
          </button>
        </div>
      )}
    </div>
  );
});