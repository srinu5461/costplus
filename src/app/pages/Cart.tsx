import { Link, useNavigate } from 'react-router';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { ShoppingBag, Trash2, Plus, Minus, Tag, ArrowRight, ShieldAlert } from 'lucide-react';
import { getApplicableMultibuyOption, calculateMultibuySavings } from '../utils/multibuy';
import { calculateBOGODiscounts, type BOGOCalculationResult } from '../utils/bogoCalculator';
import { useState, useEffect } from 'react';

export function Cart() {
  const { cart, removeFromCart, updateQuantity, getCartTotal, getItemPrice } = useCart();
  const navigate = useNavigate();
  const [bogoResult, setBogoResult] = useState<BOGOCalculationResult | null>(null);
  const [customerDiscountPercentage, setCustomerDiscountPercentage] = useState(0);
  const [canBuyAtCostPrice, setCanBuyAtCostPrice] = useState(false);
  const [hasCostPlusHundredAccess, setHasCostPlusHundredAccess] = useState(false);

  // Check for customer pricing (VIP, Cost Price, or Cost+$100)
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
  }, []);

  // Calculate BOGO discounts whenever cart changes
  useEffect(() => {
    if (cart.length > 0) {
      calculateBOGODiscounts(cart).then(result => {
        setBogoResult(result);
      });
    } else {
      setBogoResult(null);
    }
  }, [cart]);

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="bg-slate-100 size-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="size-12 text-slate-400" />
          </div>
          <h1 className="text-3xl mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8">
            Start shopping for professional catering equipment to build your perfect kitchen!
          </p>
          <Link to="/products">
            <Button size="lg">
              Browse Products
              <ArrowRight className="ml-2 size-5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate original total
  // NOTE: getItemPrice already handles ALL pricing logic:
  // - Promotional prices (highest priority)
  // - Cost prices
  // - VIP discounts
  // - Multibuy prices
  // - Regular prices
  // So we just use it directly without any recalculation!
  const calculateSubtotal = () => {
    return cart.reduce((total, item) => {
      const effectivePrice = getItemPrice(item);
      return total + effectivePrice * item.quantity;
    }, 0);
  };

  // ALWAYS use calculateSubtotal() because it correctly handles promotional prices
  // bogoResult.originalTotal doesn't know about promotional pricing
  const originalTotal = calculateSubtotal();

  const bogoDiscount = bogoResult?.totalDiscount ?? 0;
  const adjustedTotal = originalTotal - bogoDiscount;
  const gst = adjustedTotal * 0.1; // 10% GST
  // Shipping will be calculated at checkout
  const finalTotal = adjustedTotal + gst;

  // Check if cart has age-restricted items
  const hasAgeRestrictedItems = cart.some(item => item.product.ageRestricted);
  const ageRestrictedCount = cart.filter(item => item.product.ageRestricted).length;

  return (
    <div className="min-h-screen bg-slate-50 w-full max-w-[100vw] overflow-x-hidden">
      <div className="bg-white border-b w-full">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 w-full">
          <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
          <p className="text-muted-foreground">Review your items before checkout</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 w-full">
        {/* Age Restriction Warning Banner */}
        {hasAgeRestrictedItems && (
          <Card className="mb-6 border-orange-500 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="size-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-1">Age Verification Required</h3>
                  <p className="text-sm text-orange-800">
                    Your cart contains {ageRestrictedCount} age-restricted {ageRestrictedCount === 1 ? 'item' : 'items'} (marked with 18+ badge). 
                    You will need to verify you are 18 years or older during checkout.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 w-full overflow-x-hidden">
          {/* Cart Items */}
          <div className="lg:col-span-2 w-full">
            <Card>
              <CardContent className="p-0">
                {cart.map((item, index) => (
                  <div key={item.product.id}>
                    <div className="p-3 md:p-6 flex gap-3 md:gap-6">
                      <Link to={`/products/${item.product.id}`} className="shrink-0">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="size-20 md:size-28 object-cover rounded border hover:border-slate-900 transition-colors"
                        />
                      </Link>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex justify-between gap-4 mb-2">
                          <Link to={`/products/${item.product.id}`}>
                            <h3 className="hover:text-slate-900 line-clamp-2">
                              {item.product.name}
                            </h3>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.product.id)}
                            className="shrink-0"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm text-muted-foreground">
                            {item.product.category}
                          </p>
                          {item.product.ageRestricted && (
                            <Badge className="bg-orange-500 hover:bg-orange-500 text-xs">
                              🔞 18+
                            </Badge>
                          )}
                        </div>
                        {item.product.selectedSize && (
                          <p className="text-sm font-semibold text-[#2D3748] mb-4">
                            Size: {item.product.selectedSize}
                          </p>
                        )}
                        
                        {/* Show MultiBuy Badge if applicable */}
                        {(() => {
                          const multibuyOption = getApplicableMultibuyOption(item.product, item.quantity);
                          const savings = calculateMultibuySavings(item.product, item.quantity);
                          const effectivePrice = getItemPrice(item);
                          
                          return (
                            <>
                              {multibuyOption && (
                                <Badge className="mb-3 bg-orange-600 hover:bg-orange-600">
                                  <Tag className="size-3 mr-1" />
                                  MultiBuy: {multibuyOption.quantity}+ @ ${multibuyOption.price.toFixed(2)} each
                                </Badge>
                              )}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateQuantity(item.product.id, item.quantity - 1)
                                    }
                                    className="size-8 p-0"
                                  >
                                    <Minus className="size-4" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateQuantity(
                                        item.product.id,
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                    className="w-16 text-center h-8"
                                    min="1"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateQuantity(item.product.id, item.quantity + 1)
                                    }
                                    className="size-8 p-0"
                                  >
                                    <Plus className="size-4" />
                                  </Button>
                                </div>
                                <div className="text-left sm:text-right">
                                  {/* Show promotional pricing badge if applicable */}
                                  {(item.product as any).promotionalPrice && (
                                    <div className="flex items-center gap-2 justify-end mb-1">
                                      <Badge className="bg-[#E31837] hover:bg-[#E31837] text-[10px]">
                                        PROMO PRICE
                                      </Badge>
                                    </div>
                                  )}
                                  {/* Show Cost+$100 badge if applicable */}
                                  {!((item.product as any).promotionalPrice) && (() => {
                                    const universalEnabled = localStorage.getItem('costplus100_universal_pricing_enabled') !== 'false';
                                    const p = item.product.price || 0;
                                    const c = (item.product as any).tradePrice || (item.product as any).baseCost || item.product.costPrice || 0;
                                    return universalEnabled && p >= 500 && p <= 10000 && c > 0;
                                  })() && (
                                    <div className="flex items-center gap-2 justify-end mb-1">
                                      <Badge className="bg-purple-600 hover:bg-purple-600 text-[10px]">
                                        COST+$100
                                      </Badge>
                                    </div>
                                  )}
                                  {/* Show cost price badge if applicable */}
                                  {!((item.product as any).promotionalPrice) && canBuyAtCostPrice && item.product.costPrice && (
                                    <div className="flex items-center gap-2 justify-end mb-1">
                                      <Badge className="bg-amber-600 hover:bg-amber-600 text-[10px]">
                                        COST PRICE
                                      </Badge>
                                    </div>
                                  )}
                                  {/* Show VIP badge if applicable */}
                                  {!((item.product as any).promotionalPrice) && !canBuyAtCostPrice && customerDiscountPercentage > 0 && (
                                    <div className="flex items-center gap-2 justify-end mb-1">
                                      <Badge className="bg-green-600 hover:bg-green-600 text-[10px]">
                                        -{customerDiscountPercentage}% VIP
                                      </Badge>
                                    </div>
                                  )}
                                  <p className="text-xl font-semibold">
                                    ${(effectivePrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    ${effectivePrice.toFixed(2)} each
                                  </p>
                                  {savings > 0 && (
                                    <p className="text-xs text-green-600 font-medium">
                                      Save ${savings.toFixed(2)}
                                    </p>
                                  )}
                                  {effectivePrice < item.product.price && (
                                    <p className="text-xs text-slate-400 line-through">
                                      ${item.product.price.toFixed(2)} each
                                    </p>
                                  )}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    {index < cart.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Link to="/products">
              <Button variant="ghost" className="mt-4">
                Continue Shopping
              </Button>
            </Link>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${originalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {/* Show applied BOGO specials */}
                  {bogoResult && bogoResult.appliedSpecials.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-green-700">Applied Specials:</p>
                        {bogoResult.appliedSpecials.map((special, index) => (
                          <div key={index} className="flex justify-between text-sm bg-green-50 p-2 rounded">
                            <span className="text-green-800 text-xs flex-1">{special.description}</span>
                            <span className="text-green-700 font-medium ml-2">-${special.discountAmount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-green-700">Total Savings</span>
                        <span className="text-green-700">-${bogoDiscount.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal After Specials</span>
                        <span>${adjustedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST (10%)</span>
                    <span>${gst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span>Total</span>
                    <span>${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Including ${gst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in GST
                  </p>
                </div>
                <Button
                  className="w-full h-12"
                  size="lg"
                  onClick={() => navigate('/checkout')}
                >
                  Proceed to Checkout
                  <ArrowRight className="ml-2 size-5" />
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Secure checkout
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}