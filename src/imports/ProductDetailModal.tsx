import { useState } from 'react';
import { X, Check, Minus, Plus, Share2, ShoppingCart } from 'lucide-react';
import type { Product } from '../lib/api';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export function ProductDetailModal({ product, onClose, onAddToCart }: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  
  if (!product) return null;
  
  const hasTieredPricing = product.priceTiers && product.priceTiers.length > 0;
  
  // Calculate current price based on quantity
  const getCurrentPrice = () => {
    if (!hasTieredPricing) return product.price;
    
    const tier = product.priceTiers
      .slice()
      .reverse()
      .find(t => quantity >= t.minQty);
    
    return tier ? tier.webPrice : product.price;
  };
  
  const currentPrice = getCurrentPrice();
  const totalPrice = currentPrice * quantity;

  const handleQuantityChange = (value: number) => {
    setQuantity(Math.max(1, value));
  };

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    onClose();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Check out ${product.name} on CostPlus100`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Product Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Image */}
            <div>
              {product.brand && (
                <div className="bg-gray-100 rounded-lg p-4 mb-4 text-center">
                  <div className="text-lg font-bold text-gray-700">{product.brand}</div>
                  <div className="text-sm text-gray-500 mt-1">View full range →</div>
                </div>
              )}
              <img
                src={product.image}
                alt={product.name}
                className="w-full rounded-lg shadow-md"
              />
            </div>

            {/* Right Column - Details */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h3>
              
              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-medium text-blue-600">
                  {product.rating} ({product.reviews})
                </span>
              </div>

              {/* Price */}
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">From</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-800">${currentPrice.toFixed(2)}</span>
                  <span className="text-lg text-slate-700 font-medium">ex GST</span>
                </div>
              </div>

              {/* In Stock */}
              <div className="flex items-center gap-2 mb-6">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-green-600 font-medium">In Stock</span>
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-gray-700">{product.description}</p>
              </div>

              {/* Tiered Pricing Table */}
              {hasTieredPricing && (
                <div className="mb-6">
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg overflow-hidden">
                    <div className="bg-red-600 text-white text-center py-2 font-bold">
                      Reduced Price
                    </div>
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Qty</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">List Price</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Web Price</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-red-600">Save</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.priceTiers.map((tier, index) => (
                          <tr key={index} className={`border-b ${quantity >= tier.minQty ? 'bg-blue-50' : ''}`}>
                            <td className="px-4 py-3 font-medium">{tier.minQty}+</td>
                            <td className="px-4 py-3 text-gray-600">${tier.listPrice.toFixed(2)}</td>
                            <td className="px-4 py-3 font-bold text-blue-900">${tier.webPrice.toFixed(2)}</td>
                            <td className="px-4 py-3 font-bold text-red-600">{tier.savePercent}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      className="w-12 h-12 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                      className="w-20 h-12 text-center border-2 border-gray-300 rounded-lg font-bold text-lg"
                      min="1"
                    />
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      className="w-12 h-12 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">${totalPrice.toFixed(2)}</div>
                    {product.sku && (
                      <div className="text-sm text-gray-500">Code: {product.sku}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 px-8 py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    product.inStock
                      ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!product.inStock}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button className="py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Add to compare
                  </button>
                  <button 
                    onClick={handleShare}
                    className="py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-5 h-5" />
                    Share this page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}