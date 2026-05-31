import { Link } from 'react-router';
import { Star, ShoppingCart, Check, Tag } from 'lucide-react';
import { Product } from '../types/product';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
  sectionTag?: 'featured' | 'popular' | 'promotion';
}

export function ProductCard({ product, sectionTag }: ProductCardProps) {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product);
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
  
  // Promotional pricing
  const hasWasPrice = product?.wasPrice && parseFloat(String(product.wasPrice)) > productPrice;
  const wasPrice = hasWasPrice ? parseFloat(String(product.wasPrice)) : null;
  const isPromotion = sectionTag === 'promotion';

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
            loading="lazy"
            className="w-full h-56 object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Section Tag Badge */}
          {sectionTag && (
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
        </div>

        {/* Content Section */}
        <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
          {/* Brand Logo, Code, and Price with separators */}
          <div className="mb-3 space-y-2">
            {/* Brand Logo */}
            {productBrandLogo && (
              <div className="flex items-center justify-center py-1">
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
                <div className="flex items-center justify-center py-1">
                  <span className="text-xs sm:text-sm font-medium text-slate-600">Code: <span className="font-semibold text-slate-900">{productCode}</span></span>
                </div>
                <div className="border-t border-slate-200" />
              </>
            )}
            
            {/* Price */}
            <div className="py-1">
              {isPromotion && wasPrice ? (
                // Promotional pricing with old price strikethrough
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="text-sm sm:text-base font-semibold text-slate-400 line-through whitespace-nowrap">
                      ${wasPrice.toFixed(2)}
                    </span>
                    <Badge className="bg-[#E31837] hover:bg-[#E31837] text-[10px] sm:text-xs font-bold whitespace-nowrap">
                      SAVE ${(wasPrice - productPrice).toFixed(2)}
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
          <div className="flex items-center justify-center gap-1 mb-3">
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
        </CardContent>
      </Card>
    </Link>
  );
}
