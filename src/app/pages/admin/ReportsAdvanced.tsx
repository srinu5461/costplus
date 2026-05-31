import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  DollarSign, ShoppingCart, Users, Package, TrendingUp, 
  FileText, Receipt, Clock, AlertCircle, Download, Calendar,
  ArrowUpRight, ArrowDownRight, RefreshCw, Filter, BarChart3
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Input } from '../../components/ui/input';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface DashboardData {
  revenue: {
    total: number;
    monthly: number;
    previousMonth: number;
    growth: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
  };
  quotations: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    conversionRate: number;
  };
  invoices: {
    total: number;
    unpaid: number;
    overdue: number;
    paid: number;
    unpaidAmount: number;
    paidAmount: number;
  };
  returns: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalRefunded: number;
  };
  products: {
    total: number;
    lowStock: number;
    outOfStock: number;
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
  sku: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

interface TopCustomer {
  name: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
}

export function ReportsAdvanced() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [reportType, setReportType] = useState<'overview' | 'sales' | 'products' | 'customers' | 'inventory'>('overview');
  
  // Date range filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchAllData();
  }, [selectedPeriod, startDate, endDate]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboardData(),
      fetchSalesReport(selectedPeriod),
      fetchTopProducts(),
      fetchTopCustomers(),
    ]);
    setLoading(false);
  };

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
      let url = `${API_URL}/reports/sales?period=${period}`;
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await fetch(url, {
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
        setTopProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching top products:', error);
    }
  };

  const fetchTopCustomers = async () => {
    try {
      const response = await fetch(`${API_URL}/reports/customers`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTopCustomers(data.customers);
      }
    } catch (error) {
      console.error('Error fetching top customers:', error);
    }
  };

  const exportReport = (type: string) => {
    // Trigger report download
    window.open(`${API_URL}/reports/export/${type}?period=${selectedPeriod}`, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-64 bg-slate-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <h1 className="text-3xl font-bold">Business Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into your business performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAllData}>
            <RefreshCw className="size-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => exportReport('comprehensive')}>
            <Download className="size-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={reportType === 'overview' ? 'default' : 'outline'}
          onClick={() => setReportType('overview')}
        >
          <BarChart3 className="size-4 mr-2" />
          Overview
        </Button>
        <Button
          variant={reportType === 'sales' ? 'default' : 'outline'}
          onClick={() => setReportType('sales')}
        >
          <DollarSign className="size-4 mr-2" />
          Sales
        </Button>
        <Button
          variant={reportType === 'products' ? 'default' : 'outline'}
          onClick={() => setReportType('products')}
        >
          <Package className="size-4 mr-2" />
          Products
        </Button>
        <Button
          variant={reportType === 'customers' ? 'default' : 'outline'}
          onClick={() => setReportType('customers')}
        >
          <Users className="size-4 mr-2" />
          Customers
        </Button>
        <Button
          variant={reportType === 'inventory' ? 'default' : 'outline'}
          onClick={() => setReportType('inventory')}
        >
          <AlertCircle className="size-4 mr-2" />
          Inventory
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {selectedPeriod === 'custom' && (
              <>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
            
            <Button onClick={fetchAllData}>
              <Filter className="size-4 mr-2" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview Report */}
      {reportType === 'overview' && dashboardData && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">${dashboardData.revenue.total.toFixed(2)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {dashboardData.revenue.growth >= 0 ? (
                        <ArrowUpRight className="size-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="size-4 text-red-600" />
                      )}
                      <span className={`text-xs ${dashboardData.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(dashboardData.revenue.growth).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-full">
                    <DollarSign className="size-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{dashboardData.orders.total}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboardData.orders.pending} pending
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-full">
                    <ShoppingCart className="size-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Customers</p>
                    <p className="text-2xl font-bold">{dashboardData.customers.total}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboardData.customers.new} new
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-full">
                    <Users className="size-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Products</p>
                    <p className="text-2xl font-bold">{dashboardData.products.total}</p>
                    <p className="text-xs text-red-600 mt-1">
                      {dashboardData.products.lowStock} low stock
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-full">
                    <Package className="size-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quotations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total:</span>
                    <span className="font-semibold">{dashboardData.quotations.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Pending:</span>
                    <span className="font-semibold text-yellow-600">{dashboardData.quotations.pending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Accepted:</span>
                    <span className="font-semibold text-green-600">{dashboardData.quotations.accepted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Conversion Rate:</span>
                    <span className="font-semibold">{dashboardData.quotations.conversionRate.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total:</span>
                    <span className="font-semibold">{dashboardData.invoices.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Unpaid:</span>
                    <span className="font-semibold text-yellow-600">{dashboardData.invoices.unpaid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Overdue:</span>
                    <span className="font-semibold text-red-600">{dashboardData.invoices.overdue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Unpaid Amount:</span>
                    <span className="font-semibold text-red-600">${dashboardData.invoices.unpaidAmount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Returns & Refunds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Returns:</span>
                    <span className="font-semibold">{dashboardData.returns.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Pending:</span>
                    <span className="font-semibold text-yellow-600">{dashboardData.returns.pending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Approved:</span>
                    <span className="font-semibold text-green-600">{dashboardData.returns.approved}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Refunded:</span>
                    <span className="font-semibold">${dashboardData.returns.totalRefunded.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Sales Report */}
      {reportType === 'sales' && salesReport && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">${salesReport.totalSales.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{salesReport.totalOrders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Paid Orders</p>
                <p className="text-2xl font-bold">{salesReport.paidOrders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">${salesReport.averageOrderValue.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sales Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {salesReport.salesByDate.map((item) => (
                  <div key={item.date} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-muted-foreground">{item.date}</div>
                    <div className="flex-1">
                      <div className="h-8 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{
                            width: `${(item.sales / salesReport.totalSales) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-32 text-right">
                      <div className="font-semibold">${item.sales.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{item.orders} orders</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Products Report */}
      {reportType === 'products' && (
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 font-semibold text-sm border-b pb-2">
                <div className="col-span-5">Product</div>
                <div className="col-span-2 text-right">Units Sold</div>
                <div className="col-span-2 text-right">Orders</div>
                <div className="col-span-3 text-right">Revenue</div>
              </div>
              {topProducts.map((product) => (
                <div key={product.id} className="grid grid-cols-12 gap-4 py-2 border-b">
                  <div className="col-span-5">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">{product.sku}</div>
                  </div>
                  <div className="col-span-2 text-right">{product.totalQuantity}</div>
                  <div className="col-span-2 text-right">{product.orderCount}</div>
                  <div className="col-span-3 text-right font-semibold">
                    ${product.totalRevenue.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customers Report */}
      {reportType === 'customers' && (
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 font-semibold text-sm border-b pb-2">
                <div className="col-span-5">Customer</div>
                <div className="col-span-3 text-right">Total Orders</div>
                <div className="col-span-4 text-right">Total Spent</div>
              </div>
              {topCustomers.map((customer, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 py-2 border-b">
                  <div className="col-span-5">
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-muted-foreground">{customer.email}</div>
                  </div>
                  <div className="col-span-3 text-right">{customer.totalOrders}</div>
                  <div className="col-span-4 text-right font-semibold">
                    ${customer.totalSpent.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Report */}
      {reportType === 'inventory' && dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{dashboardData.products.total}</p>
              <p className="text-sm text-muted-foreground mt-2">Active products in catalog</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alert</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{dashboardData.products.lowStock}</p>
              <p className="text-sm text-muted-foreground mt-2">Products below threshold</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Out of Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{dashboardData.products.outOfStock}</p>
              <p className="text-sm text-muted-foreground mt-2">Products unavailable</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" onClick={() => exportReport('sales')}>
              <Download className="size-4 mr-2" />
              Export Sales Report (CSV)
            </Button>
            <Button variant="outline" onClick={() => exportReport('products')}>
              <Download className="size-4 mr-2" />
              Export Products Report (CSV)
            </Button>
            <Button variant="outline" onClick={() => exportReport('customers')}>
              <Download className="size-4 mr-2" />
              Export Customers Report (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
