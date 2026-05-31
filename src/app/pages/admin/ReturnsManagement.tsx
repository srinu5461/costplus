import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { 
  Package, Search, Eye, CheckCircle, XCircle, Clock, 
  DollarSign, Filter, Download
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface Return {
  id: string;
  returnNumber: string;
  orderId: string;
  customer: {
    name: string;
    email: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'refunded';
  refundAmount: number;
  createdAt: string;
  processedAt?: string;
}

export function ReturnsManagement() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalRefunded: 0,
  });

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await fetch(`${API_URL}/returns/list`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReturns(data.returns);
        calculateStats(data.returns);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (returnsList: Return[]) => {
    const stats = {
      total: returnsList.length,
      pending: returnsList.filter(r => r.status === 'pending').length,
      approved: returnsList.filter(r => r.status === 'approved').length,
      rejected: returnsList.filter(r => r.status === 'rejected').length,
      totalRefunded: returnsList
        .filter(r => r.status === 'refunded')
        .reduce((sum, r) => sum + r.refundAmount, 0),
    };
    setStats(stats);
  };

  const filteredReturns = returns.filter(ret => {
    const matchesSearch = 
      ret.returnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ret.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50">Rejected</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="bg-green-50">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-64 bg-slate-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Returns & Refunds Management</h1>
          <p className="text-muted-foreground mt-1">
            Process customer return requests and manage refunds
          </p>
        </div>
        <Button onClick={() => exportReturns()}>
          <Download className="size-4 mr-2" />
          Export Returns
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Returns</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Package className="size-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-full">
                <Clock className="size-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <CheckCircle className="size-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Refunded</p>
                <p className="text-2xl font-bold">${stats.totalRefunded.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <DollarSign className="size-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by return #, order #, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Returns List */}
      <Card>
        <CardHeader>
          <CardTitle>Return Requests ({filteredReturns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReturns.length === 0 ? (
            <div className="text-center py-12">
              <Package className="size-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No return requests found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 font-semibold text-sm border-b pb-2 px-4">
                <div className="col-span-2">Return #</div>
                <div className="col-span-2">Order #</div>
                <div className="col-span-2">Customer</div>
                <div className="col-span-2">Items</div>
                <div className="col-span-1 text-right">Amount</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1 text-center">Status</div>
              </div>

              {/* Rows */}
              {filteredReturns.map((ret) => (
                <div
                  key={ret.id}
                  className="grid grid-cols-12 gap-4 py-3 border-b hover:bg-slate-50 cursor-pointer px-4"
                  onClick={() => navigate(`/admin/returns/${ret.id}`)}
                >
                  <div className="col-span-2 font-medium">{ret.returnNumber}</div>
                  <div className="col-span-2 text-sm text-muted-foreground">{ret.orderId}</div>
                  <div className="col-span-2">
                    <div className="text-sm font-medium">{ret.customer.name}</div>
                    <div className="text-xs text-muted-foreground">{ret.customer.email}</div>
                  </div>
                  <div className="col-span-2 text-sm">{ret.items.length} item(s)</div>
                  <div className="col-span-1 text-right font-semibold">
                    ${ret.refundAmount.toFixed(2)}
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {new Date(ret.createdAt).toLocaleDateString()}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {getStatusBadge(ret.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function exportReturns() {
  const projectId = window.location.hostname.split('.')[0];
  window.open(
    `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/returns/export`,
    '_blank'
  );
}
