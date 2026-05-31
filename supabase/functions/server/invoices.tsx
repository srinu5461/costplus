import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';

const invoices = new Hono();

// Get all invoices
invoices.get('/list', async (c) => {
  try {
    const invoices = await kv.getByPrefix('invoice:');
    return c.json({ 
      success: true, 
      invoices: invoices.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return c.json({ success: false, error: 'Failed to fetch invoices' }, 500);
  }
});

// Get single invoice by ID
invoices.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const invoice = await kv.get(`invoice:${id}`);
    
    if (!invoice) {
      return c.json({ success: false, error: 'Invoice not found' }, 404);
    }
    
    return c.json({ success: true, invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return c.json({ success: false, error: 'Failed to fetch invoice' }, 500);
  }
});

// Create invoice from order
invoices.post('/create', async (c) => {
  try {
    const body = await c.req.json();
    const { orderId, customer, items, subtotal, tax, total, notes, dueDate } = body;
    
    if (!customer || !items || items.length === 0) {
      return c.json({ 
        success: false, 
        error: 'Customer and items are required' 
      }, 400);
    }
    
    // Generate invoice ID
    const invoiceId = `INV-${Date.now()}`;
    
    const invoice = {
      id: invoiceId,
      invoiceNumber: invoiceId,
      orderId: orderId || null,
      customer,
      items,
      subtotal: subtotal || items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0),
      tax: tax || 0,
      total: total || subtotal,
      notes: notes || '',
      status: 'unpaid', // unpaid, paid, overdue, cancelled
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paidAt: null,
    };
    
    await kv.set(`invoice:${invoiceId}`, invoice);
    
    return c.json({ success: true, invoice });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return c.json({ success: false, error: 'Failed to create invoice' }, 500);
  }
});

// Update invoice status
invoices.put('/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const { status, paidAt } = await c.req.json();
    
    const invoice = await kv.get(`invoice:${id}`);
    
    if (!invoice) {
      return c.json({ success: false, error: 'Invoice not found' }, 404);
    }
    
    invoice.status = status;
    invoice.updatedAt = new Date().toISOString();
    
    if (status === 'paid' && paidAt) {
      invoice.paidAt = paidAt;
    }
    
    await kv.set(`invoice:${id}`, invoice);
    
    // If invoice is paid, update the related order status
    if (status === 'paid' && invoice.orderId) {
      const order = await kv.get(`order:${invoice.orderId}`);
      if (order) {
        order.paymentStatus = 'paid';
        order.paidAt = paidAt || new Date().toISOString();
        order.status = 'processing'; // Move to processing after payment
        order.updatedAt = new Date().toISOString();
        await kv.set(`order:${invoice.orderId}`, order);
        console.log('Updated order payment status:', invoice.orderId);
      }
    }
    
    return c.json({ success: true, invoice });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return c.json({ success: false, error: 'Failed to update invoice' }, 500);
  }
});

// Delete invoice
invoices.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`invoice:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return c.json({ success: false, error: 'Failed to delete invoice' }, 500);
  }
});

// Generate invoice from order
invoices.post('/generate-from-order/:orderId', async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const order = await kv.get(`order:${orderId}`);
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    
    // Check if invoice already exists for this order
    const existingInvoices = await kv.getByPrefix('invoice:');
    const existingInvoice = existingInvoices.find((inv: any) => inv.orderId === orderId);
    
    if (existingInvoice) {
      return c.json({ success: true, invoice: existingInvoice, alreadyExists: true });
    }
    
    // Generate invoice ID
    const invoiceId = `INV-${Date.now()}`;
    
    // Map order data to invoice structure
    const shippingInfo = order.shipping?.[0] || order.billing?.[0] || {};
    const customerName = `${shippingInfo.first_name || ''} ${shippingInfo.last_name || ''}`.trim() || 'Customer';
    const customerEmail = shippingInfo.email || order.email || '';
    
    // Build customer object
    const customer = {
      name: customerName,
      email: customerEmail,
      phone: shippingInfo.phone || '',
      company: shippingInfo.company || '',
      address: shippingInfo.address ? 
        `${shippingInfo.address}, ${shippingInfo.city || ''} ${shippingInfo.state || ''} ${shippingInfo.postcode || ''}`.trim() : '',
    };
    
    // Map order items to invoice items
    const items = (order.order_items || []).map((item: any) => ({
      name: item.name || item.product?.name || 'Product',
      description: item.description || '',
      sku: item.code || item.product?.code || '',
      quantity: item.quantity || 1,
      price: item.price || item.product?.price || 0,
    }));
    
    // Calculate totals
    const itemsSubtotal = items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.price), 0);
    
    const shippingCost = order.shipping_amount || 0;
    const subtotalWithShipping = itemsSubtotal + shippingCost;
    const taxRate = 0.1; // 10% GST
    const tax = subtotalWithShipping * taxRate;
    const total = subtotalWithShipping + tax;
    
    // Add note about shipping if not yet paid
    let notes = order.notes || '';
    if (order.shipping_amount === 0 && shippingInfo.address) {
      notes = (notes ? notes + '\n\n' : '') + 
        '⚠️ SHIPPING QUOTE REQUIRED: Shipping cost to be confirmed and invoiced separately.';
    }
    
    const invoice = {
      id: invoiceId,
      invoiceNumber: invoiceId,
      orderId: order.id,
      customer,
      items,
      subtotal: itemsSubtotal,
      shippingCost,
      tax,
      taxRate,
      total,
      notes,
      status: order.payment_status === 'completed' ? 'paid' : 'unpaid',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paidAt: order.payment_status === 'completed' ? new Date().toISOString() : null,
    };
    
    await kv.set(`invoice:${invoiceId}`, invoice);
    
    // Auto-send invoice email
    try {
      console.log('Auto-sending invoice email...');
      
      // Get company info
      const companyInfo = await kv.get('company_info') || {
        companyName: 'COSTPLUS100 PTY LTD',
        tradingName: 'Costplus100',
        abn: '12 345 678 901',
        email: 'info@costplus100.com.au',
        phone: '1300 COSTPLUS',
        website: 'www.costplus100.com.au',
        address: '123 Industrial Drive',
        city: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia',
      };
      
      // Get bank details
      const bankDetails = await kv.get('bank_details') || {
        bankName: 'Commonwealth Bank',
        accountName: 'COSTPLUS100 PTY LTD',
        bsb: '063-000',
        accountNumber: '1234 5678',
      };
      
      const fullAddress = `${companyInfo.address}, ${companyInfo.city}, ${companyInfo.state} ${companyInfo.postcode}`;
      
      // Generate PDF
      const { generateInvoicePDF } = await import('./pdf-generator.tsx');
      const pdfBuffer = await generateInvoicePDF(invoice, { ...companyInfo, fullAddress, bankDetails });
      
      // Send email
      const { sendEmail } = await import('./email_utils.tsx');
      const itemsHtml = invoice.items.map((item: any) => `
        <tr>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0;">
            <strong style="color: #2D3748; display: block; margin-bottom: 4px;">${item.name}</strong>
            ${item.sku ? `<span style="color: #6B7280; font-size: 12px;">SKU: ${item.sku}</span>` : ''}
          </td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${item.price.toFixed(2)}</td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">$${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
      `).join('');
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2D3748; border-bottom: 3px solid #E31837; padding-bottom: 10px;">TAX INVOICE</h1>
            <p>Dear <strong>${invoice.customer.name}</strong>,</p>
            <p>Thank you for your order! Please find your tax invoice attached.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead style="background: #2D3748; color: white;">
                <tr>
                  <th style="padding: 10px; text-align: left;">Description</th>
                  <th style="padding: 10px; text-align: center;">Qty</th>
                  <th style="padding: 10px; text-align: right;">Price</th>
                  <th style="padding: 10px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            
            <table style="width: 100%; margin: 20px 0;">
              <tr><td style="text-align: right; padding: 5px;"><strong>Subtotal:</strong></td><td style="text-align: right; padding: 5px; width: 120px;">$${invoice.subtotal.toFixed(2)}</td></tr>
              ${invoice.shippingCost > 0 ? `<tr><td style="text-align: right; padding: 5px;"><strong>Shipping:</strong></td><td style="text-align: right; padding: 5px;">$${invoice.shippingCost.toFixed(2)}</td></tr>` : ''}
              <tr><td style="text-align: right; padding: 5px;"><strong>GST (10%):</strong></td><td style="text-align: right; padding: 5px;">$${invoice.tax.toFixed(2)}</td></tr>
              <tr style="border-top: 2px solid #2D3748;"><td style="text-align: right; padding: 10px;"><strong style="font-size: 18px;">TOTAL:</strong></td><td style="text-align: right; padding: 10px;"><strong style="font-size: 18px;">$${invoice.total.toFixed(2)}</strong></td></tr>
            </table>
            
            ${invoice.notes ? `<div style="background: #FEF3C7; padding: 15px; margin: 20px 0; border-left: 4px solid #F59E0B;"><strong>Notes:</strong><br>${invoice.notes}</div>` : ''}
            
            <p>If you have any questions, please contact us at ${companyInfo.email} or ${companyInfo.phone}.</p>
            <p>Best regards,<br><strong>${companyInfo.tradingName}</strong></p>
          </div>
        </body>
        </html>
      `;
      
      await sendEmail(
        invoice.customer.email,
        `Tax Invoice ${invoice.invoiceNumber} - ${companyInfo.tradingName}`,
        emailHtml,
        [{ filename: `Invoice-${invoice.invoiceNumber}.pdf`, content: pdfBuffer }]
      );
      
      // Mark as sent
      invoice.emailSent = true;
      invoice.emailSentAt = new Date().toISOString();
      await kv.set(`invoice:${invoiceId}`, invoice);
      
      console.log('Invoice email sent successfully!');
    } catch (emailError) {
      console.error('Failed to send invoice email:', emailError);
      // Continue anyway - invoice was created
    }
    
    return c.json({ success: true, invoice, emailSent: invoice.emailSent || false });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return c.json({ success: false, error: 'Failed to generate invoice' }, 500);
  }
});

// Send invoice email with payment link
invoices.post('/:id/send-email', async (c) => {
  try {
    const id = c.req.param('id');
    const invoice = await kv.get(`invoice:${id}`);
    
    if (!invoice) {
      return c.json({ success: false, error: 'Invoice not found' }, 404);
    }
    
    // Import the sendEmail function
    const { sendEmail } = await import('./email_utils.tsx');
    
    // Generate payment link (frontend checkout URL with invoice parameter)
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.supabase.co') || 'https://costplus100.com';
    const frontendUrl = baseUrl.replace('https://', 'https://').replace('.supabase.co', '-make-app.vercel.app');
    const paymentLink = `${frontendUrl}/checkout?invoice=${invoice.id}&amount=${invoice.total}`;
    
    // Get company info and bank details from database
    const companyInfo = await kv.get('company_info') || {
      companyName: 'COSTPLUS100 PTY LTD',
      tradingName: 'Costplus100',
      abn: '12 345 678 901',
      email: 'info@costplus100.com.au',
      website: 'www.costplus100.com.au',
      address: '123 Industrial Drive',
      city: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      country: 'Australia',
    };
    
    // Get bank details
    const bankDetails = await kv.get('bank_details') || {
      bankName: 'Commonwealth Bank',
      accountName: 'COSTPLUS100 PTY LTD',
      bsb: '063-000',
      accountNumber: '1234 5678',
    };
    
    // Build full address string
    const fullAddress = `${companyInfo.address}, ${companyInfo.city}, ${companyInfo.state} ${companyInfo.postcode}`;
    
    // Generate PDF attachment
    console.log('Generating invoice PDF...');
    const { generateInvoicePDF } = await import('./pdf-generator.tsx');
    const pdfBuffer = await generateInvoicePDF(invoice, { ...companyInfo, fullAddress, bankDetails });
    console.log('PDF generated, size:', pdfBuffer.length, 'bytes');
    
    // Generate items HTML for email
    const itemsHtml = invoice.items.map((item: any) => `
      <tr>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0;">
          <strong style="color: #2D3748; display: block; margin-bottom: 4px;">${item.name || item.description || 'Item'}</strong>
          ${item.sku ? `<span style="color: #6B7280; font-size: 12px;">SKU: ${item.sku}</span>` : ''}
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${(item.price || 0).toFixed(2)}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">$${((item.quantity * (item.price || 0))).toFixed(2)}</td>
      </tr>
    `).join('');
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1a202c; 
            margin: 0; 
            padding: 0;
            background-color: #f7fafc;
          }
          .container { 
            max-width: 650px; 
            margin: 30px auto; 
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #2D3748 0%, #1a202c 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0 0 10px 0; 
            font-size: 32px; 
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .header p { 
            margin: 0; 
            font-size: 18px; 
            opacity: 0.9;
          }
          .content { 
            padding: 40px 30px; 
          }
          .invoice-badge {
            display: inline-block;
            background: #E31837;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 14px;
            letter-spacing: 0.5px;
          }
          .info-box {
            background: #f7fafc;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
            border-left: 4px solid #E31837;
          }
          .info-box p {
            margin: 5px 0;
            font-size: 14px;
          }
          .info-box strong {
            color: #2D3748;
            font-weight: 600;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 25px 0;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
          }
          thead {
            background: #2D3748;
            color: white;
          }
          th { 
            padding: 12px 10px; 
            text-align: left; 
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          th.right { text-align: right; }
          th.center { text-align: center; }
          td {
            font-size: 14px;
          }
          .total-row { 
            background: #f7fafc; 
          }
          .total-row td {
            padding: 12px 10px;
            font-weight: 700;
            font-size: 18px;
            color: #2D3748;
          }
          .subtotal-row td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          .payment-button {
            display: inline-block;
            background: #E31837;
            color: white !important;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            text-align: center;
            box-shadow: 0 4px 6px rgba(227, 24, 55, 0.3);
            transition: all 0.3s ease;
          }
          .payment-button:hover {
            background: #c41530;
            box-shadow: 0 6px 8px rgba(227, 24, 55, 0.4);
          }
          .payment-box {
            background: linear-gradient(135deg, #E31837 0%, #c41530 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            text-align: center;
            margin: 30px 0;
          }
          .payment-box h3 {
            margin: 0 0 15px 0;
            font-size: 22px;
          }
          .payment-box p {
            margin: 10px 0;
            opacity: 0.95;
          }
          .notes-box {
            background: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .notes-box strong {
            color: #92400E;
            display: block;
            margin-bottom: 8px;
          }
          .footer {
            background: #2D3748;
            color: white;
            padding: 30px;
            text-align: center;
            font-size: 13px;
            line-height: 1.8;
          }
          .footer strong {
            display: block;
            font-size: 15px;
            margin-bottom: 8px;
          }
          .divider {
            border: none;
            border-top: 2px solid #e2e8f0;
            margin: 30px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>TAX INVOICE</h1>
            <p>${invoice.invoiceNumber}</p>
          </div>
          
          <!-- Content -->
          <div class="content">
            <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>${invoice.customer.name}</strong>,</p>
            <p style="font-size: 15px; color: #4a5568; margin-bottom: 25px;">
              Thank you for your business! Please find your tax invoice attached below. 
              ${invoice.quotationNumber ? `This invoice was generated from quotation <strong>${invoice.quotationNumber}</strong>.` : ''}
            </p>
            
            <!-- Invoice Details -->
            <div class="info-box">
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Invoice Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              ${invoice.quotationNumber ? `<p><strong>Quotation Reference:</strong> ${invoice.quotationNumber}</p>` : ''}
            </div>
            
            <!-- Customer Details -->
            <h3 style="color: #2D3748; margin: 25px 0 15px 0; font-size: 18px;">Bill To:</h3>
            <div style="background: #f7fafc; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
              <p style="margin: 5px 0;"><strong>${invoice.customer.name}</strong></p>
              ${invoice.customer.company ? `<p style="margin: 5px 0;">${invoice.customer.company}</p>` : ''}
              <p style="margin: 5px 0;">${invoice.customer.email}</p>
              ${invoice.customer.phone ? `<p style="margin: 5px 0;">${invoice.customer.phone}</p>` : ''}
              ${invoice.customer.address ? `<p style="margin: 5px 0;">${invoice.customer.address}</p>` : ''}
            </div>
            
            <!-- Items Table -->
            <h3 style="color: #2D3748; margin: 25px 0 15px 0; font-size: 18px;">Invoice Items:</h3>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="center">Qty</th>
                  <th class="right">Unit Price</th>
                  <th class="right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                
                <!-- Subtotal -->
                <tr class="subtotal-row">
                  <td colspan="3" style="text-align: right; padding: 10px;"><strong>Subtotal:</strong></td>
                  <td style="text-align: right; padding: 10px; font-weight: 600;">$${invoice.subtotal.toFixed(2)}</td>
                </tr>
                
                ${invoice.shippingCost && invoice.shippingCost > 0 ? `
                <tr class="subtotal-row">
                  <td colspan="3" style="text-align: right; padding: 10px;"><strong>Shipping:</strong></td>
                  <td style="text-align: right; padding: 10px; font-weight: 600;">$${invoice.shippingCost.toFixed(2)}</td>
                </tr>
                ` : ''}
                
                <!-- Tax -->
                <tr class="subtotal-row">
                  <td colspan="3" style="text-align: right; padding: 10px;"><strong>GST (${((invoice.taxRate || 0.1) * 100).toFixed(0)}%):</strong></td>
                  <td style="text-align: right; padding: 10px; font-weight: 600;">$${invoice.tax.toFixed(2)}</td>
                </tr>
                
                <!-- Total -->
                <tr class="total-row">
                  <td colspan="3" style="text-align: right;">TOTAL AMOUNT DUE:</td>
                  <td style="text-align: right;">$${invoice.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            
            ${invoice.notes ? `
            <div class="notes-box">
              <strong>📝 Notes:</strong>
              <p style="margin: 0; color: #78350f; white-space: pre-wrap;">${invoice.notes}</p>
            </div>
            ` : ''}
            
            ${invoice.status === 'unpaid' ? `
            <!-- Payment Call to Action -->
            <div class="payment-box">
              <h3>💳 Ready to Pay?</h3>
              <p style="font-size: 16px; margin-bottom: 20px;">Click the button below to securely pay your invoice online</p>
              <a href="${paymentLink}" class="payment-button">PAY NOW - $${invoice.total.toFixed(2)}</a>
              <p style="font-size: 13px; margin-top: 15px; opacity: 0.9;">
                Secure payment powered by eWay & PayPal
              </p>
            </div>
            
            <!-- Bank Transfer Details -->
            <div style="background: white; border: 2px solid #e2e8f0; padding: 25px; border-radius: 8px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px 0; color: #2D3748; font-size: 18px;">💵 Or Pay via Bank Transfer</h3>
              <div style="background: #f7fafc; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 14px;">
                ${invoice.bankDetails ? `
                <p style="margin: 8px 0;\"><strong style="color: #4a5568; font-family: sans-serif;\">Bank:</strong> ${invoice.bankDetails.bankName}</p>
                <p style="margin: 8px 0;\"><strong style="color: #4a5568; font-family: sans-serif;\">Account Name:</strong> ${invoice.bankDetails.accountName}</p>
                <p style="margin: 8px 0;\"><strong style="color: #4a5568; font-family: sans-serif;\">BSB:</strong> ${invoice.bankDetails.bsb}</p>
                <p style="margin: 8px 0;\"><strong style="color: #4a5568; font-family: sans-serif;\">Account Number:</strong> ${invoice.bankDetails.accountNumber}</p>
                <p style="margin: 8px 0;\"><strong style="color: #4a5568; font-family: sans-serif;\">Reference:</strong> <span style="background: #FEF3C7; padding: 2px 6px; border-radius: 3px; color: #92400E;\">${invoice.invoiceNumber}</span></p>
                ` : `
                <p style="margin: 8px 0;\"><strong style="color: #4a5568; font-family: sans-serif;\">Bank:</strong> Commonwealth Bank</p>
                <p style="margin: 8px 0;\"><strong style="color: #4a5568; font-family: sans-serif;\">Account Name:</strong> COSTPLUS100 PTY LTD</p>
                <p style="margin: 8px 0;\"><strong style="color: #4a5568; font-family: sans-serif;\">BSB:</strong> 063-000</p>
                <p style="margin: 8px 0;\"><strong style="color: #4a5568; font-family: sans-serif;\">Account Number:</strong> 1234 5678</p>
                <p style="margin: 8px 0;\"><strong style="color: #4a5568; font-family: sans-serif;\">Reference:</strong> <span style="background: #FEF3C7; padding: 2px 6px; border-radius: 3px; color: #92400E;\">${invoice.invoiceNumber}</span></p>
                `}
              </div>
              <p style="margin: 15px 0 0 0; font-size: 13px; color: #6B7280;">
                ⚠️ <strong>Important:</strong> Please include the invoice number (${invoice.invoiceNumber}) as your payment reference to ensure proper allocation.
              </p>
            </div>
            
            <div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; border-radius: 6px; margin: 25px 0;">
              <p style="margin: 0; color: #1E40AF; font-size: 14px;">
                <strong>📅 Payment Due:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
                <strong>�� Payment Options:</strong> Credit Card (instant) or Bank Transfer (1-3 business days)
              </p>
            </div>
            ` : ''}
            
            ${invoice.status === 'paid' ? `
            <div style="background: #D1FAE5; border-left: 4px solid #10B981; padding: 20px; border-radius: 6px; margin: 25px 0; text-align: center;">
              <p style="margin: 0; color: #065F46; font-size: 16px; font-weight: 600;">
                ✓ Payment Received - Thank You!
              </p>
              <p style="margin: 10px 0 0 0; color: #047857; font-size: 14px;">
                Payment was received on ${new Date(invoice.paidAt).toLocaleDateString('en-AU')}
              </p>
            </div>
            ` : ''}
            
            <hr class="divider">
            
            <p style="font-size: 14px; color: #4a5568; margin: 20px 0;">
              If you have any questions regarding this invoice, please don't hesitate to contact us.
            </p>
            <p style="font-size: 14px; margin: 5px 0;">
              <strong>Email:</strong> ${companyInfo.email}<br>
              <strong>Phone:</strong> ${companyInfo.phone}
            </p>
            
            <p style="font-size: 15px; margin-top: 30px; color: #2D3748;">
              Best regards,<br>
              <strong>${companyInfo.tradingName} Team</strong>
            </p>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <strong>${companyInfo.companyName}</strong>
            ABN: ${companyInfo.abn}<br>
            ${companyInfo.address || '123 Industrial Drive, Sydney NSW 2000'}<br>
            ${companyInfo.email} | ${companyInfo.phone}
            ${companyInfo.website ? ` | ${companyInfo.website}` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Send email with PDF attachment
    await sendEmail(
      invoice.customer.email,
      `Tax Invoice ${invoice.invoiceNumber} - ${companyInfo.tradingName}`,
      emailHtml,
      [{
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
      }]
    );
    
    // Update invoice with email sent timestamp
    invoice.emailSent = true;
    invoice.emailSentAt = new Date().toISOString();
    invoice.updatedAt = new Date().toISOString();
    await kv.set(`invoice:${id}`, invoice);
    
    console.log('Invoice email sent successfully to:', invoice.customer.email);
    return c.json({ success: true, message: 'Invoice email sent successfully', paymentLink });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return c.json({ success: false, error: 'Failed to send email: ' + error.message }, 500);
  }
});

export default invoices;