import { Hono } from 'npm:hono';

const email = new Hono();

// Test route to verify email sub-app is working
email.get('/test', (c) => {
  console.log('=== EMAIL TEST ROUTE HIT ===');
  return c.json({ message: 'Email sub-app is working!' });
});

// Get email configuration
email.get('/config', async (c) => {
  console.log('=== GET EMAIL CONFIG ===');
  try {
    const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get stored config from KV store
    const { get } = await import('./kv_custom.tsx');
    const config = await get('email_config') || {
      provider: 'smtp',
      smtpHost: 'smtp.office365.com',
      smtpPort: 587,
      smtpSecure: false,
      senderEmail: 'admin@costplus100.com.au',
      senderName: 'Costplus100',
      adminEmail: 'admin@costplus100.com.au',
      enableNotifications: true
    };

    // Check if password is configured
    const passwordConfigured = !!Deno.env.get('SMTP_PASSWORD');

    console.log('Config loaded:', { ...config, passwordConfigured });
    return c.json({ success: true, config, passwordConfigured });
  } catch (error) {
    console.error('Get email config error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get company information
email.get('/company-info', async (c) => {
  console.log('=== GET COMPANY INFO ===');
  try {
    const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { get } = await import('./kv_custom.tsx');
    const companyInfo = await get('company_info') || {
      companyName: 'COSTPLUS100 PTY LTD',
      tradingName: 'Costplus100',
      abn: '12 345 678 901',
      address: '123 Industrial Drive',
      city: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      country: 'Australia',
      phone: '1300 COSTPLUS',
      email: 'info@costplus100.com.au',
      website: 'www.costplus100.com.au',
      tagline: 'CATERING EQUIPMENT SOLUTIONS',
    };

    return c.json({ success: true, companyInfo });
  } catch (error) {
    console.error('Get company info error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Save company information
email.post('/company-info', async (c) => {
  console.log('=== SAVE COMPANY INFO ===');
  try {
    const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const companyInfo = await c.req.json();
    console.log('Saving company info:', companyInfo);

    const { set } = await import('./kv_custom.tsx');
    await set('company_info', companyInfo);

    console.log('Company info saved successfully');
    return c.json({ success: true });
  } catch (error) {
    console.error('Save company info error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Save email configuration
email.post('/config', async (c) => {
  console.log('=== SAVE EMAIL CONFIG ===');
  try {
    const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const config = await c.req.json();
    console.log('Saving config:', config);

    const { set } = await import('./kv_custom.tsx');
    await set('email_config', config);

    console.log('Config saved successfully');
    return c.json({ success: true });
  } catch (error) {
    console.error('Save email config error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Verify SMTP connection
email.post('/verify', async (c) => {
  console.log('=== VERIFY SMTP CONNECTION ===');
  try {
    const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get config
    const { get } = await import('./kv_custom.tsx');
    const config = await get('email_config') || {
      smtpHost: 'smtp.office365.com',
      smtpPort: 587,
      senderEmail: 'info@costplus100.com.au'
    };

    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    const smtpUser = Deno.env.get('SMTP_USER') || config.senderEmail;
    const smtpHost = Deno.env.get('SMTP_HOST') || config.smtpHost;
    const smtpPort = Deno.env.get('SMTP_PORT') || String(config.smtpPort);

    if (!smtpPassword) {
      console.error('SMTP_PASSWORD not configured');
      return c.json({ 
        success: false, 
        error: 'SMTP_PASSWORD environment variable not configured' 
      }, 400);
    }

    console.log('SMTP Configuration:', {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      passwordConfigured: !!smtpPassword
    });

    // Just verify the credentials are present
    // In Deno Edge Functions, we can't establish SMTP connections directly
    // This will be tested when actually sending an email
    return c.json({ 
      success: true, 
      message: 'SMTP credentials configured. Test by sending an email.' 
    });
  } catch (error) {
    console.error('Verify SMTP error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});

// Send test email
email.post('/test', async (c) => {
  console.log('=== SEND TEST EMAIL ===');
  try {
    const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { to } = await c.req.json();
    if (!to) {
      return c.json({ error: 'Recipient email address is required' }, 400);
    }

    console.log('Sending test email to:', to);

    // Get config
    const { get } = await import('./kv_custom.tsx');
    const config = await get('email_config') || {
      senderName: 'Costplus100'
    };

    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h1 style="color: #E31837; margin-bottom: 20px;">Test Email</h1>
            <p>This is a test email from ${config.senderName}.</p>
            <p>If you received this email, your SMTP configuration is working correctly! ✅</p>
            <div style="margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                <strong>Sent:</strong> ${new Date().toLocaleString()}<br>
                <strong>From:</strong> ${config.senderName}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmail(to, 'Test Email from Costplus100', emailHTML);

    console.log('Test email sent successfully');
    return c.json({ success: true, message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Send test email error:', error);
    return c.json({ 
      success: false,
      error: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});

// Simple API key verification
function verifyApiKey(apiKey: string | undefined): boolean {
  const expectedKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjYwMDIsImV4cCI6MjA4ODM0MjAwMn0.WtWmz2qJ2NNMx7LHnkrYnJqR9b8cC-IDTVyKaWs9Ta4';
  return apiKey === expectedKey;
}

// Send email using nodemailer with SMTP
async function sendEmail(to: string, subject: string, html: string, attachments?: any[]) {
  console.log('=== SEND EMAIL FUNCTION ===');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Attachments:', attachments?.length || 0);
  
  try {
    // Get email configuration
    const { get } = await import('./kv_custom.tsx');
    const config = await get('email_config') || {
      smtpHost: 'smtp.office365.com',
      smtpPort: 587,
      smtpSecure: false,
      senderEmail: 'info@costplus100.com.au',
      senderName: 'Costplus100'
    };

    // Get SMTP credentials from environment
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    const smtpUser = Deno.env.get('SMTP_USER') || config.senderEmail;
    const smtpHost = Deno.env.get('SMTP_HOST') || config.smtpHost;
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || String(config.smtpPort));

    if (!smtpPassword) {
      throw new Error('SMTP_PASSWORD environment variable not configured. Please add it to Supabase Edge Functions secrets.');
    }

    console.log('SMTP Config:', {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      secure: config.smtpSecure,
      from: `${config.senderName} <${config.senderEmail}>`
    });

    // Import nodemailer
    const nodemailer = await import('npm:nodemailer@6.9.7');

    // Create transporter
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: config.smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('Transporter created, attempting to send...');

    // Send email
    const info = await transporter.sendMail({
      from: `"${config.senderName}" <${config.senderEmail}>`,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments || [],
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);

    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Send Password Reset Email
email.post('/send-password-reset', async (c) => {
  try {
    // Verify API key
    const apiKey = c.req.header('X-API-Key');
    if (!verifyApiKey(apiKey)) {
      return c.json({ error: 'Missing authorization header' }, 401);
    }
    
    const { email: recipientEmail, resetToken, customerName } = await c.req.json();
    
    const resetLink = `https://yourapp.com/reset-password?token=${resetToken}`;
    
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset - Costplus100</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                
                <tr>
                  <td style="background-color: #2D3748; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">COSTPLUS100</h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0;">Password Reset Request</h2>
                    <p style="color: #4b5563; margin: 0 0 20px 0; line-height: 1.6;">
                      Hi ${customerName || 'there'},
                    </p>
                    <p style="color: #4b5563; margin: 0 0 20px 0; line-height: 1.6;">
                      We received a request to reset your password. Click the button below to create a new password:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${resetLink}" style="background-color: #E31837; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                        Reset Password
                      </a>
                    </div>
                    <p style="color: #6b7280; margin: 20px 0 0 0; font-size: 14px; line-height: 1.6;">
                      If you didn't request this, you can safely ignore this email. This link will expire in 1 hour.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
                    <p style="color: #6b7280; margin: 0; font-size: 12px;">
                      © ${new Date().getFullYear()} Costplus100 Pty Ltd. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    
    await sendEmail(
      recipientEmail,
      'Password Reset Request - Costplus100',
      emailHTML
    );
    
    return c.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('Send password reset email error:', error);
    return c.json({ error: 'Failed to send email: ' + error.message }, 500);
  }
});

// Export sendOrderConfirmationEmail function for use in other modules
export async function sendOrderConfirmationEmail(recipientEmail: string, order: any) {
  console.log('=== SEND ORDER CONFIRMATION EMAIL ===');
  console.log('Recipient:', recipientEmail);
  console.log('Order ID:', order.id);
  
  if (!recipientEmail) {
    console.error('No recipient email provided');
    throw new Error('Recipient email is required');
  }
  
  // Get company information from database
  const { get } = await import('./kv_custom.tsx');
  const companyInfo = await get('company_info') || {
    companyName: 'COSTPLUS100 PTY LTD',
    tradingName: 'Costplus100',
    abn: '12 345 678 901',
    address: '123 Industrial Drive',
    city: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    country: 'Australia',
    phone: '1300 COSTPLUS',
    email: 'info@costplus100.com.au',
    website: 'www.costplus100.com.au',
    tagline: 'CATERING EQUIPMENT SOLUTIONS',
  };
  
  // Generate PDF invoice
  console.log('📧 ========== EMAIL SENDING DEBUG ==========');
  console.log('📧 About to generate PDF for order:', order.id);
  console.log('📧 order.shippingMethod:', order.shippingMethod);
  console.log('📧 order.shipping_method:', order.shipping_method);
  console.log('📧 order.usePickup:', order.usePickup);
  console.log('📧 order.shipping_amount:', order.shipping_amount);
  console.log('📧 Generating PDF invoice...');
  const { generateOrderInvoicePDF } = await import('./pdf-generator.tsx');
  const pdfBuffer = await generateOrderInvoicePDF(order, companyInfo);
  console.log('📧 PDF generated, size:', pdfBuffer.length, 'bytes');
  console.log('📧 ==========================================');
  
  // Format customer details
  const customerDetails = order.customerDetails || order.shipping?.[0] || {};
  const orderItems = order.orderItems || order.order_items || [];

  // Try to find customer data to check pricing access
  let customerDiscountPercentage = 0;
  let canSeeCostPrice = false;

  try {
    // Try to get customer from order
    if (order.customerId) {
      const customerKey = `customer:${order.customerId}`;
      const customerData = await get(customerKey);
      if (customerData) {
        canSeeCostPrice = customerData.can_see_cost_price || false;
        customerDiscountPercentage = customerData.discount_percentage || 0;
      }
    }
  } catch (e) {
    console.log('Could not fetch customer pricing info for email');
  }

  // Generate items HTML with customer pricing
  const itemsHTML = orderItems.map((item: any) => {
    const itemPrice = item.price || item.product?.price || 0;
    const itemCostPrice = item.costPrice || item.product?.costPrice || 0;
    const itemQuantity = item.quantity || 1;

    // Determine effective price based on customer type
    let displayPrice = itemPrice;
    let pricingBadge = '';

    if (canSeeCostPrice && itemCostPrice > 0) {
      displayPrice = itemCostPrice;
      pricingBadge = '<span style="background-color: #d97706; color: #ffffff; padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; margin-left: 8px;">COST PRICE</span>';
    } else if (!canSeeCostPrice && customerDiscountPercentage > 0) {
      displayPrice = itemPrice * (1 - customerDiscountPercentage / 100);
      pricingBadge = `<span style="background-color: #059669; color: #ffffff; padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; margin-left: 8px;">-${customerDiscountPercentage}% VIP</span>`;
    }

    const priceDisplay = (canSeeCostPrice || customerDiscountPercentage > 0)
      ? `<span style="color: #9ca3af; text-decoration: line-through; font-size: 12px;">$${itemPrice.toFixed(2)}</span><br><strong>$${displayPrice.toFixed(2)}</strong>${pricingBadge}`
      : `$${displayPrice.toFixed(2)}`;

    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${item.name || item.product?.name || 'Product'}</strong><br>
          <span style="color: #6b7280; font-size: 13px;">Code: ${item.code || item.product?.code || 'N/A'}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${itemQuantity}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${priceDisplay}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
          $${(displayPrice * itemQuantity).toFixed(2)}
        </td>
      </tr>
    `;
  }).join('');
  
  // Format currency values
  const subtotal = order.subtotal || order.total_amount || 0;
  const tax = order.taxAmount || order.tax_amount || 0;
  const shipping = order.shippingAmount || order.shipping_amount || 0;
  const total = order.totalAmount || order.total_amount || subtotal + tax + shipping;
  
  // Format date
  const orderDate = new Date(order.createdAt || order.created_at).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
  
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tax Invoice - ${order.id}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="width: 700px; max-width: 100%; background-color: #ffffff; border: 2px solid #2D3748;">
              
              <!-- Header with Company Info -->
              <tr>
                <td style="padding: 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <!-- Company Logo & Name -->
                      <td style="background-color: #2D3748; padding: 30px; width: 50%; vertical-align: top;">
                        <h1 style="color: #ffffff; margin: 0 0 5px 0; font-size: 32px; letter-spacing: 1px;">${companyInfo.tradingName.toUpperCase()}</h1>
                        <p style="color: #E31837; margin: 0; font-size: 13px; font-weight: bold; letter-spacing: 0.5px;">${companyInfo.tagline}</p>
                      </td>
                      <!-- Tax Invoice Label -->
                      <td style="background-color: #2D3748; padding: 30px; width: 50%; text-align: right; vertical-align: top;">
                        <h2 style="color: #E31837; margin: 0; font-size: 28px; font-weight: bold;">TAX INVOICE</h2>
                        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">ABN: ${companyInfo.abn}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Company Details & Invoice Info -->
              <tr>
                <td style="padding: 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <!-- Company Address -->
                      <td style="padding: 25px 30px; width: 50%; vertical-align: top; border-right: 1px solid #e5e7eb;">
                        <h3 style="color: #2D3748; margin: 0 0 12px 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">From</h3>
                        <p style="color: #4b5563; margin: 0; font-size: 14px; line-height: 1.7;">
                          <strong style="color: #1f2937;">${companyInfo.companyName}</strong><br>
                          ${companyInfo.address}<br>
                          ${companyInfo.city} ${companyInfo.state} ${companyInfo.postcode}<br>
                          ${companyInfo.country}<br>
                          <br>
                          Phone: ${companyInfo.phone}<br>
                          Email: ${companyInfo.email}<br>
                          Web: ${companyInfo.website}
                        </p>
                      </td>
                      <!-- Invoice Details -->
                      <td style="padding: 25px 30px; width: 50%; vertical-align: top;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                          <tr>
                            <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Invoice Number:</td>
                            <td style="padding: 6px 0; color: #1f2937; text-align: right; font-weight: bold;">${order.id}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Invoice Date:</td>
                            <td style="padding: 6px 0; color: #1f2937; text-align: right;">${orderDate}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Payment Method:</td>
                            <td style="padding: 6px 0; color: #1f2937; text-align: right;">${order.paymentMethod || order.payment_method || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Transaction ID:</td>
                            <td style="padding: 6px 0; color: #1f2937; text-align: right; font-size: 12px;">${order.transactionId || order.transaction_id || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Status:</td>
                            <td style="padding: 6px 0; text-align: right;">
                              <span style="background-color: #10b981; color: #ffffff; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">PAID</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Bill To Section -->
              <tr>
                <td style="padding: 25px 30px; background-color: #f9fafb; border-top: 2px solid #e5e7eb; border-bottom: 2px solid #e5e7eb;">
                  <h3 style="color: #2D3748; margin: 0 0 12px 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">Bill To</h3>
                  <p style="color: #1f2937; margin: 0; font-size: 14px; line-height: 1.7;">
                    <strong style="font-size: 15px;">${customerDetails.firstName || ''} ${customerDetails.lastName || ''}</strong><br>
                    ${customerDetails.address || 'N/A'}<br>
                    ${customerDetails.city || ''}, ${customerDetails.state || ''} ${customerDetails.postcode || ''}<br>
                    <br>
                    <strong>Phone:</strong> ${customerDetails.phone || 'N/A'}<br>
                    <strong>Email:</strong> ${recipientEmail}
                  </p>
                </td>
              </tr>

              <!-- Items Table -->
              <tr>
                <td style="padding: 0;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                      <tr style="background-color: #2D3748;">
                        <th style="padding: 14px 30px; text-align: left; color: #ffffff; font-weight: 600; border-bottom: 2px solid #1f2937;">DESCRIPTION</th>
                        <th style="padding: 14px 20px; text-align: center; color: #ffffff; font-weight: 600; border-bottom: 2px solid #1f2937; width: 80px;">QTY</th>
                        <th style="padding: 14px 20px; text-align: right; color: #ffffff; font-weight: 600; border-bottom: 2px solid #1f2937; width: 100px;">UNIT PRICE</th>
                        <th style="padding: 14px 30px; text-align: right; color: #ffffff; font-weight: 600; border-bottom: 2px solid #1f2937; width: 120px;">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHTML || '<tr><td colspan="4" style="padding: 20px 30px; text-align: center; color: #6b7280;">No items</td></tr>'}
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Totals Section -->
              <tr>
                <td style="padding: 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 25px 30px; width: 50%; vertical-align: top; border-top: 2px solid #e5e7eb;">
                        <!-- Payment Info -->
                        <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; border-left: 3px solid #3b82f6;">
                          <p style="color: #1e40af; margin: 0 0 8px 0; font-size: 13px; font-weight: bold;">PAYMENT CONFIRMED</p>
                          <p style="color: #1e3a8a; margin: 0; font-size: 12px; line-height: 1.6;">
                            Payment has been successfully processed via ${order.paymentMethod || order.payment_method || 'N/A'}. Your order is now being prepared for dispatch.
                          </p>
                        </div>
                      </td>
                      <td style="padding: 25px 30px; width: 50%; vertical-align: top; border-top: 2px solid #e5e7eb;">
                        <!-- Calculation Table -->
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; text-align: right;">Subtotal:</td>
                            <td style="padding: 8px 0 8px 20px; color: #1f2937; text-align: right; font-weight: 600; width: 120px;">$${subtotal.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; text-align: right;">GST (10%):</td>
                            <td style="padding: 8px 0 8px 20px; color: #1f2937; text-align: right; font-weight: 600;">$${tax.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; text-align: right;">Shipping:</td>
                            <td style="padding: 8px 0 8px 20px; color: #1f2937; text-align: right; font-weight: 600;">
                              ${(order.shippingMethod === 'quote' || order.shipping_method === 'quote')
                                ? '<span style="color: #f59e0b; font-weight: bold;">Quote Required</span>'
                                : (order.shippingMethod === 'pickup' || order.usePickup)
                                ? 'FREE (Pickup)'
                                : shipping === 0
                                ? 'FREE'
                                : '$' + shipping.toFixed(2)}
                            </td>
                          </tr>
                          ${(order.shippingMethod === 'quote' || order.shipping_method === 'quote')
                            ? `<tr>
                                <td colspan="2" style="padding: 8px 0;">
                                  <div style="background-color: #fef3c7; padding: 10px; border-radius: 4px; border-left: 3px solid #f59e0b;">
                                    <p style="margin: 0; font-size: 12px; color: #92400e;">
                                      📦 Shipping quote to be provided within 24hrs
                                    </p>
                                  </div>
                                </td>
                              </tr>`
                            : ''}
                          <tr style="border-top: 2px solid #2D3748;">
                            <td style="padding: 14px 0 0 0; color: #2D3748; text-align: right; font-size: 16px; font-weight: bold;">TOTAL (AUD):</td>
                            <td style="padding: 14px 0 0 20px; color: #E31837; text-align: right; font-size: 22px; font-weight: bold;">$${total.toFixed(2)}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Terms & Footer -->
              <tr>
                <td style="padding: 25px 30px; background-color: #f9fafb; border-top: 2px solid #e5e7eb;">
                  <h4 style="color: #2D3748; margin: 0 0 10px 0; font-size: 13px; font-weight: bold;">TERMS & CONDITIONS</h4>
                  <p style="color: #6b7280; margin: 0 0 15px 0; font-size: 12px; line-height: 1.6;">
                    • This is a tax invoice for GST purposes<br>
                    • All prices are in Australian Dollars (AUD)<br>
                    • Delivery timeframe: 3-5 business days from dispatch<br>
                    • For queries, contact us at ${companyInfo.email} or ${companyInfo.phone}
                  </p>
                  <div style="text-align: center; padding-top: 15px; border-top: 1px solid #d1d5db;">
                    <p style="color: #1f2937; margin: 0 0 5px 0; font-size: 13px; font-weight: bold;">Thank you for your business!</p>
                    <p style="color: #9ca3af; margin: 0; font-size: 11px;">
                      © ${new Date().getFullYear()} ${companyInfo.companyName}. All rights reserved.<br>
                      ABN: ${companyInfo.abn} | ${companyInfo.website}
                    </p>
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  
  await sendEmail(
    recipientEmail,
    `Tax Invoice ${order.id} - ${companyInfo.tradingName}`,
    emailHTML,
    [{ filename: `Tax_Invoice_${order.id}.pdf`, content: pdfBuffer }]
  );
  
  console.log('Order confirmation email sent successfully');
}

// Send Shipping Quote Email
email.post('/shipping-quote', async (c) => {
  console.log('=== SEND SHIPPING QUOTE EMAIL ===');
  try {
    const body = await c.req.json();
    const {
      orderId,
      customerEmail,
      customerName,
      shippingCost,
      shippingGST,
      totalShipping,
      notes,
      bankDetails,
      paymentLink,
      order
    } = body;

    console.log('Shipping quote request:', { orderId, customerEmail, shippingCost, totalShipping });

    // Validate required fields
    if (!orderId || !customerEmail || !order) {
      console.error('Missing required fields:', { orderId, customerEmail, hasOrder: !!order });
      return c.json({
        success: false,
        error: 'Missing required fields: orderId, customerEmail, or order data',
      }, 400);
    }

    // Get email config
    const { get } = await import('./kv_custom.tsx');
    const config = await get('email_config') || {
      provider: 'smtp',
      smtpHost: 'smtp.office365.com',
      smtpPort: 587,
      smtpSecure: false,
      senderEmail: 'admin@costplus100.com.au',
      senderName: 'Costplus100',
    };

    // Get company info
    const companyInfo = await get('company_info') || {
      name: 'Costplus100',
      email: 'admin@costplus100.com.au',
      phone: '(08) 6165 8444',
      address: '123 Business St, Perth WA 6000',
      abn: '12 345 678 901',
    };

    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    if (!smtpPassword) {
      throw new Error('SMTP password not configured');
    }

    // Generate Shipping Quote PDF
    console.log('Generating shipping quote PDF...');
    const { generateShippingQuotePDF } = await import('./pdf-generator.tsx');
    const pdfBuffer = await generateShippingQuotePDF(
      order,
      shippingCost,
      shippingGST,
      totalShipping,
      notes,
      companyInfo,
      bankDetails  // Pass bank details to PDF
    );
    console.log('PDF generated, size:', pdfBuffer.length, 'bytes');

    // Build HTML email
    const orderItemsHtml = order.order_items?.map((item: any) => `
      <tr>
        <td style=\"padding: 10px; border-bottom: 1px solid #ddd;\">
          ${item.product?.name || 'Product'}
        </td>
        <td style=\"padding: 10px; border-bottom: 1px solid #ddd; text-align: center;\">
          ${item.quantity}
        </td>
        <td style=\"padding: 10px; border-bottom: 1px solid #ddd; text-align: right;\">
          $${((item.product?.price || 0) * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('') || '';
    
    // Get customer name from either shipping or billing info
    const finalCustomerName = customerName || 
                             `${order.shipping?.[0]?.first_name || ''} ${order.shipping?.[0]?.last_name || ''}`.trim() ||
                             `${order.billing?.[0]?.first_name || ''} ${order.billing?.[0]?.last_name || ''}`.trim() ||
                             'Valued Customer';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset=\"utf-8\">
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
        <title>Shipping Quote - Order #${orderId}</title>
      </head>
      <body style=\"margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;\">
        <div style=\"max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\">
          <!-- Header with Logo and Company Info -->
          <div style=\"background-color: #2D3748; color: #ffffff; padding: 30px 20px;\">
            <div style=\"text-align: center; margin-bottom: 20px;\">
              <div style=\"background-color: #ffffff; display: inline-block; padding: 15px 30px; border-radius: 8px; margin-bottom: 15px;\">
                <h1 style=\"margin: 0; font-size: 32px; font-weight: bold; color: #2D3748;\">
                  <span style=\"color: #E31837;\">Cost</span><span style=\"color: #2D3748;\">plus100</span>
                </h1>
              </div>
            </div>
            <div style=\"text-align: center; border-top: 2px solid #E31837; padding-top: 15px;\">
              <h2 style=\"margin: 0 0 5px 0; font-size: 24px; font-weight: bold; color: #E31837;\">TAX INVOICE</h2>
              <p style=\"margin: 0; font-size: 16px; opacity: 0.9;\">Shipping Quote</p>
            </div>
            <div style=\"margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center;\">
              <p style=\"margin: 0; font-size: 13px; opacity: 0.8;\">ABN: ${companyInfo.abn}</p>
              <p style=\"margin: 5px 0 0 0; font-size: 13px; opacity: 0.8;\">${companyInfo.email} | ${companyInfo.phone}</p>
            </div>
          </div>

          <!-- Content -->
          <div style=\"padding: 30px 20px;\">
            <p style=\"margin: 0 0 20px 0; font-size: 16px; color: #333;\">
              Dear ${finalCustomerName},
            </p>

            <p style=\"margin: 0 0 20px 0; font-size: 14px; color: #666; line-height: 1.6;\">
              Thank you for your order! Your products have been paid for successfully. We are now providing you with the shipping quote for delivery to your address.
            </p>

            <!-- Order Status -->
            <div style=\"background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 20px; border-radius: 4px;\">
              <p style=\"margin: 0; font-size: 16px; font-weight: bold; color: #1e40af;\">
                ✅ Product Payment: PAID
              </p>
              <p style=\"margin: 10px 0 0 0; font-size: 16px; font-weight: bold; color: #ea580c;\">
                🚚 Shipping Payment: DUE
              </p>
            </div>

            <!-- Order Details -->
            <div style=\"margin-bottom: 20px;\">
              <h2 style=\"margin: 0 0 15px 0; font-size: 18px; color: #2D3748; border-bottom: 2px solid #E31837; padding-bottom: 10px;\">
                Order #${orderId}
              </h2>
              
              <table style=\"width: 100%; border-collapse: collapse; margin-bottom: 20px;\">
                <thead>
                  <tr style=\"background-color: #f9fafb;\">
                    <th style=\"padding: 10px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;\">Product</th>
                    <th style=\"padding: 10px; text-align: center; border-bottom: 2px solid #ddd; font-weight: bold;\">Qty</th>
                    <th style=\"padding: 10px; text-align: right; border-bottom: 2px solid #ddd; font-weight: bold;\">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderItemsHtml}
                </tbody>
              </table>

              <!-- Product Total -->
              <div style=\"border-top: 2px solid #ddd; padding-top: 15px;\">
                <table style=\"width: 100%; font-size: 14px;\">
                  <tr>
                    <td style=\"padding: 5px 0; color: #666;\">Product Subtotal:</td>
                    <td style=\"padding: 5px 0; text-align: right; font-weight: bold;\">$${order.subtotal?.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style=\"padding: 5px 0; color: #666;\">Product GST:</td>
                    <td style=\"padding: 5px 0; text-align: right; font-weight: bold;\">$${order.tax_amount?.toFixed(2)}</td>
                  </tr>
                  <tr style=\"background-color: #f0fdf4;\">
                    <td style=\"padding: 10px; font-size: 16px; font-weight: bold; color: #15803d;\">Product Total (PAID):</td>
                    <td style=\"padding: 10px; text-align: right; font-size: 18px; font-weight: bold; color: #15803d;\">$${order.total_amount?.toFixed(2)}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Shipping Quote -->
            <div style=\"background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;\">
              <h3 style=\"margin: 0 0 15px 0; font-size: 18px; color: #92400e;\">📦 Shipping Quote</h3>
              
              <table style=\"width: 100%; font-size: 14px;\">
                <tr>
                  <td style=\"padding: 5px 0; color: #92400e;\">Shipping Cost:</td>
                  <td style=\"padding: 5px 0; text-align: right; font-weight: bold; color: #92400e;\">$${shippingCost.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style=\"padding: 5px 0; color: #92400e;\">Shipping GST:</td>
                  <td style=\"padding: 5px 0; text-align: right; font-weight: bold; color: #92400e;\">$${shippingGST.toFixed(2)}</td>
                </tr>
                <tr style=\"border-top: 2px solid #f59e0b;\">
                  <td style=\"padding: 10px 0; font-size: 18px; font-weight: bold; color: #92400e;\">Total Shipping Due:</td>
                  <td style=\"padding: 10px 0; text-align: right; font-size: 20px; font-weight: bold; color: #92400e;\">$${totalShipping.toFixed(2)}</td>
                </tr>
              </table>

              ${notes ? `
                <div style=\"margin-top: 15px; padding-top: 15px; border-top: 1px solid #fbbf24;\">
                  <p style=\"margin: 0; font-size: 14px; color: #92400e; font-weight: bold;\">Notes:</p>
                  <p style=\"margin: 5px 0 0 0; font-size: 14px; color: #78350f;\">${notes}</p>
                </div>
              ` : ''}
            </div>

            <!-- Payment Instructions -->
            <div style=\"background-color: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 4px; border: 1px solid #e5e7eb;\">
              <h3 style=\"margin: 0 0 15px 0; font-size: 18px; color: #2D3748;\">💳 Payment Instructions</h3>
              
              ${paymentLink ? `
                <div style=\"margin-bottom: 20px;\">
                  <p style=\"margin: 0 0 10px 0; font-size: 14px; color: #666;\">Pay online securely:</p>
                  <a href=\"${paymentLink}\" style=\"display: inline-block; background-color: #E31837; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;\">
                    Pay Now
                  </a>
                </div>
                <p style=\"margin: 15px 0; text-align: center; font-size: 14px; color: #999;\">- OR -</p>
              ` : ''}

              ${bankDetails ? `
                <div>
                  <p style=\"margin: 0 0 10px 0; font-size: 14px; color: #666; font-weight: bold;\">Bank Transfer Details:</p>
                  <div style=\"background-color: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #e5e7eb;\">
                    <pre style=\"margin: 0; font-family: 'Courier New', monospace; font-size: 13px; color: #333; white-space: pre-wrap;\">${bankDetails}</pre>
                  </div>
                  <p style=\"margin: 10px 0 0 0; font-size: 13px; color: #999; font-style: italic;\">
                    Please include Order #${orderId} as reference
                  </p>
                </div>
              ` : ''}
            </div>

            <!-- Contact -->
            <div style=\"margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;\">
              <p style=\"margin: 0 0 10px 0; font-size: 14px; color: #666;\">
                If you have any questions, please contact us:
              </p>
              <p style=\"margin: 5px 0; font-size: 14px; color: #666;\">
                📧 Email: <a href=\"mailto:${companyInfo.email}\" style=\"color: #E31837; text-decoration: none;\">${companyInfo.email}</a>
              </p>
              <p style=\"margin: 5px 0; font-size: 14px; color: #666;\">
                📞 Phone: ${companyInfo.phone}
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style=\"background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;\">
            <p style=\"margin: 0 0 5px 0; font-size: 12px; color: #999;\">
              ${companyInfo.name}
            </p>
            <p style=\"margin: 0; font-size: 12px; color: #999;\">
              ${companyInfo.address} | ABN: ${companyInfo.abn}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using nodemailer
    const nodemailer = await import('npm:nodemailer');
    
    const transporter = nodemailer.default.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.senderEmail,
        pass: smtpPassword,
      },
    });

    await transporter.sendMail({
      from: `"${config.senderName}" <${config.senderEmail}>`,
      to: customerEmail,
      subject: `Shipping Quote for Order #${orderId} - ${companyInfo.name}`,
      html: emailHtml,
      attachments: [{ filename: `Shipping_Quote_${orderId}.pdf`, content: pdfBuffer }]
    });

    console.log('✅ Shipping quote email sent successfully to:', customerEmail);

    // Update order status to 'quote_sent' in BOTH the individual order AND the orders array
    // Note: 'get' is already imported at the top of this route handler (line 696)
    const { set } = await import('./kv_custom.tsx');
    
    // Update individual order
    const orderKey = `order:${orderId}`;
    const orderData = await get(orderKey);
    if (orderData) {
      orderData.order_status = 'quote_sent';
      orderData.updated_at = new Date().toISOString();
      await set(orderKey, orderData);
      console.log(`✅ Individual order ${orderId} status updated to 'quote_sent'`);
    }
    
    // Update orders array (this is what the frontend fetches)
    const orders = await get('orders') || [];
    const orderIndex = orders.findIndex((o: any) => o.id === orderId);
    if (orderIndex !== -1) {
      orders[orderIndex].order_status = 'quote_sent';
      orders[orderIndex].updated_at = new Date().toISOString();
      await set('orders', orders);
      console.log(`✅ Orders array updated - order ${orderId} status changed to 'quote_sent'`);
    } else {
      console.warn(`⚠️  Order ${orderId} not found in orders array`);
    }

    return c.json({
      success: true,
      message: 'Shipping quote email sent successfully',
    });

  } catch (error: any) {
    console.error('❌ Shipping quote email error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to send shipping quote email',
    });
  }
});

// Export function to send customer welcome email (when admin creates account)
export async function sendCustomerWelcomeEmail(customerEmail: string, customerData: any, temporaryPassword: string) {
  console.log('=== SEND CUSTOMER WELCOME EMAIL ===');
  console.log('Recipient:', customerEmail);
  
  if (!customerEmail) {
    console.error('No recipient email provided');
    throw new Error('Recipient email is required');
  }
  
  const { get } = await import('./kv_custom.tsx');
  const companyInfo = await get('company_info') || {
    tradingName: 'Costplus100',
    email: 'info@costplus100.com.au',
    phone: '1300 COSTPLUS',
    website: 'www.costplus100.com.au',
  };
  
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #E31837 0%, #B91429 100%); padding: 40px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                    Welcome to ${companyInfo.tradingName}!
                  </h1>
                  <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">
                    Your account has been created
                  </p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                    Hello ${customerData.firstName} ${customerData.lastName},
                  </p>
                  
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                    Your customer account has been created by our admin team. You can now log in to your account using the credentials below:
                  </p>
                  
                  <!-- Login Credentials Box -->
                  <div style="background-color: #f8f9fa; border-left: 4px solid #E31837; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #E31837;">🔐 Your Login Credentials</h3>
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                      <strong>Email:</strong> ${customerEmail}
                    </p>
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                      <strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 3px; font-family: monospace;">${temporaryPassword}</code>
                    </p>
                    <p style="margin: 15px 0 0 0; font-size: 13px; color: #999; font-style: italic;">
                      ⚠️ Please change your password after first login for security.
                    </p>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://${companyInfo.website}/customer/login" 
                       style="display: inline-block; background-color: #E31837; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      Login to Your Account
                    </a>
                  </div>
                  
                  <p style="margin: 30px 0 0 0; font-size: 14px; color: #666; line-height: 1.6;">
                    If you have any questions or need assistance, please don't hesitate to contact us.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #2D3748; color: #ffffff; padding: 30px; text-align: center;">
                  <p style="margin: 0 0 10px 0; font-size: 14px;">
                    ${companyInfo.tradingName}
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #a0aec0;">
                    Email: ${companyInfo.email} | Phone: ${companyInfo.phone}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  
  await sendEmail(
    customerEmail,
    `Welcome to ${companyInfo.tradingName} - Your Account is Ready`,
    emailHTML
  );
  
  console.log('Customer welcome email sent successfully');
}

// Export function to send access level update notification
export async function sendAccessLevelUpdateEmail(customerEmail: string, customerData: any, accessChanges: any) {
  console.log('=== SEND ACCESS LEVEL UPDATE EMAIL ===');
  console.log('Recipient:', customerEmail);
  console.log('Access changes:', accessChanges);
  
  if (!customerEmail) {
    console.error('No recipient email provided');
    throw new Error('Recipient email is required');
  }
  
  const { get } = await import('./kv_custom.tsx');
  const companyInfo = await get('company_info') || {
    tradingName: 'Costplus100',
    email: 'info@costplus100.com.au',
    phone: '1300 COSTPLUS',
    website: 'www.costplus100.com.au',
  };
  
  // Determine what changed
  let accessType = 'Standard Customer';
  let accessDescription = 'You have regular customer access with standard pricing.';
  let accessColor = '#3B82F6'; // Blue
  
  if (accessChanges.canSeeCostPrice) {
    accessType = 'Wholesale Customer';
    accessDescription = 'You now have wholesale access! You can purchase products at cost price.';
    accessColor = '#10B981'; // Green
  } else if (accessChanges.discountPercentage > 0) {
    accessType = `Discount Customer (${accessChanges.discountPercentage}% OFF)`;
    accessDescription = `You now receive ${accessChanges.discountPercentage}% discount on all purchases!`;
    accessColor = '#8B5CF6'; // Purple
  }
  
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, ${accessColor} 0%, ${accessColor}dd 100%); padding: 40px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                    🎉 Account Access Updated!
                  </h1>
                  <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">
                    Your customer privileges have been updated
                  </p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                    Hello ${customerData.firstName} ${customerData.lastName},
                  </p>
                  
                  <p style="margin: 0 0 30px 0; font-size: 16px; color: #333; line-height: 1.6;">
                    Great news! Your account access level has been updated by our team.
                  </p>
                  
                  <!-- Access Level Box -->
                  <div style="background: linear-gradient(135deg, ${accessColor}15 0%, ${accessColor}05 100%); border-left: 4px solid ${accessColor}; padding: 25px; margin: 30px 0; border-radius: 4px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 20px; color: ${accessColor};">✨ Your New Access Level</h3>
                    <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: #333;">
                      ${accessType}
                    </p>
                    <p style="margin: 0; font-size: 16px; color: #666; line-height: 1.6;">
                      ${accessDescription}
                    </p>
                  </div>
                  
                  <!-- Details -->
                  <div style="background-color: #f8f9fa; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <h4 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">📋 Access Details:</h4>
                    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #666; line-height: 2;">
                      <li><strong>Cost Price Access:</strong> ${accessChanges.canSeeCostPrice ? '✅ Yes' : '❌ No'}</li>
                      <li><strong>Discount Percentage:</strong> ${accessChanges.discountPercentage > 0 ? `${accessChanges.discountPercentage}%` : 'None'}</li>
                      <li><strong>Effective Date:</strong> Immediately</li>
                    </ul>
                  </div>
                  
                  <p style="margin: 20px 0; font-size: 14px; color: #666; line-height: 1.6;">
                    Your new pricing will be reflected automatically when you browse products and make purchases. You may need to refresh your browser to see the updated prices.
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://${companyInfo.website}" 
                       style="display: inline-block; background-color: #E31837; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      Start Shopping
                    </a>
                  </div>
                  
                  <p style="margin: 30px 0 0 0; font-size: 14px; color: #666; line-height: 1.6;">
                    If you have any questions about your new access level, please contact our team.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #2D3748; color: #ffffff; padding: 30px; text-align: center;">
                  <p style="margin: 0 0 10px 0; font-size: 14px;">
                    ${companyInfo.tradingName}
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #a0aec0;">
                    Email: ${companyInfo.email} | Phone: ${companyInfo.phone}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  
  await sendEmail(
    customerEmail,
    `Account Access Updated - ${companyInfo.tradingName}`,
    emailHTML
  );
  
  console.log('Access level update email sent successfully');
}

export default email;