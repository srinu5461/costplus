import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';
import * as customerKV from './kv_store.tsx';
import { sendOrderConfirmationEmail } from './email.tsx';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const payment = new Hono();

// Supabase environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('💳 [Payment Router] Initializing payment router...');

// Generate a unique 6-digit order number
function generateOrderNumber(): string {
  const timestamp = Date.now();
  // Use last 6 digits of timestamp for uniqueness
  const shortId = timestamp.toString().slice(-6);
  return `ORD-${shortId}`;
}

// PayPal API Base URL - Will be determined dynamically based on payment settings
let PAYPAL_API = 'https://api-m.sandbox.paypal.com'; // Default to sandbox

// Helper function to get PayPal API URL based on settings
async function getPayPalApiUrl(): Promise<string> {
  try {
    const paymentSettings = await kv.get('payment_settings');
    const sandboxMode = paymentSettings?.paypalSandboxMode ?? true; // Default to sandbox if not set
    return sandboxMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  } catch (error) {
    console.warn('Failed to get PayPal sandbox mode from settings, using default sandbox:', error);
    return 'https://api-m.sandbox.paypal.com';
  }
}

const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID');
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET');

// Get PayPal Client ID (public, safe to expose)
payment.get('/paypal/client-id', (c) => {
  return c.json({ clientId: PAYPAL_CLIENT_ID });
});

// Get PayPal Access Token
async function getPayPalAccessToken() {
  try {
    const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
    const apiUrl = await getPayPalApiUrl();

    console.log('Requesting PayPal access token from:', apiUrl);

    const response = await fetch(`${apiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('PayPal auth error:', error);
      throw new Error('Failed to get PayPal access token');
    }
    
    const data = await response.json();
    console.log('PayPal access token obtained successfully');
    return data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error);
    throw error;
  }
}

// Customer Registration
payment.post('/auth/register', async (c) => {
  console.log('=== CUSTOMER REGISTRATION START ===');
  try {
    const body = await c.req.json();
    console.log('Registration request body:', body);
    
    const { email, password, firstName, lastName, phone } = body;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName || !phone) {
      console.log('Missing required fields:', { email: !!email, password: !!password, firstName: !!firstName, lastName: !!lastName, phone: !!phone });
      return c.json({ error: 'All fields are required' }, 400);
    }
    
    console.log('Registration attempt for:', email);
    
    // Check if customer already exists in KV store with timeout
    console.log('Checking for existing customer...');
    
    try {
      const existingCustomer = await Promise.race([
        customerKV.get(`customer:email:${email}`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Customer check timeout')), 5000))
      ]);
      console.log('Existing customer check result:', existingCustomer ? 'FOUND' : 'NOT FOUND');
      
      if (existingCustomer) {
        console.log('Customer already exists:', email);
        return c.json({ error: 'Email already registered' }, 400);
      }
    } catch (timeoutError) {
      console.error('Customer check timeout or error:', timeoutError);
      // Continue anyway if timeout - we'll handle duplicate in error below
    }
    
    // Generate customer ID
    const customerId = crypto.randomUUID();
    console.log('Generated customer ID:', customerId);
    
    // Create customer record
    const customer = {
      id: customerId,
      email,
      password, // In production, hash this password!
      first_name: firstName,
      last_name: lastName,
      phone,
      created_at: new Date().toISOString(),
    };
    
    console.log('Storing customer data...');
    
    // Store customer with timeout protection
    try {
      const result = await Promise.race([
        (async () => {
          // Store customer by ID and email index
          await customerKV.set(`customer:${customerId}`, customer);
          console.log('Stored customer by ID');
          
          await customerKV.set(`customer:email:${email}`, customerId);
          console.log('Stored customer email index');
          
          // Add to customer list (using customerKV, not kv!)
          console.log('Updating customer list...');
          const customerIds = await customerKV.get('customer:list') || [];
          console.log('Current customer list length:', Array.isArray(customerIds) ? customerIds.length : 'NOT AN ARRAY');
          customerIds.push(customerId);
          await customerKV.set('customer:list', customerIds);
          console.log('Updated customer list');
          
          console.log('Customer registered successfully:', customerId);
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Customer store timeout')), 10000))
      ]);
      
      const responseData = { 
        success: true, 
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          phone: customer.phone,
        }
      };
      
      // Generate session token
      const sessionToken = crypto.randomUUID();
      console.log('Generated session token:', sessionToken);
      
      // Store session (expires in 30 days)
      await kv.set(`session:${sessionToken}`, {
        customerId: customer.id,
        email: customer.email,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });
      console.log('Session stored successfully');
      
      // Add token to response
      responseData.sessionToken = sessionToken;
      
      console.log('Returning response:', responseData);
      console.log('=== CUSTOMER REGISTRATION SUCCESS ===');
      return c.json(responseData);
    } catch (timeoutError) {
      console.error('Customer store timeout or error:', timeoutError);
      return c.json({ error: 'Registration failed: Database timeout. Please try again.' }, 500);
    }
  } catch (error) {
    console.error('=== CUSTOMER REGISTRATION ERROR ===');
    console.error('Registration error:', error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return c.json({ error: 'Registration failed: ' + (error instanceof Error ? error.message : String(error)) }, 500);
  }
});

// Customer Login
payment.post('/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);
    console.log('Password length:', password?.length);
    
    // Validate input
    if (!email || !password) {
      console.log('Missing email or password');
      return c.json({ error: 'Email and password are required' }, 400);
    }
    
    // For signInWithPassword, use ANON key (not service role key)
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    
    // For admin operations, use service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // FIRST: Try to authenticate with Supabase Auth using ANON key
    try {
      console.log('Attempting Auth login for:', email);
      
      // Add timeout to prevent hanging
      const authPromise = supabaseAuth.auth.signInWithPassword({
        email,
        password,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 5000)
      );
      
      const { data: authData, error: authError } = await Promise.race([
        authPromise,
        timeoutPromise
      ]) as any;
      
      if (authError) {
        console.log('❌ Auth login error:', authError.message);
        console.log('Auth error details:', JSON.stringify(authError, null, 2));
      }
      
      if (authData?.user && authData?.session) {
        console.log('✅ Auth login successful for:', email);
        console.log('User ID:', authData.user.id);
        console.log('User email:', authData.user.email);
        console.log('User metadata:', authData.user.user_metadata);
        
        // Generate session token
        const sessionToken = crypto.randomUUID();
        
        // Store session (expires in 30 days)
        await kv.set(`session:${sessionToken}`, {
          customerId: authData.user.id,
          email: authData.user.email,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        
        console.log('=== AUTH LOGIN SUCCESS ===');
        return c.json({
          success: true,
          sessionToken,
          customer: {
            id: authData.user.id,
            email: authData.user.email || email,
            firstName: authData.user.user_metadata?.firstName || '',
            lastName: authData.user.user_metadata?.lastName || '',
            phone: authData.user.user_metadata?.phone || '',
            can_see_cost_price: authData.user.user_metadata?.can_see_cost_price || false,
            discount_percentage: authData.user.user_metadata?.discount_percentage || 0,
            cost_plus_hundred_access: authData.user.user_metadata?.cost_plus_hundred_access || false,
          }
        });
      }
      
      console.log('Auth login failed - no user or session returned');
    } catch (authError) {
      console.log('Auth login attempt exception:', authError instanceof Error ? authError.message : String(authError));
    }
    
    // FALLBACK: Try KV store for legacy customers
    console.log('Trying KV store login...');
    
    // Get customer ID from email index
    const customerId = await customerKV.get(`customer:email:${email}`);
    
    console.log('Email index lookup result:', customerId ? `Found ID: ${customerId}` : 'NOT FOUND');
    
    if (!customerId) {
      console.log('Customer not found in email index for:', email);
      
      // Debug: Check if customer exists with old format
      const oldFormatCustomers = await customerKV.getByPrefix('customer_');
      const customerWithEmail = oldFormatCustomers.find(c => c.email === email);
      
      if (customerWithEmail) {
        console.warn('⚠️ FOUND CUSTOMER WITH OLD FORMAT (customer_):', customerWithEmail.id);
        console.warn('This customer needs migration. Creating email index...');
        
        // Migrate this customer
        await customerKV.set(`customer:email:${email}`, customerWithEmail.id);
        await customerKV.set(`customer:${customerWithEmail.id}`, customerWithEmail);
        
        // Now try to login with migrated customer
        if (customerWithEmail.password === password) {
          const sessionToken = crypto.randomUUID();
          await kv.set(`session:${sessionToken}`, {
            customerId: customerWithEmail.id,
            email: customerWithEmail.email,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
          
          return c.json({
            success: true,
            sessionToken,
            customer: {
              id: customerWithEmail.id,
              email: customerWithEmail.email,
              firstName: customerWithEmail.first_name,
              lastName: customerWithEmail.last_name,
              phone: customerWithEmail.phone,
              can_see_cost_price: customerWithEmail.can_see_cost_price || false,
              discount_percentage: customerWithEmail.discount_percentage || 0,
              cost_plus_hundred_access: customerWithEmail.cost_plus_hundred_access || false,
            }
          });
        } else {
          console.log('Password mismatch for migrated customer');
          return c.json({ error: 'Invalid email or password' }, 401);
        }
      }
      
      return c.json({ error: 'Invalid email or password' }, 401);
    }
    
    // Get customer data - try BOTH key formats
    let customer = await customerKV.get(`customer:${customerId}`);
    
    if (!customer) {
      console.log('Customer not found with colon format, trying underscore format...');
      customer = await customerKV.get(`customer_${customerId}`);
      
      if (customer) {
        console.warn('⚠️ Customer found with old underscore format, migrating...');
        // Migrate to new format
        await kv.set(`customer:${customerId}`, customer);
        console.log('✅ Customer migrated to new format');
      }
    }
    
    console.log('Customer data lookup:', customer ? 'FOUND' : 'NOT FOUND');
    
    if (!customer) {
      console.error('Customer ID exists in index but customer data not found:', customerId);
      console.error('This is a data inconsistency issue. Clearing bad email index...');
      // Clear the bad email index
      await customerKV.del(`customer:email:${email}`);
      return c.json({ error: 'Invalid email or password' }, 401);
    }
    
    console.log('Comparing passwords...');
    console.log('Stored password:', customer.password);
    console.log('Provided password:', password);
    console.log('Match:', customer.password === password);
    
    if (customer.password !== password) {
      console.log('Invalid password for:', email);
      return c.json({ error: 'Invalid email or password' }, 401);
    }
    
    console.log('Login successful for:', email);
    
    // Generate session token
    const sessionToken = crypto.randomUUID();
    console.log('Generated session token:', sessionToken);
    
    // Store session (expires in 30 days)
    await kv.set(`session:${sessionToken}`, {
      customerId: customer.id,
      email: customer.email,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    });
    console.log('Session stored successfully');
    console.log('=== LOGIN SUCCESS ===');
    
    return c.json({
      success: true,
      sessionToken,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
        can_see_cost_price: customer.can_see_cost_price || false,
        discount_percentage: customer.discount_percentage || 0,
        cost_plus_hundred_access: customer.cost_plus_hundred_access || false,
      }
    });
  } catch (error) {
    console.error('=== LOGIN ERROR ===');
    console.error('Login error:', error);
    return c.json({ error: 'Login failed: ' + (error instanceof Error ? error.message : String(error)) }, 500);
  }
});

// Request Password Reset
payment.post('/auth/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use Supabase Auth to send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}/customer/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      // Don't reveal if email exists for security
      return c.json({ success: true, message: 'If email exists, reset link sent' });
    }

    return c.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return c.json({ error: 'Failed to process request: ' + error.message }, 500);
  }
});

// Reset Password
payment.post('/auth/reset-password', async (c) => {
  try {
    const { accessToken, newPassword } = await c.req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!accessToken || !newPassword) {
      return c.json({ error: 'Access token and new password are required' }, 400);
    }

    // Update user's password using the access token from the reset email
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('Password update error:', error);
      return c.json({ error: error.message || 'Failed to update password' }, 400);
    }

    return c.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return c.json({ error: 'Failed to reset password: ' + error.message }, 500);
  }
});

// Change Password (for logged-in users)
payment.post('/auth/change-password', async (c) => {
  try {
    const { customerId, currentPassword, newPassword } = await c.req.json();
    
    console.log('Change password request for customer:', customerId);
    
    // Get customer from customer KV store
    const customer = await customerKV.get(`customer:${customerId}`);
    
    if (!customer) {
      console.log('Customer not found:', customerId);
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    // Verify current password
    if (customer.password !== currentPassword) {
      console.log('Current password is incorrect for customer:', customerId);
      return c.json({ error: 'Current password is incorrect' }, 401);
    }
    
    // Update password
    customer.password = newPassword;
    customer.updated_at = new Date().toISOString();
    
    // Save back to customer KV store
    await customerKV.set(`customer:${customerId}`, customer);
    
    console.log('Password changed successfully for customer:', customerId);
    return c.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ error: 'Failed to change password: ' + (error instanceof Error ? error.message : String(error)) }, 500);
  }
});

// Create PayPal Order
payment.post('/paypal/create-order', async (c) => {
  console.log('=== CREATE PAYPAL ORDER START ===');
  try {
    const requestBody = await c.req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const { amount, currency = 'AUD', orderDetails } = requestBody;

    // Ensure amount is a number
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;

    console.log('Amount:', amountNum, 'Type:', typeof amountNum, 'Currency:', currency);

    if (!amountNum || amountNum <= 0 || isNaN(amountNum)) {
      console.error('Invalid amount:', amountNum);
      return c.json({ error: 'Invalid amount' }, 400);
    }
    
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      console.error('PayPal credentials not configured');
      return c.json({ error: 'PayPal not configured' }, 500);
    }
    
    console.log('Getting PayPal access token...');
    const accessToken = await getPayPalAccessToken();
    console.log('Access token obtained');

    const apiUrl = await getPayPalApiUrl();
    console.log('Using PayPal API URL:', apiUrl);

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amountNum.toFixed(2),
        },
        description: orderDetails?.description || 'Catering Equipment Purchase',
      }],
      application_context: {
        brand_name: 'Costplus100',
        shipping_preference: 'NO_SHIPPING',
      },
    };

    console.log('Creating PayPal order with data:', JSON.stringify(orderData, null, 2));

    const response = await fetch(`${apiUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });
    
    console.log('PayPal API response status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('PayPal create order error:', error);
      return c.json({ error: 'Failed to create PayPal order', details: error }, 500);
    }
    
    const order = await response.json();
    console.log('PayPal order created successfully:', order.id);
    console.log('=== CREATE PAYPAL ORDER SUCCESS ===');
    
    return c.json({ orderId: order.id });
  } catch (error) {
    console.error('=== CREATE PAYPAL ORDER ERROR ===');
    console.error('Create PayPal order error:', error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return c.json({ error: 'Failed to create order: ' + (error instanceof Error ? error.message : String(error)) }, 500);
  }
});

// Capture PayPal Order and Save to Database
payment.post('/paypal/capture-order', async (c) => {
  console.log('=== CAPTURE PAYPAL ORDER START ===');
  try {
    const { orderID, orderData } = await c.req.json();

    console.log('Capture request:', { orderID, orderDataKeys: Object.keys(orderData) });

    if (!orderID) {
      console.error('Missing orderID');
      return c.json({ error: 'Order ID is required' }, 400);
    }

    console.log('Getting PayPal access token...');
    const accessToken = await getPayPalAccessToken();

    const apiUrl = await getPayPalApiUrl();
    console.log('Using PayPal API URL:', apiUrl);

    console.log('Capturing PayPal order:', orderID);
    const response = await fetch(`${apiUrl}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('PayPal capture response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('PayPal capture order error:', error);
      return c.json({ error: 'Failed to capture PayPal order', details: error }, 500);
    }

    const capture = await response.json();
    console.log('PayPal order captured successfully:', capture.id);

    // Generate order ID
    const dbOrderId = generateOrderNumber();
    console.log('Generated order ID:', dbOrderId);

    // Create order object matching the structure expected by frontend (snake_case + camelCase for compatibility)
    const order = {
      id: dbOrderId,
      customer_id: orderData.customer?.id || null,
      customerId: orderData.customer?.id || null, // Also camelCase for compatibility
      total_amount: orderData.total,
      total: orderData.total, // Also as 'total' for compatibility
      subtotal: orderData.subtotal,
      tax_amount: orderData.gst,
      gst: orderData.gst, // Also include as 'gst' for compatibility
      shipping_amount: orderData.shipping,
      shippingCost: orderData.shipping, // Also include as 'shippingCost' for compatibility
      payment_method: 'PayPal',
      paymentMethod: 'PayPal', // Also include camelCase for compatibility
      payment_status: 'completed',
      order_status: 'processing',
      transaction_id: orderID,
      order_items: orderData.items, // snake_case for frontend compatibility
      orderItems: orderData.items, // camelCase for email compatibility
      customer_details: orderData.customer,
      customerDetails: orderData.customer, // Also camelCase for email compatibility
      shipping: orderData.shippingAddress ? [orderData.shippingAddress] : [], // Array format expected by frontend
      shipping_method: orderData.shippingMethod,
      shippingMethod: orderData.shippingMethod, // Also include camelCase for compatibility
      usePickup: orderData.usePickup,
      pickup_location: orderData.pickupLocation,
      pickupLocation: orderData.pickupLocation, // Also camelCase
      age_verification_required: orderData.ageVerificationRequired,
      age_verified_at: orderData.ageVerifiedAt,
      age_verified_dob: orderData.ageVerifiedDOB,
      created_at: new Date().toISOString(),
    };

    console.log('Saving PayPal order to KV store:', dbOrderId);

    // Save order to KV store
    await kv.set(`order:${dbOrderId}`, order);

    // Also add to orders list for admin panel
    const ordersList = await kv.get('orders') || [];
    ordersList.unshift(order);
    await kv.set('orders', ordersList);

    console.log('PayPal order stored successfully:', dbOrderId);

    // Send order confirmation email
    try {
      const customerEmail = orderData.customer?.email;
      if (customerEmail) {
        await sendOrderConfirmationEmail(customerEmail, order);
        console.log(`Order confirmation email sent to: ${customerEmail}`);
      } else {
        console.warn('No customer email found, skipping confirmation email');
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the order if email fails
    }

    console.log('=== CAPTURE PAYPAL ORDER SUCCESS ===');
    return c.json({
      success: true,
      orderId: dbOrderId,
      transactionId: orderID,
      captureId: capture.id,
      status: capture.status,
    });
  } catch (error) {
    console.error('Capture PayPal order error:', error);
    return c.json({ error: 'Failed to capture order: ' + error.message }, 500);
  }
});

// Get eWay Public API Key
payment.get('/eway/public-key', async (c) => {
  const publicKey = Deno.env.get('EWAY_PUBLIC_API_KEY');
  console.log('eWay Public API Key requested');
  console.log('EWAY_PUBLIC_API_KEY from env:', publicKey ? `${publicKey.substring(0, 10)}...` : 'NOT SET');

  if (!publicKey) {
    console.error('ERROR: EWAY_PUBLIC_API_KEY environment variable is not set');
    return c.json({
      error: 'eWay Public API Key is not configured. Please set EWAY_PUBLIC_API_KEY in your environment variables.'
    }, 500);
  }

  // Get payment settings from database to determine sandbox mode
  let sandboxMode = Deno.env.get('EWAY_SANDBOX') === 'true';
  try {
    const paymentSettings = await kv.get('payment_settings');
    if (paymentSettings && typeof paymentSettings.ewaySandboxMode === 'boolean') {
      sandboxMode = paymentSettings.ewaySandboxMode;
      console.log('Using eWay sandbox mode from database:', sandboxMode);
    } else {
      console.log('Using eWay sandbox mode from environment:', sandboxMode);
    }
  } catch (error) {
    console.warn('Failed to fetch payment settings, using env variable:', error);
  }

  return c.json({ publicKey, sandboxMode });
});

// Store eWay order
payment.post('/eway/store-order', async (c) => {
  try {
    const orderData = await c.req.json();
    console.log('eWay order received:', JSON.stringify(orderData, null, 2));
    
    // Generate order ID
    const orderId = generateOrderNumber();
    console.log('Generated order ID:', orderId);
    
    // Create order object
    const order = {
      id: orderId,
      customerId: orderData.customerId || null,
      total_amount: orderData.total,
      subtotal: orderData.subtotal,
      tax_amount: orderData.gst,
      shipping_amount: orderData.shipping,
      payment_method: 'eWay',
      payment_status: 'completed',
      order_status: 'processing',
      transaction_id: orderData.ewayTransactionId || '',
      order_items: orderData.cart,
      shipping: [orderData.customerDetails], // Wrap in array for frontend compatibility
      shippingMethod: orderData.shippingMethod,
      shipping_method: orderData.shippingMethod,
      usePickup: orderData.usePickup || false,
      pickupLocation: orderData.pickupLocation || null,
      created_at: new Date().toISOString(),
    };
    
    console.log('Saving order to KV store:', orderId);
    
    // Save order to KV store
    await kv.set(`order:${orderId}`, order);
    
    // Also add to orders list for admin panel
    const ordersList = await kv.get('orders') || [];
    ordersList.unshift(order);
    await kv.set('orders', ordersList);
    
    console.log('eWay order stored successfully:', orderId);
    
    // Return success response immediately (don't wait for email)
    const response = c.json({ success: true, orderId });
    
    // Send order confirmation email asynchronously (don't await - fire and forget)
    (async () => {
      try {
        // Format the order object to match the expected structure for email/PDF
        const formattedOrder = {
          id: orderId,
          customerId: order.customerId,
          totalAmount: order.total_amount,
          subtotal: order.subtotal,
          taxAmount: order.tax_amount,
          shippingAmount: order.shipping_amount,
          paymentMethod: order.payment_method,
          paymentStatus: order.payment_status,
          orderStatus: order.order_status,
          transactionId: order.transaction_id,
          orderItems: order.order_items,
          customerDetails: orderData.customerDetails,
          createdAt: order.created_at,
          // Format for PDF generator - use snake_case to match PDF expectations
          created_at: order.created_at,
          total_amount: order.total_amount,
          tax_amount: order.tax_amount,
          shipping_amount: order.shipping_amount,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          order_items: order.order_items,
          shippingMethod: order.shippingMethod,
          shipping_method: order.shipping_method,
          usePickup: order.usePickup,
          pickupLocation: order.pickupLocation,
          // PDF expects billing and shipping as arrays
          billing: orderData.customerDetails ? [{
            first_name: orderData.customerDetails.firstName,
            last_name: orderData.customerDetails.lastName,
            email: orderData.customerDetails.email,
            phone: orderData.customerDetails.phone,
          }] : [],
          shipping: orderData.customerDetails ? [{
            first_name: orderData.customerDetails.firstName,
            last_name: orderData.customerDetails.lastName,
            address: orderData.customerDetails.address,
            city: orderData.customerDetails.city,
            state: orderData.customerDetails.state,
            postcode: orderData.customerDetails.postcode,
            country: orderData.customerDetails.country || 'Australia',
            email: orderData.customerDetails.email,
            phone: orderData.customerDetails.phone,
          }] : [],
        };
        
        console.log('Attempting to send order confirmation email...');
        await sendOrderConfirmationEmail(orderData.customerDetails?.email, formattedOrder);
        console.log(`✓ Order confirmation email sent to: ${orderData.customerDetails?.email}`);
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Email failure doesn't affect the order
      }
    })();
    
    return response;
  } catch (error) {
    console.error('Store eWay order error:', error);
    return c.json({ error: 'Failed to store order: ' + error.message }, 500);
  }
});

// ============================================
// SQUARE PAYMENT GATEWAY
// ============================================

// Get Square application ID (public key)
payment.get('/square/application-id', async (c) => {
  try {
    console.log('📡 [Square] Getting application ID');

    const applicationId = Deno.env.get('SQUARE_APPLICATION_ID');
    const locationId = Deno.env.get('SQUARE_LOCATION_ID'); // Australian location ID
    const redirectUrl = Deno.env.get('SQUARE_REDIRECT_URL') || Deno.env.get('SITE_URL') || 'https://costplus100.com.au';

    // Auto-detect sandbox mode from Application ID prefix
    // Sandbox IDs start with "sandbox-", production IDs don't
    let sandboxMode = false;
    if (applicationId) {
      sandboxMode = applicationId.startsWith('sandbox-');
    }

    // Allow override from environment variable or KV settings
    const envSandbox = Deno.env.get('SQUARE_SANDBOX');
    if (envSandbox !== undefined && envSandbox !== '') {
      sandboxMode = envSandbox === 'true';
    }

    const paymentSettings = await kv.get('payment_settings');
    if (paymentSettings && typeof paymentSettings.squareSandboxMode === 'boolean') {
      sandboxMode = paymentSettings.squareSandboxMode;
    }

    console.log('📡 [Square] Application ID:', applicationId ? `${applicationId.substring(0, 10)}...` : 'NOT SET');
    console.log('📡 [Square] Location ID:', locationId ? `${locationId.substring(0, 10)}...` : 'NOT SET');
    console.log('📡 [Square] Redirect URL:', redirectUrl);
    console.log('📡 [Square] Sandbox mode (auto-detected):', sandboxMode);

    return c.json({
      applicationId,
      locationId,
      redirectUrl,
      sandboxMode
    });
  } catch (error: any) {
    console.error('❌ [Square] Error getting application ID:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create Square payment
payment.post('/square/create-payment', async (c) => {
  try {
    const { sourceId, verificationToken, amount, idempotencyKey, orderData } = await c.req.json();

    console.log('💳 [Square] Creating payment');
    console.log('💳 [Square] Amount:', amount);
    console.log('💳 [Square] Source ID:', sourceId ? `${sourceId.substring(0, 10)}...` : 'MISSING');
    console.log('💳 [Square] Verification Token:', verificationToken ? `${verificationToken.substring(0, 10)}...` : 'MISSING');

    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const applicationId = Deno.env.get('SQUARE_APPLICATION_ID');

    if (!accessToken) {
      throw new Error('Square access token not configured');
    }

    // Auto-detect sandbox mode from Application ID or Access Token prefix
    let sandboxMode = false;
    if (applicationId) {
      sandboxMode = applicationId.startsWith('sandbox-');
    } else if (accessToken) {
      // Access tokens also have sandbox prefix
      sandboxMode = accessToken.startsWith('EAAA') && accessToken.includes('sandbox');
    }

    // Allow override from environment variable or KV settings
    const envSandbox = Deno.env.get('SQUARE_SANDBOX');
    if (envSandbox !== undefined && envSandbox !== '') {
      sandboxMode = envSandbox === 'true';
    }

    const paymentSettings = await kv.get('payment_settings');
    if (paymentSettings && typeof paymentSettings.squareSandboxMode === 'boolean') {
      sandboxMode = paymentSettings.squareSandboxMode;
    }

    console.log('💳 [Square] Sandbox mode (auto-detected):', sandboxMode);

    const squareApiUrl = sandboxMode
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';

    console.log('💳 [Square] API URL:', squareApiUrl);

    // Create payment with Square API - include verification token for 3D Secure
    const paymentPayload: any = {
      source_id: sourceId,
      idempotency_key: idempotencyKey,
      amount_money: {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'AUD',
      },
    };

    // Add verification token if provided (required for 3D Secure/SCA)
    if (verificationToken) {
      paymentPayload.verification_token = verificationToken;
    }

    console.log('💳 [Square] Payment payload:', JSON.stringify(paymentPayload, null, 2));
    console.log('💳 [Square] Sending request to:', `${squareApiUrl}/v2/payments`);

    const response = await fetch(`${squareApiUrl}/v2/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-12-18',
      },
      body: JSON.stringify(paymentPayload),
    });

    console.log('💳 [Square] Response status:', response.status);

    const result = await response.json();
    console.log('💳 [Square] Response body:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('❌ [Square] Payment failed:', result);
      console.error('❌ [Square] Error details:', result.errors);
      throw new Error(result.errors?.[0]?.detail || 'Square payment failed');
    }

    console.log('✅ ================================================');
    console.log('✅ [Square] PAYMENT SUCCESSFUL!');
    console.log('✅ [Square] Payment ID:', result.payment.id);
    console.log('✅ [Square] Payment status:', result.payment.status);
    console.log('✅ [Square] Amount:', result.payment.amount_money);
    console.log('✅ [Square] Environment:', sandboxMode ? '🧪 SANDBOX' : '🚀 PRODUCTION');
    console.log('✅ [Square] Dashboard URL:', sandboxMode
      ? 'https://squareup.com/dashboard/sales/transactions (SANDBOX MODE)'
      : 'https://squareup.com/dashboard/sales/transactions (PRODUCTION MODE)');
    console.log('✅ [Square] NOTE: Transaction may take 5-30 seconds to appear in dashboard');
    console.log('✅ [Square] If not visible: Check you\'re on the correct environment (sandbox/production)');
    console.log('✅ ================================================');

    // Store order in database
    const orderId = generateOrderNumber();

    console.log('📦 ========== SQUARE ORDER CREATION DEBUG ==========');
    console.log('📦 [Square] orderData.shippingMethod:', orderData.shippingMethod);
    console.log('📦 [Square] orderData.usePickup:', orderData.usePickup);
    console.log('📦 [Square] orderData.shipping (amount):', orderData.shipping);
    console.log('📦 [Square] orderData.pickupLocation:', orderData.pickupLocation);

    const order = {
      id: orderId,
      customerId: orderData.customerId || null,
      total_amount: orderData.total,
      subtotal: orderData.subtotal,
      tax_amount: orderData.gst,
      shipping_amount: orderData.shipping,
      payment_method: 'Square',
      payment_status: result.payment.status === 'COMPLETED' ? 'completed' : 'pending',
      order_status: 'processing',
      transaction_id: result.payment.id || '',
      order_items: orderData.cart,
      shipping: [orderData.customerDetails],
      shippingMethod: orderData.shippingMethod,
      shipping_method: orderData.shippingMethod,
      usePickup: orderData.usePickup || false,
      pickupLocation: orderData.pickupLocation || null,
      created_at: new Date().toISOString(),
    };

    console.log('📦 [Square] FINAL order.shippingMethod:', order.shippingMethod);
    console.log('📦 [Square] FINAL order.shipping_method:', order.shipping_method);
    console.log('📦 [Square] Is Quote?:', order.shippingMethod === 'quote' || order.shipping_method === 'quote');
    console.log('📦 [Square] FULL ORDER OBJECT:', JSON.stringify(order, null, 2));
    console.log('📦 ================================================');

    console.log('💾 [Square] Saving order:', orderId);

    await kv.set(`order:${orderId}`, order);

    const ordersList = await kv.get('orders') || [];
    ordersList.unshift(order);
    await kv.set('orders', ordersList);

    console.log('✅ [Square] Order stored successfully');

    // Send confirmation email asynchronously
    (async () => {
      try {
        const formattedOrder = {
          id: orderId,
          customerId: order.customerId,
          totalAmount: order.total_amount,
          subtotal: order.subtotal,
          taxAmount: order.tax_amount,
          shippingAmount: order.shipping_amount,
          paymentMethod: order.payment_method,
          paymentStatus: order.payment_status,
          orderStatus: order.order_status,
          transactionId: order.transaction_id,
          orderItems: order.order_items,
          customerDetails: orderData.customerDetails,
          createdAt: order.created_at,
          created_at: order.created_at,
          total_amount: order.total_amount,
          tax_amount: order.tax_amount,
          shipping_amount: order.shipping_amount,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          order_items: order.order_items,
          shippingMethod: order.shippingMethod,
          shipping_method: order.shipping_method,
          usePickup: order.usePickup,
          pickupLocation: order.pickupLocation,
          billing: orderData.customerDetails ? [{
            first_name: orderData.customerDetails.firstName,
            last_name: orderData.customerDetails.lastName,
            email: orderData.customerDetails.email,
            phone: orderData.customerDetails.phone,
          }] : [],
          shipping: orderData.customerDetails ? [{
            first_name: orderData.customerDetails.firstName,
            last_name: orderData.customerDetails.lastName,
            address: orderData.customerDetails.address,
            city: orderData.customerDetails.city,
            state: orderData.customerDetails.state,
            postcode: orderData.customerDetails.postcode,
            country: orderData.customerDetails.country || 'Australia',
            email: orderData.customerDetails.email,
            phone: orderData.customerDetails.phone,
          }] : [],
        };

        console.log('📧 [Square] Sending confirmation email...');
        await sendOrderConfirmationEmail(orderData.customerDetails?.email, formattedOrder);
        console.log('✅ [Square] Confirmation email sent');
      } catch (emailError) {
        console.error('❌ [Square] Email error:', emailError);
      }
    })();

    return c.json({
      success: true,
      orderId,
      paymentId: result.payment.id,
      payment: result.payment
    });
  } catch (error: any) {
    console.error('❌ [Square] Payment error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get Order by ID
payment.get('/order/:id', async (c) => {
  try {
    const orderId = c.req.param('id');
    console.log('Fetching order from KV store:', orderId);
    
    // Try to get order from KV store
    const order = await kv.get(`order:${orderId}`);
    
    if (!order) {
      console.log('Order not found in KV store:', orderId);
      return c.json({ error: 'Order not found' }, 404);
    }
    
    console.log('Order found:', order);
    return c.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    return c.json({ error: 'Failed to get order: ' + error.message }, 500);
  }
});

// Get All Orders
payment.get('/orders', async (c) => {
  try {
    console.log('Fetching all orders from KV store');
    const orders = await kv.get('orders') || [];
    
    console.log(`Found ${orders.length} orders`);
    return c.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    return c.json({ error: 'Failed to get orders: ' + error.message }, 500);
  }
});

// Get Customer Orders
payment.get('/customer/:customerId/orders', async (c) => {
  try {
    const customerId = c.req.param('customerId');
    console.log('Fetching orders for customer:', customerId);
    
    const allOrders = await kv.get('orders') || [];
    const customerOrders = allOrders.filter((order: any) => order.customerId === customerId);
    
    console.log(`Found ${customerOrders.length} orders for customer ${customerId}`);
    return c.json({ orders: customerOrders });
  } catch (error) {
    console.error('Get customer orders error:', error);
    return c.json({ error: 'Failed to get customer orders: ' + error.message }, 500);
  }
});

// Update Order Status
payment.put('/order/:orderId/status', async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const { status } = await c.req.json();
    
    console.log(`Updating order ${orderId} status to: ${status}`);
    
    // Get all orders
    const orders = await kv.get('orders') || [];
    
    // Find the order
    const orderIndex = orders.findIndex((o: any) => o.id === orderId);
    
    if (orderIndex === -1) {
      return c.json({ error: 'Order not found' }, 404);
    }
    
    // Update the order status
    orders[orderIndex].order_status = status;
    orders[orderIndex].updated_at = new Date().toISOString();
    
    // Add status history
    if (!orders[orderIndex].status_history) {
      orders[orderIndex].status_history = [];
    }
    orders[orderIndex].status_history.push({
      status,
      timestamp: new Date().toISOString(),
      note: `Status changed to ${status}`
    });
    
    // Save back to KV store
    await kv.set('orders', orders);
    
    console.log(`Order ${orderId} status updated successfully`);
    return c.json({ 
      success: true, 
      order: orders[orderIndex],
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    return c.json({ error: 'Failed to update order status: ' + error.message }, 500);
  }
});

// Process Refund
payment.post('/refund', async (c) => {
  try {
    const { orderId, amount, reason } = await c.req.json();
    
    console.log(`Processing refund for order ${orderId}: $${amount}`);
    
    // Get all orders
    const orders = await kv.get('orders') || [];
    
    // Find the order
    const orderIndex = orders.findIndex((o: any) => o.id === orderId);
    
    if (orderIndex === -1) {
      return c.json({ error: 'Order not found' }, 404);
    }
    
    const order = orders[orderIndex];
    
    // Validate refund amount
    if (amount > order.total_amount) {
      return c.json({ error: 'Refund amount exceeds order total' }, 400);
    }
    
    // Update order with refund information
    if (!order.refunds) {
      order.refunds = [];
    }
    
    const refund = {
      id: crypto.randomUUID(),
      amount: parseFloat(amount),
      reason,
      status: 'processed',
      created_at: new Date().toISOString(),
      processed_by: 'admin'
    };
    
    order.refunds.push(refund);
    order.refund_total = (order.refund_total || 0) + parseFloat(amount);
    order.order_status = 'refunded';
    order.updated_at = new Date().toISOString();
    
    // Add to status history
    if (!order.status_history) {
      order.status_history = [];
    }
    order.status_history.push({
      status: 'refunded',
      timestamp: new Date().toISOString(),
      note: `Refund processed: $${amount} - ${reason}`
    });
    
    // Save back to KV store
    orders[orderIndex] = order;
    await kv.set('orders', orders);
    
    console.log(`Refund processed successfully for order ${orderId}`);
    
    // TODO: Integrate with payment gateway to process actual refund
    // For now, we just record it in the database
    
    return c.json({
      success: true,
      refund,
      order,
      message: 'Refund processed successfully'
    });
  } catch (error) {
    console.error('Process refund error:', error);
    return c.json({ error: 'Failed to process refund: ' + error.message }, 500);
  }
});

// ⚡ BANK TRANSFER ORDER CREATION
payment.post('/bank-transfer', async (c) => {
  try {
    console.log('🏦 [Bank Transfer] ===== ROUTE HIT IN PAYMENT ROUTER =====');
    const orderData = await c.req.json();
    console.log('🏦 [Bank Transfer] Order data:', {
      customer: orderData.customer?.email,
      items: orderData.items?.length,
      total: orderData.total
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

    // Also add to orders list
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

export default payment;
