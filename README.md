# Costplus100 E-Commerce Platform

A complete full-stack e-commerce application for catering equipment sales, built with React, Vite, Supabase, and Hono.

## 🚀 Features

### Frontend
- ✅ Multi-page React application with React Router
- ✅ 730+ categories in 4-level mega menu navigation
- ✅ Product listings with search, filtering, and sorting
- ✅ Shopping cart with persistent storage
- ✅ Three-step checkout process
- ✅ Customer authentication and portal
- ✅ Order tracking and history
- ✅ Responsive design with Tailwind CSS
- ✅ Costplus100 branding (Dark Navy #2D3748 + Brand Red #E31837)

### Backend (Supabase Edge Functions)
- ✅ Hono web server
- ✅ KV Store database integration
- ✅ PayPal payment gateway integration
- ✅ eWay payment gateway integration
- ✅ SMTP email system with nodemailer
- ✅ Tax invoice email templates
- ✅ Customer authentication with Supabase Auth
- ✅ RESTful API endpoints

### Admin CMS
- ✅ Complete admin panel at `/admin`
- ✅ Product management with CSV import
- ✅ Category management with CSV import
- ✅ Order management and tracking
- ✅ Customer management
- ✅ Company information settings
- ✅ Email configuration (SMTP settings)
- ✅ Featured products management
- ✅ Banner management
- ✅ Header/Footer editor
- ✅ Maintenance mode toggle
- ✅ System diagnostics

### Email System
- ✅ Professional tax invoice emails
- ✅ Order confirmation emails
- ✅ GST/ABN compliance for Australian businesses
- ✅ Dynamic company information
- ✅ Password reset emails
- ✅ Test email functionality

## 📋 Prerequisites

Before running this project, ensure you have:

- **Node.js** v18+ installed
- **pnpm** package manager (recommended) or npm
- **Supabase account** with project created
- **PayPal Business Account** (for PayPal payments)
- **eWay Account** (for eWay payments)
- **SMTP Email Account** (Office365, Gmail, etc.)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd costplus100-ecommerce
```

### 2. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 3. Configure Supabase

#### A. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Note your **Project URL** and **Anon Key**

#### B. Set up the KV Store Table

The application uses a key-value store table. Create it with this SQL:

```sql
-- Create the KV store table
CREATE TABLE kv_store_577b3f26 (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_kv_store_key ON kv_store_577b3f26(key);

-- Enable Row Level Security
ALTER TABLE kv_store_577b3f26 ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on kv_store"
  ON kv_store_577b3f26
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

#### C. Update Supabase Configuration

Edit `/utils/supabase/info.tsx`:

```typescript
export const projectId = 'YOUR_PROJECT_ID'; // e.g., 'bqtzxoteouxvioxqgfpc'
export const publicAnonKey = 'YOUR_ANON_KEY'; // Your Supabase anon key
```

### 4. Deploy Supabase Edge Function

The backend server must be deployed to Supabase Edge Functions:

#### A. Install Supabase CLI

```bash
npm install -g supabase
```

#### B. Login to Supabase

```bash
supabase login
```

#### C. Link Your Project

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

#### D. Deploy the Function

```bash
supabase functions deploy make-server-d1fbc049
```

#### E. Set Environment Secrets

Set up the required secrets in Supabase:

```bash
# Supabase credentials (auto-configured)
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
supabase secrets set SUPABASE_ANON_KEY=YOUR_ANON_KEY
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# SMTP Email Configuration
supabase secrets set SMTP_HOST=smtp.office365.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=admin@costplus100.com.au
supabase secrets set SMTP_PASSWORD=your_email_password

# PayPal Configuration
supabase secrets set PAYPAL_CLIENT_ID=your_paypal_client_id
supabase secrets set PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# eWay Configuration
supabase secrets set EWAY_API_KEY=your_eway_api_key
supabase secrets set EWAY_API_PASSWORD=your_eway_password
supabase secrets set EWAY_PUBLIC_API_KEY=your_eway_public_key
supabase secrets set EWAY_SANDBOX=true  # Set to false for production
```

### 5. Configure Admin Account

#### A. Create Admin User

The admin system uses Supabase Auth. Create an admin user:

1. Go to your Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Email: `admin@costplus100.com.au`
4. Password: (choose a strong password)
5. User metadata:
   ```json
   {
     "name": "Admin User",
     "role": "admin"
   }
   ```
6. Confirm the email manually

#### B. Configure Admin Access

The admin credentials are hardcoded in `/src/app/context/AdminContext.tsx`. Update if needed:

```typescript
// Default admin credentials
const ADMIN_EMAIL = 'admin@costplus100.com.au';
const ADMIN_PASSWORD = 'your_chosen_password';
```

## 🚀 Running the Application

### Development Mode

Start the Vite development server:

```bash
pnpm dev
# or
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

Build for production:

```bash
pnpm build
# or
npm run build
```

Preview the production build:

```bash
pnpm preview
# or
npm run preview
```

## 📱 Application Structure

```
/
├── src/
│   ├── app/
│   │   ├── components/         # Reusable React components
│   │   ├── context/           # React Context providers
│   │   ├── pages/             # Page components
│   │   │   ├── admin/         # Admin panel pages
│   │   │   └── customer/      # Customer portal pages
│   │   ├── layout/            # Layout components
│   │   ├── utils/             # Utility functions
│   │   ├── routes.ts          # React Router configuration
│   │   └── App.tsx            # Main app component
│   ├── lib/                   # Third-party integrations
│   ├── styles/                # Global styles and themes
│   └── imports/               # Imported data files
├── supabase/
│   └── functions/
│       └── server/            # Edge Functions server code
│           ├── index.tsx      # Main Hono server
│           ├── email.tsx      # Email routes
│           ├── payment.tsx    # Payment routes
│           ├── customers.tsx  # Customer routes
│           └── kv_custom.tsx  # KV store utilities
├── utils/
│   └── supabase/
│       └── info.tsx           # Supabase configuration
├── package.json               # Dependencies
├── vite.config.ts             # Vite configuration
└── README.md                  # This file
```

## 🔐 Access Points

### Customer Portal
- **URL**: `http://localhost:5173/customer/login`
- Create accounts via signup or use test account

### Admin Panel
- **URL**: `http://localhost:5173/admin/login`
- **Email**: `admin@costplus100.com.au`
- **Password**: (as configured in Supabase)

### Admin Sections
- `/admin` - Dashboard
- `/admin/products` - Product management
- `/admin/categories` - Category management
- `/admin/orders` - Order management
- `/admin/customers` - Customer management
- `/admin/company-settings` - Company information
- `/admin/email-settings` - SMTP configuration
- `/admin/featured-products` - Featured products
- `/admin/settings` - System settings

## 🎨 Customization

### Company Branding

Update company details in the Admin Panel:
1. Login to `/admin/login`
2. Go to "Company Info" (`/admin/company-settings`)
3. Update all fields:
   - Legal Company Name
   - Trading Name
   - ABN (Australian Business Number)
   - Address
   - Phone, Email, Website
   - Tagline

These settings will automatically update:
- Tax invoices
- Email templates
- Footer information
- All customer communications

### Email Configuration

Configure SMTP settings:
1. Go to `/admin/email-settings`
2. Update SMTP settings:
   - Host: `smtp.office365.com` (or your provider)
   - Port: `587`
   - Sender Email: `admin@costplus100.com.au`
   - Sender Name: `Costplus100`
3. Test the connection
4. Send test email to verify

### Payment Gateways

#### PayPal Setup
1. Get credentials from [PayPal Developer](https://developer.paypal.com)
2. Update Supabase secrets:
   ```bash
   supabase secrets set PAYPAL_CLIENT_ID=xxx
   supabase secrets set PAYPAL_CLIENT_SECRET=xxx
   ```

#### eWay Setup
1. Get credentials from [eWay](https://www.eway.com.au)
2. Update Supabase secrets:
   ```bash
   supabase secrets set EWAY_API_KEY=xxx
   supabase secrets set EWAY_API_PASSWORD=xxx
   supabase secrets set EWAY_PUBLIC_API_KEY=xxx
   supabase secrets set EWAY_SANDBOX=true
   ```

## 📊 Data Management

### Import Products

1. Prepare CSV file with columns:
   - `code`, `name`, `description`, `price`, `category`, `brand`, etc.
2. Go to `/admin/import-products`
3. Upload CSV file
4. Map columns
5. Import products

### Import Categories

1. Prepare CSV file with columns:
   - `id`, `name`, `parent_id`, `level`, `path`
2. Go to `/admin/import-categories`
3. Upload CSV file
4. Verify hierarchy
5. Import categories

## 🐛 Troubleshooting

### Email Not Sending
- Verify SMTP credentials in Supabase secrets
- Check SMTP host and port
- Test connection in `/admin/email-settings`
- Check email logs in Supabase Edge Function logs

### Payment Errors
- Verify PayPal/eWay credentials
- Check sandbox vs production mode
- View browser console for errors
- Check Supabase Edge Function logs

### Database Errors
- Verify KV store table exists
- Check Supabase connection
- View diagnostics at `/admin/diagnostics`
- Test connection at `/db-diagnostic`

### Build Errors
- Clear node_modules: `rm -rf node_modules && pnpm install`
- Clear Vite cache: `rm -rf .vite`
- Update dependencies: `pnpm update`

## 📝 Testing

### Test Order Flow
1. Add products to cart
2. Go to checkout
3. Use PayPal Sandbox or eWay Sandbox
4. Complete payment
5. Check order confirmation email
6. View order in customer dashboard
7. Check order in admin panel

### Test Email System
1. Go to `/admin/email-settings`
2. Click "Send Test Email"
3. Check your inbox
4. Verify company branding

### Test Admin Functions
1. Login to admin panel
2. Create/edit products
3. Create/edit categories
4. View orders and customers
5. Update company settings
6. Toggle maintenance mode

## 🌐 Deployment

### Production Checklist

- [ ] Update Supabase secrets for production
- [ ] Set `EWAY_SANDBOX=false` for live payments
- [ ] Configure production SMTP credentials
- [ ] Update PayPal to live credentials
- [ ] Set up custom domain
- [ ] Enable HTTPS
- [ ] Test all payment flows
- [ ] Test email delivery
- [ ] Backup database
- [ ] Set up monitoring

## 📄 License

Proprietary - Costplus100 Pty Ltd

## 🤝 Support

For issues or questions:
- Email: admin@costplus100.com.au
- Phone: 1300 COSTPLUS

---

**Built with ❤️ for Costplus100 - CATERING EQUIPMENT SOLUTIONS**
