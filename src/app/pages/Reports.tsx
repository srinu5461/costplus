import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  DollarSign, ShoppingCart, Users, Package, TrendingUp, 
  FileText, Receipt, Clock, AlertCircle, Download
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface DashboardData {
  revenue: {
    total: number;
    monthly: number;
  };
  orders: {
    total: number;
    pending: number;
  };
  customers: {
    total: number;
  };
  quotations: {
    total: number;
    pending: number;
    accepted: number;
  };
  invoices: {
    total: number;
    unpaid: number;
    overdue: number;
    unpaidAmount: number;
  };
  products: {
    total: number;
  };
}

interface SalesReport {
  period: string;
  totalSales: number;
  totalOrders: number;
  paidOrders: number;
  averageOrderValue: number;
  salesByDate: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
}

interface TopProduct {
  id: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

export function Reports() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    fetchDashboardData();
    fetchSalesReport(selectedPeriod);
    fetchTopProducts();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_URL}/reports/dashboard`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.dashboard);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchSalesReport = async (period: string) => {
    try {
      const response = await fetch(`${API_URL}/reports/sales?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSalesReport(data.report);
      }
    } catch (error) {
      console.error('Error fetching sales report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/reports/products`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTopProducts(data.report.topProducts.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching top products:', error);
    }
  };

  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-64 bg-slate-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
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
              <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
              <p className="text-muted-foreground">
                Track your business performance and key metrics
              </p>
            </div>
            <Button variant="outline">
              <Download className="size-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Revenue Card */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium opacity-90">Total Revenue</h3>
                <DollarSign className="size-8 opacity-50" />
              </div>
              <p className="text-3xl font-bold mb-2">
                ${dashboardData.revenue.total.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 text-sm opacity-90">
                <TrendingUp className="size-4" />
                <span>This month: ${dashboardData.revenue.monthly.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Orders Card */}
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium opacity-90">Total Orders</h3>
                <ShoppingCart className="size-8 opacity-50" />
              </div>
              <p className="text-3xl font-bold mb-2">
                {dashboardData.orders.total}
              </p>
              <div className="flex items-center gap-2 text-sm opacity-90">
                <Clock className="size-4" />
                <span>{dashboardData.orders.pending} pending</span>
              </div>
            </CardContent>
          </Card>

          {/* Customers Card */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium opacity-90">Total Customers</h3>
                <Users className="size-8 opacity-50" />
              </div>
              <p className="text-3xl font-bold mb-2">
                {dashboardData.customers.total}
              </p>
              <div className="flex items-center gap-2 text-sm opacity-90">
                <TrendingUp className="size-4" />
                <span>Active customers</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Quotations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="size-5 text-blue-500" />
                Quotations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-semibold">{dashboardData.quotations.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="font-semibold text-yellow-600">{dashboardData.quotations.pending}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Accepted</span>
                  <span className="font-semibold text-green-600">{dashboardData.quotations.accepted}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="size-5 text-green-500" />
                Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-semibold">{dashboardData.invoices.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Unpaid</span>
                  <span className="font-semibold text-yellow-600">{dashboardData.invoices.unpaid}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Overdue</span>
                  <span className="font-semibold text-red-600">{dashboardData.invoices.overdue}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="size-5 text-purple-500" />
                Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Products</span>
                  <span className="font-semibold">{dashboardData.products.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Unpaid Amount</span>
                  <span className="font-semibold text-red-600">
                    ${dashboardData.invoices.unpaidAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Report */}
        {salesReport && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sales Report</CardTitle>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-4 py-2 border rounded-md"
                >
                  <option value="day">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
                  <p className="text-2xl font-bold">${salesReport.totalSales.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
                  <p className="text-2xl font-bold">{salesReport.totalOrders}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Paid Orders</p>
                  <p className="text-2xl font-bold">{salesReport.paidOrders}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Avg Order Value</p>
                  <p className="text-2xl font-bold">${salesReport.averageOrderValue.toFixed(2)}</p>
                </div>
              </div>

              {/* Sales by Date Chart (Simple) */}
              <div className="space-y-2">
                <h4 className="font-medium mb-3">Sales by Date</h4>
                {salesReport.salesByDate.slice(-7).map((day, idx) => (
                  <div key={`${day.date}-${idx}`} className="flex items-center gap-4">
                    <span className="text-sm w-24">{new Date(day.date).toLocaleDateString()}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-8 relative overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-blue-500 flex items-center px-3 text-white text-sm font-medium"
                        style={{ 
                          width: `${Math.max((day.sales / Math.max(...salesReport.salesByDate.map(d => d.sales))) * 100, 10)}%` 
                        }}
                      >
                        ${day.sales.toFixed(0)}
                      </div>
                    </div>
                    <span className="text-sm w-20 text-right">{day.orders} orders</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {product.totalQuantity} units sold • {product.orderCount} orders
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      ${product.totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
