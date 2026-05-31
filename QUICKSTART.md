# 🚀 Quick Start Guide - Localhost Testing

This guide will get you up and running in **5 minutes** for localhost testing.

## Step 1: Install Dependencies (1 minute)

```bash
# Install pnpm globally if you don't have it
npm install -g pnpm

# Install project dependencies
pnpm install
```

## Step 2: Configure Supabase (2 minutes)

### Option A: Use Existing Supabase Project

If you already have the Supabase project configured:

1. Edit `/utils/supabase/info.tsx`:
   ```typescript
   export const projectId = 'bqtzxoteouxvioxqgfpc';  // Your project ID
   export const publicAnonKey = 'eyJhbGciOi...';     // Your anon key
   ```

2. Done! The backend is already deployed.

### Option B: Set Up New Supabase Project

If starting fresh:

1. Create project at [supabase.com](https://supabase.com)

2. Create the KV store table (SQL Editor):
   ```sql
   CREATE TABLE kv_store_577b3f26 (
     key TEXT PRIMARY KEY,
     value JSONB NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   ALTER TABLE kv_store_577b3f26 ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Allow all operations on kv_store"
     ON kv_store_577b3f26 FOR ALL USING (true) WITH CHECK (true);
   ```

3. Update `/utils/supabase/info.tsx` with your credentials

4. Deploy Edge Function:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_ID
   supabase functions deploy make-server-d1fbc049
   ```

5. Set Edge Function secrets:
   ```bash
   supabase secrets set SMTP_USER=admin@costplus100.com.au
   supabase secrets set SMTP_PASSWORD=your_password
   supabase secrets set SMTP_HOST=smtp.office365.com
   supabase secrets set SMTP_PORT=587
   ```

## Step 3: Start Development Server (30 seconds)

```bash
pnpm dev
```

Open browser to `http://localhost:5173`

## Step 4: Test the Application (1 minute)

### Test Frontend
✅ Homepage: `http://localhost:5173`
✅ Products: `http://localhost:5173/products`
✅ Cart: `http://localhost:5173/cart`

### Test Admin Panel
✅ Login: `http://localhost:5173/admin/login`
- **Email**: `admin@costplus100.com.au`
- **Password**: `admin123` (default, or as configured)

### First Time Setup

1. **Login to Admin** (`/admin/login`)

2. **Configure Company Info** (`/admin/company-settings`)
   - Update ABN
   - Update address
   - Update contact details
   - Click "Save"

3. **Configure Email** (`/admin/email-settings`)
   - Update SMTP settings
   - Test email connection
   - Send test email

4. **Import Categories** (`/admin/import-categories`)
   - Sample file in `/src/imports/costplus100-categories-2026-03-03_(3).csv`
   - Upload and import

5. **Import Products** (`/admin/import-products`)
   - Prepare your products CSV
   - Upload and import

## Testing Payment Gateways (Optional)

### PayPal Sandbox
```bash
supabase secrets set PAYPAL_CLIENT_ID=your_sandbox_client_id
supabase secrets set PAYPAL_CLIENT_SECRET=your_sandbox_secret
```

### eWay Sandbox
```bash
supabase secrets set EWAY_API_KEY=your_sandbox_api_key
supabase secrets set EWAY_API_PASSWORD=your_sandbox_password
supabase secrets set EWAY_PUBLIC_API_KEY=your_sandbox_public_key
supabase secrets set EWAY_SANDBOX=true
```

## 🧪 Testing Checklist

### Frontend Testing
- [ ] Browse products
- [ ] Search and filter
- [ ] Add to cart
- [ ] Update cart quantities
- [ ] View product details
- [ ] Browse categories (mega menu)

### Checkout Testing
- [ ] Go to checkout
- [ ] Fill in customer details
- [ ] Select payment method
- [ ] Complete test payment
- [ ] Receive order confirmation email
- [ ] View order in customer dashboard

### Admin Testing
- [ ] Login to admin panel
- [ ] View dashboard statistics
- [ ] Create/edit products
- [ ] Manage categories
- [ ] View orders
- [ ] View customers
- [ ] Update company settings
- [ ] Test email settings
- [ ] Toggle maintenance mode

### Email Testing
- [ ] Send test email from admin
- [ ] Complete an order
- [ ] Check tax invoice email
- [ ] Verify company branding
- [ ] Check ABN display

## 🐛 Common Issues

### "Cannot connect to database"
- Check Supabase credentials in `/utils/supabase/info.tsx`
- Verify KV store table exists
- Check `/db-diagnostic` page

### "Email not sending"
- Verify SMTP secrets are set
- Check email settings in admin panel
- Test connection first
- Check Edge Function logs

### "Payment failed"
- Verify payment gateway credentials
- Check sandbox mode is enabled
- View browser console for errors
- Check Edge Function logs

### "Admin login not working"
- Create admin user in Supabase Dashboard
- Check email: `admin@costplus100.com.au`
- Verify password
- Check Auth logs in Supabase

## 📊 View Logs

### Frontend Logs
Check browser console (F12)

### Backend Logs
```bash
# View Edge Function logs
supabase functions logs make-server-d1fbc049 --project-ref YOUR_PROJECT_ID
```

Or view in Supabase Dashboard → Edge Functions → Logs

## 🎉 You're Ready!

Your Costplus100 e-commerce platform is now running locally!

**Next Steps:**
1. Import your product catalog
2. Configure payment gateways
3. Test the complete checkout flow
4. Customize branding and content
5. Deploy to production

---

**Need Help?**
- Check `/README.md` for detailed documentation
- View diagnostics at `/admin/diagnostics`
- Check database at `/db-diagnostic`
