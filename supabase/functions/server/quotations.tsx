import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';
import { generateQuotationNumber, generateUniqueId } from './id_generator.tsx';

const quotations = new Hono();

// Get all quotations
quotations.get('/list', async (c) => {
  try {
    const quotations = await kv.getByPrefix('quotation:');
    return c.json({ 
      success: true, 
      quotations: quotations.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    });
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return c.json({ success: false, error: 'Failed to fetch quotations' }, 500);
  }
});

// Get single quotation by ID
quotations.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const quotation = await kv.get(`quotation:${id}`);
    
    if (!quotation) {
      return c.json({ success: false, error: 'Quotation not found' }, 404);
    }
    
    return c.json({ success: true, quotation });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    return c.json({ success: false, error: 'Failed to fetch quotation' }, 500);
  }
});

// Create new quotation
quotations.post('/create', async (c) => {
  try {
    const body = await c.req.json();
    const { customer, items, notes, validUntil, taxRate = 0.1 } = body;
    
    if (!customer || !items || items.length === 0) {
      return c.json({ 
        success: false, 
        error: 'Customer and items are required' 
      }, 400);
    }
    
    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.price);
    }, 0);
    
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    
    // Generate quotation ID and number
    const quotationId = generateUniqueId('quotation');
    const quotationNumber = await generateQuotationNumber();
    
    const quotation = {
      id: quotationId,
      quotationNumber: quotationNumber,
      customer,
      items,
      subtotal,
      tax,
      taxRate,
      total,
      notes: notes || '',
      status: 'pending', // pending, accepted, rejected, expired
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`quotation:${quotationId}`, quotation);
    
    return c.json({ success: true, quotation });
  } catch (error) {
    console.error('Error creating quotation:', error);
    return c.json({ success: false, error: 'Failed to create quotation' }, 500);
  }
});

// Update quotation status
quotations.put('/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    
    const quotation = await kv.get(`quotation:${id}`);
    
    if (!quotation) {
      return c.json({ success: false, error: 'Quotation not found' }, 404);
    }
    
    quotation.status = status;
    quotation.updatedAt = new Date().toISOString();
    
    await kv.set(`quotation:${id}`, quotation);
    
    return c.json({ success: true, quotation });
  } catch (error) {
    console.error('Error updating quotation:', error);
    return c.json({ success: false, error: 'Failed to update quotation' }, 500);
  }
});

// Delete quotation
quotations.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`quotation:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    return c.json({ success: false, error: 'Failed to delete quotation' }, 500);
  }
});

// Convert quotation to order (customer accepts quotation)
quotations.post('/:id/convert-to-order', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { customerId } = body;
    
    if (!customerId) {
      return c.json({ success: false, error: 'Customer ID is required' }, 400);
    }
    
    const quotation = await kv.get(`quotation:${id}`);
    
    if (!quotation) {
      return c.json({ success: false, error: 'Quotation not found' }, 404);
    }
    
    // Check if already converted
    if (quotation.status === 'accepted' && quotation.orderId) {
      const existingOrder = await kv.get(`order:${quotation.orderId}`);
      if (existingOrder) {
        console.log('Quotation already converted to order:', quotation.orderId);
        return c.json({ 
          success: true, 
          order: existingOrder,
          alreadyConverted: true,
          message: 'Quotation was already converted to an order'
        });
      }
    }
    
    // Import ID generator
    const { generateUniqueId } = await import('./id_generator.tsx');
    
    // Create order from quotation
    const orderId = generateUniqueId('order');
    const order = {
      id: orderId,
      quotationId: id,
      quotationNumber: quotation.quotationNumber,
      customerId,
      customer: quotation.customer,
      items: quotation.items,
      subtotal: quotation.subtotal,
      tax: quotation.tax,
      total: quotation.total,
      status: 'pending', // waiting for admin to process
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: quotation.notes,
    };
    
    // Save order
    await kv.set(`order:${orderId}`, order);
    
    // Update quotation status
    quotation.status = 'accepted';
    quotation.orderId = orderId;
    quotation.acceptedAt = new Date().toISOString();
    await kv.set(`quotation:${id}`, quotation);
    
    console.log('Created order from quotation:', orderId);
    
    return c.json({ 
      success: true, 
      order,
      message: 'Quotation converted to order successfully'
    });
  } catch (error) {
    console.error('Error converting quotation to order:', error);
    return c.json({ success: false, error: 'Failed to convert quotation to order' }, 500);
  }
});

// Send quotation email
quotations.post('/:id/send-email', async (c) => {
  try {
    const id = c.req.param('id');
    const quotation = await kv.get(`quotation:${id}`);
    
    if (!quotation) {
      return c.json({ success: false, error: 'Quotation not found' }, 404);
    }
    
    // Import the sendEmail function
    const { sendEmail } = await import('./email_utils.tsx');
    
    // Get company info from database
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
    
    // Build full address string
    const fullAddress = `${companyInfo.address}, ${companyInfo.city}, ${companyInfo.state} ${companyInfo.postcode}`;
    
    // Generate PDF attachment
    console.log('Generating quotation PDF...');
    const { generateQuotationPDF } = await import('./pdf-generator.tsx');
    const pdfBuffer = await generateQuotationPDF(quotation, { ...companyInfo, fullAddress });
    console.log('PDF generated, size:', pdfBuffer.length, 'bytes');
    
    // Generate items HTML for email
    const itemsHtml = quotation.items.map((item: any) => `
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
          .validity-box {
            background: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>QUOTATION</h1>
            <p>${quotation.quotationNumber}</p>
          </div>
          
          <!-- Content -->
          <div class="content">
            <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>${quotation.customer.name}</strong>,</p>
            <p style="font-size: 15px; color: #4a5568; margin-bottom: 25px;">
              Thank you for your interest! Please find your quotation attached below.
            </p>
            
            <!-- Quotation Details -->
            <div class="info-box">
              <p><strong>Quotation Number:</strong> ${quotation.quotationNumber}</p>
              <p><strong>Date:</strong> ${new Date(quotation.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p><strong>Valid Until:</strong> ${new Date(quotation.validUntil).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            
            <!-- Customer Details -->
            <h3 style="color: #2D3748; margin: 25px 0 15px 0; font-size: 18px;">Quote For:</h3>
            <div style="background: #f7fafc; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
              <p style="margin: 5px 0;"><strong>${quotation.customer.name}</strong></p>
              ${quotation.customer.company ? `<p style="margin: 5px 0;">${quotation.customer.company}</p>` : ''}
              <p style="margin: 5px 0;">${quotation.customer.email}</p>
              ${quotation.customer.phone ? `<p style="margin: 5px 0;">${quotation.customer.phone}</p>` : ''}
            </div>
            
            <!-- Items Table -->
            <h3 style="color: #2D3748; margin: 25px 0 15px 0; font-size: 18px;">Quoted Items:</h3>
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
                  <td style="text-align: right; padding: 10px; font-weight: 600;">$${quotation.subtotal.toFixed(2)}</td>
                </tr>
                
                <!-- Tax -->
                <tr class="subtotal-row">
                  <td colspan="3" style="text-align: right; padding: 10px;"><strong>GST (${((quotation.taxRate || 0.1) * 100).toFixed(0)}%):</strong></td>
                  <td style="text-align: right; padding: 10px; font-weight: 600;">$${quotation.tax.toFixed(2)}</td>
                </tr>
                
                <!-- Total -->
                <tr class="total-row">
                  <td colspan="3" style="text-align: right;">TOTAL:</td>
                  <td style="text-align: right;">$${quotation.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            
            ${quotation.notes ? `
            <div class="notes-box">
              <strong>📝 Notes:</strong>
              <p style="margin: 0; color: #78350f; white-space: pre-wrap;">${quotation.notes}</p>
            </div>
            ` : ''}
            
            <div class="validity-box">
              <p style="margin: 0; color: #92400E; font-size: 14px;">
                <strong>⏰ Valid Until:</strong> ${new Date(quotation.validUntil).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
                This quotation is valid for 30 days from the date of issue.
              </p>
            </div>
            
            <hr class="divider">
            
            <p style="font-size: 14px; color: #4a5568; margin: 20px 0;">
              If you would like to proceed with this quotation or have any questions, please don't hesitate to contact us.
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
      quotation.customer.email,
      `Quotation ${quotation.quotationNumber} - ${companyInfo.tradingName}`,
      emailHtml,
      [{
        filename: `Quotation-${quotation.quotationNumber}.pdf`,
        content: pdfBuffer,
      }]
    );
    
    // Update quotation with email sent timestamp
    quotation.emailSent = true;
    quotation.emailSentAt = new Date().toISOString();
    quotation.updatedAt = new Date().toISOString();
    await kv.set(`quotation:${id}`, quotation);
    
    console.log('Quotation email sent successfully to:', quotation.customer.email);
    return c.json({ success: true, message: 'Quotation email sent successfully' });
  } catch (error) {
    console.error('Error sending quotation email:', error);
    return c.json({ success: false, error: 'Failed to send email: ' + error.message }, 500);
  }
});

export default quotations;