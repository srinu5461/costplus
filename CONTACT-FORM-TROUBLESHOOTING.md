# 🐛 Contact Form Email - Troubleshooting Guide

## Quick Diagnostic Steps

### **Step 1: Check Browser Console (F12)**

When you submit the contact form, check the browser console for:

```
✅ Good logs:
- "Sending contact form to backend..."
- "Response status: 200"
- "Response data: {success: true, message: '...'}"

❌ Bad logs:
- "Response status: 500" (server error)
- "Response status: 400" (bad request)
- "Contact form error: ..." (error message)
```

---

### **Step 2: Check Server Logs**

Look at your Supabase Edge Function logs for:

```
✅ Good logs:
- "Contact form submission: {name: 'Test', email: '...', subject: '...'}"
- "Contact form submission stored successfully"
- "Sending contact form email to: support@..."
- "Contact form email sent successfully to: support@..."

❌ Bad logs:
- "SMTP settings not configured"
- "Email sending error: ..."
- Any authentication or connection errors
```

---

## Common Issues & Fixes

### ❌ **Issue 1: "All fields are required"**

**Cause:** Empty form fields  
**Fix:** Make sure name, email, subject, and message are all filled in

---

### ❌ **Issue 2: "Email notification pending SMTP configuration"**

**Cause:** SMTP settings not configured in database

**Fix:**
1. Go to **Admin → Email Settings**
2. Fill in:
   - SMTP Host: `smtp.office365.com` (or your provider)
   - SMTP Port: `587`
   - SMTP User: `info@costplus100.com.au`
   - SMTP Password: Your email password
3. Click **"Test Connection"**
4. If test passes, click **"Save Settings"**

---

### ❌ **Issue 3: "Submission stored successfully" but no email sent**

**Cause:** Email sending failed but form was saved

**Possible reasons:**
1. **Wrong SMTP password**
   - Re-enter password in Email Settings
   - Test connection again

2. **SMTP server blocked**
   - Try port `587` instead of `465`
   - Check if "less secure apps" needs enabling
   - For Office365: May need app-specific password

3. **Email server rate limiting**
   - Wait 1-2 minutes
   - Try again

**Check:** Go to **Admin → Email Diagnostics** to view configuration status

---

### ❌ **Issue 4: Email not arriving in inbox**

**Cause:** Email sent but not received

**Solutions:**
1. **Check spam/junk folder** ⭐ Most common!
2. **Verify support email is correct:**
   - Go to **Admin → Company Settings**
   - Check "Support Email" field
   - Make sure it's the right address
3. **Wait 2-5 minutes** (sometimes emails are delayed)
4. **Check SMTP user has sending permissions**
5. **Add sender to contacts** to prevent spam filtering

---

### ❌ **Issue 5: "Server error processing contact form"**

**Cause:** Backend exception

**Debug steps:**
1. Check Supabase Edge Function logs
2. Look for error message in console
3. Verify backend is deployed
4. Test health endpoint: `/make-server-d1fbc049/health`

---

### ❌ **Issue 6: CORS or network errors**

**Symptoms:**
- "Failed to fetch"
- "Network request failed"
- CORS policy errors

**Fix:**
1. Check internet connection
2. Verify Supabase project is running
3. Check Edge Function is deployed
4. Try redeploying the backend

---

## 🔧 Testing Checklist

Use this checklist to systematically test:

### **Backend Setup:**
- [ ] Supabase Edge Function deployed
- [ ] Health endpoint working: `/make-server-d1fbc049/health`
- [ ] Contact endpoint exists: `/make-server-d1fbc049/contact/send`

### **SMTP Configuration:**
- [ ] SMTP Host configured
- [ ] SMTP Port configured (587 or 465)
- [ ] SMTP User configured
- [ ] SMTP Password set in environment variable
- [ ] Test connection passes

### **Company Configuration:**
- [ ] Company email configured
- [ ] Support email configured ⭐ **This is where emails go!**
- [ ] Company settings saved

### **Frontend:**
- [ ] Contact form loads without errors
- [ ] Form validation works
- [ ] Submission triggers backend call
- [ ] Success/error messages display

### **Email Delivery:**
- [ ] Check spam folder
- [ ] Check support email inbox
- [ ] Wait 2-5 minutes for delivery
- [ ] Verify reply-to works

---

## 🧪 Manual Testing Steps

### **Test 1: Verify Backend**

```bash
# Test if backend is alive
curl https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/health

# Expected response: {"status":"ok"}
```

### **Test 2: Test Contact Form API Directly**

```bash
curl -X POST \
  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/contact/send \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "subject": "Test Subject",
    "message": "Test message"
  }'

# Expected response: {"success":true,"message":"Thank you..."}
```

### **Test 3: Check Email Settings in Database**

1. Go to **Admin → Email Diagnostics**
2. Check SMTP configuration status
3. Check recipient email configuration
4. Click **"Send Test Email"**
5. Wait 1-2 minutes
6. Check inbox

---

## 📊 Understanding Email Flow

```
User fills form
    ↓
Frontend validates
    ↓
POST to /contact/send
    ↓
Backend stores in KV (backup)
    ↓
Backend loads SMTP settings
    ↓
Backend loads company info
    ↓
Determines recipient:
  1. Support Email (if set) ← YOUR NEW SETTING
  2. Company Email (fallback)
  3. SMTP User (fallback)
    ↓
Creates nodemailer transport
    ↓
Sends email via SMTP
    ↓
Email arrives in inbox
```

---

## 🔍 Debug Commands

### **Check if SMTP settings are saved:**

```javascript
// In browser console on any admin page:
fetch('https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/email/smtp-settings', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjYwMDIsImV4cCI6MjA4ODM0MjAwMn0.WtWmz2qJ2NNMx7LHnkrYnJqR9b8cC-IDTVyKaWs9Ta4'
  }
}).then(r => r.json()).then(console.log)
```

### **Check if company info is saved:**

```javascript
fetch('https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/email/company-info', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjYwMDIsImV4cCI6MjA4ODM0MjAwMn0.WtWmz2qJ2NNMx7LHnkrYnJqR9b8cC-IDTVyKaWs9Ta4'
  }
}).then(r => r.json()).then(console.log)
```

---

## 🚨 Most Common Mistake

**Problem:** Email shows as sent but doesn't arrive

**Reason:** Wrong SMTP password

**Fix:**
1. Go to Email Settings
2. Delete and re-enter SMTP password (don't copy-paste)
3. Test connection
4. If it passes, try sending contact form again

---

## 💡 Quick Wins

### **If nothing works:**

1. **Start fresh:**
   - Go to Email Settings
   - Clear all fields
   - Re-enter everything manually
   - Test connection
   - Save

2. **Try different port:**
   - If using 465, try 587
   - If using 587, try 465

3. **Check support email:**
   - Go to Company Settings
   - Make sure Support Email is filled in
   - Make sure it's a valid email
   - Save

4. **Use Email Diagnostics:**
   - Go to **Admin → Email Diagnostics**
   - Review all configuration
   - Send test email
   - Check inbox

---

## ✅ Success Indicators

You know it's working when:
- ✅ Form submits without errors
- ✅ Success message appears: "Thank you for your message..."
- ✅ Browser console shows: "Response status: 200"
- ✅ Server logs show: "Contact form email sent successfully"
- ✅ Email arrives in support inbox within 1-2 minutes
- ✅ Reply-To is set to customer's email

---

## 🎯 Where to Get Help

### **Check These First:**
1. **Email Diagnostics page:** `/admin/email-diagnostics`
2. **Browser console:** F12 → Console tab
3. **Supabase logs:** Supabase Dashboard → Edge Functions → Logs
4. **Network tab:** F12 → Network tab → Look for `/contact/send` request

### **Common Error Messages:**

| Error Message | Meaning | Fix |
|---------------|---------|-----|
| "All fields are required" | Form validation failed | Fill all fields |
| "Email notification pending SMTP configuration" | SMTP not set up | Configure Email Settings |
| "Submission stored successfully" | Email failed but form saved | Check SMTP password |
| "Failed to send message" | Network/server error | Check console for details |
| "Unauthorized" | API key issue | Should not happen for contact form |

---

## 📧 Email Details

### **Current Setup:**

**From:** `{companyInfo.tradingName} <{smtpSettings.user}>`  
Example: `Costplus100 <info@costplus100.com.au>`

**To:** `{companyInfo.supportEmail || companyInfo.email || smtpSettings.user}`  
Example: `support@costplus100.com.au`

**Reply-To:** `{customer.email}`  
Example: `john@example.com`

**Subject:** `Contact Form: {customer.subject}`  
Example: `Contact Form: Product Inquiry`

---

## 🔐 Security Notes

- ✅ Contact form is public (no authentication required)
- ✅ SMTP password stored in environment variables (secure)
- ✅ All submissions stored in database (backup)
- ✅ Email content is HTML-escaped (XSS protection)
- ✅ Reply-To prevents email spoofing

---

## 📝 Next Steps

1. **Go to Email Diagnostics:**
   - Admin → Email Diagnostics
   - Check all status indicators
   - Send test email

2. **Configure Support Email:**
   - Admin → Company Settings
   - Fill in "Support Email" field
   - Save

3. **Test Contact Form:**
   - Go to Contact page
   - Fill in form
   - Submit
   - Check browser console
   - Check support email inbox

**Need more help?** Check the Email Diagnostics page in the admin panel!
