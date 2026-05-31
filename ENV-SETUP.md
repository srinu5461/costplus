# 🔐 Environment Variables Setup Guide

This guide explains how to configure environment variables for the Costplus100 platform.

---

## 📋 Overview

The application uses **two separate environments** for secrets:

1. **Frontend Environment** (.env file) - For browser-side configuration
2. **Backend Environment** (Supabase Secrets) - For server-side secrets

---

## 🌐 Frontend Environment Variables (.env)

### What Goes Here?
Only **non-sensitive, public** configuration that's safe to expose in the browser.

### File Location
`/.env` (in the root of your project)

### Required Variables

```bash
# Supabase Configuration (Public)
VITE_SUPABASE_URL=https://bqtzxoteoucvioxqgfpc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjYwMDIsImV4cCI6MjA4ODM0MjAwMn0.WtWmz2qJ2NNMx7LHnkrYnJqR9b8cC-IDTVyKaWs9Ta4
VITE_SUPABASE_PROJECT_ID=bqtzxoteoucvioxqgfpc
```

### ⚠️ Important Rules

1. **Must start with `VITE_`** - Vite only exposes variables with this prefix
2. **Never commit `.env`** - Already in `.gitignore`
3. **Anon key is safe** - It's designed to be public (has limited permissions)
4. **No backend secrets** - SMTP passwords, payment keys, etc. go elsewhere

### How to Create

**Option 1: Copy from .env.example**
```bash
cp .env.example .env
# Then edit .env with your values
```

**Option 2: I've already created .env for you!**
Your `.env` file is ready to use with the correct values.

---

## 🔒 Backend Environment Variables (Supabase Secrets)

### What Goes Here?
**Sensitive secrets** that should never be exposed to the browser:
- SMTP passwords
- Payment gateway secrets
- API keys
- Service role keys

### How to Set Them

Use the Supabase CLI:

```bash
supabase secrets set SECRET_NAME=value --project-ref bqtzxoteoucvioxqgfpc
```

### Required Backend Secrets

#### 1️⃣ SMTP Email Configuration

```bash
supabase secrets set SMTP_HOST=smtp.office365.com --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set SMTP_PORT=587 --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set SMTP_USER=admin@costplus100.com.au --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set SMTP_PASSWORD=your_actual_password --project-ref bqtzxoteoucvioxqgfpc
```

**Common SMTP Settings:**

| Provider | Host | Port | Security |
|----------|------|------|----------|
| Office365 | smtp.office365.com | 587 | STARTTLS |
| Gmail | smtp.gmail.com | 587 | STARTTLS |
| Outlook | smtp-mail.outlook.com | 587 | STARTTLS |
| SendGrid | smtp.sendgrid.net | 587 | STARTTLS |

#### 2️⃣ PayPal Payment Gateway

```bash
# Sandbox (for testing)
supabase secrets set PAYPAL_CLIENT_ID=your_sandbox_client_id --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set PAYPAL_CLIENT_SECRET=your_sandbox_secret --project-ref bqtzxoteoucvioxqgfpc

# Production (when going live)
supabase secrets set PAYPAL_CLIENT_ID=your_live_client_id --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set PAYPAL_CLIENT_SECRET=your_live_secret --project-ref bqtzxoteoucvioxqgfpc
```

**Get PayPal Credentials:**
1. Go to https://developer.paypal.com
2. Create/login to your account
3. Create a sandbox app (for testing)
4. Create a live app (for production)
5. Copy Client ID and Secret

#### 3️⃣ eWay Payment Gateway (Australian)

```bash
# Sandbox (for testing)
supabase secrets set EWAY_API_KEY=your_sandbox_api_key --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set EWAY_API_PASSWORD=your_sandbox_password --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set EWAY_PUBLIC_API_KEY=your_sandbox_public_key --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set EWAY_SANDBOX=true --project-ref bqtzxoteoucvioxqgfpc

# Production (when going live)
supabase secrets set EWAY_API_KEY=your_live_api_key --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set EWAY_API_PASSWORD=your_live_password --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set EWAY_PUBLIC_API_KEY=your_live_public_key --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set EWAY_SANDBOX=false --project-ref bqtzxoteoucvioxqgfpc
```

**Get eWay Credentials:**
1. Go to https://www.eway.com.au
2. Sign up for an account
3. Get sandbox credentials for testing
4. Get production credentials for live

#### 4️⃣ Supabase Internal (Auto-configured)

These are usually auto-configured, but you can set them manually if needed:

```bash
supabase secrets set SUPABASE_URL=https://bqtzxoteoucvioxqgfpc.supabase.co --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set SUPABASE_ANON_KEY=your_anon_key --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key --project-ref bqtzxoteoucvioxqgfpc
```

---

## 📋 Complete Setup Checklist

### ✅ Step 1: Frontend Environment (.env)

```bash
# Check if .env exists
ls -la .env

# If not, create it (I've already done this for you!)
# Content:
# VITE_SUPABASE_URL=https://bqtzxoteoucvioxqgfpc.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# VITE_SUPABASE_PROJECT_ID=bqtzxoteoucvioxqgfpc
```

### ✅ Step 2: Backend Secrets (Supabase)

```bash
# 1. Login to Supabase
supabase login

# 2. Link your project
supabase link --project-ref bqtzxoteoucvioxqgfpc

# 3. Set SMTP secrets (for email)
supabase secrets set SMTP_HOST=smtp.office365.com --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set SMTP_PORT=587 --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set SMTP_USER=admin@costplus100.com.au --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set SMTP_PASSWORD=your_password --project-ref bqtzxoteoucvioxqgfpc

# 4. Set PayPal secrets (optional)
supabase secrets set PAYPAL_CLIENT_ID=your_client_id --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set PAYPAL_CLIENT_SECRET=your_secret --project-ref bqtzxoteoucvioxqgfpc

# 5. Set eWay secrets (optional)
supabase secrets set EWAY_API_KEY=your_key --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set EWAY_API_PASSWORD=your_password --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set EWAY_PUBLIC_API_KEY=your_public_key --project-ref bqtzxoteoucvioxqgfpc
supabase secrets set EWAY_SANDBOX=true --project-ref bqtzxoteoucvioxqgfpc
```

### ✅ Step 3: Verify Setup

```bash
# List all secrets (values hidden)
supabase secrets list --project-ref bqtzxoteoucvioxqgfpc

# You should see:
# - SMTP_HOST
# - SMTP_PORT
# - SMTP_USER
# - SMTP_PASSWORD
# - PAYPAL_CLIENT_ID (if set)
# - PAYPAL_CLIENT_SECRET (if set)
# - EWAY_API_KEY (if set)
# - etc.
```

### ✅ Step 4: Deploy Backend

```bash
# Deploy Edge Functions with new secrets
supabase functions deploy make-server-d1fbc049 --project-ref bqtzxoteoucvioxqgfpc
```

### ✅ Step 5: Test

```bash
# Start dev server
pnpm dev

# Test in browser:
# 1. Go to http://localhost:5173/admin/email-settings
# 2. Test SMTP connection
# 3. Send test email
```

---

## 🔍 How to Get Your Credentials

### Supabase Credentials

**Already provided in your .env file!**

But if you need to find them:
1. Go to https://app.supabase.com
2. Select your project: `bqtzxoteoucvioxqgfpc`
3. Go to Settings → API
4. Copy:
   - Project URL
   - Anon public key

### SMTP Email Credentials

**Office365/Outlook:**
1. Use your Office365 email: `admin@costplus100.com.au`
2. Password: Your Office365 password
3. Host: `smtp.office365.com`
4. Port: `587`

**Gmail:**
1. Enable "Less secure app access" OR
2. Create an "App Password":
   - Google Account → Security → 2-Step Verification → App passwords
3. Host: `smtp.gmail.com`
4. Port: `587`

### PayPal Credentials

**Sandbox (Testing):**
1. Go to https://developer.paypal.com
2. Log in
3. Dashboard → My Apps & Credentials
4. Sandbox → Create App
5. Copy Client ID and Secret

**Production:**
1. Same as sandbox
2. Switch to "Live" tab
3. Create app and copy credentials

### eWay Credentials

**Sandbox (Testing):**
1. Go to https://www.eway.com.au
2. Sign up for sandbox account
3. Go to My Account → API Keys
4. Copy API Key, Password, and Public API Key

**Production:**
1. Apply for live account
2. Get API credentials from your account

---

## 🚨 Security Best Practices

### ✅ DO:
- Use `.env` for frontend config (VITE_ variables)
- Use Supabase secrets for backend credentials
- Keep `.env` in `.gitignore`
- Use different credentials for development vs production
- Rotate secrets regularly
- Use sandbox/test modes during development

### ❌ DON'T:
- Commit `.env` to Git
- Put backend secrets in `.env`
- Share secrets in Slack/email
- Use production credentials for testing
- Hardcode secrets in source code
- Expose service role key to frontend

---

## 🐛 Troubleshooting

### Issue: Frontend can't connect to Supabase

**Check:**
```bash
# Verify .env exists and has correct values
cat .env

# Make sure variables start with VITE_
grep VITE_ .env

# Restart dev server (required after .env changes)
pnpm dev
```

### Issue: Backend secrets not working

**Check:**
```bash
# List secrets
supabase secrets list --project-ref bqtzxoteoucvioxqgfpc

# Verify secret was set
# If not listed, set it again

# Redeploy Edge Function (required after setting secrets)
supabase functions deploy make-server-d1fbc049 --project-ref bqtzxoteoucvioxqgfpc
```

### Issue: Email not sending

**Check:**
```bash
# 1. Verify SMTP secrets are set
supabase secrets list --project-ref bqtzxoteoucvioxqgfpc

# 2. Test SMTP connection in admin panel
# http://localhost:5173/admin/email-settings

# 3. Check Edge Function logs
supabase functions logs make-server-d1fbc049 --project-ref bqtzxoteoucvioxqgfpc
```

### Issue: Payment gateway not working

**Check:**
```bash
# 1. Verify payment secrets are set
supabase secrets list --project-ref bqtzxoteoucvioxqgfpc

# 2. Verify sandbox mode is enabled for testing
# EWAY_SANDBOX=true

# 3. Check browser console for errors (F12)
```

---

## 📝 Quick Reference

### Frontend Variables (in .env)
```bash
VITE_SUPABASE_URL=https://bqtzxoteoucvioxqgfpc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_SUPABASE_PROJECT_ID=bqtzxoteoucvioxqgfpc
```

### Backend Secrets (via Supabase CLI)
```bash
# Set a secret
supabase secrets set NAME=value --project-ref bqtzxoteoucvioxqgfpc

# List secrets
supabase secrets list --project-ref bqtzxoteoucvioxqgfpc

# Unset a secret
supabase secrets unset NAME --project-ref bqtzxoteoucvioxqgfpc
```

---

## ✅ Your Setup Status

**Frontend Environment:**
✅ `.env` file created with correct Supabase credentials

**Backend Secrets:**
⚠️ Need to be configured by you:
- [ ] SMTP credentials
- [ ] PayPal credentials (optional)
- [ ] eWay credentials (optional)

**Next Steps:**
1. Start the dev server: `pnpm dev`
2. Login to admin: http://localhost:5173/admin/login
3. Configure email: http://localhost:5173/admin/email-settings
4. Test email connection

---

**Need help?** Check the other documentation files:
- `LOCALHOST-SETUP.md` - Complete setup guide
- `COMMANDS.md` - Command reference
- `README.md` - Full documentation
