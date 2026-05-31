import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  ArrowLeft, CheckCircle, XCircle, FileText, Download, 
  ShoppingCart, Mail, Trash2
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface Quotation {
  id: string;
  quotationNumber: string;
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
  taxRate: number;
  total: number;
  status: string;
  validUntil: string;
  createdAt: string;
  notes?: string;
  invoiceId?: string;
}

export function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const fetchQuotation = async () => {
    try {
      const response = await fetch(`${API_URL}/quotations/${id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuotation(data.quotation);
      } else {
        alert('Quotation not found');
        navigate('/admin/quotations');
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
      alert('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const response = await fetch(`${API_URL}/quotations/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        alert(`Quotation ${status}`);
        fetchQuotation();
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const convertToOrder = async () => {
    if (!confirm('Convert this quotation to an invoice and send to customer?')) return;

    try {
      // Step 1: Convert to invoice
      const convertResponse = await fetch(`${API_URL}/quotations/${id}/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!convertResponse.ok) {
        const error = await convertResponse.json();
        alert(error.error || 'Failed to convert to invoice');
        return;
      }

      const convertData = await convertResponse.json();
      const invoice = convertData.invoice;
      const isAlreadyConverted = convertData.alreadyConverted;

      if (isAlreadyConverted) {
        // Already converted, just navigate to existing invoice
        alert(`This quotation is already converted to invoice ${invoice.invoiceNumber}`);
        navigate(`/admin/invoices/${invoice.id}`);
        return;
      }

      // Step 2: Send invoice email with payment link (for new conversions only)
      try {
        const emailResponse = await fetch(`${API_URL}/invoices/${invoice.id}/send-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });

        if (emailResponse.ok) {
          alert(`✅ Invoice ${invoice.invoiceNumber} created and sent!\n📧 Customer will receive email with payment link\n📋 Quotation: ${quotation?.quotationNumber}`);
        } else {
          alert(`✅ Invoice ${invoice.invoiceNumber} created!\n⚠️ Email failed to send. You can resend from Invoice Manager.`);
        }
      } catch (emailError) {
        console.error('Error sending invoice email:', emailError);
        alert(`✅ Invoice ${invoice.invoiceNumber} created!\n⚠️ Email failed to send. You can resend from Invoice Manager.`);
      }

      // Navigate to invoice
      navigate(`/admin/invoices/${invoice.id}`);
    } catch (error) {
      console.error('Error converting to invoice:', error);
      alert('Failed to convert to invoice');
    }
  };

  const deleteQuotation = async () => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;

    try {
      const response = await fetch(`${API_URL}/quotations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        alert('Quotation deleted');
        navigate('/admin/quotations');
      } else {
        alert('Failed to delete quotation');
      }
    } catch (error) {
      console.error('Error deleting quotation:', error);
      alert('Failed to delete quotation');
    }
  };

  const sendEmail = async () => {
    if (!confirm('Send this quotation via email?')) return;
    setSendingEmail(true);

    try {
      const response = await fetch(`${API_URL}/quotations/${id}/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        alert('Email sent successfully!');
        fetchQuotation(); // Refresh to show email sent status
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
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

  if (!quotation) {
    return null;
  }

  const getStatusBadge = () => {
    switch (quotation.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50">Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50">Rejected</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50">Expired</Badge>;
      default:
        return <Badge variant="outline">{quotation.status}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/admin/quotations')}>
          <ArrowLeft className="size-4 mr-2" />
          Back to Quotations
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={sendEmail}
            disabled={sendingEmail}
          >
            <Mail className="size-4 mr-2" />
            {sendingEmail ? 'Sending...' : 'Send Email'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteQuotation}>
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
              <CardTitle className="text-2xl mb-2">{quotation.quotationNumber}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Created: {new Date(quotation.createdAt).toLocaleDateString()}</span>
                <span>Valid Until: {new Date(quotation.validUntil).toLocaleDateString()}</span>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {quotation.status === 'pending' && (
              <>
                <Button onClick={() => updateStatus('accepted')}>
                  <CheckCircle className="size-4 mr-2" />
                  Accept
                </Button>
                <Button variant="outline" onClick={() => updateStatus('rejected')}>
                  <XCircle className="size-4 mr-2" />
                  Reject
                </Button>
                <Button variant="outline" onClick={convertToOrder}>
                  <FileText className="size-4 mr-2" />
                  Convert to Invoice
                </Button>
              </>
            )}
            {quotation.status === 'accepted' && !quotation.invoiceId && (
              <Button onClick={convertToOrder}>
                <FileText className="size-4 mr-2" />
                Convert to Invoice
              </Button>
            )}
            {quotation.invoiceId && (
              <Button variant="outline" onClick={() => navigate(`/admin/invoices/${quotation.invoiceId}`)}>
                <FileText className="size-4 mr-2" />
                View Invoice: {quotation.invoiceId}
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
              <p className="font-medium">{quotation.customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{quotation.customer.email}</p>
            </div>
            {quotation.customer.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{quotation.customer.phone}</p>
              </div>
            )}
            {quotation.customer.company && (
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{quotation.customer.company}</p>
              </div>
            )}
            {quotation.customer.address && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{quotation.customer.address}</p>
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
            {quotation.items.map((item, index) => (
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
              <span className="font-semibold">${quotation.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({(quotation.taxRate * 100).toFixed(0)}%):</span>
              <span className="font-semibold">${quotation.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>${quotation.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {quotation.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{quotation.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}