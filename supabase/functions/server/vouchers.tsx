import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const vouchers = new Hono();

// Supabase client
const getSupabaseClient = (c: any) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, supabaseKey);
};

// Initialize vouchers table
const initVouchersTable = async (supabase: any) => {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS vouchers (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('fixed', 'percentage')),
        value REAL NOT NULL,
        min_purchase REAL DEFAULT 0,
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        customer_specific TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS voucher_usage (
        id TEXT PRIMARY KEY,
        voucher_id TEXT NOT NULL,
        voucher_code TEXT NOT NULL,
        order_id TEXT NOT NULL,
        customer_id TEXT,
        customer_email TEXT,
        discount_amount REAL NOT NULL,
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
      );

      CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
      CREATE INDEX IF NOT EXISTS idx_vouchers_active ON vouchers(active);
      CREATE INDEX IF NOT EXISTS idx_voucher_usage_voucher_id ON voucher_usage(voucher_id);
      CREATE INDEX IF NOT EXISTS idx_voucher_usage_customer_email ON voucher_usage(customer_email);
    `
  });

  if (error) {
    console.error('❌ Error initializing vouchers table:', error);
  }
};

// Create new voucher
vouchers.post('/create', async (c) => {
  try {
    const supabase = getSupabaseClient(c);
    await initVouchersTable(supabase);

    const {
      code,
      type,
      value,
      minPurchase,
      maxUses,
      expiresAt,
      customerSpecific
    } = await c.req.json();

    console.log('📝 Creating voucher:', { code, type, value });

    // Validate input
    if (!code || !type || !value) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    if (type !== 'fixed' && type !== 'percentage') {
      return c.json({ success: false, error: 'Type must be "fixed" or "percentage"' }, 400);
    }

    if (type === 'percentage' && (value < 0 || value > 100)) {
      return c.json({ success: false, error: 'Percentage must be between 0 and 100' }, 400);
    }

    // Check if code already exists
    const { data: existing } = await supabase
      .from('vouchers')
      .select('code')
      .eq('code', code.toUpperCase())
      .single();

    if (existing) {
      return c.json({ success: false, error: 'Voucher code already exists' }, 400);
    }

    // Create voucher
    const voucher = {
      id: `voucher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code: code.toUpperCase(),
      type,
      value: parseFloat(value),
      min_purchase: minPurchase ? parseFloat(minPurchase) : 0,
      max_uses: maxUses ? parseInt(maxUses) : null,
      used_count: 0,
      active: true,
      expires_at: expiresAt || null,
      customer_specific: customerSpecific || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('vouchers')
      .insert(voucher)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating voucher:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log('✅ Voucher created:', data.code);
    return c.json({ success: true, voucher: data });
  } catch (error: any) {
    console.error('❌ Error creating voucher:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get all vouchers
vouchers.get('/list', async (c) => {
  try {
    const supabase = getSupabaseClient(c);
    await initVouchersTable(supabase);

    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching vouchers:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, vouchers: data || [] });
  } catch (error: any) {
    console.error('❌ Error fetching vouchers:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Validate voucher code
vouchers.post('/validate', async (c) => {
  try {
    const supabase = getSupabaseClient(c);
    await initVouchersTable(supabase);

    const { code, orderTotal, customerEmail } = await c.req.json();

    console.log('🔍 Validating voucher:', { code, orderTotal, customerEmail });

    if (!code) {
      return c.json({ success: false, error: 'Voucher code is required' }, 400);
    }

    // Get voucher
    const { data: voucher, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !voucher) {
      return c.json({ success: false, error: 'Invalid voucher code' }, 400);
    }

    // Check if active
    if (!voucher.active) {
      return c.json({ success: false, error: 'This voucher is no longer active' }, 400);
    }

    // Check expiry
    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      return c.json({ success: false, error: 'This voucher has expired' }, 400);
    }

    // Check max uses
    if (voucher.max_uses && voucher.used_count >= voucher.max_uses) {
      return c.json({ success: false, error: 'This voucher has reached its usage limit' }, 400);
    }

    // Check customer specific
    if (voucher.customer_specific && customerEmail !== voucher.customer_specific) {
      return c.json({ success: false, error: 'This voucher is not valid for your account' }, 400);
    }

    // Check minimum purchase
    if (voucher.min_purchase > 0 && orderTotal < voucher.min_purchase) {
      return c.json({
        success: false,
        error: `Minimum purchase of $${voucher.min_purchase.toFixed(2)} required to use this voucher`
      }, 400);
    }

    // Calculate discount
    let discountAmount = 0;
    if (voucher.type === 'fixed') {
      discountAmount = Math.min(voucher.value, orderTotal);
    } else if (voucher.type === 'percentage') {
      discountAmount = (orderTotal * voucher.value) / 100;
    }

    console.log('✅ Voucher valid:', {
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      discount: discountAmount
    });

    return c.json({
      success: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
        discountAmount: parseFloat(discountAmount.toFixed(2))
      }
    });
  } catch (error: any) {
    console.error('❌ Error validating voucher:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Apply voucher (record usage)
vouchers.post('/apply', async (c) => {
  try {
    const supabase = getSupabaseClient(c);
    await initVouchersTable(supabase);

    const { voucherId, voucherCode, orderId, customerId, customerEmail, discountAmount } = await c.req.json();

    console.log('💳 Applying voucher:', { voucherCode, orderId, discountAmount });

    // Record usage
    const usage = {
      id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      voucher_id: voucherId,
      voucher_code: voucherCode,
      order_id: orderId,
      customer_id: customerId || null,
      customer_email: customerEmail,
      discount_amount: parseFloat(discountAmount),
      used_at: new Date().toISOString()
    };

    const { error: usageError } = await supabase
      .from('voucher_usage')
      .insert(usage);

    if (usageError) {
      console.error('❌ Error recording voucher usage:', usageError);
      return c.json({ success: false, error: usageError.message }, 500);
    }

    // Increment used_count
    const { error: updateError } = await supabase
      .from('vouchers')
      .update({
        used_count: supabase.raw('used_count + 1'),
        updated_at: new Date().toISOString()
      })
      .eq('id', voucherId);

    if (updateError) {
      console.error('❌ Error updating voucher count:', updateError);
    }

    console.log('✅ Voucher applied successfully');
    return c.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error applying voucher:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update voucher
vouchers.put('/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c);
    const voucherId = c.req.param('id');
    const updates = await c.req.json();

    console.log('📝 Updating voucher:', voucherId);

    const { error } = await supabase
      .from('vouchers')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', voucherId);

    if (error) {
      console.error('❌ Error updating voucher:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log('✅ Voucher updated');
    return c.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error updating voucher:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete voucher
vouchers.delete('/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c);
    const voucherId = c.req.param('id');

    console.log('🗑️ Deleting voucher:', voucherId);

    const { error } = await supabase
      .from('vouchers')
      .delete()
      .eq('id', voucherId);

    if (error) {
      console.error('❌ Error deleting voucher:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log('✅ Voucher deleted');
    return c.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error deleting voucher:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get voucher usage history
vouchers.get('/usage/:voucherId', async (c) => {
  try {
    const supabase = getSupabaseClient(c);
    const voucherId = c.req.param('voucherId');

    const { data, error } = await supabase
      .from('voucher_usage')
      .select('*')
      .eq('voucher_id', voucherId)
      .order('used_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching usage:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, usage: data || [] });
  } catch (error: any) {
    console.error('❌ Error fetching usage:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get customer's available vouchers
vouchers.get('/customer/:email', async (c) => {
  try {
    const supabase = getSupabaseClient(c);
    await initVouchersTable(supabase);

    const customerEmail = c.req.param('email');

    // Get all active vouchers that are either public or customer-specific
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('active', true)
      .or(`customer_specific.is.null,customer_specific.eq.${customerEmail}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching customer vouchers:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // Filter out expired and fully used vouchers
    const availableVouchers = (data || []).filter(v => {
      if (v.expires_at && new Date(v.expires_at) < new Date()) return false;
      if (v.max_uses && v.used_count >= v.max_uses) return false;
      return true;
    });

    return c.json({ success: true, vouchers: availableVouchers });
  } catch (error: any) {
    console.error('❌ Error fetching customer vouchers:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default vouchers;
