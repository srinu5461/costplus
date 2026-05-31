# 🖥️ Localhost Setup - Complete Guide

This is a **step-by-step guide** for getting the Costplus100 e-commerce platform running on your local machine.

---

## ✅ Prerequisites Check

Before starting, verify you have:

```bash
# Check Node.js version (should be 18+)
node --version

# Check if pnpm is installed
pnpm --version

# If pnpm is not installed:
npm install -g pnpm
```

---

## 📦 Step 1: Install Dependencies (2 minutes)

```bash
# Navigate to project directory
cd costplus100-ecommerce

# Install all dependencies
pnpm install
```

**Expected output:**
```
Progress: resolved XXX, reused XXX, downloaded XX, added XXX
Done in XXs
```

---

## 🔧 Step 2: Configure Supabase Connection (5 minutes)

### A. Get Supabase Credentials

Your Supabase project should already be set up with:
- Project ID: `bqtzxoteouxvioxqgfpc`
- Project URL: `https://bqtzxoteouxvioxqgfpc.supabase.co`
- Anon Key: (your existing key)

### B. Verify Configuration

Check `/utils/supabase/info.tsx`:

```typescript
export const projectId = 'bqtzxoteouxvioxqgfpc';
export const publicAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

✅ If these are correct, you're good to go!

### C. Verify Edge Function is Deployed

The backend server should already be deployed at:
`https://bqtzxoteouxvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049`

Test it by visiting:
`https://bqtzxoteouxvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/health`

You should see: `{"status":"ok"}`

---

## 🚀 Step 3: Start Development Server (30 seconds)

```bash
pnpm dev
```

**Expected output:**
```
VITE vX.X.X  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## 🌐 Step 4: Open Application (30 seconds)

Open your browser and navigate to:

### Frontend
**Homepage**: http://localhost:5173

You should see:
- Costplus100 header with logo
- Mega menu navigation
- Featured products
- Banners (if configured)

### Admin Panel
**Admin Login**: http://localhost:5173/admin/login

**Default Credentials:**
- Email: `admin@costplus100.com.au`
- Password: (your configured password)

---

## 🧪 Step 5: Verify Everything Works

### Test 1: Database Connection

Visit: http://localhost:5173/db-diagnostic

You should see:
- ✅ Connection Status: Connected
- ✅ Table exists: kv_store_577b3f26
- ✅ Can read/write data

### Test 2: Admin Login

1. Go to http://localhost:5173/admin/login
2. Login with admin credentials
3. You should see the admin dashboard

### Test 3: Browse Products

1. Go to http://localhost:5173/products
2. You should see products (if any are imported)
3. Try searching and filtering

### Test 4: Shopping Cart

1. Click "Add to Cart" on any product
2. Click cart icon in header
3. You should see your cart with items

---

## 📧 Step 6: Configure Email (Optional - 5 minutes)

If you want to test email functionality:

### A. Set SMTP Credentials in Supabase

```bash
# If you have Supabase CLI installed
supabase secrets set SMTP_USER=admin@costplus100.com.au
supabase secrets set SMTP_PASSWORD=your_email_password
supabase secrets set SMTP_HOST=smtp.office365.com
supabase secrets set SMTP_PORT=587
```

### B. Configure in Admin Panel

1. Login to admin panel
2. Go to "Email Settings" (http://localhost:5173/admin/email-settings)
3. Update SMTP settings
4. Click "Test Connection"
5. Send test email to your address

---

## 💳 Step 7: Configure Payments (Optional - 10 minutes)

### PayPal Sandbox

1. Get sandbox credentials from https://developer.paypal.com
2. Set secrets:
   ```bash
   supabase secrets set PAYPAL_CLIENT_ID=your_sandbox_client_id
   supabase secrets set PAYPAL_CLIENT_SECRET=your_sandbox_secret
   ```

### eWay Sandbox

1. Get sandbox credentials from https://www.eway.com.au
2. Set secrets:
   ```bash
   supabase secrets set EWAY_API_KEY=your_sandbox_api_key
   supabase secrets set EWAY_API_PASSWORD=your_sandbox_password
   supabase secrets set EWAY_PUBLIC_API_KEY=your_sandbox_public_key
   supabase secrets set EWAY_SANDBOX=true
   ```

---

## 📊 Step 8: Import Data (Optional - 5 minutes)

### Import Categories

1. Go to http://localhost:5173/admin/import-categories
2. Sample file is at: `/src/imports/costplus100-categories-2026-03-03_(3).csv`
3. Click "Choose File" and select the CSV
4. Click "Upload and Parse CSV"
5. Review the preview
6. Click "Import Categories"

### Import Products

1. Prepare a products CSV file with columns:
   - code, name, description, price, category, brand, etc.
2. Go to http://localhost:5173/admin/import-products
3. Upload your CSV
4. Map the columns
5. Click "Import Products"

---

## 🏢 Step 9: Configure Company Information (2 minutes)

1. Login to admin panel
2. Go to "Company Info" (http://localhost:5173/admin/company-settings)
3. Update all fields:
   - **Legal Company Name**: COSTPLUS100 PTY LTD
   - **Trading Name**: Costplus100
   - **ABN**: (your real ABN, e.g., 12 345 678 901)
   - **Address**: (your business address)
   - **Phone**: 1300 COSTPLUS
   - **Email**: info@costplus100.com.au
   - **Website**: www.costplus100.com.au
   - **Tagline**: CATERING EQUIPMENT SOLUTIONS
4. Click "Save Company Information"

---

## 🎯 Step 10: Test Complete Flow

### Complete Order Flow Test

1. **Browse Products**
   - Go to http://localhost:5173/products
   - Find a product
   - Click on it to view details

2. **Add to Cart**
   - Click "Add to Cart"
   - Adjust quantity if needed
   - View cart

3. **Checkout**
   - Click "Proceed to Checkout"
   - Fill in customer details:
     - First Name: Test
     - Last Name: User
     - Email: your_email@example.com
     - Phone: 0400000000
     - Address: 123 Test St
     - City: Sydney
     - State: NSW
     - Postcode: 2000

4. **Payment (if configured)**
   - Select PayPal or eWay
   - Complete payment in sandbox
   - You should be redirected to order confirmation

5. **Verify Order**
   - Check your email for tax invoice
   - Login to admin panel
   - Go to "Orders"
   - See your test order

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
1. Check `/utils/supabase/info.tsx` has correct credentials
2. Verify Edge Function is deployed
3. Check http://localhost:5173/db-diagnostic

### Issue: "Admin login not working"

**Solution:**
1. Go to Supabase Dashboard → Authentication → Users
2. Verify admin user exists with email `admin@costplus100.com.au`
3. If not, create the user:
   - Email: `admin@costplus100.com.au`
   - Password: (choose a password)
   - Confirm email manually

### Issue: "Products not showing"

**Solution:**
1. Import products via admin panel
2. Or check if products exist in database
3. Go to http://localhost:5173/admin/products

### Issue: "Email not sending"

**Solution:**
1. Check SMTP credentials in Supabase secrets
2. Test connection in admin panel
3. View Edge Function logs:
   ```bash
   supabase functions logs make-server-d1fbc049
   ```

### Issue: "Payment failed"

**Solution:**
1. Verify payment gateway credentials
2. Check sandbox mode is enabled
3. View browser console (F12) for errors
4. Check Edge Function logs

### Issue: "Port 5173 already in use"

**Solution:**
```bash
# Kill process on port 5173
# On Mac/Linux:
lsof -ti:5173 | xargs kill -9

# On Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use different port:
pnpm dev --port 3000
```

### Issue: "Module not found" errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules
rm -rf .vite
pnpm install
```

---

## 📝 Development Tips

### Hot Module Replacement (HMR)

Vite automatically reloads when you make changes. Just save your file and the browser will update.

### View Console Logs

**Frontend logs:** Press F12 in browser → Console tab

**Backend logs:** 
```bash
supabase functions logs make-server-d1fbc049 --project-ref bqtzxoteouxvioxqgfpc
```

### Debugging Admin Panel

1. Open browser DevTools (F12)
2. Go to Console tab
3. All API calls and errors will be logged

### Database Diagnostics

Visit: http://localhost:5173/admin/diagnostics

Shows:
- Database connection status
- KV store statistics
- Recent errors
- System information

---

## 🎨 Customization

### Change Branding Colors

Edit `/src/styles/theme.css`:

```css
:root {
  --color-primary: #2D3748;  /* Dark Navy */
  --color-accent: #E31837;   /* Brand Red */
}
```

### Update Logo

Replace the logo in header component:
`/src/app/components/Header.tsx`

### Modify Homepage

1. Go to admin panel
2. Navigate to "Homepage" editor
3. Update banners, featured products, etc.

---

## ✅ Setup Complete!

Your localhost environment is ready! 🎉

### Quick Reference URLs

| Page | URL |
|------|-----|
| Homepage | http://localhost:5173 |
| Products | http://localhost:5173/products |
| Cart | http://localhost:5173/cart |
| Admin Login | http://localhost:5173/admin/login |
| Admin Dashboard | http://localhost:5173/admin |
| DB Diagnostic | http://localhost:5173/db-diagnostic |

### Next Steps

1. ✅ Import your product catalog
2. ✅ Configure company settings
3. ✅ Set up email system
4. ✅ Test checkout flow
5. ✅ Configure payment gateways
6. 🚀 Ready for deployment!

---

**Need More Help?**
- Check `/README.md` for full documentation
- View `/QUICKSTART.md` for quick reference
- Check `/DEPLOYMENT.md` when ready to deploy
