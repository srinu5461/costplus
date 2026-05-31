# 🚀 Deployment Guide

This guide covers deploying the Costplus100 e-commerce platform to production.

## Prerequisites

Before deploying, ensure you have:
- ✅ Tested application locally
- ✅ Supabase project configured
- ✅ Production payment gateway credentials
- ✅ Production SMTP credentials
- ✅ Domain name (optional)

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel provides excellent React/Vite hosting with automatic deployments.

#### 1. Install Vercel CLI

```bash
npm install -g vercel
```

#### 2. Build the Project

```bash
pnpm build
```

#### 3. Deploy to Vercel

```bash
vercel --prod
```

#### 4. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

#### 5. Configure Custom Domain (Optional)

Vercel Dashboard → Domains → Add Domain

---

### Option 2: Netlify

#### 1. Install Netlify CLI

```bash
npm install -g netlify-cli
```

#### 2. Build the Project

```bash
pnpm build
```

#### 3. Deploy to Netlify

```bash
netlify deploy --prod --dir=dist
```

#### 4. Configure Build Settings

Create `netlify.toml`:

```toml
[build]
  command = "pnpm build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 5. Set Environment Variables

Netlify Dashboard → Site settings → Environment variables

---

### Option 3: Static Hosting (AWS S3, Cloudflare Pages, etc.)

#### 1. Build the Project

```bash
pnpm build
```

#### 2. Configure Routing

The `dist` folder contains your static files. Configure your hosting provider to:
- Serve `index.html` for all routes (SPA routing)
- Enable HTTPS
- Configure custom domain (optional)

#### 3. Upload Files

Upload the contents of `dist/` to your hosting provider.

---

## Supabase Edge Functions Deployment

The backend MUST be deployed to Supabase Edge Functions.

### 1. Deploy Edge Function

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_ID

# Deploy the server
supabase functions deploy make-server-d1fbc049
```

### 2. Configure Production Secrets

```bash
# Supabase (auto-configured)
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your_anon_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# SMTP Email (PRODUCTION)
supabase secrets set SMTP_HOST=smtp.office365.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=admin@costplus100.com.au
supabase secrets set SMTP_PASSWORD=your_production_password

# PayPal (PRODUCTION)
supabase secrets set PAYPAL_CLIENT_ID=your_live_client_id
supabase secrets set PAYPAL_CLIENT_SECRET=your_live_secret

# eWay (PRODUCTION)
supabase secrets set EWAY_API_KEY=your_live_api_key
supabase secrets set EWAY_API_PASSWORD=your_live_password
supabase secrets set EWAY_PUBLIC_API_KEY=your_live_public_key
supabase secrets set EWAY_SANDBOX=false  # ⚠️ IMPORTANT: Set to false
```

### 3. Verify Deployment

```bash
# Check function logs
supabase functions logs make-server-d1fbc049 --project-ref YOUR_PROJECT_ID
```

Test endpoints:
- `https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-d1fbc049/health`
- `https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-d1fbc049/email/test`

---

## Production Configuration Checklist

### 🔐 Security

- [ ] Change default admin password
- [ ] Use strong SMTP password
- [ ] Enable HTTPS on frontend
- [ ] Review Supabase RLS policies
- [ ] Enable rate limiting (if needed)
- [ ] Set up CORS properly
- [ ] Review API key security

### 💳 Payment Gateways

#### PayPal
- [ ] Switch to live credentials
- [ ] Test live payment flow
- [ ] Configure webhooks (optional)
- [ ] Set up refund process

#### eWay
- [ ] Switch to live credentials
- [ ] Set `EWAY_SANDBOX=false`
- [ ] Test live payment flow
- [ ] Configure fraud detection
- [ ] Set up refund process

### 📧 Email System

- [ ] Use production SMTP server
- [ ] Update sender email
- [ ] Test email delivery
- [ ] Check spam folder
- [ ] Configure SPF/DKIM records
- [ ] Test all email templates:
  - [ ] Order confirmation
  - [ ] Password reset
  - [ ] Test email

### 🏢 Company Settings

- [ ] Update company name
- [ ] Update ABN (real Australian Business Number)
- [ ] Update business address
- [ ] Update contact phone
- [ ] Update contact email
- [ ] Update website URL
- [ ] Update tagline

### 📊 Database

- [ ] Backup KV store
- [ ] Test data import/export
- [ ] Set up automated backups
- [ ] Monitor storage usage

### 🎨 Content

- [ ] Import all products
- [ ] Import all categories
- [ ] Configure featured products
- [ ] Set up homepage banners
- [ ] Update header/footer
- [ ] Add brand information
- [ ] Review all pages

---

## Post-Deployment Testing

### 1. Frontend Testing

Visit your production URL and test:

- [ ] Homepage loads correctly
- [ ] Product listings work
- [ ] Search and filters function
- [ ] Category navigation works
- [ ] Product details display
- [ ] Cart functionality
- [ ] Mobile responsiveness

### 2. Checkout Testing

**⚠️ Use real payment methods with small amounts:**

- [ ] Add product to cart
- [ ] Proceed to checkout
- [ ] Fill customer information
- [ ] Select PayPal payment
  - [ ] Complete payment
  - [ ] Verify charge
  - [ ] Receive confirmation email
  - [ ] Check order in admin
- [ ] Select eWay payment
  - [ ] Complete payment
  - [ ] Verify charge
  - [ ] Receive confirmation email
  - [ ] Check order in admin

### 3. Email Testing

- [ ] Send test email from admin
- [ ] Complete test order
- [ ] Receive tax invoice email
- [ ] Verify company branding
- [ ] Check ABN display
- [ ] Verify all links work
- [ ] Test password reset email

### 4. Admin Panel Testing

- [ ] Login with admin credentials
- [ ] View dashboard statistics
- [ ] Create/edit products
- [ ] Manage orders
- [ ] View customers
- [ ] Update company settings
- [ ] Update email settings
- [ ] Test maintenance mode

### 5. Customer Portal Testing

- [ ] Create new customer account
- [ ] Login to customer portal
- [ ] View order history
- [ ] Track order status
- [ ] Change password
- [ ] Test password reset flow

---

## Monitoring & Maintenance

### Set Up Monitoring

1. **Supabase Dashboard**
   - Monitor Edge Function logs
   - Check database usage
   - Review auth logs
   - Set up alerts

2. **Payment Gateway Dashboards**
   - Monitor transactions
   - Review failed payments
   - Check refunds
   - Set up notifications

3. **Email Deliverability**
   - Monitor bounce rates
   - Check spam reports
   - Review delivery logs

### Regular Maintenance

- **Daily**: Check Edge Function logs for errors
- **Weekly**: Review orders and payments
- **Monthly**: 
  - Backup database
  - Review customer feedback
  - Update product catalog
  - Check email deliverability
- **Quarterly**:
  - Review security settings
  - Update dependencies
  - Performance optimization
  - Security audit

---

## Rollback Plan

If issues occur after deployment:

### 1. Revert Frontend

**Vercel:**
```bash
# Revert to previous deployment
vercel rollback
```

**Netlify:**
- Dashboard → Deploys → Click previous deploy → Publish

### 2. Revert Edge Function

```bash
# Redeploy previous version
cd supabase/functions/server
git checkout <previous-commit>
supabase functions deploy make-server-d1fbc049
```

### 3. Restore Database

```bash
# Restore from backup
supabase db reset
```

---

## Scaling Considerations

### Database

- Supabase handles scaling automatically
- Monitor KV store size
- Consider archiving old orders
- Set up read replicas if needed

### Edge Functions

- Supabase automatically scales
- Monitor response times
- Check concurrency limits
- Review rate limiting

### Frontend

- Use CDN (Vercel/Netlify provide this)
- Enable caching headers
- Optimize images
- Minimize bundle size

---

## Support & Troubleshooting

### View Logs

**Frontend (Vercel):**
- Dashboard → Deployments → Function logs

**Backend (Supabase):**
```bash
supabase functions logs make-server-d1fbc049 --project-ref YOUR_PROJECT_ID
```

**Database (Supabase):**
- Dashboard → Database → Logs

### Common Production Issues

#### "Payment failed in production"
- Verify live credentials are set
- Check `EWAY_SANDBOX=false`
- Review payment gateway dashboard
- Check Edge Function logs

#### "Emails not being delivered"
- Verify SPF/DKIM records
- Check spam folder
- Review SMTP logs
- Test with different email providers

#### "Database connection errors"
- Check Supabase status page
- Verify connection string
- Review RLS policies
- Check firewall rules

---

## Security Best Practices

1. **Never commit secrets to Git**
   - Use Supabase secrets
   - Use environment variables
   - Review `.gitignore`

2. **Regular Updates**
   - Update dependencies monthly
   - Apply security patches immediately
   - Review Supabase security advisories

3. **Access Control**
   - Use strong admin passwords
   - Enable 2FA on Supabase account
   - Review user permissions regularly
   - Monitor failed login attempts

4. **Data Protection**
   - Backup database regularly
   - Encrypt sensitive data
   - Comply with privacy regulations
   - Implement data retention policies

---

## 🎉 Deployment Complete!

Your Costplus100 e-commerce platform is now live!

**Next Steps:**
1. Monitor logs for first 24 hours
2. Process test orders
3. Train staff on admin panel
4. Set up customer support
5. Market your store!

---

**Need Help?**
- Supabase Support: https://supabase.com/support
- Vercel Support: https://vercel.com/support
- Project Documentation: `/README.md`
