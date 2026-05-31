# eWay Payment Gateway: Sandbox to Production Migration Guide

This guide explains how to switch your eWay payment gateway from sandbox (test) mode to production (live) mode.

## 🎯 Overview

The payment system supports two modes:
- **Sandbox Mode**: For testing with test credit cards (no real charges)
- **Production Mode**: For processing real payments from customers

## ⚠️ Important: What Changes Between Sandbox and Production

### Sandbox Mode
- Uses test eWay credentials
- Test credit card numbers work
- No real money is charged
- URL: `https://secure-au.sandbox.ewaypayments.com`

### Production Mode
- Uses live eWay credentials  
- Only real credit cards work
- Real money is charged to customers
- URL: `https://secure.ewaypayments.com`

---

## 📋 Prerequisites

Before switching to production, ensure you have:

1. ✅ **Live eWay Account**: A production eWay account (not sandbox)
2. ✅ **Production API Credentials**:
   - Production API Key
   - Production API Password
   - Production Public API Key
3. ✅ **Testing Complete**: All payment flows tested thoroughly in sandbox mode
4. ✅ **Business Ready**: Your business is ready to accept real payments

---

## 🚀 Step-by-Step Migration Process

### Step 1: Get Production eWay Credentials

1. Log in to your **production** eWay account at [myeway.com.au](https://myeway.com.au)
2. Navigate to **My Account** → **API Keys**
3. Generate or retrieve your **production** API credentials:
   - API Key
   - API Password  
   - Public API Key (also called Publishable API Key)
4. **Save these securely** - you'll need them for Supabase

⚠️ **Warning**: Keep production credentials private and secure. Never commit them to git.

---

### Step 2: Update Supabase Environment Variables

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Environment Variables**
3. Update the following environment variables with your **production** values:

   ```
   EWAY_API_KEY=your_production_api_key
   EWAY_API_PASSWORD=your_production_api_password
   EWAY_PUBLIC_API_KEY=your_production_public_api_key
   EWAY_SANDBOX=false
   ```

4. **Important**: Set `EWAY_SANDBOX=false` to enable production mode
5. Click **Save** to apply changes

⏱️ **Note**: Edge function environment variables may take 1-2 minutes to update.

---

### Step 3: Toggle Production Mode in Admin Panel

**This is the recommended method for switching modes after initial setup.**

1. Log in to your admin panel
2. Navigate to **Admin** → **Payment Settings**
3. Find the **eWay Payment Gateway** section
4. Locate the **Sandbox Mode** toggle under eWay settings
5. **Turn OFF** the Sandbox Mode toggle
6. You should see a green message: "✓ Production Mode Active: Using live eWay environment"
7. Click **Save Payment Settings**

✅ **Benefits of using Admin Panel**:
- No need to redeploy
- Instant switching between modes
- Visual confirmation of current mode
- Easier for non-technical users

---

### Step 4: Verify the Switch

#### Backend Verification

Check your Edge Function logs:
```bash
# In Supabase dashboard: Edge Functions → Logs
# Look for:
"Using eWay sandbox mode from database: false"
```

#### Frontend Verification

1. Open your website checkout page
2. Open browser Developer Tools (F12) → Console tab
3. Look for log message:
   ```
   eWay Sandbox Mode: false
   eWay button loaded: { sandboxMode: false }
   ```
4. The eWay payment button should load from:
   ```
   https://secure.ewaypayments.com/scripts/eCrypt.js
   ```
   (NOT the sandbox URL)

---

### Step 5: Test with Real Payment (Small Amount)

⚠️ **Critical**: Test with a small real payment first

1. Create a test order for a small amount (e.g., $1.00)
2. Use a **real credit card** (test cards won't work in production)
3. Complete the full checkout process
4. Verify the payment appears in:
   - Your eWay dashboard at [myeway.com.au](https://myeway.com.au)
   - Your admin orders panel
   - Customer receives confirmation email

**What to check:**
- ✅ Payment processes successfully
- ✅ Order is created in admin panel
- ✅ Transaction appears in eWay dashboard
- ✅ Customer email is sent
- ✅ Payment amount matches order total
- ✅ No errors in browser console or server logs

---

## 🔄 Switching Back to Sandbox (For Testing)

If you need to switch back to sandbox mode:

### Option 1: Admin Panel (Recommended)
1. Go to **Admin** → **Payment Settings**
2. Turn **ON** the Sandbox Mode toggle under eWay
3. Click **Save Payment Settings**

### Option 2: Supabase Environment Variables
1. Set `EWAY_SANDBOX=true` in Supabase environment variables
2. Redeploy or wait for changes to propagate

---

## 🛡️ Security Best Practices

### Production Credentials
- ✅ Store in Supabase environment variables only
- ✅ Never commit to git repositories
- ✅ Use different credentials for sandbox vs production
- ✅ Rotate credentials periodically
- ✅ Restrict access to production dashboard

### Testing
- ✅ Always test in sandbox first
- ✅ Never test with real customer data in sandbox
- ✅ Use small amounts for initial production tests
- ✅ Monitor transactions closely after going live

---

## 📊 Environment Comparison Table

| Feature | Sandbox | Production |
|---------|---------|------------|
| Real Charges | ❌ No | ✅ Yes |
| Test Cards | ✅ Work | ❌ Don't work |
| Real Cards | ⚠️ May work but not charged | ✅ Work and charge |
| Dashboard URL | sandbox.ewaypayments.com | myeway.com.au |
| Script URL | secure-au.sandbox.ewaypayments.com | secure.ewaypayments.com |
| Credentials | Sandbox API keys | Production API keys |

---

## 🐛 Troubleshooting

### Payment button not loading
**Symptom**: eWay payment button doesn't appear on checkout page

**Solutions**:
1. Check browser console for errors
2. Verify `EWAY_PUBLIC_API_KEY` is set correctly in Supabase
3. Ensure you're using production public key (not sandbox)
4. Check Edge Function logs for configuration errors

---

### "Invalid API Key" Error
**Symptom**: Payment fails with "Invalid API Key" or authentication error

**Solutions**:
1. Verify you're using **production** credentials (not sandbox)
2. Check credentials are saved correctly in Supabase
3. Ensure no extra spaces in environment variable values
4. Wait 2-3 minutes after saving credentials for propagation

---

### Payment succeeds but order not created
**Symptom**: Payment goes through but no order in admin panel

**Solutions**:
1. Check Edge Function logs for `/eway/store-order` endpoint errors
2. Verify database permissions
3. Check customer email was sent (email queue might be backed up)
4. Look for order in eWay dashboard to confirm payment was captured

---

### Wrong mode being used
**Symptom**: Admin panel shows production but sandbox is still being used

**Solutions**:
1. Clear browser cache and refresh
2. Check database: payment_settings → ewaySandboxMode value
3. Verify Edge Function is reading from database (check logs)
4. As fallback, set EWAY_SANDBOX environment variable

---

## 📞 Support Resources

- **eWay Support**: [support.eway.com.au](https://support.eway.com.au)
- **eWay Documentation**: [eway.io/api-v3](https://eway.io/api-v3)
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)

---

## ✅ Pre-Launch Checklist

Before going live with production payments:

- [ ] Production eWay account created and verified
- [ ] Business bank account linked to eWay
- [ ] Production API credentials generated
- [ ] Credentials added to Supabase environment variables
- [ ] Sandbox mode toggled OFF in admin panel
- [ ] Test payment completed successfully with real card
- [ ] Transaction appears in production eWay dashboard
- [ ] Order created in admin panel
- [ ] Customer confirmation email sent
- [ ] Payment amount matches order total (including GST + shipping)
- [ ] All team members aware of go-live
- [ ] Support process ready for customer payment issues
- [ ] Refund process tested and documented
- [ ] SSL certificate valid and active
- [ ] Terms & conditions and refund policy updated
- [ ] Privacy policy includes payment processing disclosure

---

## 🎓 Summary

**Quick Reference**:

1. **Get production credentials** from myeway.com.au
2. **Add to Supabase** environment variables
3. **Toggle OFF sandbox mode** in Admin → Payment Settings
4. **Test with $1 payment** using real card
5. **Monitor closely** for first few transactions
6. **Keep sandbox available** for future testing

**Remember**: You can switch between modes anytime using the admin panel toggle!

---

*Last Updated: 2026-05-02*
