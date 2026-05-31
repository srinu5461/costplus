# 🚀 Deployment Guide - Costplus100 Catering Equipment Store

## 📋 Overview

Your app uses **serverless architecture** - you DON'T need a traditional server!

```
┌──────────────────────────────────────────┐
│  WHAT'S ALREADY DEPLOYED ✅              │
├──────────────────────────────────────────┤
│  • Supabase Backend API (Edge Functions) │
│  • PostgreSQL Database                   │
│  • Authentication System                 │
│  • File Storage (if used)                │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  WHAT YOU NEED TO DEPLOY 🎯              │
├──────────────────────────────────────────┤
│  • Frontend React App ONLY               │
└──────────────────────────────────────────┘
```

---

## ✅ **Backend is ALREADY LIVE!**

Your Supabase Edge Functions are already deployed at:
```
https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049
```

Test it:
```bash
curl https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/health
```

Expected response:
```json
{"status":"ok"}
```

---

## 🚀 **OPTION 1: Vercel (RECOMMENDED - FREE)**

**Best for React/Vite apps with zero configuration**

### **Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

### **Step 2: Login**
```bash
vercel login
```

### **Step 3: Deploy**
```bash
# From your project root directory
vercel
```

### **Step 4: Answer Prompts**
```
? Set up and deploy "~/costplus100-catering"? [Y/n] Y
? Which scope? Your Account
? Link to existing project? [y/N] N
? What's your project's name? costplus100-catering
? In which directory is your code located? ./
? Want to modify these settings? [y/N] N
```

### **Step 5: Production Deploy**
```bash
vercel --prod
```

### **✅ Done!**
Your site will be live at:
```
https://costplus100-catering.vercel.app
```

Or your custom domain (configured in Vercel dashboard)

---

### **🎯 Vercel Configuration (Auto-detected)**

Vercel will automatically detect:
- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node Version:** 18.x

---

## 🚀 **OPTION 2: Netlify (ALSO FREE)**

### **Step 1: Install Netlify CLI**
```bash
npm install -g netlify-cli
```

### **Step 2: Login**
```bash
netlify login
```

### **Step 3: Initialize**
```bash
netlify init
```

### **Step 4: Configure**
```
? What would you like to do? Create & configure a new site
? Team: Your Team
? Site name: costplus100-catering
? Build command: npm run build
? Directory to deploy: dist
```

### **Step 5: Deploy**
```bash
netlify deploy --prod
```

### **✅ Done!**
```
https://costplus100-catering.netlify.app
```

---

## 🚀 **OPTION 3: Traditional Web Host (cPanel/VPS)**

**If you already have a hosting provider with cPanel or VPS**

### **Step 1: Build Locally**
```bash
# In your project directory
npm install
npm run build
```

This creates a `dist` folder with your production files.

### **Step 2: Upload Files**

**Upload ONLY the contents of the `dist` folder:**

```
dist/
├── index.html          ← Upload these
├── assets/
│   ├── index-abc123.js
│   └── index-def456.css
└── ...
```

**DO NOT upload:**
- ❌ `node_modules/`
- ❌ `src/`
- ❌ `package.json`
- ❌ `.git/`
- ❌ `supabase/` (already deployed separately)

### **Step 3: Configure Web Server**

#### **For Apache (.htaccess)**

Create `.htaccess` in your public folder:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

#### **For Nginx**

Add to your nginx config:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### **Step 4: Point Domain**

In your domain registrar (Namecheap, GoDaddy, etc.):
- Point A record to your server IP
- Wait 1-24 hours for DNS propagation

---

## 🔐 **SSL Certificate (HTTPS)**

### **Vercel/Netlify:**
✅ Automatic HTTPS - no configuration needed!

### **Traditional Host:**
1. Use Let's Encrypt (free)
2. Enable in cPanel → SSL/TLS
3. Or use Cloudflare (free tier)

---

## ⚙️ **Environment Variables (Optional)**

If you want to use different Supabase projects for dev/prod:

### **Vercel:**
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### **Netlify:**
```
Site settings → Environment variables → Add variables
```

Then update your code to use:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-key';
```

---

## 🔍 **Testing Your Deployment**

### **1. Check Homepage**
```
https://your-domain.com
```

### **2. Check API Connection**
Open browser console:
```javascript
fetch('https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/health')
  .then(r => r.json())
  .then(console.log)
```

### **3. Check Products**
```
https://your-domain.com/products
```

### **4. Check Admin Panel**
```
https://your-domain.com/admin
```

### **5. Test Checkout**
Add item to cart → Proceed to checkout → Test payment

---

## 🚨 **Common Issues & Fixes**

### **Issue 1: Blank Page After Deploy**

**Cause:** Base path incorrect

**Fix:** Check `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/', // Should be '/' for custom domain
  // If deploying to subdirectory: base: '/subdirectory/'
})
```

---

### **Issue 2: 404 on Page Refresh**

**Cause:** Server not configured for SPA

**Fix:**
- **Vercel/Netlify:** Create `vercel.json` or `netlify.toml`
- **Apache:** Add `.htaccess` (see above)
- **Nginx:** Configure `try_files` (see above)

---

### **Issue 3: API Calls Failing**

**Cause:** CORS or incorrect API URL

**Fix:** Check browser console for errors
- Ensure using correct Supabase URL
- Check CORS settings in Edge Function (already configured)

---

### **Issue 4: Images Not Loading**

**Cause:** Absolute paths vs relative paths

**Fix:** Ensure images use:
```typescript
import logo from './assets/logo.png'
// NOT: src="/assets/logo.png"
```

---

## 📁 **Vercel Configuration File (Optional)**

Create `vercel.json` in project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 📁 **Netlify Configuration File (Optional)**

Create `netlify.toml` in project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

---

## 🌐 **Custom Domain Setup**

### **Vercel:**
1. Go to Project Settings → Domains
2. Add your domain: `www.costplus100.com`
3. Add DNS records as instructed
4. Wait for SSL certificate (automatic)

### **Netlify:**
1. Go to Domain Settings → Add custom domain
2. Follow DNS configuration steps
3. Enable HTTPS (automatic)

---

## 📊 **Performance Optimization**

### **Already Optimized:**
✅ Code splitting (Vite)
✅ Lazy loading (React Router)
✅ Tree shaking (Vite)
✅ Compression (Vercel/Netlify auto)

### **Optional Improvements:**

1. **Add CDN:**
   - Cloudflare (free)
   - Already included with Vercel/Netlify

2. **Image Optimization:**
   - Convert to WebP format
   - Use responsive images
   - Lazy load images below fold

3. **Caching:**
   - Already configured in `vite.config.ts`
   - Headers set automatically by host

---

## 🔒 **Security Checklist**

### **Before Going Live:**

- [x] ✅ API keys stored in Supabase (not in code)
- [x] ✅ CORS configured properly
- [x] ✅ Rate limiting enabled (Supabase built-in)
- [x] ✅ Input validation on backend
- [x] ✅ SQL injection prevention (using Supabase)
- [ ] 🔲 Enable Supabase RLS (Row Level Security) - Optional
- [ ] 🔲 Set up monitoring (Sentry, LogRocket, etc.)
- [ ] 🔲 Configure backup schedule

---

## 📈 **Monitoring & Analytics**

### **Free Options:**

1. **Vercel Analytics** (Built-in)
   ```bash
   npm install @vercel/analytics
   ```

2. **Google Analytics**
   - Add tracking code to `index.html`

3. **Supabase Dashboard**
   - Monitor API usage
   - Check error logs
   - Database performance

---

## 🚀 **Quick Deploy Commands**

### **Development:**
```bash
npm run dev
```

### **Build for Production:**
```bash
npm run build
```

### **Preview Production Build:**
```bash
npm run preview
```

### **Deploy to Vercel:**
```bash
vercel --prod
```

### **Deploy to Netlify:**
```bash
netlify deploy --prod
```

---

## 📞 **Support**

### **Vercel Issues:**
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support

### **Netlify Issues:**
- Docs: https://docs.netlify.com
- Support: https://www.netlify.com/support/

### **Supabase Issues:**
- Docs: https://supabase.com/docs
- Support: https://supabase.com/dashboard/support

---

## ✅ **Final Checklist**

Before going live:

- [ ] Build locally succeeds: `npm run build`
- [ ] No console errors in production build
- [ ] All pages load correctly
- [ ] Products display properly
- [ ] Cart functionality works
- [ ] Checkout process completes
- [ ] Admin panel accessible
- [ ] eWay payment integration tested
- [ ] Email notifications working
- [ ] Mobile responsive (test on phone)
- [ ] SSL certificate active (HTTPS)
- [ ] Custom domain configured (if applicable)
- [ ] Favicon and metadata set
- [ ] SEO tags present
- [ ] Analytics tracking active

---

## 🎉 **You're Ready to Deploy!**

**Recommended for beginners:**
```bash
npm install -g vercel
vercel login
vercel --prod
```

**That's it!** Your site will be live in 2-3 minutes! 🚀

---

## 💡 **Pro Tips**

1. **Use Vercel/Netlify** - They're free and handle everything automatically
2. **Don't upload node_modules** - Only upload the built `dist` folder
3. **Test locally first** - Run `npm run build && npm run preview`
4. **Keep Supabase keys secure** - Never commit them to GitHub
5. **Use environment variables** - For different dev/prod environments
6. **Enable HTTPS** - Always (automatic on Vercel/Netlify)
7. **Set up monitoring** - Catch errors before users report them
8. **Regular backups** - Export database weekly

---

## 🎯 **Summary**

**What's Deployed:**
- ✅ Backend API → Already on Supabase
- ✅ Database → Already on Supabase
- 🎯 Frontend → You need to deploy (Vercel recommended)

**How Long:**
- First time: 10-15 minutes
- Subsequent deploys: 2-3 minutes

**Cost:**
- Vercel/Netlify: FREE (hobby tier)
- Supabase: FREE (up to certain limits)
- Total: $0/month for small/medium traffic

---

**Need help? Check the troubleshooting section or reach out to platform support!** 🚀
