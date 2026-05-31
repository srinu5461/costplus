import { useState, useEffect } from 'react';
import { Package, Search, Eye, Edit, Trash2, Loader2, Calendar, DollarSign, Truck, Mail, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { useNavigate } from 'react-router';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function OrdersManager() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  
  // Shipping quote state
  const [shippingQuoteDialogOpen, setShippingQuoteDialogOpen] = useState(false);
  const [shippingCost, setShippingCost] = useState('');
  const [shippingGST, setShippingGST] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Refund state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Create Return state
  const [createReturnDialogOpen, setCreateReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnComments, setReturnComments] = useState('');
  const [selectedReturnItems, setSelectedReturnItems] = useState<string[]>([]);
  const [creatingReturn, setCreatingReturn] = useState(false);

  // Generate Invoice state
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);
  
  // Send Invoice Email state
  const [sendingInvoiceEmail, setSendingInvoiceEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    // Filter orders based on search term
    if (searchTerm) {
      const filtered = orders.filter(order =>
        order.id.toString().includes(searchTerm) ||
        order.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.payment_method?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOrders(filtered);
    } else {
      setFilteredOrders(orders);
    }
  }, [searchTerm, orders]);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/payment/orders`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setFilteredOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setEditStatus(order.order_status || 'processing');
    setEditDialogOpen(true);
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    try {
      // In a real implementation, you'd update via API
      // For now, we'll just update locally
      const updatedOrders = orders.map(o =>
        o.id === selectedOrder.id
          ? { ...o, order_status: editStatus }
          : o
      );
      setOrders(updatedOrders);
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  };

  const handleDeleteOrder = (order: any) => {
    setSelectedOrder(order);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedOrder) return;

    try {
      // Call backend API to delete the order
      const response = await fetch(`${API_URL}/orders/${selectedOrder.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      // Update local state after successful deletion
      const updatedOrders = orders.filter(o => o.id !== selectedOrder.id);
      setOrders(updatedOrders);
      setDeleteDialogOpen(false);
      alert('Order deleted successfully');
    } catch (error) {
      console.error('Failed to delete order:', error);
      alert('Failed to delete order. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'quote_sent':
        return 'bg-cyan-100 text-cyan-800';
      case 'ready_to_ship':
        return 'bg-purple-100 text-purple-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-teal-100 text-teal-800';
      case 'return_initiated':
        return 'bg-orange-100 text-orange-800';
      case 'refund_requested':
        return 'bg-amber-100 text-amber-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  // Check if order needs shipping (shipping_amount === 0 means customer pays later)
  // Truck icon should only show BEFORE quote is sent (initial stage)
  const needsShipping = (order: any) => {
    const hasShippingAddress = order.shipping?.[0]?.address;
    const noShippingCost = order.shipping_amount === 0 || order.shipping_amount === null || order.shipping_amount === undefined;
    const statusAllowsQuote = !['quote_sent', 'ready_to_ship', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(order.order_status);


    return hasShippingAddress && noShippingCost && statusAllowsQuote;
  };

  // Handle opening shipping quote dialog
  const handleCreateShippingQuote = (order: any) => {
    setSelectedOrder(order);
    setShippingCost('');
    setShippingGST('');
    setShippingNotes('');
    setBankDetails(`Bank: Costplus100 Bank
BSB: 123-456
Account Number: 12345678
Account Name: Costplus100 Pty Ltd

Please use Order #${order.id} as payment reference`);
    setPaymentLink('');
    setShippingQuoteDialogOpen(true);
  };

  // Auto-calculate GST when shipping cost changes
  const handleShippingCostChange = (value: string) => {
    setShippingCost(value);
    const cost = parseFloat(value);
    if (!isNaN(cost) && cost > 0) {
      const gst = cost * 0.1; // 10% GST
      setShippingGST(gst.toFixed(2));
    } else {
      setShippingGST('');
    }
  };

  // Send shipping quote email
  const handleSendShippingQuote = async () => {
    if (!selectedOrder || !shippingCost) {
      alert('Please enter shipping cost');
      return;
    }

    setSendingEmail(true);

    try {
      const cost = parseFloat(shippingCost);
      const gst = parseFloat(shippingGST) || 0;
      const totalShipping = cost + gst;
      
      // Get customer name with proper fallback
      const firstName = selectedOrder.shipping?.[0]?.first_name || selectedOrder.billing?.[0]?.first_name || '';
      const lastName = selectedOrder.shipping?.[0]?.last_name || selectedOrder.billing?.[0]?.last_name || '';
      const customerName = `${firstName} ${lastName}`.trim() || 'Valued Customer';

      const response = await fetch(`${API_URL}/email/shipping-quote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          customerEmail: selectedOrder.shipping[0]?.email,
          customerName: customerName,
          shippingCost: cost,
          shippingGST: gst,
          totalShipping,
          notes: shippingNotes,
          bankDetails,
          paymentLink,
          order: selectedOrder,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send shipping quote');
      }

      alert('Shipping quote email sent successfully!');
      setShippingQuoteDialogOpen(false);
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Error sending shipping quote:', error);
      alert('Failed to send shipping quote email');
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle opening refund dialog
  const handleRefundOrder = (order: any) => {
    setSelectedOrder(order);
    setRefundAmount('');
    setRefundReason('');
    setRefundDialogOpen(true);
  };

  // Process refund
  const handleProcessRefund = async () => {
    if (!selectedOrder || !refundAmount) {
      alert('Please enter refund amount');
      return;
    }

    setProcessingRefund(true);

    try {
      const amount = parseFloat(refundAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid refund amount');
      }

      const response = await fetch(`${API_URL}/payment/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          amount,
          reason: refundReason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process refund');
      }

      alert('Refund processed successfully!');
      setRefundDialogOpen(false);
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  // Handle status change directly from table
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId);

    try {
      const response = await fetch(`${API_URL}/payment/order/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      // Update local state
      const updatedOrders = orders.map(o =>
        o.id === orderId ? { ...o, order_status: newStatus } : o
      );
      setOrders(updatedOrders);
      setFilteredOrders(updatedOrders.filter(o => {
        if (!searchTerm) return true;
        return o.id.toString().includes(searchTerm) ||
          o.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.payment_method?.toLowerCase().includes(searchTerm.toLowerCase());
      }));
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Handle opening create return dialog
  const handleCreateReturn = (order: any) => {
    setSelectedOrder(order);
    setReturnReason('');
    setReturnComments('');
    setSelectedReturnItems([]);
    setCreateReturnDialogOpen(true);
  };

  // Process return
  const handleProcessReturn = async () => {
    if (!selectedOrder || !returnReason || selectedReturnItems.length === 0) {
      alert('Please enter return reason and select items to return');
      return;
    }

    setCreatingReturn(true);

    try {
      const response = await fetch(`${API_URL}/payment/order/${selectedOrder.id}/return`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: returnReason,
          comments: returnComments,
          items: selectedReturnItems,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process return');
      }

      alert('Return processed successfully!');
      setCreateReturnDialogOpen(false);
    } catch (error) {
      console.error('Error processing return:', error);
      alert('Failed to process return');
    } finally {
      setCreatingReturn(false);
    }
  };

  // Generate invoice from order
  const handleGenerateInvoice = async (order: any) => {
    if (!order.id) return;

    setGeneratingInvoice(order.id);

    try {
      const response = await fetch(`${API_URL}/invoices/generate-from-order/${order.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      const data = await response.json();

      if (data.alreadyExists) {
        alert('Invoice already exists for this order!');
        navigate(`/admin/invoices`);
      } else {
        alert('Invoice generated successfully!');
        navigate(`/admin/invoices`);
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice');
    } finally {
      setGeneratingInvoice(null);
    }
  };

  // Send invoice email for an order
  const handleSendInvoiceEmail = async (order: any) => {
    if (!order.id) return;

    // Check if order has an invoice
    if (!order.invoice_id && !order.invoiceId) {
      const confirmGenerate = confirm('This order does not have an invoice yet. Would you like to generate one first?');
      if (confirmGenerate) {
        await handleGenerateInvoice(order);
      }
      return;
    }

    setSendingInvoiceEmail(order.id);

    try {
      // Get invoice ID from order
      const invoiceId = order.invoice_id || order.invoiceId;
      
      // Send invoice email via backend
      const response = await fetch(`${API_URL}/invoices/${invoiceId}/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invoice email');
      }

      alert('Invoice email sent successfully!');
      fetchOrders(); // Refresh to get updated status
    } catch (error) {
      console.error('Error sending invoice email:', error);
      alert(`Failed to send invoice email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingInvoiceEmail(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Orders Management</h1>
          <p className="text-muted-foreground">
            View and manage all customer orders
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Package className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.payment_status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Package className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.order_status === 'processing').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${orders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by Order ID, Transaction ID, or Payment Method..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={fetchOrders} variant="outline">
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="size-8 animate-spin mx-auto text-[#E31837] mb-2" />
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="size-12 mx-auto text-slate-300 mb-3" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Order ID</TableHead>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead className="w-[180px]">Customer</TableHead>
                      <TableHead className="w-[60px]">Items</TableHead>
                      <TableHead className="w-[100px]">Amount</TableHead>
                      <TableHead className="w-[140px]">Payment</TableHead>
                      <TableHead className="w-[220px]">Status</TableHead>
                      <TableHead className="w-[550px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">#{order.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="size-4 text-muted-foreground" />
                          {new Date(order.created_at).toLocaleDateString('en-AU', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.shipping?.[0] ? (
                          <div>
                            <p className="font-medium">
                              {order.shipping[0].first_name} {order.shipping[0].last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.shipping[0].email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Guest</span>
                        )}
                      </TableCell>
                      <TableCell>{order.order_items?.length || 0}</TableCell>
                      <TableCell className="font-semibold">
                        ${order.total_amount?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{order.payment_method}</p>
                          <Badge className={getStatusColor(order.payment_status)} variant="outline">
                            {order.payment_status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Select
                            value={order.order_status || 'processing'}
                            onValueChange={(value) => handleStatusChange(order.id, value)}
                            disabled={updatingStatus === order.id}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">🕐 Pending</SelectItem>
                              <SelectItem value="processing">⚙️ Processing</SelectItem>
                              <SelectItem value="quote_sent">📧 Quote Sent</SelectItem>
                              <SelectItem value="ready_to_ship">📦 Ready to Ship</SelectItem>
                              <SelectItem value="shipped">🚚 Shipped</SelectItem>
                              <SelectItem value="delivered">✅ Delivered</SelectItem>
                              <SelectItem value="completed">🎉 Completed</SelectItem>
                              <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                              <SelectItem value="return_initiated">🔄 Return Initiated</SelectItem>
                              <SelectItem value="refund_requested">💰 Refund Requested</SelectItem>
                              <SelectItem value="refunded">✔️ Refunded</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {/* PROMINENT SHIPPING NEEDED BADGE */}
                          {needsShipping(order) && (
                            <Badge className="bg-[#E31837] text-white font-bold text-xs px-2.5 py-1.5 flex items-center gap-1.5 shadow-lg w-fit">
                              <Truck className="size-5 font-bold" />
                              <span>SHIPPING QUOTE NEEDED</span>
                            </Badge>
                          )}
                          
                          {order.order_status === 'return_initiated' && (
                            <Badge className="bg-orange-500 text-white animate-pulse">
                              🔄 Action Required: Create Return
                            </Badge>
                          )}
                          {updatingStatus === order.id && (
                            <Loader2 className="size-3 animate-spin text-[#E31837]" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap items-center">
                          {/* View Order */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewOrder(order)}
                            title="View Order Details"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="size-4" />
                          </Button>
                          
                          {/* Delete Order */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteOrder(order)}
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Delete Order"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                          
                          {/* Shipping Quote - Only if needed - VERY PROMINENT */}
                          {needsShipping(order) && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleCreateShippingQuote(order)}
                              className="bg-[#E31837] hover:bg-[#c41530] text-white font-bold shadow-lg animate-pulse"
                              title="Send Shipping Quote"
                            >
                              <Truck className="size-5 mr-1.5 font-bold" />
                              Send Quote
                            </Button>
                          )}
                          
                          {/* Generate Invoice - Available for all orders */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateInvoice(order)}
                            disabled={generatingInvoice === order.id}
                            className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                            title="Generate & View Invoice"
                          >
                            {generatingInvoice === order.id ? (
                              <Loader2 className="size-4 animate-spin mr-1" />
                            ) : (
                              <Receipt className="size-4 mr-1" />
                            )}
                            {order.invoice_id || order.invoiceId ? 'View' : 'Generate'}
                          </Button>
                          
                          {/* Send Invoice Email - Available if invoice exists */}
                          {(order.invoice_id || order.invoiceId) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendInvoiceEmail(order)}
                              disabled={sendingInvoiceEmail === order.id}
                              className="bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-700"
                              title="Send Invoice Email"
                            >
                              {sendingInvoiceEmail === order.id ? (
                                <Loader2 className="size-4 animate-spin mr-1" />
                              ) : (
                                <Mail className="size-4 mr-1" />
                              )}
                              Email
                            </Button>
                          )}
                          
                          {/* Process Refund */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRefundOrder(order)}
                            className="bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-700"
                            title="Process Refund"
                          >
                            <DollarSign className="size-4 mr-1" />
                            Refund
                          </Button>
                          
                          {/* Create Return - Only for return_initiated status */}
                          {order.order_status === 'return_initiated' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCreateReturn(order)}
                              className="bg-orange-50 hover:bg-orange-100 border-orange-300 animate-pulse text-orange-700"
                              title="Create Return"
                            >
                              <Package className="size-4 mr-1" />
                              Return
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>View complete order information and details</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Order Date</Label>
                  <p className="font-medium">
                    {new Date(selectedOrder.created_at).toLocaleString('en-AU')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-medium">{selectedOrder.payment_method}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Status</Label>
                  <Badge className={getStatusColor(selectedOrder.payment_status)}>
                    {selectedOrder.payment_status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Order Status</Label>
                  <Badge className={getStatusColor(selectedOrder.order_status)}>
                    {selectedOrder.order_status || 'processing'}
                  </Badge>
                </div>
              </div>

              {selectedOrder.shipping?.[0] && (
                <div>
                  <Label className="text-muted-foreground">Shipping Address</Label>
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium">
                      {selectedOrder.shipping[0].first_name} {selectedOrder.shipping[0].last_name}
                    </p>
                    <p>{selectedOrder.shipping[0].address}</p>
                    <p>
                      {selectedOrder.shipping[0].city}, {selectedOrder.shipping[0].state}{' '}
                      {selectedOrder.shipping[0].postcode}
                    </p>
                    <p>{selectedOrder.shipping[0].country}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selectedOrder.shipping[0].email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.shipping[0].phone}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Order Items</Label>
                <div className="mt-2 space-y-2">
                  {selectedOrder.order_items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="size-16 rounded bg-white flex-shrink-0">
                        {item.product?.image && (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.product?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} × ${item.product?.price?.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">${selectedOrder.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST:</span>
                    <span className="font-medium">${selectedOrder.tax_amount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping:</span>
                    <span className="font-medium">
                      {selectedOrder.shipping_amount === 0 ? (
                        <span className="text-orange-600 font-semibold">Quote Needed</span>
                      ) : (
                        `$${selectedOrder.shipping_amount?.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span className="text-[#E31837]">${selectedOrder.total_amount?.toFixed(2)}</span>
                  </div>
                  {selectedOrder.shipping_amount === 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-green-800">Product Payment Status:</span>
                        <span className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold">PAID</span>
                      </div>
                      <p className="text-xs text-green-700 mt-1">
                        Products have been paid. Shipping quote needs to be sent to customer.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {selectedOrder.transaction_id && (
                <div className="bg-slate-50 p-3 rounded-lg">
                  <Label className="text-muted-foreground">Transaction ID</Label>
                  <p className="font-mono text-sm mt-1">{selectedOrder.transaction_id}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Order #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>Update the order status</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Order Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateOrder} className="bg-[#E31837] hover:bg-[#E31837]/90">
              Update Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete order #{selectedOrder?.id}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDelete} variant="destructive">
              Delete Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipping Quote Dialog */}
      <Dialog open={shippingQuoteDialogOpen} onOpenChange={setShippingQuoteDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shipping Quote for Order #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>Generate and send a shipping quote to the customer</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Order Date</Label>
                  <p className="font-medium">
                    {new Date(selectedOrder.created_at).toLocaleString('en-AU')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-medium">{selectedOrder.payment_method}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Status</Label>
                  <Badge className={getStatusColor(selectedOrder.payment_status)}>
                    {selectedOrder.payment_status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Order Status</Label>
                  <Badge className={getStatusColor(selectedOrder.order_status)}>
                    {selectedOrder.order_status || 'processing'}
                  </Badge>
                </div>
              </div>

              {selectedOrder.shipping?.[0] && (
                <div>
                  <Label className="text-muted-foreground">Shipping Address</Label>
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium">
                      {selectedOrder.shipping[0].first_name} {selectedOrder.shipping[0].last_name}
                    </p>
                    <p>{selectedOrder.shipping[0].address}</p>
                    <p>
                      {selectedOrder.shipping[0].city}, {selectedOrder.shipping[0].state}{' '}
                      {selectedOrder.shipping[0].postcode}
                    </p>
                    <p>{selectedOrder.shipping[0].country}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selectedOrder.shipping[0].email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.shipping[0].phone}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Order Items</Label>
                <div className="mt-2 space-y-2">
                  {selectedOrder.order_items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="size-16 rounded bg-white flex-shrink-0">
                        {item.product?.image && (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.product?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} × ${item.product?.price?.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">${selectedOrder.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST:</span>
                    <span className="font-medium">${selectedOrder.tax_amount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping:</span>
                    <span className="font-medium">
                      {selectedOrder.shipping_amount === 0 ? (
                        <span className="text-orange-600 font-semibold">Quote Needed</span>
                      ) : (
                        `$${selectedOrder.shipping_amount?.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span className="text-[#E31837]">${selectedOrder.total_amount?.toFixed(2)}</span>
                  </div>
                  {selectedOrder.shipping_amount === 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-green-800">Product Payment Status:</span>
                        <span className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold">PAID</span>
                      </div>
                      <p className="text-xs text-green-700 mt-1">
                        Products have been paid. Shipping quote needs to be sent to customer.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {selectedOrder.transaction_id && (
                <div className="bg-slate-50 p-3 rounded-lg">
                  <Label className="text-muted-foreground">Transaction ID</Label>
                  <p className="font-mono text-sm mt-1">{selectedOrder.transaction_id}</p>
                </div>
              )}

              <div className="mt-4">
                <Label className="text-muted-foreground">Shipping Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => handleShippingCostChange(e.target.value)}
                />
              </div>

              <div className="mt-4">
                <Label className="text-muted-foreground">Shipping GST</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={shippingGST}
                  onChange={(e) => setShippingGST(e.target.value)}
                />
              </div>

              <div className="mt-4">
                <Label className="text-muted-foreground">Shipping Notes</Label>
                <Textarea
                  value={shippingNotes}
                  onChange={(e) => setShippingNotes(e.target.value)}
                />
              </div>

              <div className="mt-4">
                <Label className="text-muted-foreground">Bank Details</Label>
                <Textarea
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                />
              </div>

              <div className="mt-4">
                <Label className="text-muted-foreground">Payment Link</Label>
                <Input
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                />
              </div>

              {/* Shipping Quote Preview */}
              {shippingCost && parseFloat(shippingCost) > 0 && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">📧 Email Preview</h3>
                  
                  {/* Product Total - PAID */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-green-800">Product Payment Status:</span>
                      <span className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold">PAID</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">Product Subtotal:</span>
                        <span className="font-medium text-green-900">${selectedOrder.subtotal?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Product GST:</span>
                        <span className="font-medium text-green-900">${selectedOrder.tax_amount?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-green-300 pt-2 mt-2">
                        <span className="font-bold text-green-900">Product Total (PAID):</span>
                        <span className="font-bold text-green-900 text-lg">${selectedOrder.total_amount?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Total - DUE */}
                  <div className="bg-orange-50 border border-orange-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-orange-800">🚚 Shipping Payment Status:</span>
                      <span className="bg-orange-600 text-white px-3 py-1 rounded text-sm font-bold">DUE</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-orange-700">Shipping Cost:</span>
                        <span className="font-medium text-orange-900">${parseFloat(shippingCost).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-700">Shipping GST:</span>
                        <span className="font-medium text-orange-900">${parseFloat(shippingGST || '0').toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-orange-400 pt-2 mt-2">
                        <span className="font-bold text-orange-900">Total Shipping Due:</span>
                        <span className="font-bold text-orange-900 text-lg">
                          ${(parseFloat(shippingCost) + parseFloat(shippingGST || '0')).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {shippingNotes && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs font-semibold text-blue-800 mb-1">Notes:</p>
                      <p className="text-sm text-blue-900">{shippingNotes}</p>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShippingQuoteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSendShippingQuote}
                  className="bg-[#E31837] hover:bg-[#E31837]/90"
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    'Send Shipping Quote'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund Order #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>Process a refund for this order</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Refund Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Refund Reason</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleProcessRefund}
              className="bg-[#E31837] hover:bg-[#E31837]/90"
              disabled={processingRefund}
            >
              {processingRefund ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Process Refund'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Return Dialog */}
      <Dialog open={createReturnDialogOpen} onOpenChange={setCreateReturnDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Return for Order #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>Create a new return request for this order</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Order Date</Label>
                  <p className="font-medium">
                    {new Date(selectedOrder.created_at).toLocaleString('en-AU')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-medium">{selectedOrder.payment_method}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Status</Label>
                  <Badge className={getStatusColor(selectedOrder.payment_status)}>
                    {selectedOrder.payment_status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Order Status</Label>
                  <Badge className={getStatusColor(selectedOrder.order_status)}>
                    {selectedOrder.order_status || 'processing'}
                  </Badge>
                </div>
              </div>

              {selectedOrder.shipping?.[0] && (
                <div>
                  <Label className="text-muted-foreground">Shipping Address</Label>
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium">
                      {selectedOrder.shipping[0].first_name} {selectedOrder.shipping[0].last_name}
                    </p>
                    <p>{selectedOrder.shipping[0].address}</p>
                    <p>
                      {selectedOrder.shipping[0].city}, {selectedOrder.shipping[0].state}{' '}
                      {selectedOrder.shipping[0].postcode}
                    </p>
                    <p>{selectedOrder.shipping[0].country}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selectedOrder.shipping[0].email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.shipping[0].phone}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Order Items</Label>
                <div className="mt-2 space-y-2">
                  {selectedOrder.order_items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="size-16 rounded bg-white flex-shrink-0">
                        {item.product?.image && (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.product?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} × ${item.product?.price?.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-left">
                        <Checkbox
                          id={`item-${idx}`}
                          value={item.product?.id}
                          checked={selectedReturnItems.includes(item.product?.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedReturnItems([...selectedReturnItems, item.product?.id]);
                            } else {
                              setSelectedReturnItems(selectedReturnItems.filter(id => id !== item.product?.id));
                            }
                          }}
                        />
                        <Label
                          htmlFor={`item-${idx}`}
                          className="text-sm text-muted-foreground"
                        >
                          Return this item
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">${selectedOrder.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST:</span>
                    <span className="font-medium">${selectedOrder.tax_amount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping:</span>
                    <span className="font-medium">
                      {selectedOrder.shipping_amount === 0 ? (
                        <span className="text-orange-600 font-semibold">Quote Needed</span>
                      ) : (
                        `$${selectedOrder.shipping_amount?.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span className="text-[#E31837]">${selectedOrder.total_amount?.toFixed(2)}</span>
                  </div>
                  {selectedOrder.shipping_amount === 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-green-800">Product Payment Status:</span>
                        <span className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold">PAID</span>
                      </div>
                      <p className="text-xs text-green-700 mt-1">
                        Products have been paid. Shipping quote needs to be sent to customer.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {selectedOrder.transaction_id && (
                <div className="bg-slate-50 p-3 rounded-lg">
                  <Label className="text-muted-foreground">Transaction ID</Label>
                  <p className="font-mono text-sm mt-1">{selectedOrder.transaction_id}</p>
                </div>
              )}

              <div className="mt-4">
                <Label className="text-muted-foreground">Return Reason</Label>
                <Input
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </div>

              <div className="mt-4">
                <Label className="text-muted-foreground">Return Comments</Label>
                <Textarea
                  value={returnComments}
                  onChange={(e) => setReturnComments(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateReturnDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleProcessReturn}
                  className="bg-[#E31837] hover:bg-[#E31837]/90"
                  disabled={creatingReturn}
                >
                  {creatingReturn ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    'Process Return'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}