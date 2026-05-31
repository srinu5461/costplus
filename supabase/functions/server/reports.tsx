import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';

const reports = new Hono();

// Get dashboard statistics
reports.get('/dashboard', async (c) => {
  try {
    const [orders, quotations, invoices, returns, products] = await Promise.all([
      kv.getByPrefix('order:'),
      kv.getByPrefix('quotation:'),
      kv.getByPrefix('invoice:'),
      kv.getByPrefix('return:'),
      kv.get('cms:products') || []
    ]);
    
    // Calculate revenue
    const totalRevenue = orders
      .filter((o: any) => o.paymentStatus === 'paid')
      .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const monthlyRevenue = orders
      .filter((o: any) => {
        const orderDate = new Date(o.createdAt);
        return o.paymentStatus === 'paid' && 
               orderDate.getMonth() === currentMonth && 
               orderDate.getFullYear() === currentYear;
      })
      .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    
    const previousMonthRevenue = orders
      .filter((o: any) => {
        const orderDate = new Date(o.createdAt);
        return o.paymentStatus === 'paid' && 
               orderDate.getMonth() === previousMonth && 
               orderDate.getFullYear() === previousYear;
      })
      .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    
    const revenueGrowth = previousMonthRevenue > 0 
      ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : 0;
    
    // Count active customers (unique email addresses from orders)
    const customerEmails = new Set(
      orders.map((o: any) => o.customer?.email).filter(Boolean)
    );
    
    const newCustomersThisMonth = orders.filter((o: any) => {
      const orderDate = new Date(o.createdAt);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    }).map((o: any) => o.customer?.email).filter(Boolean);
    
    const uniqueNewCustomers = new Set(newCustomersThisMonth);
    
    // Order statistics
    const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
    const completedOrders = orders.filter((o: any) => o.status === 'completed').length;
    const cancelledOrders = orders.filter((o: any) => o.status === 'cancelled').length;
    
    // Quotation statistics
    const pendingQuotations = quotations.filter((q: any) => q.status === 'pending').length;
    const acceptedQuotations = quotations.filter((q: any) => q.status === 'accepted').length;
    const rejectedQuotations = quotations.filter((q: any) => q.status === 'rejected').length;
    const conversionRate = quotations.length > 0 
      ? (acceptedQuotations / quotations.length) * 100 
      : 0;
    
    // Invoice statistics
    const unpaidInvoices = invoices.filter((i: any) => i.status === 'unpaid').length;
    const paidInvoices = invoices.filter((i: any) => i.status === 'paid').length;
    const overdueInvoices = invoices.filter((i: any) => {
      if (i.status !== 'unpaid') return false;
      return new Date(i.dueDate) < new Date();
    }).length;
    
    const unpaidAmount = invoices
      .filter((i: any) => i.status === 'unpaid')
      .reduce((sum: number, i: any) => sum + (i.total || 0), 0);
    
    const paidAmount = invoices
      .filter((i: any) => i.status === 'paid')
      .reduce((sum: number, i: any) => sum + (i.total || 0), 0);
    
    // Returns statistics
    const pendingReturns = returns.filter((r: any) => r.status === 'pending').length;
    const approvedReturns = returns.filter((r: any) => r.status === 'approved').length;
    const rejectedReturns = returns.filter((r: any) => r.status === 'rejected').length;
    const totalRefunded = returns
      .filter((r: any) => r.status === 'refunded')
      .reduce((sum: number, r: any) => sum + (r.refundAmount || 0), 0);
    
    // Product statistics
    const productsArray = Array.isArray(products) ? products : [];
    const lowStockProducts = productsArray.filter((p: any) => 
      p.stock && p.stock > 0 && p.stock < 10
    ).length;
    const outOfStockProducts = productsArray.filter((p: any) => 
      p.stock === 0 || !p.inStock
    ).length;
    
    return c.json({
      success: true,
      dashboard: {
        revenue: {
          total: totalRevenue,
          monthly: monthlyRevenue,
          previousMonth: previousMonthRevenue,
          growth: revenueGrowth,
        },
        orders: {
          total: orders.length,
          pending: pendingOrders,
          completed: completedOrders,
          cancelled: cancelledOrders,
        },
        customers: {
          total: customerEmails.size,
          new: uniqueNewCustomers.size,
          returning: customerEmails.size - uniqueNewCustomers.size,
        },
        quotations: {
          total: quotations.length,
          pending: pendingQuotations,
          accepted: acceptedQuotations,
          rejected: rejectedQuotations,
          conversionRate,
        },
        invoices: {
          total: invoices.length,
          unpaid: unpaidInvoices,
          paid: paidInvoices,
          overdue: overdueInvoices,
          unpaidAmount,
          paidAmount,
        },
        returns: {
          total: returns.length,
          pending: pendingReturns,
          approved: approvedReturns,
          rejected: rejectedReturns,
          totalRefunded,
        },
        products: {
          total: productsArray.length,
          lowStock: lowStockProducts,
          outOfStock: outOfStockProducts,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return c.json({ success: false, error: 'Failed to fetch dashboard data' }, 500);
  }
});

// Get sales report
reports.get('/sales', async (c) => {
  try {
    const period = c.req.query('period') || 'month'; // day, week, month, year
    const orders = await kv.getByPrefix('order:');
    
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    const filteredOrders = orders.filter((o: any) => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= startDate;
    });
    
    const totalSales = filteredOrders
      .filter((o: any) => o.paymentStatus === 'paid')
      .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    
    const totalOrders = filteredOrders.length;
    const paidOrders = filteredOrders.filter((o: any) => o.paymentStatus === 'paid').length;
    const averageOrderValue = paidOrders > 0 ? totalSales / paidOrders : 0;
    
    // Group by date
    const salesByDate: Record<string, { date: string; sales: number; orders: number }> = {};
    
    filteredOrders.forEach((o: any) => {
      const dateKey = new Date(o.createdAt).toISOString().split('T')[0];
      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = { date: dateKey, sales: 0, orders: 0 };
      }
      salesByDate[dateKey].orders++;
      if (o.paymentStatus === 'paid') {
        salesByDate[dateKey].sales += o.total || 0;
      }
    });
    
    return c.json({
      success: true,
      report: {
        period,
        totalSales,
        totalOrders,
        paidOrders,
        averageOrderValue,
        salesByDate: Object.values(salesByDate).sort((a, b) => a.date.localeCompare(b.date)),
      },
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    return c.json({ success: false, error: 'Failed to generate sales report' }, 500);
  }
});

// Get product performance report
reports.get('/products', async (c) => {
  try {
    const orders = await kv.getByPrefix('order:');
    
    // Aggregate product sales
    const productStats: Record<string, {
      id: string;
      name: string;
      totalQuantity: number;
      totalRevenue: number;
      orderCount: number;
    }> = {};
    
    orders.forEach((order: any) => {
      if (!order.items) return;
      
      order.items.forEach((item: any) => {
        if (!productStats[item.id]) {
          productStats[item.id] = {
            id: item.id,
            name: item.name,
            totalQuantity: 0,
            totalRevenue: 0,
            orderCount: 0,
          };
        }
        
        productStats[item.id].totalQuantity += item.quantity;
        if (order.paymentStatus === 'paid') {
          productStats[item.id].totalRevenue += item.quantity * item.price;
        }
        productStats[item.id].orderCount++;
      });
    });
    
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 20);
    
    return c.json({
      success: true,
      report: {
        totalProducts: Object.keys(productStats).length,
        topProducts,
      },
    });
  } catch (error) {
    console.error('Error generating product report:', error);
    return c.json({ success: false, error: 'Failed to generate product report' }, 500);
  }
});

// Get customer report
reports.get('/customers', async (c) => {
  try {
    const orders = await kv.getByPrefix('order:');
    
    // Aggregate customer data
    const customerStats: Record<string, {
      email: string;
      name: string;
      totalOrders: number;
      totalSpent: number;
      lastOrderDate: string;
    }> = {};
    
    orders.forEach((order: any) => {
      const email = order.customer?.email;
      if (!email) return;
      
      if (!customerStats[email]) {
        customerStats[email] = {
          email,
          name: order.customer?.name || 'Unknown',
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: order.createdAt,
        };
      }
      
      customerStats[email].totalOrders++;
      if (order.paymentStatus === 'paid') {
        customerStats[email].totalSpent += order.total || 0;
      }
      
      if (new Date(order.createdAt) > new Date(customerStats[email].lastOrderDate)) {
        customerStats[email].lastOrderDate = order.createdAt;
      }
    });
    
    const topCustomers = Object.values(customerStats)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 20);
    
    return c.json({
      success: true,
      report: {
        totalCustomers: Object.keys(customerStats).length,
        topCustomers,
      },
    });
  } catch (error) {
    console.error('Error generating customer report:', error);
    return c.json({ success: false, error: 'Failed to generate customer report' }, 500);
  }
});

// Get inventory report (low stock alerts)
reports.get('/inventory', async (c) => {
  try {
    const products = await kv.get('cms:products') || [];
    
    if (!Array.isArray(products)) {
      return c.json({
        success: true,
        report: {
          totalProducts: 0,
          inStock: 0,
          outOfStock: 0,
          lowStock: [],
        },
      });
    }
    
    const inStock = products.filter((p: any) => p.inStock).length;
    const outOfStock = products.filter((p: any) => !p.inStock).length;
    
    // Low stock items (you can customize this based on your inventory field)
    const lowStock = products
      .filter((p: any) => p.inStock && (p.stockQuantity || 0) < 10)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        stockQuantity: p.stockQuantity || 0,
        sku: p.sku,
      }));
    
    return c.json({
      success: true,
      report: {
        totalProducts: products.length,
        inStock,
        outOfStock,
        lowStock,
      },
    });
  } catch (error) {
    console.error('Error generating inventory report:', error);
    return c.json({ success: false, error: 'Failed to generate inventory report' }, 500);
  }
});

export default reports;
