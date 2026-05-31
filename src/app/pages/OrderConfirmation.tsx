import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Mail,
  Phone,
  CreditCard,
  Loader2,
  AlertCircle,
  Building2,
  Clock
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function OrderConfirmation() {
  const { orderId: orderIdFromParams } = useParams();
  const [searchParams] = useSearchParams();
  const orderIdFromQuery = searchParams.get('orderId');
  const orderId = orderIdFromParams || orderIdFromQuery;
  const paymentMethod = searchParams.get('method');

  const [order, setOrder] = useState<any>(null);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`${API_URL}/payment/order/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Order not found');
      }

      const data = await response.json();
      setOrder(data);

      // If this is a bank transfer order, also fetch bank details
      if (paymentMethod === 'bank-transfer') {
        try {
          const bankResponse = await fetch(`${API_URL}/settings/bank-details`, {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          });
          if (bankResponse.ok) {
            const bankData = await bankResponse.json();
            if (bankData.success && bankData.bankDetails) {
              setBankDetails(bankData.bankDetails);
            }
          }
        } catch (error) {
          console.error('Failed to fetch bank details:', error);
        }
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="size-12 animate-spin mx-auto text-[#E31837] mb-4" />
        <p className="text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="bg-red-100 size-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="size-12 text-red-600" />
          </div>
          <h1 className="text-3xl mb-4 font-bold">Order Not Found</h1>
          <p className="text-muted-foreground mb-8">
            We couldn't find the order you're looking for.
          </p>
          <Link to="/products">
            <Button size="lg" className="bg-[#E31837] hover:bg-[#E31837]/90">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const shippingInfo = order.shipping?.[0] || {};
  const orderItems = order.order_items || [];

  // Debug: Log full order object and shipping details
  console.log('📦 ========== ORDER CONFIRMATION DEBUG ==========');
  console.log('📦 Full Order Object:', JSON.stringify(order, null, 2));
  console.log('📦 Shipping Method Check:', {
    'order.shippingMethod': order.shippingMethod,
    'order.shipping_method': order.shipping_method,
    'order.usePickup': order.usePickup,
    'order.shipping_amount': order.shipping_amount,
    'order.shippingCost': order.shippingCost,
    'Is Quote (shippingMethod)': order.shippingMethod === 'quote',
    'Is Quote (shipping_method)': order.shipping_method === 'quote',
    'Will Show': (order.shippingMethod === 'quote' || order.shipping_method === 'quote')
      ? 'Quote Sent Separately'
      : 'Something else'
  });
  console.log('📦 ============================================');

  return (
    <div className="min-h-screen bg-slate-50 py-4 md:py-8">
      <div className="container mx-auto px-4">
        {/* Success Header */}
        <Card className="max-w-3xl mx-auto mb-8">
          <CardContent className="p-8 md:p-12 text-center">
            <div className={`${paymentMethod === 'bank-transfer' ? 'bg-blue-100' : 'bg-green-100'} size-20 md:size-24 rounded-full flex items-center justify-center mx-auto mb-6`}>
              {paymentMethod === 'bank-transfer' ? (
                <Clock className="size-12 md:size-14 text-blue-600" />
              ) : (
                <CheckCircle2 className="size-12 md:size-14 text-green-600" />
              )}
            </div>
            <h1 className="text-2xl md:text-4xl mb-3 md:mb-4 font-bold">
              {paymentMethod === 'bank-transfer' ? 'Order Created!' : 'Order Confirmed!'}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8">
              {paymentMethod === 'bank-transfer'
                ? 'Thank you for your order. Please complete payment via bank transfer within 3 business days.'
                : 'Thank you for your order. We\'ve received your payment and will begin processing your order shortly.'}
            </p>
            <div className="bg-slate-50 p-4 md:p-6 rounded-lg inline-block">
              <p className="text-sm text-muted-foreground mb-2">Order Number</p>
              <p className="text-2xl md:text-3xl font-mono font-bold text-[#E31837]">#{order.id}</p>
              {paymentMethod === 'bank-transfer' && (
                <p className="text-xs text-amber-700 mt-2 font-medium">
                  ⚠️ Use this Order ID as your payment reference
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bank Transfer Instructions */}
        {paymentMethod === 'bank-transfer' && bankDetails && (
          <Card className="max-w-3xl mx-auto mb-8 border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-blue-600" />
                Bank Transfer Payment Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-amber-900 mb-2">⏱️ Payment Due</p>
                <p className="text-sm text-amber-800">
                  Please complete your bank transfer within <strong>3 business days</strong>. Your order will be processed once payment is verified.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Bank Name</p>
                  <p className="font-semibold">{bankDetails.bankName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Account Name</p>
                  <p className="font-semibold">{bankDetails.accountName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">BSB</p>
                  <p className="font-semibold font-mono text-lg">{bankDetails.bsb}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Account Number</p>
                  <p className="font-semibold font-mono text-lg">{bankDetails.accountNumber}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Payment Amount</p>
                  {order.shippingMethod === 'quote' || order.shipping_method === 'quote' ? (
                    <div>
                      <p className="font-semibold text-xl text-amber-600">Quote Sent Separately</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Shipping cost will be calculated and confirmed before payment
                      </p>
                    </div>
                  ) : (
                    <p className="font-semibold text-2xl text-[#E31837]">
                      ${(order.total_amount || order.total || 0).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="col-span-2 bg-slate-100 p-3 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Payment Reference (IMPORTANT)</p>
                  <p className="font-mono font-bold text-lg">#{order.id}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bankDetails.reference || 'Please use this Order ID as your payment reference'}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">What happens next?</p>
                {order.shippingMethod === 'quote' || order.shipping_method === 'quote' ? (
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>We'll calculate your shipping cost and email you a quote within 1 business day</li>
                    <li>Once you approve the quote, transfer the total amount to the bank account above</li>
                    <li>Use Order ID <strong>#{order.id}</strong> as your payment reference</li>
                    <li>Payment verification usually takes 1-2 business days</li>
                    <li>We'll email you once payment is confirmed and your order ships</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Transfer ${(order.total_amount || order.total || 0).toFixed(2)} to the bank account above</li>
                    <li>Use Order ID <strong>#{order.id}</strong> as your payment reference</li>
                    <li>Payment verification usually takes 1-2 business days</li>
                    <li>We'll email you once payment is confirmed and your order ships</li>
                  </ol>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Status */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Package className="size-5 text-[#E31837]" />
                    Order Status
                  </h2>
                  <div className="space-y-3">
                  {paymentMethod === 'bank-transfer' ? (
                    <>
                      <div className="flex items-center gap-3">
                        <Clock className="size-5 text-amber-600" />
                        <div>
                          <p className="font-medium">Awaiting Payment</p>
                          <p className="text-sm text-muted-foreground">
                            Bank transfer pending - Payment due within 3 business days
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Package className="size-5 text-slate-400" />
                        <div>
                          <p className="font-medium text-muted-foreground">Processing Order</p>
                          <p className="text-sm text-muted-foreground">Will begin after payment confirmation</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Truck className="size-5 text-slate-400" />
                        <div>
                          <p className="font-medium text-muted-foreground">Awaiting Shipment</p>
                          <p className="text-sm text-muted-foreground">
                            After payment: Estimated dispatch 1-2 business days
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="size-5 text-green-600" />
                        <div>
                          <p className="font-medium">Payment Confirmed</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleString('en-AU', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Package className="size-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Processing Order</p>
                          <p className="text-sm text-muted-foreground">Your order is being prepared</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Truck className="size-5 text-slate-400" />
                        <div>
                          <p className="font-medium text-muted-foreground">Awaiting Shipment</p>
                          <p className="text-sm text-muted-foreground">
                            Estimated dispatch: 1-2 business days
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Order Items</h2>
                <div className="space-y-4">
                  {orderItems.map((item: any, index: number) => {
                    // Handle both formats: nested product object OR flat item structure
                    const itemName = item.product?.name || item.productName || item.name || 'Product';
                    const itemImage = item.image || item.product?.image || '/placeholder.png';
                    const itemCode = item.product?.code || item.code || 'N/A';
                    const itemPrice = item.product?.price || item.price || 0;
                    const itemQuantity = item.quantity || 1;

                    return (
                      <div key={index} className="flex gap-4">
                        <div className="size-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          <img
                            src={itemImage}
                            alt={itemName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder.png';
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium mb-1">{itemName}</p>
                          <p className="text-xs text-muted-foreground mb-1">
                            Code: {itemCode}
                          </p>
                          <p className="text-sm text-muted-foreground mb-2">
                            Quantity: {itemQuantity}
                          </p>
                          <p className="font-semibold">
                            ${(itemPrice * itemQuantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold">Order Summary</h2>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${(order.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST (10%)</span>
                    <span className="font-medium">${(order.tax_amount || order.gst || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">
                      {(order.shippingMethod === 'quote' || order.shipping_method === 'quote')
                        ? <span className="text-amber-600 font-semibold">Quote Sent Separately</span>
                        : (order.shippingMethod === 'pickup' || order.shipping_method === 'pickup' || order.usePickup)
                        ? <span className="text-green-600 font-semibold">FREE (Pickup)</span>
                        : ((order.shipping_amount || 0) > 0 || (order.shippingCost || 0) > 0)
                        ? `$${(order.shipping_amount || order.shippingCost || 0).toFixed(2)}`
                        : <span className="text-green-600 font-semibold">FREE</span>}
                    </span>
                  </div>
                  {(order.shippingMethod === 'quote' || order.shipping_method === 'quote') && (
                    <div className="bg-amber-50 p-2 rounded text-xs text-amber-800 mt-2">
                      📦 Shipping quote to be provided within 24hrs
                    </div>
                  )}

                  {/* Voucher Discount */}
                  {(order.voucherCode || order.voucher_code || order.voucherDiscount > 0 || order.voucher_discount > 0) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Voucher Discount
                        {(order.voucherCode || order.voucher_code) && (
                          <span className="ml-2 text-xs font-mono text-green-700">
                            ({order.voucherCode || order.voucher_code})
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-green-600">
                        -${(order.voucherDiscount || order.voucher_discount || 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-[#E31837]">
                    {order.shippingMethod === 'quote' || order.shipping_method === 'quote'
                      ? <span className="text-sm font-normal text-amber-600">Quote Sent Separately</span>
                      : `$${(order.total_amount || order.total || 0).toFixed(2)}`}
                  </span>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="size-4" />
                    <span>Payment Method</span>
                  </div>
                  <p className="font-medium pl-6">{order.payment_method || order.paymentMethod}</p>

                  <div className="flex items-center gap-2 text-muted-foreground pt-2">
                    <Badge variant="outline" className="text-xs">
                      {(order.payment_status || order.paymentStatus || 'pending').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {order.transaction_id && (
                  <>
                    <Separator />
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
                      <p className="text-xs font-mono break-all">{order.transaction_id}</p>
                    </div>
                  </>
                )}

                <div className="pt-4 space-y-3">
                  <Link to="/products" className="block">
                    <Button className="w-full bg-[#E31837] hover:bg-[#E31837]/90">
                      Continue Shopping
                    </Button>
                  </Link>
                  <Link to="/" className="block">
                    <Button variant="outline" className="w-full">
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Shipping Information - Full Width at Bottom */}
          <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              {order.usePickup ? <Building2 className="size-5 text-[#E31837]" /> : <MapPin className="size-5 text-[#E31837]" />}
              {order.usePickup ? 'Pickup Information' : 'Shipping Address'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                {order.usePickup ? (
                  <>
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Pickup Location</p>
                      <div className="text-base space-y-1">
                        {(() => {
                          const pickupLoc = order.pickupLocation || order.pickup_location || 'Store Pickup';
                          // If location contains " - ", split it into name and address
                          if (pickupLoc.includes(' - ')) {
                            const [name, address] = pickupLoc.split(' - ');
                            return (
                              <>
                                <p className="font-semibold">{name}</p>
                                <p className="text-muted-foreground">{address}</p>
                              </>
                            );
                          }
                          return <p className="font-semibold">{pickupLoc}</p>;
                        })()}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Customer Name</p>
                      <p className="text-base">
                        {shippingInfo.first_name} {shippingInfo.last_name}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg mt-2">
                      <p className="text-xs text-blue-800">
                        <strong>📍 Pickup Instructions:</strong> We'll notify you via email when your order is ready for collection.
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Delivery Address</p>
                    <div className="text-base space-y-1">
                      <p className="font-semibold">
                        {shippingInfo.first_name} {shippingInfo.last_name}
                      </p>
                      <p>{shippingInfo.address}</p>
                      <p>
                        {shippingInfo.city}, {shippingInfo.state} {shippingInfo.postcode}
                      </p>
                      <p>{shippingInfo.country}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Contact Information</p>
                  <div className="space-y-2 text-base">
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-muted-foreground" />
                      <p>{shippingInfo.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-muted-foreground" />
                      <p>{shippingInfo.phone}</p>
                    </div>
                  </div>
                </div>

                {(order.shippingMethod || order.shipping_method || order.usePickup) && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">
                      {order.usePickup ? 'Fulfillment Method' : 'Shipping Method'}
                    </p>
                    <div className="flex items-center gap-2 text-base">
                      {order.usePickup ? (
                        <Building2 className="size-4 text-muted-foreground" />
                      ) : (
                        <Truck className="size-4 text-muted-foreground" />
                      )}
                      <p className="capitalize font-medium">
                        {order.usePickup
                          ? 'Store Pickup'
                          : (order.shippingMethod || order.shipping_method) === 'quote'
                          ? 'Shipping Quote Sent Separately'
                          : (order.shippingMethod || order.shipping_method) === 'pickup'
                          ? 'Store Pickup'
                          : `${order.shippingMethod || order.shipping_method} Delivery`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}