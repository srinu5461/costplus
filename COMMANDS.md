# ⚡ Command Reference - Quick Guide

All the commands you need for developing and deploying the Costplus100 platform.

---

## 🚀 Development Commands

### Start Development Server
```bash
pnpm dev
```
**What it does:** Starts Vite development server on http://localhost:5173

**When to use:** Every time you want to work on the project

---

### Install Dependencies
```bash
pnpm install
```
**What it does:** Installs all required npm packages

**When to use:** First time setup, or after pulling new code

---

### Build for Production
```bash
pnpm build
```
**What it does:** Creates optimized production build in `/dist` folder

**When to use:** Before deploying to production

---

### Preview Production Build
```bash
pnpm preview
```
**What it does:** Serves the production build locally

**When to use:** Test production build before deploying

---

## 🔧 Supabase Commands

### Login to Supabase
```bash
supabase login
```
**What it does:** Authenticates you with Supabase CLI

**When to use:** First time setup

---

### Link Project
```bash
supabase link --project-ref bqtzxoteouxvioxqgfpc
```
**What it does:** Links your local project to Supabase

**When to use:** First time setup, or after cloning repo

---

### Deploy Edge Function
```bash
supabase functions deploy make-server-d1fbc049
```
**What it does:** Deploys backend server to Supabase Edge Functions

**When to use:** 
- After modifying server code
- First time deployment
- After pulling updates

---

### View Edge Function Logs
```bash
supabase functions logs make-server-d1fbc049
```
**What it does:** Shows real-time logs from the backend server

**When to use:** Debugging backend issues

---

### Tail Logs (Live)
```bash
supabase functions logs make-server-d1fbc049 --follow
```
**What it does:** Streams live logs as they happen

**When to use:** Real-time debugging

---

### Set Environment Secret
```bash
supabase secrets set SECRET_NAME=value
```
**Examples:**
```bash
supabase secrets set SMTP_USER=admin@costplus100.com.au
supabase secrets set SMTP_PASSWORD=your_password
supabase secrets set SMTP_HOST=smtp.office365.com
supabase secrets set SMTP_PORT=587
supabase secrets set PAYPAL_CLIENT_ID=your_client_id
supabase secrets set PAYPAL_CLIENT_SECRET=your_secret
supabase secrets set EWAY_API_KEY=your_api_key
supabase secrets set EWAY_SANDBOX=true
```

**What it does:** Sets secure environment variables for Edge Functions

**When to use:** Configuring payment gateways, email, etc.

---

### List All Secrets
```bash
supabase secrets list
```
**What it does:** Shows all configured secrets (values hidden)

**When to use:** Verify which secrets are configured

---

## 📦 Package Management

### Install Specific Package
```bash
pnpm add package-name
```
**Example:**
```bash
pnpm add lodash
```

---

### Install Dev Dependency
```bash
pnpm add -D package-name
```

---

### Remove Package
```bash
pnpm remove package-name
```

---

### Update All Packages
```bash
pnpm update
```

---

## 🗄️ Database Commands

### Run SQL Query
```bash
supabase db execute --project-ref bqtzxoteouxvioxqgfpc
```

---

### Backup Database
```bash
supabase db dump --project-ref bqtzxoteouxvioxqgfpc > backup.sql
```

---

### Restore Database
```bash
supabase db restore --project-ref bqtzxoteouxvioxqgfpc < backup.sql
```

---

## 🧹 Cleanup Commands

### Clear Node Modules
```bash
rm -rf node_modules
pnpm install
```
**When to use:** Fix dependency issues

---

### Clear Vite Cache
```bash
rm -rf .vite
rm -rf dist
```
**When to use:** Fix build issues

---

### Full Clean Install
```bash
rm -rf node_modules .vite dist
pnpm install
```
**When to use:** Nuclear option for stubborn issues

---

## 🚀 Deployment Commands

### Deploy to Vercel
```bash
vercel --prod
```

---

### Deploy to Netlify
```bash
netlify deploy --prod --dir=dist
```

---

## 🔍 Debugging Commands

### Check Node Version
```bash
node --version
```
**Expected:** v18 or higher

---

### Check pnpm Version
```bash
pnpm --version
```

---

### List Running Processes on Port 5173
```bash
# Mac/Linux
lsof -i :5173

# Windows
netstat -ano | findstr :5173
```

---

### Kill Process on Port 5173
```bash
# Mac/Linux
lsof -ti:5173 | xargs kill -9

# Windows
taskkill /PID <PID> /F
```

---

## 🧪 Testing Commands

### Run in Different Port
```bash
pnpm dev --port 3000
```

---

### Run with Host Access
```bash
pnpm dev --host
```
**What it does:** Makes dev server accessible from network

**When to use:** Testing on mobile devices

---

## 📊 Git Commands (if using version control)

### Check Status
```bash
git status
```

---

### Add All Changes
```bash
git add .
```

---

### Commit Changes
```bash
git commit -m "Your message"
```

---

### Push to Remote
```bash
git push
```

---

### Pull Latest Changes
```bash
git pull
```

---

## 🎯 Quick Workflows

### 🆕 First Time Setup
```bash
# 1. Install dependencies
pnpm install

# 2. Login to Supabase
supabase login

# 3. Link project
supabase link --project-ref bqtzxoteouxvioxqgfpc

# 4. Deploy backend
supabase functions deploy make-server-d1fbc049

# 5. Start development
pnpm dev
```

---

### 🔄 Daily Development
```bash
# Start the dev server
pnpm dev

# (Make your changes...)

# If you modified backend code, redeploy:
supabase functions deploy make-server-d1fbc049
```

---

### 🐛 Debugging Backend Issues
```bash
# View recent logs
supabase functions logs make-server-d1fbc049

# Or watch live logs
supabase functions logs make-server-d1fbc049 --follow

# Check specific error in browser console (F12)
```

---

### 📧 Configure Email System
```bash
# Set all SMTP secrets
supabase secrets set SMTP_HOST=smtp.office365.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=admin@costplus100.com.au
supabase secrets set SMTP_PASSWORD=your_password

# Verify they're set
supabase secrets list

# Test in browser: http://localhost:5173/admin/email-settings
```

---

### 💳 Configure Payment Gateways
```bash
# PayPal
supabase secrets set PAYPAL_CLIENT_ID=your_id
supabase secrets set PAYPAL_CLIENT_SECRET=your_secret

# eWay
supabase secrets set EWAY_API_KEY=your_key
supabase secrets set EWAY_API_PASSWORD=your_password
supabase secrets set EWAY_PUBLIC_API_KEY=your_public_key
supabase secrets set EWAY_SANDBOX=true

# Verify
supabase secrets list
```

---

### 🚀 Deploy to Production
```bash
# 1. Build frontend
pnpm build

# 2. Deploy backend (if changes)
supabase functions deploy make-server-d1fbc049

# 3. Set production secrets
supabase secrets set EWAY_SANDBOX=false
# ... other production secrets

# 4. Deploy frontend (example: Vercel)
vercel --prod

# 5. Monitor logs
supabase functions logs make-server-d1fbc049 --follow
```

---

### 🔧 Fix Common Issues
```bash
# Issue: Port already in use
lsof -ti:5173 | xargs kill -9

# Issue: Module not found
rm -rf node_modules .vite
pnpm install

# Issue: Backend not responding
supabase functions deploy make-server-d1fbc049

# Issue: Build fails
rm -rf dist .vite
pnpm build
```

---

## 📱 Browser URLs Reference

### Development
```
http://localhost:5173              → Homepage
http://localhost:5173/admin/login  → Admin login
http://localhost:5173/admin        → Admin dashboard
```

### API Health Check
```
https://bqtzxoteouxvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/health
```

---

## 💡 Pro Tips

### Alias for Common Commands
Add to your `.bashrc` or `.zshrc`:

```bash
# Development
alias dev="pnpm dev"
alias build="pnpm build"

# Supabase
alias sblogs="supabase functions logs make-server-d1fbc049"
alias sbdeploy="supabase functions deploy make-server-d1fbc049"

# Quick clean
alias clean="rm -rf node_modules .vite dist && pnpm install"
```

Then use:
```bash
dev        # Instead of pnpm dev
sbdeploy   # Instead of long deploy command
sblogs     # Instead of long logs command
```

---

## 🆘 Emergency Commands

### Everything is broken!
```bash
# Nuclear option - full reset
rm -rf node_modules .vite dist
pnpm install
supabase functions deploy make-server-d1fbc049
pnpm dev
```

### Backend won't start
```bash
# Redeploy backend
supabase functions deploy make-server-d1fbc049

# Check logs for errors
supabase functions logs make-server-d1fbc049
```

### Can't login to admin
```bash
# Check Supabase Dashboard → Authentication → Users
# Verify admin@costplus100.com.au exists
# Manually reset password if needed
```

---

## ✅ Verification Commands

After setup, verify everything works:

```bash
# 1. Check Node version
node --version  # Should be v18+

# 2. Check if dev server starts
pnpm dev  # Should start on :5173

# 3. Check backend (in another terminal)
curl https://bqtzxoteouxvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/health

# 4. Check secrets are set
supabase secrets list

# Expected secrets:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - SMTP_* (if email configured)
# - PAYPAL_* (if PayPal configured)
# - EWAY_* (if eWay configured)
```

---

## 📖 More Information

For detailed explanations, see:
- **QUICKSTART.md** - Quick setup guide
- **LOCALHOST-SETUP.md** - Detailed setup
- **README.md** - Full documentation
- **DEPLOYMENT.md** - Production deployment

---

**Quick Copy-Paste Setup:**

```bash
pnpm install
supabase login
supabase link --project-ref bqtzxoteouxvioxqgfpc
supabase functions deploy make-server-d1fbc049
pnpm dev
```

**Done! 🎉**
