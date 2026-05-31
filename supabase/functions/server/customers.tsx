import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx'; // Use kv_store.tsx which queries kv_store_d1fbc049 (customer data is here)

const customers = new Hono();

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Helper function to generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Get all customers (from both Auth and KV store)
customers.get('/', async (c) => {
  try {
    console.log('=== GET CUSTOMERS REQUEST ===');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get customers from Supabase Auth
    console.log('Fetching Auth users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Auth error:', authError);
    }
    
    let allCustomers = [];
    const seenIds = new Set(); // Track IDs to prevent duplicates
    
    // Add auth users with role 'customer'
    if (authUsers?.users) {
      console.log(`Found ${authUsers.users.length} total auth users`);
      const authCustomers = authUsers.users
        .filter(user => user.user_metadata?.role === 'customer')
        .map(user => ({
          id: user.id,
          first_name: user.user_metadata?.firstName || '',
          last_name: user.user_metadata?.lastName || '',
          email: user.email || '',
          phone: user.user_metadata?.phone || '',
          created_at: user.created_at,
          source: 'auth',
          can_generate_invoices: user.user_metadata?.can_generate_invoices || false,
          can_see_cost_price: user.user_metadata?.can_see_cost_price || false,
          discount_percentage: user.user_metadata?.discount_percentage || 0,
          cost_plus_hundred_access: user.user_metadata?.cost_plus_hundred_access || false,
        }));
      
      console.log(`Filtered to ${authCustomers.length} customers`);
      authCustomers.forEach(customer => {
        seenIds.add(customer.id);
        allCustomers.push(customer);
      });
    }
    
    // Get customers from KV store using customer list
    console.log('Fetching KV customers...');
    
    // Always use getByPrefix to get ALL customers (handles old customers not in list)
    const kvCustomersColon = await kv.getByPrefix('customer:');
    console.log(`Found ${kvCustomersColon.length} items with customer: prefix`);
    
    // Filter out email index entries (they are strings, not objects with id)
    const actualKvCustomers = kvCustomersColon.filter(item => {
      // Email indexes are just UUID strings, not customer objects
      // customer:list is an array, not an object with id
      // We only want customer objects with id and email properties
      return typeof item === 'object' && 
             item !== null && 
             item.id && 
             typeof item.email === 'string' &&
             !Array.isArray(item);
    });
    
    console.log(`Filtered to ${actualKvCustomers.length} actual customers (removed email indexes and list)`);
    
    actualKvCustomers.forEach(customer => {
      if (!seenIds.has(customer.id)) {
        seenIds.add(customer.id);
        allCustomers.push({
          ...customer,
          source: 'kv',
          can_generate_invoices: customer.can_generate_invoices || false,
          can_see_cost_price: customer.can_see_cost_price || false,
          discount_percentage: customer.discount_percentage || 0,
          cost_plus_hundred_access: customer.cost_plus_hundred_access || false,
        });
        console.log(`Added customer: ${customer.email}`);
      }
    });
    
    console.log(`Total customers after merge: ${allCustomers.length}`);
    
    // Sort by created_at descending
    const sortedCustomers = allCustomers.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    console.log('Returning customers successfully');
    return c.json({ customers: sortedCustomers });
  } catch (error) {
    console.error('=== GET CUSTOMERS ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', (error as Error).stack);
    return c.json({ 
      error: 'Failed to fetch customers: ' + (error as Error).message,
      customers: [] 
    }, 500);
  }
});

// Get customer by ID
customers.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Try Auth first
    try {
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(id);
      
      if (authUser && authUser.user && authUser.user.user_metadata?.role === 'customer') {
        return c.json({
          id: authUser.user.id,
          first_name: authUser.user.user_metadata?.firstName || '',
          last_name: authUser.user.user_metadata?.lastName || '',
          email: authUser.user.email || '',
          phone: authUser.user.user_metadata?.phone || '',
          created_at: authUser.user.created_at,
          can_see_cost_price: authUser.user.user_metadata?.can_see_cost_price || false,
          discount_percentage: authUser.user.user_metadata?.discount_percentage || 0,
          source: 'auth'
        });
      }
    } catch (authError) {
      console.log('Not found in Auth, trying KV store...', authError);
    }
    
    // Try KV store
    let customer = await kv.get(`customer_${id}`);
    if (!customer) {
      customer = await kv.get(`customer:${id}`);
    }

    if (!customer) {
      return c.json({ error: 'Customer not found' }, 404);
    }

    return c.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    return c.json({ error: 'Failed to fetch customer: ' + (error as Error).message }, 500);
  }
});

// Get customer by email (for session validation)
customers.get('/by-email/:email', async (c) => {
  try {
    const email = decodeURIComponent(c.req.param('email'));
    console.log('Getting customer by email:', email);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Try Auth first
    try {
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (authUsers?.users) {
        const customer = authUsers.users.find(
          user => user.email?.toLowerCase() === email.toLowerCase() && 
                  user.user_metadata?.role === 'customer'
        );
        
        if (customer) {
          return c.json({
            id: customer.id,
            first_name: customer.user_metadata?.firstName || '',
            last_name: customer.user_metadata?.lastName || '',
            email: customer.email || '',
            phone: customer.user_metadata?.phone || '',
            created_at: customer.created_at,
            can_see_cost_price: customer.user_metadata?.can_see_cost_price || false,
            discount_percentage: customer.user_metadata?.discount_percentage || 0,
            cost_plus_hundred_access: customer.user_metadata?.cost_plus_hundred_access || false,
            updated_at: customer.updated_at,
            source: 'auth'
          });
        }
      }
    } catch (authError) {
      console.log('Error checking Auth, trying KV store...', authError);
    }
    
    // Try KV store via email index
    const customerId = await kv.get(`customer:email:${email}`);
    if (customerId) {
      let customer = await kv.get(`customer:${customerId}`);
      if (!customer) {
        customer = await kv.get(`customer_${customerId}`);
      }
      
      if (customer) {
        return c.json(customer);
      }
    }

    return c.json({ error: 'Customer not found' }, 404);
  } catch (error) {
    console.error('Get customer by email error:', error);
    return c.json({ error: 'Failed to fetch customer: ' + (error as Error).message }, 500);
  }
});

// Create customer
customers.post('/', async (c) => {
  try {
    const body = await c.req.json();
    console.log('=== CREATE CUSTOMER REQUEST ===');
    console.log('Request body:', body);
    
    const { firstName, lastName, email, phone, password, canSeeCostPrice, discountPercentage, costPlusHundredAccess } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password) {
      console.log('Missing required fields');
      return c.json({ error: 'All fields are required' }, 400);
    }

    // Check if customer with email already exists in KV store
    const emailIndex = await kv.get(`customer:email:${email}`);
    if (emailIndex) {
      console.log('Customer email already exists:', email);
      return c.json({ error: 'Email already registered' }, 400);
    }

    const customerId = generateId();
    const customerData = {
      id: customerId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      password, // In production, hash this!
      can_see_cost_price: canSeeCostPrice || false,
      discount_percentage: discountPercentage || 0,
      cost_plus_hundred_access: costPlusHundredAccess || false,
      created_at: new Date().toISOString(),
    };

    console.log('Creating customer with data:', { ...customerData, password: '***' });

    // Store customer data with consistent key format
    await kv.set(`customer:${customerId}`, customerData);
    console.log('Stored customer data');
    
    // Create email index for login lookup
    await kv.set(`customer:email:${email}`, customerId);
    console.log('Stored email index');

    // Add customer ID to customer list
    const customerList = await kv.get('customer:list');
    if (customerList && Array.isArray(customerList)) {
      customerList.push(customerId);
      await kv.set('customer:list', customerList);
      console.log('Updated customer list with new ID');
    } else {
      await kv.set('customer:list', [customerId]);
      console.log('Created new customer list with ID');
    }

    console.log('Customer created successfully:', customerId);
    
    return c.json({ 
      success: true, 
      customer: customerData,
      message: `Customer ${firstName} ${lastName} created successfully`
    });
  } catch (error) {
    console.error('=== CREATE CUSTOMER ERROR ===');
    console.error('Create customer error:', error);
    return c.json({ error: 'Failed to create customer: ' + (error as Error).message }, 500);
  }
});

// Update customer
customers.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { firstName, lastName, email, phone, password } = body;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let updated = false;
    let source = '';

    // First, try to update in Supabase Auth
    try {
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(id);
      
      if (authUser && authUser.user) {
        console.log('Found customer in Auth system, updating...');
        console.log('Current email:', authUser.user.email);
        console.log('New email:', email);
        console.log('Password provided:', !!password);
        
        const updateData: any = {
          email,
          email_confirm: true, // CRITICAL: Auto-confirm email change (bypass verification)
          user_metadata: {
            ...authUser.user.user_metadata,
            firstName,
            lastName,
            phone,
            role: 'customer'
          }
        };
        
        // Only update password if provided
        if (password) {
          console.log('Updating password...');
          updateData.password = password;
        }
        
        console.log('Calling Supabase Auth admin.updateUserById with:', {
          id,
          email: updateData.email,
          email_confirm: updateData.email_confirm,
          hasPassword: !!updateData.password,
          metadata: updateData.user_metadata
        });
        
        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(id, updateData);
        
        if (updateError) {
          console.error('❌ Supabase Auth update error:', updateError);
          throw updateError;
        }
        
        console.log('✅ Successfully updated auth user:', id);
        console.log('Updated user email:', updatedUser?.user?.email);
        updated = true;
        source = 'auth';
      }
    } catch (authError) {
      console.log('Not found in Auth system, checking KV store...', authError);
    }

    // ALWAYS try to update KV store as well (for backwards compatibility)
    let kvKey = `customer_${id}`;
    let existing = await kv.get(kvKey);
    
    // Try colon format if underscore not found
    if (!existing) {
      kvKey = `customer:${id}`;
      existing = await kv.get(kvKey);
    }
    
    if (existing) {
      const updateData: any = {
        ...existing,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        updated_at: new Date().toISOString(),
      };

      // Only update password if provided
      if (password) {
        updateData.password = password;
      }

      // Also update the email index if email changed
      if (existing.email !== email) {
        // Remove old email index
        await kv.del(`customer:email:${existing.email}`);
        // Add new email index
        await kv.set(`customer:email:${email}`, id);
      }

      await kv.set(kvKey, updateData);
      console.log('✅ Successfully updated KV store customer:', id);
      updated = true;
      if (!source) source = 'kv';
      else source = 'both';
    }

    if (!updated) {
      return c.json({ error: 'Customer not found in either Auth or KV store' }, 404);
    }

    return c.json({ 
      success: true, 
      source,
      customer: {
        id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Update customer error:', error);
    return c.json({ error: 'Failed to update customer: ' + (error as Error).message }, 500);
  }
});

// Delete customer
customers.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    console.log('=== DELETE CUSTOMER REQUEST ===');
    console.log('Customer ID:', id);
    console.log('ID type:', typeof id);
    console.log('ID length:', id.length);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let deletedFromAuth = false;
    let deletedFromKv = false;
    
    // Step 1: Try to delete from Supabase Auth
    console.log('Step 1: Attempting to delete from Supabase Auth...');
    try {
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(id);
      
      console.log('Auth getUserById result:');
      console.log('- authUser:', authUser ? 'exists' : 'null');
      console.log('- error:', getUserError);
      
      if (authUser?.user) {
        console.log('Found customer in Auth system, deleting...');
        const { error: deleteError } = await supabase.auth.admin.deleteUser(id);
        
        if (deleteError) {
          console.error('Error deleting from Auth:', deleteError);
          throw deleteError;
        }
        
        console.log('Successfully deleted auth user:', id);
        deletedFromAuth = true;
      } else {
        console.log('Customer not found in Auth or already deleted');
      }
    } catch (authError) {
      console.warn('Auth deletion attempt failed (customer may not exist in Auth):', authError);
    }
    
    // Step 2: Try to delete from KV store with BOTH key formats
    console.log('Step 2: Attempting to delete from KV store...');
    
    // Try underscore format first
    let kvKey = `customer_${id}`;
    console.log('Looking for KV key (underscore):', kvKey);
    let existing = await kv.get(kvKey);
    
    if (existing) {
      console.log('Found customer in KV store (underscore format)');
      
      // Delete customer data
      await kv.del(kvKey);
      
      // Also delete email index if email exists
      if (existing.email) {
        console.log('Deleting email index for:', existing.email);
        await kv.del(`customer:email:${existing.email}`);
      }
      
      console.log('Successfully deleted KV customer:', id, 'with key:', kvKey);
      deletedFromKv = true;
    } else {
      // Try colon format if underscore not found
      kvKey = `customer:${id}`;
      console.log('Looking for KV key (colon):', kvKey);
      existing = await kv.get(kvKey);
      
      if (existing) {
        console.log('Found customer in KV store (colon format)');
        
        // Delete customer data
        await kv.del(kvKey);
        
        // Also delete email index if email exists
        if (existing.email) {
          console.log('Deleting email index for:', existing.email);
          await kv.del(`customer:email:${existing.email}`);
        }
        
        console.log('Successfully deleted KV customer:', id, 'with key:', kvKey);
        deletedFromKv = true;
      } else {
        console.log('Customer not found in KV store with either format');
      }
    }
    
    // Step 3: Check if we deleted from anywhere
    if (!deletedFromAuth && !deletedFromKv) {
      // Debug: List all customers to see what IDs actually exist
      console.log('Step 3: Customer not found anywhere. Listing all customers for debugging...');
      const allKvCustomersUnderscore = await kv.getByPrefix('customer_');
      const allKvCustomersColon = await kv.getByPrefix('customer:');
      console.log('All KV customers (underscore):', allKvCustomersUnderscore.map(c => ({ id: c.id, email: c.email })));
      console.log('All KV customers (colon):', allKvCustomersColon.map(c => ({ id: c.id, email: c.email })));
      
      return c.json({ 
        error: 'Customer not found in either Auth or KV store',
        details: {
          searchedId: id,
          kvCustomerCount: allKvCustomersUnderscore.length + allKvCustomersColon.length
        }
      }, 404);
    }

    // Success - deleted from at least one location
    const sources = [];
    if (deletedFromAuth) sources.push('auth');
    if (deletedFromKv) sources.push('kv');
    
    console.log('Successfully deleted customer from:', sources.join(', '));
    return c.json({ 
      success: true, 
      source: sources.length === 1 ? sources[0] : sources.join(','),
      deletedFrom: sources 
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    return c.json({ error: 'Failed to delete customer: ' + (error as Error).message }, 500);
  }
});

// Grant invoice permission to customer
customers.post('/:id/grant-invoice-permission', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Try to update in Supabase Auth first
    try {
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(id);
      
      if (authUser && authUser.user) {
        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(id, {
          user_metadata: {
            ...authUser.user.user_metadata,
            can_generate_invoices: true,
          }
        });
        
        if (updateError) throw updateError;
        
        console.log('Granted invoice permission to auth user:', id);
        return c.json({ success: true, source: 'auth' });
      }
    } catch (authError) {
      console.log('Not found in Auth, trying KV store...', authError);
    }
    
    // Try KV store
    let kvKey = `customer_${id}`;
    let existing = await kv.get(kvKey);
    
    if (!existing) {
      kvKey = `customer:${id}`;
      existing = await kv.get(kvKey);
    }
    
    if (!existing) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    await kv.set(kvKey, { ...existing, can_generate_invoices: true });
    console.log('Granted invoice permission to KV customer:', id);
    
    return c.json({ success: true, source: 'kv' });
  } catch (error) {
    console.error('Grant invoice permission error:', error);
    return c.json({ error: 'Failed to grant permission: ' + (error as Error).message }, 500);
  }
});

// Revoke invoice permission from customer
customers.post('/:id/revoke-invoice-permission', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Try to update in Supabase Auth first
    try {
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(id);
      
      if (authUser && authUser.user) {
        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(id, {
          user_metadata: {
            ...authUser.user.user_metadata,
            can_generate_invoices: false,
          }
        });
        
        if (updateError) throw updateError;
        
        console.log('Revoked invoice permission from auth user:', id);
        return c.json({ success: true, source: 'auth' });
      }
    } catch (authError) {
      console.log('Not found in Auth, trying KV store...', authError);
    }
    
    // Try KV store
    let kvKey = `customer_${id}`;
    let existing = await kv.get(kvKey);
    
    if (!existing) {
      kvKey = `customer:${id}`;
      existing = await kv.get(kvKey);
    }
    
    if (!existing) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    await kv.set(kvKey, { ...existing, can_generate_invoices: false });
    console.log('Revoked invoice permission from KV customer:', id);
    
    return c.json({ success: true, source: 'kv' });
  } catch (error) {
    console.error('Revoke invoice permission error:', error);
    return c.json({ error: 'Failed to revoke permission: ' + (error as Error).message }, 500);
  }
});

// Update customer access levels (cost price visibility, discount percentage)
customers.post('/:id/update-access-levels', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { canSeeCostPrice, discountPercentage, costPlusHundredAccess } = body;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Updating access levels for customer ${id}:`, { canSeeCostPrice, discountPercentage, costPlusHundredAccess });
    
    // Validate discount percentage
    if (discountPercentage !== undefined && (discountPercentage < 0 || discountPercentage > 100)) {
      return c.json({ error: 'Discount percentage must be between 0 and 100' }, 400);
    }
    
    let updated = false;
    let source = '';
    let customerEmail = '';
    let customerData: any = null;
    
    // Try to update in Supabase Auth first
    try {
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(id);
      
      if (authUser && authUser.user) {
        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(id, {
          user_metadata: {
            ...authUser.user.user_metadata,
            can_see_cost_price: canSeeCostPrice !== undefined ? canSeeCostPrice : authUser.user.user_metadata?.can_see_cost_price,
            discount_percentage: discountPercentage !== undefined ? discountPercentage : authUser.user.user_metadata?.discount_percentage,
            cost_plus_hundred_access: costPlusHundredAccess !== undefined ? costPlusHundredAccess : authUser.user.user_metadata?.cost_plus_hundred_access,
          }
        });
        
        if (updateError) throw updateError;
        
        console.log('✅ Updated access levels in Auth for user:', id);
        updated = true;
        source = 'auth';
        customerEmail = authUser.user.email || '';
        customerData = {
          firstName: authUser.user.user_metadata?.firstName || '',
          lastName: authUser.user.user_metadata?.lastName || '',
          email: customerEmail,
        };
      }
    } catch (authError) {
      console.log('Not found in Auth, trying KV store...', authError);
    }
    
    // ALWAYS try to update KV store as well (for backwards compatibility and KV-only customers)
    let kvKey = `customer_${id}`;
    let existing = await kv.get(kvKey);
    
    if (!existing) {
      kvKey = `customer:${id}`;
      existing = await kv.get(kvKey);
    }
    
    if (existing) {
      const updatedData = {
        ...existing,
        can_see_cost_price: canSeeCostPrice !== undefined ? canSeeCostPrice : existing.can_see_cost_price,
        discount_percentage: discountPercentage !== undefined ? discountPercentage : existing.discount_percentage,
        cost_plus_hundred_access: costPlusHundredAccess !== undefined ? costPlusHundredAccess : existing.cost_plus_hundred_access,
        updated_at: new Date().toISOString(),
      };
      
      await kv.set(kvKey, updatedData);
      console.log('✅ Updated access levels in KV store for customer:', id);
      updated = true;
      if (!source) source = 'kv';
      else source = 'both';
      
      // Get customer data for email if not already set
      if (!customerEmail) {
        customerEmail = existing.email || '';
        customerData = {
          firstName: existing.first_name || '',
          lastName: existing.last_name || '',
          email: customerEmail,
        };
      }
    }
    
    if (!updated) {
      return c.json({ error: 'Customer not found in Auth or KV store' }, 404);
    }
    
    // Send email notification to customer
    if (customerEmail && customerData) {
      try {
        console.log('Sending access level update email to:', customerEmail);
        const { sendAccessLevelUpdateEmail } = await import('./email.tsx');
        await sendAccessLevelUpdateEmail(customerEmail, customerData, {
          canSeeCostPrice: canSeeCostPrice !== undefined ? canSeeCostPrice : false,
          discountPercentage: discountPercentage !== undefined ? discountPercentage : 0,
        });
        console.log('✅ Access level update email sent successfully');
      } catch (emailError) {
        console.error('Failed to send access level update email:', emailError);
        // Don't fail the update if email fails
      }
    }
    
    return c.json({ 
      success: true, 
      source,
      accessLevels: {
        canSeeCostPrice: canSeeCostPrice !== undefined ? canSeeCostPrice : false,
        discountPercentage: discountPercentage !== undefined ? discountPercentage : 0,
        costPlusHundredAccess: costPlusHundredAccess !== undefined ? costPlusHundredAccess : false,
      }
    });
  } catch (error) {
    console.error('Update access levels error:', error);
    return c.json({ error: 'Failed to update access levels: ' + (error as Error).message }, 500);
  }
});

// Update customer age verification
customers.post('/:id/age-verification', async (c) => {
  try {
    const id = c.req.param('id');
    const { dateOfBirth, verifiedAt } = await c.req.json();
    
    console.log('=== UPDATE AGE VERIFICATION REQUEST ===');
    console.log('Customer ID:', id);
    console.log('Date of Birth:', dateOfBirth);
    console.log('Verified At:', verifiedAt);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let updated = false;
    let source = '';
    
    // Try Auth first
    try {
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(id);
      
      if (authUser?.user && !getUserError) {
        console.log('Found customer in Auth, updating metadata...');
        
        const { data, error } = await supabase.auth.admin.updateUserById(id, {
          user_metadata: {
            ...authUser.user.user_metadata,
            dateOfBirth,
            ageVerifiedAt: verifiedAt,
          },
        });
        
        if (error) {
          console.error('Auth update error:', error);
        } else {
          console.log('Successfully updated Auth user metadata');
          updated = true;
          source = 'auth';
        }
      }
    } catch (authError) {
      console.error('Error checking Auth:', authError);
    }
    
    // If not in Auth, try KV store
    if (!updated) {
      console.log('Customer not in Auth, trying KV store...');
      
      // Try both key formats
      const customerUnderscore = await kv.get(`customer_${id}`);
      const customerColon = await kv.get(`customer:${id}`);
      const customer = customerUnderscore || customerColon;
      const key = customerUnderscore ? `customer_${id}` : `customer:${id}`;
      
      if (customer) {
        console.log('Found customer in KV, updating...');
        await kv.set(key, {
          ...customer,
          dateOfBirth,
          ageVerifiedAt: verifiedAt,
          updated_at: new Date().toISOString()
        });
        updated = true;
        source = 'kv';
      }
    }
    
    if (!updated) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    console.log('Age verification updated successfully in:', source);
    return c.json({ 
      success: true, 
      source,
      message: 'Age verification saved successfully'
    });
  } catch (error) {
    console.error('Update age verification error:', error);
    return c.json({ error: 'Failed to update age verification: ' + (error as Error).message }, 500);
  }
});

export default customers;