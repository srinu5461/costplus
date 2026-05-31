import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { 
  ArrowLeft, CheckCircle, XCircle, DollarSign, Package, 
  User, Calendar, AlertCircle
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface ReturnDetail {
  id: string;
  returnNumber: string;
  orderId: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    price: number;
    reason: string;
  }>;
  reason: string;
  comments?: string;
  status: 'pending' | 'approved' | 'rejected' | 'refunded';
  refundAmount: number;
  refundMethod?: string;
  createdAt: string;
  processedAt?: string;
  adminNotes?: string;
}

export function ReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [returnData, setReturnData] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchReturnDetail();
  }, [id]);

  const fetchReturnDetail = async () => {
    try {
      const response = await fetch(`${API_URL}/returns/${id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReturnData(data.return);
        setAdminNotes(data.return.adminNotes || '');
      } else {
        alert('Return not found');
        navigate('/admin/returns');
      }
    } catch (error) {
      console.error('Error fetching return detail:', error);
      alert('Failed to load return');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: 'approved' | 'rejected' | 'refunded') => {
    if (!confirm(`Are you sure you want to ${status} this return?`)) return;

    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/returns/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          status,
          adminNotes,
          processedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        alert(`Return ${status} successfully`);
        fetchReturnDetail();
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const processRefund = async () => {
    if (!confirm('Process refund for this return? This will mark it as refunded.')) return;

    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/returns/${id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          adminNotes,
        }),
      });

      if (response.ok) {
        alert('Refund processed successfully');
        fetchReturnDetail();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to process refund');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('Failed to process refund');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-64 bg-slate-200 rounded"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!returnData) {
    return null;
  }

  const getStatusBadge = () => {
    switch (returnData.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50">Pending Review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50">Rejected</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="bg-green-50">Refunded</Badge>;
      default:
        return <Badge variant="outline">{returnData.status}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => navigate('/admin/returns')}>
          <ArrowLeft className="size-4 mr-2" />
          Back to Returns
        </Button>
      </div>

      {/* Return Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{returnData.returnNumber}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Order: {returnData.orderId}</span>
                <span>Created: {new Date(returnData.createdAt).toLocaleDateString()}</span>
                {returnData.processedAt && (
                  <span>Processed: {new Date(returnData.processedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          {returnData.status === 'pending' && (
            <div className="flex gap-4 mb-4">
              <Button onClick={() => updateStatus('approved')} disabled={processing}>
                <CheckCircle className="size-4 mr-2" />
                Approve Return
              </Button>
              <Button variant="outline" onClick={() => updateStatus('rejected')} disabled={processing}>
                <XCircle className="size-4 mr-2" />
                Reject Return
              </Button>
            </div>
          )}
          {returnData.status === 'approved' && (
            <div className="flex gap-4 mb-4">
              <Button onClick={processRefund} disabled={processing}>
                <DollarSign className="size-4 mr-2" />
                Process Refund
              </Button>
            </div>
          )}
          {returnData.status === 'refunded' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-5 text-green-600" />
                <span className="font-medium text-green-900">Refund Processed</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                ${returnData.refundAmount.toFixed(2)} refunded to customer
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{returnData.customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{returnData.customer.email}</p>
            </div>
            {returnData.customer.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{returnData.customer.phone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Return Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-5" />
            Return Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {returnData.items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded p-3 mt-2">
                  <p className="text-sm font-medium mb-1">Reason:</p>
                  <p className="text-sm text-muted-foreground">{item.reason}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between text-lg font-bold">
              <span>Total Refund Amount:</span>
              <span>${returnData.refundAmount.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Return Reason & Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="size-5" />
            Return Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Primary Reason:</p>
            <p className="text-sm bg-slate-50 rounded p-3">{returnData.reason}</p>
          </div>
          {returnData.comments && (
            <div>
              <p className="text-sm font-medium mb-2">Additional Comments:</p>
              <p className="text-sm bg-slate-50 rounded p-3 whitespace-pre-wrap">
                {returnData.comments}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Internal Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="adminNotes">Admin Notes (Internal Only)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                placeholder="Add internal notes about this return..."
                className="mt-2"
              />
            </div>
            <Button onClick={fetchReturnDetail} variant="outline">
              Save Notes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
