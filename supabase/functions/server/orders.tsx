import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendOrderConfirmationEmail } from './email.tsx';

const orders = new Hono();

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('🔧 [Orders Router] Initializing orders routes...');

// ⚡ IMPORTANT: Specific routes MUST come before parameterized routes (/:id)
// Otherwise Hono will match /:id first and never reach specific routes

// Test route to verify orders router is working
orders.get('/test', (c) => {
  return c.json({ success: true, message: 'Orders router is working!' });
});

// Create bank transfer order - MUST BE BEFORE /:id routes
console.log('🔧 [Orders Router] Registering POST /bank-transfer route');
orders.post('/bank-transfer', async (c) => {
  try {
    console.log('🏦 [Bank Transfer] ===== ROUTE HIT =====');
    console.log('🏦 [Bank Transfer] Received request');
    const orderData = await c.req.json();
    console.log('🏦 [Bank Transfer] Order data:', {
      customer: orderData.customer?.email,
      items: orderData.items?.length,
      total: orderData.total,
      shipping: orderData.shipping
    });

    // Import ID generator
    const { generateOrderNumber } = await import('./id_generator.tsx');

    // Generate order ID (6 digits)
    const orderId = await generateOrderNumber();
    console.log('🏦 [Bank Transfer] Generated order ID:', orderId);

    // Create order object with standardized field names
    const order = {
      id: orderId,
      orderId,
      customerId: orderData.customerId || orderData.customer?.id || null,
      customer: orderData.customer,
      shipping: [orderData.shipping],
      order_items: orderData.items || [],
      items: orderData.items,
      subtotal: orderData.subtotal,
      tax_amount: orderData.gst,
      gst: orderData.gst,
      shipping_amount: orderData.shippingCost || 0,
      shippingCost: orderData.shippingCost || 0,
      total: orderData.total,
      total_amount: orderData.total,
      bogoDiscount: orderData.bogoDiscount || 0,
      payment_method: 'Bank Transfer',
      paymentMethod: 'Bank Transfer',
      payment_status: 'pending',
      paymentStatus: 'pending',
      status: 'pending-payment',
      shippingMethod: orderData.shippingMethod,
      shipping_method: orderData.shippingMethod,
      usePickup: orderData.usePickup || false,
      pickupLocation: orderData.pickupLocation || null,
      ageVerificationRequired: orderData.ageVerificationRequired || false,
      ageVerifiedAt: orderData.ageVerifiedAt || null,
      ageVerifiedDOB: orderData.ageVerifiedDOB || null,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Please transfer funds using Order ID as reference',
    };

    // Save order
    console.log('🏦 [Bank Transfer] Saving order to KV store...');
    await kv.set(`order:${orderId}`, order);

    // Also add to orders list (used by some queries)
    const ordersList = await kv.get('orders') || [];
    ordersList.push(order);
    await kv.set('orders', ordersList);

    console.log('🏦 [Bank Transfer] Order saved successfully:', orderId);

    // Send order confirmation email asynchronously (don't await - fire and forget)
    (async () => {
      try {
        const customerEmail = orderData.customer?.email || orderData.shipping?.email;
        if (customerEmail) {
          console.log('🏦 [Bank Transfer] Attempting to send order confirmation email to:', customerEmail);
          await sendOrderConfirmationEmail(customerEmail, order);
          console.log('✓ Bank transfer order confirmation email sent to:', customerEmail);
        } else {
          console.warn('⚠️ No customer email found for order:', orderId);
        }
      } catch (emailError) {
        console.error('❌ Failed to send bank transfer confirmation email:', emailError);
        // Email failure doesn't affect the order
      }
    })();

    return c.json({
      success: true,
      orderId,
      order,
      message: 'Order created successfully. Please transfer funds to complete payment.'
    });
  } catch (error) {
    console.error('❌ [Bank Transfer] Error creating order:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order'
    }, 500);
  }
});

// Get all orders
orders.get('/list', async (c) => {
  try {
    const orders = await kv.getByPrefix('order:');
    return c.json({
      success: true,
      orders: orders.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return c.json({ success: false, error: 'Failed to fetch orders' }, 500);
  }
});

// Get single order by ID
orders.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const order = await kv.get(`order:${id}`);
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    
    return c.json({ success: true, order });
  } catch (error) {
    console.error('Error fetching order:', error);
    return c.json({ success: false, error: 'Failed to fetch order' }, 500);
  }
});

// Get orders by customer ID
orders.get('/customer/:customerId', async (c) => {
  try {
    const customerId = c.req.param('customerId');
    const allOrders = await kv.getByPrefix('order:');
    const customerOrders = allOrders.filter((order: any) => order.customerId === customerId);
    
    return c.json({ 
      success: true, 
      orders: customerOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return c.json({ success: false, error: 'Failed to fetch customer orders' }, 500);
  }
});

// Update order status
orders.put('/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    
    const order = await kv.get(`order:${id}`);
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    
    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    await kv.set(`order:${id}`, order);
    
    return c.json({ success: true, order });
  } catch (error) {
    console.error('Error updating order status:', error);
    return c.json({ success: false, error: 'Failed to update order status' }, 500);
  }
});

// Update order payment status
orders.put('/:id/payment-status', async (c) => {
  try {
    const id = c.req.param('id');
    const { paymentStatus } = await c.req.json();
    
    const order = await kv.get(`order:${id}`);
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    
    order.paymentStatus = paymentStatus;
    order.updatedAt = new Date().toISOString();
    
    if (paymentStatus === 'paid') {
      order.paidAt = new Date().toISOString();
    }
    
    await kv.set(`order:${id}`, order);
    
    return c.json({ success: true, order });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return c.json({ success: false, error: 'Failed to update payment status' }, 500);
  }
});

// Generate invoice from order (admin only, requires customer permission)
orders.post('/:id/generate-invoice', async (c) => {
  try {
    const id = c.req.param('id');
    const order = await kv.get(`order:${id}`);
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    
    // Check if invoice already generated
    if (order.invoiceId) {
      const existingInvoice = await kv.get(`invoice:${order.invoiceId}`);
      if (existingInvoice) {
        console.log('Order already has invoice:', order.invoiceId);
        return c.json({ 
          success: true, 
          invoice: existingInvoice,
          alreadyGenerated: true,
          message: 'Invoice already generated for this order'
        });
      }
    }
    
    // Check customer permission
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let canGenerateInvoices = false;
    
    // Try to get customer from Auth
    try {
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(order.customerId);
      if (authUser && authUser.user) {
        canGenerateInvoices = authUser.user.user_metadata?.can_generate_invoices || false;
      }
    } catch (authError) {
      // Try KV store
      let kvKey = `customer_${order.customerId}`;
      let customer = await kv.get(kvKey);
      
      if (!customer) {
        kvKey = `customer:${order.customerId}`;
        customer = await kv.get(kvKey);
      }
      
      if (customer) {
        canGenerateInvoices = customer.can_generate_invoices || false;
      }
    }
    
    if (!canGenerateInvoices) {
      return c.json({ 
        success: false, 
        error: 'Customer does not have permission to generate invoices' 
      }, 403);
    }
    
    // Import ID generators
    const { generateInvoiceNumber, generateUniqueId } = await import('./id_generator.tsx');
    
    // Generate invoice
    const invoiceId = generateUniqueId('invoice');
    const invoiceNumber = await generateInvoiceNumber();
    
    // Calculate due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    
    const invoice = {
      id: invoiceId,
      invoiceNumber,
      orderId: id,
      quotationId: order.quotationId,
      quotationNumber: order.quotationNumber,
      customer: order.customer,
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      taxRate: order.taxRate || 0.1,
      total: order.total,
      status: 'unpaid',
      dueDate: dueDate.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: order.notes,
    };
    
    // Save invoice
    await kv.set(`invoice:${invoiceId}`, invoice);
    
    // Update order with invoice ID
    order.invoiceId = invoiceId;
    order.invoiceNumber = invoiceNumber;
    order.updatedAt = new Date().toISOString();
    await kv.set(`order:${id}`, order);
    
    console.log('Generated invoice from order:', invoiceId);
    
    return c.json({ 
      success: true, 
      invoice,
      message: 'Invoice generated successfully'
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return c.json({ success: false, error: 'Failed to generate invoice' }, 500);
  }
});

// Delete order
orders.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // Delete the individual order key
    await kv.del(`order:${id}`);
    
    // Also remove from the orders array used by /payment/orders
    const ordersList = await kv.get('orders') || [];
    const updatedList = ordersList.filter((order: any) => order.id !== id);
    await kv.set('orders', updatedList);
    
    console.log(`Order ${id} deleted from both storage locations`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    return c.json({ success: false, error: 'Failed to delete order' }, 500);
  }
});

export default orders;
