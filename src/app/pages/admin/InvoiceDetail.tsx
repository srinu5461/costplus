import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  ArrowLeft, CheckCircle, Download, Mail, Trash2, DollarSign
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId?: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
  };
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  dueDate: string;
  createdAt: string;
  paidAt?: string;
  notes?: string;
}

export function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`${API_URL}/invoices/${id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoice(data.invoice);
      } else {
        alert('Invoice not found');
        navigate('/admin/invoices');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      alert('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async () => {
    if (!confirm('Mark this invoice as paid?')) return;

    try {
      const response = await fetch(`${API_URL}/invoices/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ 
          status: 'paid',
          paidAt: new Date().toISOString()
        }),
      });

      if (response.ok) {
        alert('Invoice marked as paid');
        fetchInvoice();
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const cancelInvoice = async () => {
    if (!confirm('Cancel this invoice?')) return;

    try {
      const response = await fetch(`${API_URL}/invoices/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (response.ok) {
        alert('Invoice cancelled');
        fetchInvoice();
      } else {
        alert('Failed to cancel invoice');
      }
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      alert('Failed to cancel invoice');
    }
  };

  const deleteInvoice = async () => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const response = await fetch(`${API_URL}/invoices/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        alert('Invoice deleted');
        navigate('/admin/invoices');
      } else {
        alert('Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice');
    }
  };

  const sendEmail = async () => {
    if (!confirm('Send this invoice via email?')) return;
    setSendingEmail(true);

    try {
      const response = await fetch(`${API_URL}/invoices/${id}/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        alert('Invoice email sent successfully!');
        fetchInvoice(); // Refresh to show email sent status
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send invoice email');
      }
    } catch (error) {
      console.error('Error sending invoice email:', error);
      alert('Failed to send invoice email');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-64 bg-slate-200 rounded"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const getStatusBadge = () => {
    const isOverdue = invoice.status === 'unpaid' && new Date(invoice.dueDate) < new Date();
    
    if (isOverdue) {
      return <Badge variant="outline" className="bg-red-50">Overdue</Badge>;
    }

    switch (invoice.status) {
      case 'paid':
        return <Badge variant="outline" className="bg-green-50">Paid</Badge>;
      case 'unpaid':
        return <Badge variant="outline" className="bg-yellow-50">Unpaid</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{invoice.status}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/admin/invoices')}>
          <ArrowLeft className="size-4 mr-2" />
          Back to Invoices
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={sendEmail} disabled={sendingEmail}>
            <Mail className="size-4 mr-2" />
            {sendingEmail ? 'Sending...' : 'Email Invoice'}
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteInvoice}>
            <Trash2 className="size-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{invoice.invoiceNumber}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Created: {new Date(invoice.createdAt).toLocaleDateString()}</span>
                <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                {invoice.paidAt && (
                  <span className="text-green-600 font-medium">
                    Paid: {new Date(invoice.paidAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {invoice.status === 'unpaid' && (
              <>
                <Button onClick={markAsPaid}>
                  <CheckCircle className="size-4 mr-2" />
                  Mark as Paid
                </Button>
                <Button variant="outline" onClick={cancelInvoice}>
                  Cancel Invoice
                </Button>
              </>
            )}
            {invoice.orderId && (
              <Button variant="outline" onClick={() => navigate(`/admin/orders`)}>
                View Order: {invoice.orderId}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{invoice.customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{invoice.customer.email}</p>
            </div>
            {invoice.customer.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{invoice.customer.phone}</p>
              </div>
            )}
            {invoice.customer.company && (
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{invoice.customer.company}</p>
              </div>
            )}
            {invoice.customer.address && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{invoice.customer.address}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 font-semibold text-sm border-b pb-2">
              <div className="col-span-6">Product</div>
              <div className="col-span-2 text-right">Quantity</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {invoice.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 py-2 border-b">
                <div className="col-span-6">{item.name}</div>
                <div className="col-span-2 text-right">{item.quantity}</div>
                <div className="col-span-2 text-right">${item.price.toFixed(2)}</div>
                <div className="col-span-2 text-right font-semibold">
                  ${(item.quantity * item.price).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 max-w-md ml-auto">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold">${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span className="font-semibold">${invoice.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>${invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}