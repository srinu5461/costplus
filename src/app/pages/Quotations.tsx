import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  FileText, Plus, Search, Eye, CheckCircle, XCircle, Clock, 
  Calendar, DollarSign, User, Package
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
  };
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  validUntil: string;
  createdAt: string;
  notes?: string;
}

export function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/quotations/list`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuotations(data.quotations || []);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50"><Clock className="size-3 mr-1" />Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle className="size-3 mr-1" />Accepted</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50"><XCircle className="size-3 mr-1" />Rejected</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50"><Calendar className="size-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = 
      q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: quotations.length,
    pending: quotations.filter(q => q.status === 'pending').length,
    accepted: quotations.filter(q => q.status === 'accepted').length,
    totalValue: quotations.reduce((sum, q) => sum + q.total, 0),
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
              <h1 className="text-3xl font-bold mb-2">Quotations</h1>
              <p className="text-muted-foreground">
                Manage customer quotations and convert to orders
              </p>
            </div>
            <Button onClick={() => navigate('/admin/quotations/create')}>
              <Plus className="size-4 mr-2" />
              Create Quotation
            </Button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Quotations</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <FileText className="size-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Pending</p>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                  </div>
                  <Clock className="size-8 text-yellow-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Accepted</p>
                    <p className="text-2xl font-bold">{stats.accepted}</p>
                  </div>
                  <CheckCircle className="size-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Value</p>
                    <p className="text-2xl font-bold">${stats.totalValue.toFixed(2)}</p>
                  </div>
                  <DollarSign className="size-8 text-green-500 opacity-50" />
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
                placeholder="Search quotations..."
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
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Quotations List */}
        {filteredQuotations.length > 0 ? (
          <div className="space-y-4">
            {filteredQuotations.map((quotation) => (
              <Card key={quotation.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold">{quotation.quotationNumber}</h3>
                        {getStatusBadge(quotation.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="size-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{quotation.customer.name}</p>
                            <p className="text-muted-foreground">{quotation.customer.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Package className="size-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{quotation.items.length} Items</p>
                            <p className="text-muted-foreground">
                              {quotation.items.reduce((sum, item) => sum + item.quantity, 0)} units
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="size-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">${quotation.total.toFixed(2)}</p>
                            <p className="text-muted-foreground">Total (incl. GST)</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>Created: {new Date(quotation.createdAt).toLocaleDateString()}</span>
                        <span>Valid Until: {new Date(quotation.validUntil).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/admin/quotations/${quotation.id}`)}
                      >
                        <Eye className="size-4 mr-2" />
                        View
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
              <FileText className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No quotations found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first quotation to get started'}
              </p>
              <Button onClick={() => navigate('/admin/quotations/create')}>
                <Plus className="size-4 mr-2" />
                Create Quotation
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
