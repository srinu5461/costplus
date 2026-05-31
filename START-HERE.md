# 🎯 START HERE - Costplus100 E-Commerce Platform

**👋 Just extracted the zip to your Desktop?** Read `GETTING-STARTED.md` first!

Welcome! This document will guide you through getting started with the Costplus100 platform.

---

## 🚀 Ultra Quick Start (3 Commands)

If you just want to get it running RIGHT NOW:

```bash
# 1. Navigate to the project folder
cd ~/Desktop/costplus100-ecommerce   # Mac/Linux
cd Desktop\costplus100-ecommerce     # Windows

# 2. Install dependencies
pnpm install

# 3. Start the server
pnpm dev
```

Open browser: http://localhost:5173

**🎉 Done!**

➡️ **Need help?** Read `GETTING-STARTED.md` for step-by-step instructions.

---

## 📚 Documentation Overview

This project includes several documentation files:

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **START-HERE.md** | Quick orientation (this file) | Read first |
| **QUICKSTART.md** | 5-minute quick start | Get running fast |
| **LOCALHOST-SETUP.md** | Detailed localhost setup | Comprehensive setup guide |
| **README.md** | Full project documentation | Reference guide |
| **TESTING-CHECKLIST.md** | Complete testing checklist | Before deployment |
| **DEPLOYMENT.md** | Production deployment guide | Going live |

---

## 🚀 Quick Start (Choose Your Path)

### Path 1: "Just Get It Running" (5 minutes)

If you want to see the app running ASAP:

```bash
# 1. Install dependencies
pnpm install

# 2. Start the server
pnpm dev

# 3. Open browser
# Visit: http://localhost:5173
```

**That's it!** The app should be running.

➡️ **Next:** Read `QUICKSTART.md` for more details

---

### Path 2: "Complete Setup" (15 minutes)

If you want everything configured properly:

1. **Read** `LOCALHOST-SETUP.md`
2. **Follow** all steps including:
   - ✅ Install dependencies
   - ✅ Configure Supabase
   - ✅ Start development server
   - ✅ Test database connection
   - ✅ Configure company settings
   - ✅ Set up email system
   - ✅ Import sample data

➡️ **Next:** Read `LOCALHOST-SETUP.md` now

---

### Path 3: "I Want to Deploy" (30+ minutes)

If you're ready to deploy to production:

1. **Complete** Path 2 first
2. **Test** everything using `TESTING-CHECKLIST.md`
3. **Deploy** following `DEPLOYMENT.md`

➡️ **Next:** Read `DEPLOYMENT.md`

---

## 🎯 What is This Project?

**Costplus100 E-Commerce Platform** is a complete full-stack web application for selling catering equipment online.

### Key Features

#### 🛍️ Customer Features
- Browse 730+ product categories
- Search and filter products
- Add items to shopping cart
- Complete checkout with PayPal or eWay
- Receive professional tax invoice emails
- Track orders in customer portal
- Manage account and password

#### 🔧 Admin Features
- Manage products and categories
- Import data via CSV
- View and manage orders
- Manage customers
- Configure company information
- Configure email settings (SMTP)
- Set up featured products and banners
- Toggle maintenance mode
- View system diagnostics

#### 💼 Business Features
- Australian GST compliance
- Professional tax invoices
- ABN display on invoices
- Multiple payment gateways
- Order confirmation emails
- Customer authentication
- Responsive design (mobile-friendly)

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Radix UI** - Component library
- **Lucide React** - Icons

### Backend
- **Supabase** - Database and hosting
- **Hono** - Web framework (Edge Functions)
- **Supabase Auth** - Authentication
- **KV Store** - Database (key-value pairs)

### Integrations
- **PayPal** - Payment processing
- **eWay** - Payment processing (Australia)
- **Nodemailer** - Email sending
- **SMTP** - Email delivery

---

## 📂 Project Structure

```
costplus100-ecommerce/
│
├── 📄 Documentation
│   ├── START-HERE.md          ← You are here
│   ├── QUICKSTART.md           ← 5-minute setup
│   ├── LOCALHOST-SETUP.md      ← Detailed setup
│   ├── README.md               ← Full documentation
│   ├── TESTING-CHECKLIST.md    ← Testing guide
│   └── DEPLOYMENT.md           ← Production deployment
│
├── 📁 src/
│   ├── app/
│   │   ├── components/         ← React components
│   │   ├── pages/             ← Page components
│   │   │   ├── admin/         ← Admin panel pages
│   │   │   └── customer/      ← Customer portal pages
│   │   ├── context/           ← React contexts
│   │   ├── utils/             ← Utility functions
│   │   └── routes.ts          ← Route configuration
│   │
│   ├── styles/                ← CSS and themes
│   └── imports/               ← Sample data files
│
├── 📁 supabase/
│   └── functions/
│       └── server/            ← Backend server code
│           ├── index.tsx      ← Main server
│           ├── email.tsx      ← Email routes
│           ├── payment.tsx    ← Payment routes
│           └── customers.tsx  ← Customer routes
│
├── 📁 utils/
│   └── supabase/
│       └── info.tsx           ← Supabase config
│
├── package.json               ← Dependencies
├── vite.config.ts             ← Vite config
└── .env.example               ← Environment variables template
```

---

## ⚙️ System Requirements

### Required
- ✅ **Node.js** v18 or higher
- ✅ **pnpm** (or npm/yarn)
- ✅ **Modern browser** (Chrome, Firefox, Safari, Edge)

### For Full Functionality
- ✅ **Supabase account** (free tier works)
- ✅ **PayPal Business account** (optional)
- ✅ **eWay account** (optional, for Australian payments)
- ✅ **SMTP email account** (Office365, Gmail, etc.)

---

## 🔑 Default Credentials

### Admin Panel
- **URL:** http://localhost:5173/admin/login
- **Email:** admin@costplus100.com.au
- **Password:** (configured in Supabase Auth)

### Supabase
- **Project ID:** bqtzxoteouxvioxqgfpc
- **Project URL:** https://bqtzxoteouxvioxqgfpc.supabase.co
- **Anon Key:** (in `/utils/supabase/info.tsx`)

---

## 🎯 Common Tasks

### Start Development Server
```bash
pnpm dev
```

### Build for Production
```bash
pnpm build
```

### Preview Production Build
```bash
pnpm preview
```

### Deploy Backend
```bash
supabase functions deploy make-server-d1fbc049
```

### View Backend Logs
```bash
supabase functions logs make-server-d1fbc049
```

---

## 🔗 Important URLs (Localhost)

| Page | URL |
|------|-----|
| Homepage | http://localhost:5173 |
| Products | http://localhost:5173/products |
| Cart | http://localhost:5173/cart |
| Checkout | http://localhost:5173/checkout |
| Customer Login | http://localhost:5173/customer/login |
| Customer Dashboard | http://localhost:5173/customer/dashboard |
| Admin Login | http://localhost:5173/admin/login |
| Admin Dashboard | http://localhost:5173/admin |
| Company Settings | http://localhost:5173/admin/company-settings |
| Email Settings | http://localhost:5173/admin/email-settings |
| Products Manager | http://localhost:5173/admin/products |
| Categories Manager | http://localhost:5173/admin/categories |
| Orders Manager | http://localhost:5173/admin/orders |
| DB Diagnostic | http://localhost:5173/db-diagnostic |
| Diagnostics | http://localhost:5173/admin/diagnostics |

---

## ❓ FAQ

### Q: Do I need a Supabase account?
**A:** Yes, the backend runs on Supabase Edge Functions. Free tier is sufficient for testing.

### Q: Can I use this without payment gateways?
**A:** Yes! Payment gateways are optional. The app works without them, but checkout will fail.

### Q: Do I need to set up email?
**A:** Email is optional for testing, but required for production (order confirmations).

### Q: Is this production-ready?
**A:** Yes, but you must:
- Configure company settings
- Set up payment gateways
- Configure email system
- Update all placeholder data
- Complete the testing checklist

### Q: Can I use my own domain?
**A:** Yes! See `DEPLOYMENT.md` for instructions.

### Q: How do I import products?
**A:** Use the admin panel at `/admin/import-products` with a CSV file.

### Q: Where is the database?
**A:** Data is stored in Supabase using a key-value store table (`kv_store_577b3f26`).

### Q: Can I customize the design?
**A:** Yes! Update colors in `/src/styles/theme.css` and components in `/src/app/components/`.

---

## 🆘 Getting Help

### Check Diagnostics
Visit these pages for system information:
- http://localhost:5173/db-diagnostic
- http://localhost:5173/admin/diagnostics

### View Logs
**Frontend:** Browser console (F12 → Console)
**Backend:** `supabase functions logs make-server-d1fbc049`

### Common Issues
See `LOCALHOST-SETUP.md` → Troubleshooting section

### Review Documentation
- `README.md` - Full documentation
- `LOCALHOST-SETUP.md` - Setup guide
- `DEPLOYMENT.md` - Deployment guide

---

## ✅ Next Steps

### For First-Time Setup:
1. ✅ Read this document (you're doing it!)
2. ✅ Choose your path above (Quick Start or Complete Setup)
3. ✅ Follow the chosen guide
4. ✅ Test the application
5. ✅ Import sample data
6. ✅ Configure company settings

### For Deployment:
1. ✅ Complete setup and testing
2. ✅ Review `TESTING-CHECKLIST.md`
3. ✅ Follow `DEPLOYMENT.md`
4. ✅ Configure production secrets
5. ✅ Deploy and monitor

---

## 🎉 Ready to Start!

Pick your path from above and get started:

- 🚀 **Quick:** Read `QUICKSTART.md`
- 🔧 **Detailed:** Read `LOCALHOST-SETUP.md`
- 🌍 **Deploy:** Read `DEPLOYMENT.md`

---

**Built with ❤️ for Costplus100**
**CATERING EQUIPMENT SOLUTIONS**

Version: 2.0.0
Last Updated: March 2026