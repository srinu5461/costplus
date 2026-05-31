import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Receipt, Plus, Search, Eye, Download, DollarSign, 
  AlertCircle, CheckCircle, Clock, Calendar
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
  };
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'unpaid' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  createdAt: string;
  paidAt?: string;
  notes?: string;
}

export function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/invoices/list`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (invoice: Invoice) => {
    const isOverdue = invoice.status === 'unpaid' && new Date(invoice.dueDate) < new Date();
    
    if (isOverdue) {
      return <Badge variant="outline" className="bg-red-50"><AlertCircle className="size-3 mr-1" />Overdue</Badge>;
    }
    
    switch (invoice.status) {
      case 'paid':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle className="size-3 mr-1" />Paid</Badge>;
      case 'unpaid':
        return <Badge variant="outline" className="bg-yellow-50"><Clock className="size-3 mr-1" />Unpaid</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{invoice.status}</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (filterStatus === 'overdue') {
      matchesStatus = inv.status === 'unpaid' && new Date(inv.dueDate) < new Date();
    } else if (filterStatus !== 'all') {
      matchesStatus = inv.status === filterStatus;
    }
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: invoices.length,
    unpaid: invoices.filter(i => i.status === 'unpaid').length,
    overdue: invoices.filter(i => i.status === 'unpaid' && new Date(i.dueDate) < new Date()).length,
    unpaidAmount: invoices.filter(i => i.status === 'unpaid').reduce((sum, i) => sum + i.total, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-64 bg-slate-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Invoices</h1>
              <p className="text-muted-foreground">
                Manage customer invoices and track payments
              </p>
            </div>
            <Button onClick={() => navigate('/admin/invoices/create')}>
              <Plus className="size-4 mr-2" />
              Create Invoice
            </Button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Invoices</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Receipt className="size-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Unpaid</p>
                    <p className="text-2xl font-bold">{stats.unpaid}</p>
                  </div>
                  <Clock className="size-8 text-yellow-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                  </div>
                  <AlertCircle className="size-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Unpaid Amount</p>
                    <p className="text-2xl font-bold">${stats.unpaidAmount.toFixed(2)}</p>
                  </div>
                  <DollarSign className="size-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Invoices List */}
        {filteredInvoices.length > 0 ? (
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold">{invoice.invoiceNumber}</h3>
                        {getStatusBadge(invoice)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-muted-foreground mb-1">Customer</p>
                          <p className="font-medium">{invoice.customer.name}</p>
                          <p className="text-muted-foreground">{invoice.customer.email}</p>
                        </div>
                        
                        <div>
                          <p className="text-muted-foreground mb-1">Amount</p>
                          <p className="font-medium text-lg">${invoice.total.toFixed(2)}</p>
                          <p className="text-muted-foreground">{invoice.items.length} items</p>
                        </div>
                        
                        <div>
                          <p className="text-muted-foreground mb-1">Due Date</p>
                          <p className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                          {invoice.paidAt && (
                            <p className="text-muted-foreground">Paid: {new Date(invoice.paidAt).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(invoice.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/admin/invoices/${invoice.id}`)}
                      >
                        <Eye className="size-4 mr-2" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                      >
                        <Download className="size-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Receipt className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first invoice to get started'}
              </p>
              <Button onClick={() => navigate('/admin/invoices/create')}>
                <Plus className="size-4 mr-2" />
                Create Invoice
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}