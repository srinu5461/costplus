import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Trash2, ArrowLeft, Save } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { useCMS } from '../../context/CMSContext';
import { useProducts } from '../../../hooks/useProducts';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  discount?: number; // Percentage discount (0-100)
}

export function CreateInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { data } = useCMS();
  const { data: productsFromCDN } = useProducts();
  const products = productsFromCDN || [];
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerCompany: '',
    customerAddress: '',
    notes: '',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    taxRate: 0.1,
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Load order data if orderId is provided
  useEffect(() => {
    if (orderId) {
      loadOrderData();
    }
  }, [orderId]);

  const loadOrderData = async () => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const order = data.order;
        
        setFormData({
          customerName: order.customer?.name || '',
          customerEmail: order.customer?.email || '',
          customerPhone: order.customer?.phone || '',
          customerCompany: order.customer?.company || '',
          customerAddress: order.shippingAddress ? 
            `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zip}` : '',
          notes: order.notes || '',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          taxRate: 0.1,
        });
        
        setItems(order.items || []);
      }
    } catch (error) {
      console.error('Error loading order:', error);
    }
  };

  const addProduct = (product: any) => {
    const existingItem = items.find(item => item.id === product.id);
    if (existingItem) {
      setItems(items.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setItems([...items, {
        id: product.id,
        name: product.name,
        quantity: 1,
        price: parseFloat(product.price) || 0,
        discount: 0,
      }]);
    }
    setSearchQuery('');
    setShowProductSearch(false);
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(items.filter(item => item.id !== id));
    } else {
      setItems(items.map(item => 
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  const updateItemPrice = (id: string, price: number) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, price } : item
    ));
  };

  const updateItemDiscount = (id: string, discount: number) => {
    const clampedDiscount = Math.max(0, Math.min(100, discount));
    setItems(items.map(item =>
      item.id === id ? { ...item, discount: clampedDiscount } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.price;
    const discountAmount = itemTotal * ((item.discount || 0) / 100);
    return sum + (itemTotal - discountAmount);
  }, 0);
  const tax = subtotal * formData.taxRate;
  const total = subtotal + tax;

  const filteredProducts = products.filter((p: any) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerEmail || items.length === 0) {
      alert('Please fill in customer details and add at least one item');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/invoices/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          orderId: orderId || null,
          customer: {
            name: formData.customerName,
            email: formData.customerEmail,
            phone: formData.customerPhone,
            company: formData.customerCompany,
            address: formData.customerAddress,
          },
          items,
          subtotal,
          tax,
          total,
          notes: formData.notes,
          dueDate: new Date(formData.dueDate).toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Invoice created successfully!');
        navigate(`/admin/invoices/${data.invoice.id}`);
      } else {
        alert('Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin/invoices')}>
          <ArrowLeft className="size-4 mr-2" />
          Back to Invoices
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="customerCompany">Company</Label>
                  <Input
                    id="customerCompany"
                    value={formData.customerCompany}
                    onChange={(e) => setFormData({ ...formData, customerCompany: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="customerAddress">Address</Label>
                  <Textarea
                    id="customerAddress"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Items</h3>
              
              {/* Product Search */}
              {!orderId && (
                <div className="mb-4 relative">
                  <Input
                    placeholder="Search products to add..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowProductSearch(true);
                    }}
                    onFocus={() => setShowProductSearch(true)}
                  />
                  {showProductSearch && searchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {filteredProducts.map(product => (
                        <div
                          key={product.id}
                          className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => addProduct(product)}
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.sku} - ${parseFloat(product.price).toFixed(2)}
                          </div>
                        </div>
                      ))}
                      {filteredProducts.length === 0 && (
                        <div className="p-3 text-center text-muted-foreground">
                          No products found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex gap-2 items-center px-3 py-2 text-sm font-semibold text-muted-foreground">
                  <div className="flex-1">Product</div>
                  <div className="w-24 text-center">Qty</div>
                  <div className="w-32 text-center">Price</div>
                  <div className="w-28 text-center">Discount %</div>
                  <div className="w-32 text-right">Total</div>
                  <div className="w-10"></div>
                </div>
                {items.map(item => {
                  const itemTotal = item.quantity * item.price;
                  const discountAmount = itemTotal * ((item.discount || 0) / 100);
                  const finalPrice = itemTotal - discountAmount;

                  return (
                    <div key={item.id} className="flex gap-2 items-center p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value))}
                          min="1"
                          placeholder="Qty"
                        />
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value))}
                          placeholder="Price"
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={item.discount || 0}
                          onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div className="w-32 text-right">
                        <div className="font-semibold">${finalPrice.toFixed(2)}</div>
                        {(item.discount || 0) > 0 && (
                          <div className="text-xs text-muted-foreground line-through">
                            ${itemTotal.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground">
                    No items added. Search for products above to add them.
                  </div>
                )}
              </div>
            </div>

            {/* Totals */}
            {items.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({(formData.taxRate * 100).toFixed(0)}%):</span>
                  <span className="font-semibold">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Add any additional notes or payment terms..."
              />
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading || items.length === 0}>
                <Save className="size-4 mr-2" />
                {loading ? 'Creating...' : 'Create Invoice'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/admin/invoices')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
