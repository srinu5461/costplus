import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { 
  Package, ArrowLeft, AlertCircle, CheckCircle 
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
}

const RETURN_REASONS = [
  'Defective or damaged product',
  'Wrong item received',
  'Item not as described',
  'No longer needed',
  'Found better price elsewhere',
  'Ordered by mistake',
  'Quality not as expected',
  'Other'
];

export function RequestReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemReasons, setItemReasons] = useState<Record<string, string>>({});
  const [mainReason, setMainReason] = useState('');
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        
        // Pre-fill customer info if available
        if (data.order.customer) {
          setCustomerName(data.order.customer.name || '');
          setCustomerEmail(data.order.customer.email || '');
          setCustomerPhone(data.order.customer.phone || '');
        }
      } else {
        alert('Order not found');
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      alert('Failed to load order');
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
      const newReasons = { ...itemReasons };
      delete newReasons[itemId];
      setItemReasons(newReasons);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const updateItemReason = (itemId: string, reason: string) => {
    setItemReasons({
      ...itemReasons,
      [itemId]: reason,
    });
  };

  const calculateRefundAmount = () => {
    if (!order) return 0;
    return order.items
      .filter((item: OrderItem) => selectedItems.has(item.id))
      .reduce((sum: number, item: OrderItem) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.size === 0) {
      alert('Please select at least one item to return');
      return;
    }

    // Validate reasons for all selected items
    const missingReasons = Array.from(selectedItems).filter(id => !itemReasons[id]);
    if (missingReasons.length > 0) {
      alert('Please provide a reason for each selected item');
      return;
    }

    if (!mainReason) {
      alert('Please select a primary reason for return');
      return;
    }

    if (!customerName || !customerEmail) {
      alert('Please provide your contact information');
      return;
    }

    setLoading(true);
    try {
      const returnItems = order.items
        .filter((item: OrderItem) => selectedItems.has(item.id))
        .map((item: OrderItem) => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          reason: itemReasons[item.id],
        }));

      const response = await fetch(`${API_URL}/returns/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          orderId,
          customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
          items: returnItems,
          reason: mainReason,
          comments,
          refundAmount: calculateRefundAmount(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubmitted(true);
      } else {
        alert('Failed to submit return request');
      }
    } catch (error) {
      console.error('Error submitting return:', error);
      alert('Failed to submit return request');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
                  <CheckCircle className="size-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Return Request Submitted</h1>
                <p className="text-muted-foreground">
                  We've received your return request and will review it within 1-2 business days.
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-6 mb-6">
                <p className="text-sm text-muted-foreground mb-2">
                  You will receive an email confirmation at:
                </p>
                <p className="font-medium">{customerEmail}</p>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground mb-6">
                <p>• We'll send you a return authorization email once approved</p>
                <p>• Please keep your items in original packaging</p>
                <p>• Refunds typically process within 5-7 business days after receiving returned items</p>
              </div>

              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('/')}>
                  Back to Home
                </Button>
                <Button variant="outline" onClick={() => navigate('/contact')}>
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-8 w-48 bg-slate-200 rounded mx-auto"></div>
                <div className="h-4 w-64 bg-slate-200 rounded mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Package className="size-6" />
              Request Return
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Order #{orderId}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="size-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Return Policy</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      <li>Returns accepted within 30 days of purchase</li>
                      <li>Items must be in original condition and packaging</li>
                      <li>Refunds processed within 5-7 business days</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Full Name *</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="customerPhone">Phone Number</Label>
                    <Input
                      id="customerPhone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Select Items to Return */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Select Items to Return</h3>
                <div className="space-y-3">
                  {order.items.map((item: OrderItem) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between mb-2">
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                              <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          
                          {selectedItems.has(item.id) && (
                            <div className="mt-3">
                              <Label>Reason for returning this item *</Label>
                              <Select
                                value={itemReasons[item.id] || ''}
                                onValueChange={(value) => updateItemReason(item.id, value)}
                              >
                                <SelectTrigger className="mt-2">
                                  <SelectValue placeholder="Select a reason" />
                                </SelectTrigger>
                                <SelectContent>
                                  {RETURN_REASONS.map((reason) => (
                                    <SelectItem key={reason} value={reason}>
                                      {reason}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Reason */}
              {selectedItems.size > 0 && (
                <>
                  <div>
                    <Label htmlFor="mainReason">Primary Reason for Return *</Label>
                    <Select value={mainReason} onValueChange={setMainReason}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select primary reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {RETURN_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="comments">Additional Comments (Optional)</Label>
                    <Textarea
                      id="comments"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={4}
                      placeholder="Please provide any additional details about your return..."
                      className="mt-2"
                    />
                  </div>

                  {/* Refund Summary */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Estimated Refund Amount:</span>
                      <span className="text-2xl font-bold">${calculateRefundAmount().toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Shipping charges are non-refundable. Refund will be processed to original payment method.
                    </p>
                  </div>
                </>
              )}

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit" 
                  disabled={loading || selectedItems.size === 0}
                  className="flex-1"
                >
                  {loading ? 'Submitting...' : 'Submit Return Request'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
