import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  User,
  Package,
  LogOut,
  Key,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  PackageCheck,
  PackageX
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export function CustomerDashboard() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const [customerDiscountPercentage, setCustomerDiscountPercentage] = useState(0);
  const [canBuyAtCostPrice, setCanBuyAtCostPrice] = useState(false);

  useEffect(() => {
    // Check if customer is logged in
    const customerData = localStorage.getItem('customer');

    if (!customerData) {
      navigate('/customer/login');
      return;
    }

    try {
      const parsedCustomer = JSON.parse(customerData);
      setCustomer(parsedCustomer);

      // Check customer pricing access
      const costPriceAccess = parsedCustomer?.can_see_cost_price || false;
      const discountPercentage = parsedCustomer?.discount_percentage || 0;

      setCanBuyAtCostPrice(costPriceAccess);
      // Only show VIP discount for discount % customers (not cost price customers)
      if (!costPriceAccess && discountPercentage > 0) {
        setCustomerDiscountPercentage(discountPercentage);
      }

      // Fetch customer orders
      fetchOrders(parsedCustomer.id);
    } catch (error) {
      console.error('Error parsing customer data:', error);
      navigate('/customer/login');
    }
  }, [navigate]);

  const fetchOrders = async (customerId: string) => {
    try {
      const response = await fetch(`${API_URL}/payment/customer/${customerId}/orders`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer');
    navigate('/customer/login');
  };

  const handleRefresh = async () => {
    if (!customer) return;
    
    setRefreshing(true);
    await fetchOrders(customer.id);
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
      case 'ready_to_ship':
        return 'bg-purple-100 text-purple-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refund_requested':
        return 'bg-orange-100 text-orange-800';
      case 'refunded':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return <CheckCircle2 className="size-4" />;
      case 'shipped':
      case 'ready_to_ship':
        return <Truck className="size-4" />;
      case 'processing':
        return <Package className="size-4" />;
      case 'pending':
        return <Clock className="size-4" />;
      case 'cancelled':
        return <XCircle className="size-4" />;
      case 'refund_requested':
      case 'refunded':
        return <PackageX className="size-4" />;
      default:
        return <Package className="size-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ready_to_ship':
        return 'Ready to Ship';
      case 'refund_requested':
        return 'Refund Requested';
      default:
        return status?.toUpperCase();
    }
  };

  if (!customer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 md:py-12 w-full max-w-[100vw] overflow-x-hidden">
      <div className="container mx-auto px-4 w-full">
        {/* Back to Home Link */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-[#2D3748]">
            <ShoppingBag className="size-4 mr-2" />
            Back to Home
          </Link>
        </div>
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Welcome back, {customer.firstName}!
              </h1>
              <p className="text-muted-foreground">
                Manage your orders and account settings
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/products">
                <Button variant="outline">
                  <ShoppingBag className="size-4 mr-2" />
                  Continue Shopping
                </Button>
              </Link>
              <Button onClick={handleLogout} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                <LogOut className="size-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-[#2D3748] size-12 rounded-full flex items-center justify-center">
                    <User className="size-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {customer.firstName} {customer.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">Customer</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground break-all">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{orders.length} Orders</span>
                  </div>
                </div>

                <Separator />

                <Link to="/customer/change-password" className="block">
                  <Button variant="outline" className="w-full">
                    <Key className="size-4 mr-2" />
                    Change Password
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Order Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Orders</span>
                  <Badge variant="outline">{orders.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <Badge className="bg-green-100 text-green-800">
                    {orders.filter(o => o.payment_status === 'completed').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Processing</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {orders.filter(o => o.order_status === 'processing').length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>My Orders</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`size-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="size-12 animate-spin mx-auto text-[#E31837] mb-4" />
                    <p className="text-muted-foreground">Loading orders...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-slate-100 size-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingBag className="size-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No Orders Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      You haven't placed any orders yet. Start shopping to see your orders here.
                    </p>
                    <Link to="/products">
                      <Button className="bg-[#E31837] hover:bg-[#E31837]/90">
                        Browse Products
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 hover:border-[#E31837] transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="font-semibold text-lg">Order #{order.id}</h3>
                              {/* Order Status Badge */}
                              <Badge className={getStatusColor(order.order_status || 'processing')}>
                                {getStatusIcon(order.order_status || 'processing')}
                                <span className="ml-1">{getStatusLabel(order.order_status || 'processing')}</span>
                              </Badge>
                              {/* Payment Status Badge */}
                              {order.payment_status && order.payment_status === 'completed' && (
                                <Badge className="bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="size-3 mr-1" />
                                  Paid
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="size-4" />
                              {new Date(order.created_at).toLocaleDateString('en-AU', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-2xl font-bold text-[#E31837]">
                              ${order.total_amount?.toFixed(2)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {order.order_items?.length || 0} item(s)
                            </p>
                          </div>
                        </div>

                        <Separator className="mb-4" />

                        {/* Order Items Preview with Pricing */}
                        <div className="space-y-3 mb-4">
                          {order.order_items?.slice(0, 2).map((item: any, idx: number) => {
                            const itemPrice = item.product?.price || item.price || 0;
                            const itemCostPrice = item.product?.costPrice || item.costPrice || 0;
                            const itemQuantity = item.quantity || 1;

                            // Determine effective price based on customer type
                            let displayPrice = itemPrice;
                            let showCostBadge = false;
                            let showVIPBadge = false;

                            if (canBuyAtCostPrice && itemCostPrice > 0) {
                              displayPrice = itemCostPrice;
                              showCostBadge = true;
                            } else if (customerDiscountPercentage > 0) {
                              displayPrice = itemPrice * (1 - customerDiscountPercentage / 100);
                              showVIPBadge = true;
                            }

                            const itemImage = item.product?.image || item.image || '';

                            return (
                              <div key={idx} className="flex gap-3 bg-slate-50 p-3 rounded-lg">
                                <div className="size-16 rounded bg-white border flex-shrink-0">
                                  {itemImage ? (
                                    <img
                                      src={itemImage}
                                      alt={item.product?.name || item.productName || 'Product'}
                                      className="w-full h-full object-cover rounded"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded">
                                      <Package className="size-8 text-slate-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium line-clamp-2 mb-1 text-sm">{item.product?.name || item.productName || 'Product'}</p>
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <p className="text-xs text-muted-foreground">Qty: {itemQuantity}</p>
                                    {showCostBadge && (
                                      <Badge className="bg-amber-600 hover:bg-amber-600 text-[10px]">
                                        COST PRICE
                                      </Badge>
                                    )}
                                    {showVIPBadge && (
                                      <Badge className="bg-green-600 hover:bg-green-600 text-[10px]">
                                        -{customerDiscountPercentage}% VIP
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {(showCostBadge || showVIPBadge) && (
                                      <span className="text-xs text-slate-400 line-through">
                                        ${itemPrice.toFixed(2)} each
                                      </span>
                                    )}
                                    <span className="text-sm font-semibold text-[#E31837]">
                                      ${displayPrice.toFixed(2)} each
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Total: ${(displayPrice * itemQuantity).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          {order.order_items?.length > 2 && (
                            <p className="text-sm text-muted-foreground text-center py-2 bg-slate-100 rounded">
                              + {order.order_items.length - 2} more item(s)
                            </p>
                          )}
                        </div>

                        {/* Shipping Info */}
                        {order.shipping?.[0] && (
                          <div className="bg-slate-50 p-3 rounded-lg mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Truck className="size-4 text-muted-foreground" />
                              <span className="font-medium text-sm">Shipping To:</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {order.shipping[0].address}, {order.shipping[0].city}, {order.shipping[0].state} {order.shipping[0].postcode}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                          <Link to={`/order/${order.id}`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              View Details
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            onClick={() => {
                              // TODO: Track order
                              alert('Order tracking coming soon!');
                            }}
                          >
                            <Truck className="size-4 mr-2" />
                            Track Order
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}