# 🚀 Deployment Guide - Costplus100 E-Commerce Platform

## Overview
This guide covers deploying the production-ready Costplus100 e-commerce application with all features including loading skeletons, error handling, security, and performance optimizations.

---

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure all required environment variables are configured in your deployment platform:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_DB_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres

# Payment Gateway (eWay)
EWAY_API_KEY=your_eway_api_key
EWAY_API_PASSWORD=your_eway_api_password
EWAY_SANDBOX=false  # Set to true for testing
EWAY_PUBLIC_API_KEY=your_eway_public_key

# Email Configuration (SMTP)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password

# AI Chatbot (OpenAI)
OPENAI_API_KEY=your_openai_api_key

# PayPal (Optional)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
```

### 2. Build Configuration
Verify your build settings:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

### 3. Static Files
Ensure these production files are in `/public`:
- ✅ `robots.txt` - Search engine instructions
- ✅ `web.config` - IIS deployment config
- ✅ `_headers` - Netlify/Vercel security headers
- ✅ `_redirects` - SPA routing for static hosts

---

## Deployment Platforms

### Option 1: Netlify (Recommended)

#### Step 1: Connect Repository
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize
netlify init
```

#### Step 2: Configure Build Settings
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "supabase/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

#### Step 3: Deploy
```bash
# Deploy to production
netlify deploy --prod

# Or use Git integration for automatic deployments
git push origin main
```

---

### Option 2: Vercel

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
vercel login
```

#### Step 2: Configure
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

#### Step 3: Deploy
```bash
vercel --prod
```

---

### Option 3: Azure Static Web Apps

#### Step 1: Create Static Web App
```bash
# Install Azure CLI
npm install -g @azure/static-web-apps-cli

# Login
az login

# Create resource
az staticwebapp create \
  --name costplus100 \
  --resource-group your-resource-group \
  --source https://github.com/your-repo \
  --location australiaeast \
  --branch main \
  --app-location "/" \
  --output-location "dist"
```

#### Step 2: Configure Routes
```json
// staticwebapp.config.json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "globalHeaders": {
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff"
  },
  "routes": [
    {
      "route": "/admin/*",
      "allowedRoles": ["admin"]
    }
  ]
}
```

---

### Option 4: AWS Amplify

#### Step 1: Install Amplify CLI
```bash
npm install -g @aws-amplify/cli
amplify configure
```

#### Step 2: Initialize
```bash
amplify init
amplify add hosting
amplify publish
```

#### Step 3: Configure Redirects
```json
// amplify.yml
version: 1
frontend:
  phases:
    build:
      commands:
        - npm ci
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

---

## Supabase Edge Functions Deployment

### Deploy Server Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy server

# Or deploy individually
supabase functions deploy make-server-d1fbc049
```

### Set Edge Function Secrets
```bash
# Set environment variables for edge functions
supabase secrets set OPENAI_API_KEY=your_key
supabase secrets set EWAY_API_KEY=your_key
supabase secrets set EWAY_API_PASSWORD=your_password
supabase secrets set SMTP_HOST=your_host
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=your_user
supabase secrets set SMTP_PASSWORD=your_password
```

---

## Post-Deployment Configuration

### 1. DNS Configuration
Point your domain to the deployment platform:

**For Netlify:**
```
CNAME: www -> [your-site].netlify.app
A: @ -> 75.2.60.5
```

**For Vercel:**
```
CNAME: www -> cname.vercel-dns.com
A: @ -> 76.76.21.21
```

### 2. SSL Certificate
- ✅ Netlify/Vercel: Automatic Let's Encrypt SSL
- ✅ Azure: Free SSL certificate included
- ✅ Custom domains: Configure in platform settings

### 3. CDN Configuration
All platforms include built-in CDN:
- Netlify: Global Edge Network
- Vercel: Edge Network (100+ locations)
- Azure: Azure CDN
- AWS: CloudFront integration

---

## Database Setup

### 1. Initialize Database Schema
```sql
-- Already exists from Supabase setup
-- Verify kv_store_d1fbc049 table exists:
SELECT * FROM kv_store_d1fbc049 LIMIT 1;
```

### 2. Upload Initial Data
```bash
# Import products via CSV through Admin Panel
# Or use API endpoint:
curl -X POST https://your-project.supabase.co/functions/v1/make-server-d1fbc049/import-csv \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@products.csv"
```

### 3. Configure Backups
```bash
# Enable automated backups in Supabase Dashboard
# Settings > Database > Enable Point-in-Time Recovery
```

---

## Security Hardening

### 1. Enable Rate Limiting
Add to `/supabase/functions/server/index.tsx`:
```typescript
import { rateLimiters } from './rate-limiter.tsx';

// Add rate limiting
app.use('/make-server-d1fbc049/auth/*', rateLimiters.auth);
app.use('/make-server-d1fbc049/api/*', rateLimiters.api);
```

### 2. Configure CORS
Already configured in server, verify:
```typescript
app.use('*', cors({
  origin: ['https://costplus100.com.au', 'https://www.costplus100.com.au'],
  credentials: true,
}));
```

### 3. Input Validation
Already implemented via `sanitizeInput()` utility

---

## Monitoring & Analytics

### 1. Setup Error Tracking (Sentry)
```bash
npm install @sentry/react

# In /src/app/App.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.PROD ? 'production' : 'development',
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
});
```

### 2. Google Analytics 4
```typescript
// Add to /src/app/App.tsx
useEffect(() => {
  if (import.meta.env.PROD) {
    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  }
}, []);
```

### 3. Uptime Monitoring
**Recommended Services:**
- UptimeRobot (Free plan available)
- Pingdom
- StatusCake

**Monitor these endpoints:**
- `https://costplus100.com.au/` (Homepage)
- `https://your-project.supabase.co/functions/v1/make-server-d1fbc049/health` (API health)

---

## Performance Optimization

### 1. Image Optimization
Already implemented via `getOptimizedImageUrl()` utility

### 2. Caching Strategy
```
Static Assets: 1 year (immutable)
Images: 1 month
HTML: No cache (must-revalidate)
API Responses: Implement cache headers
```

### 3. Loading Skeletons
✅ Already implemented for all homepage sections:
- Banner carousel skeleton
- Product section skeletons (Featured, Popular, Promotional)
- Brand carousel skeleton
- Smooth transitions from loading to content

### 4. Code Splitting
✅ Already implemented via React Router

---

## Testing Checklist

### Pre-Launch Testing
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on iOS Safari and Chrome Mobile
- [ ] Test tablet layouts (iPad, Android tablets)
- [ ] Run Lighthouse audit (target 90+ performance)
- [ ] Test slow 3G network simulation
- [ ] Test all payment flows with eWay sandbox
- [ ] Verify email delivery for all email types
- [ ] Test customer registration and login
- [ ] Test admin panel functionality
- [ ] Test product search and filtering
- [ ] Test shopping cart and checkout flow
- [ ] Test order tracking and returns
- [ ] Verify loading skeletons appear on slow connections
- [ ] Test error boundaries with forced errors
- [ ] Verify 404 pages work correctly
- [ ] Test AI chatbot responses

### SEO Testing
- [ ] Verify robots.txt is accessible
- [ ] Submit sitemap to Google Search Console
- [ ] Test Open Graph tags with Facebook debugger
- [ ] Verify structured data with Google Rich Results Test
- [ ] Check meta descriptions on all pages
- [ ] Verify canonical URLs

---

## Launch Procedure

### 1. Final Pre-Launch
```bash
# Run production build locally
npm run build
npm run preview

# Verify no console errors
# Check Network tab for failed requests
# Verify loading skeletons appear
```

### 2. Deploy to Production
```bash
# Using Netlify
netlify deploy --prod

# Or using Vercel
vercel --prod

# Or trigger via Git
git push origin main
```

### 3. Post-Launch Verification
```bash
# Test production URL
curl -I https://costplus100.com.au
curl -I https://www.costplus100.com.au

# Verify API health
curl https://your-project.supabase.co/functions/v1/make-server-d1fbc049/health
```

### 4. Monitor First 24 Hours
- Watch error tracking dashboard
- Monitor server response times
- Check analytics for traffic patterns
- Verify payment transactions work
- Monitor email delivery rates

---

## Rollback Procedure

### If Issues Arise
```bash
# Netlify
netlify rollback

# Vercel
vercel rollback

# Manual
git revert HEAD
git push origin main
```

---

## Support & Maintenance

### Regular Tasks
- **Daily:** Monitor error rates and uptime
- **Weekly:** Review analytics and user feedback
- **Monthly:** Database backups verification
- **Quarterly:** Security audit and dependency updates

### Emergency Contacts
- Hosting Platform Support
- Supabase Support: support@supabase.io
- eWay Support: support@eway.com.au
- Domain Registrar Support

---

## Success Metrics

### Performance Targets
- **Page Load Time:** < 2.5s (LCP)
- **API Response Time:** < 200ms average
- **Uptime:** 99.9%
- **Error Rate:** < 0.1%

### Business Metrics
- **Conversion Rate:** Track checkout completion
- **Cart Abandonment:** Monitor and optimize
- **Average Order Value:** Track trends
- **Customer Retention:** Track repeat purchases

---

## 🎉 Your Application is Deployed!

The Costplus100 e-commerce platform is now live with:
- ✅ Professional loading skeletons
- ✅ Global error handling
- ✅ Performance optimizations
- ✅ Security measures
- ✅ SEO configuration
- ✅ Production utilities
- ✅ Monitoring preparation

**Next Steps:**
1. Monitor error tracking dashboard
2. Watch analytics for user behavior
3. Collect customer feedback
4. Iterate and improve

**Need Help?**
- Review `/PRODUCTION-READY.md` for detailed feature documentation
- Check `/PLACEHOLDER-FIX-COMPLETE.md` for loading skeleton details
- Refer to platform-specific documentation for troubleshooting
