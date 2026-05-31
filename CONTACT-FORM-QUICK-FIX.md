# ❌ "Message Sending Failed" - Quick Fix Guide

## What You're Seeing:
- Red error message: "Failed to send message. Please try again."
- Message not sending

---

## 🎯 Quick Fix (Most Likely):

### **The SMTP Password is probably wrong or not set**

**Fix it in 3 steps:**

1. **Go to Email Settings:**
   ```
   Admin Panel → Email Settings
   ```

2. **Re-enter your SMTP password:**
   - Delete current password
   - Type it fresh (don't copy-paste)
   - For Office365: May need app-specific password

3. **Test & Save:**
   - Click "Test Connection"
   - If ✅ green success: Click "Save Settings"
   - If ❌ red error: Check password again

---

## 🔍 How to Debug:

### **Step 1: Open Browser Console**
1. Press **F12** in browser
2. Go to **Console** tab
3. Try submitting contact form again
4. Look for these messages:

```javascript
// You should see:
Sending contact form to backend...
Response status: 200          ← Should be 200!
Response data: {...}           ← Check for errors

// If you see Response status: 500 or 400, there's a problem
```

### **Step 2: Check What Error You're Getting**

Look at the **"Response data"** in console:

**If you see:**
```json
{
  "error": "All fields are required"
}
```
**Fix:** Fill in all form fields

---

**If you see:**
```json
{
  "note": "Email notification pending SMTP configuration"
}
```
**Fix:** Configure SMTP settings (see Step 3 below)

---

**If you see:**
```json
{
  "note": "Submission stored successfully"
}
```
**Fix:** SMTP password is wrong or SMTP settings incorrect

---

**If you see:**
```json
{
  "error": "Server error processing contact form",
  "details": "..."
}
```
**Fix:** Check Supabase Edge Function logs for detailed error

---

### **Step 3: Verify SMTP Settings**

Go to **Admin → Email Diagnostics** and check:

**SMTP Configuration:**
- ✅ SMTP Host: Should show your host (e.g., `smtp.office365.com`)
- ✅ SMTP Port: Should show 587 or 465
- ✅ SMTP User: Should show your email
- ✅ SMTP Password: Should show `••••••••`

**If any show "Not configured":**
1. Go to Email Settings
2. Fill them in
3. Test connection
4. Save

---

### **Step 4: Set Support Email**

Go to **Admin → Company Settings**:
1. Scroll to **"Support Email"** field
2. Enter email where you want to receive messages
   - Example: `support@costplus100.com.au`
   - Example: `yourname@costplus100.com.au`
3. Click **"Save Company Information"**

---

### **Step 5: Test Again**

Go to **Admin → Email Diagnostics**:
1. Click **"Send Test Email"**
2. Wait 1-2 minutes
3. Check inbox
4. Check spam folder

---

## 🔧 Office365 Specific Issues

### **If using Office365/Outlook.com:**

**Problem:** "Authentication failed" or "Invalid credentials"

**Solution:** You may need an **app-specific password**:

1. Go to: https://account.microsoft.com/security
2. Click **"Advanced security options"**
3. Under **"App passwords"**, click **"Create a new app password"**
4. Copy the generated password
5. Use THIS password in Email Settings (not your regular password)

**Settings for Office365:**
- Host: `smtp.office365.com`
- Port: `587`
- User: Your Office365 email
- Password: App-specific password (if enabled) or regular password

---

## 🎯 Most Common Solutions (Try These First):

### **Solution 1: Reset SMTP Password** ⭐ **MOST COMMON**
1. Email Settings → Delete password
2. Type it fresh (carefully!)
3. Test connection
4. Save

### **Solution 2: Set Support Email**
1. Company Settings → Support Email
2. Enter email address
3. Save

### **Solution 3: Check Spam**
1. Go to support email inbox
2. Check spam/junk folder
3. If email is there, mark as "Not Spam"
4. Add sender to contacts

---

## 📞 What Happens When It Works:

**User Experience:**
1. User fills form
2. Clicks "Send Message"
3. Sees green success: "Thank you for your message..."
4. Form clears

**Your Experience:**
1. Email arrives at support inbox
2. Subject: "Contact Form: [Their Subject]"
3. Body shows all their info
4. You hit "Reply" to respond
5. Reply goes directly to customer

---

## 🚀 Final Checklist

Before testing, make sure:

1. [ ] SMTP settings configured and tested
2. [ ] Support email set in Company Settings
3. [ ] Browser console open (F12)
4. [ ] Ready to check spam folder
5. [ ] Server is running (`pnpm dev` for localhost)

**Then:**
1. Fill in contact form
2. Submit
3. Check console for errors
4. Wait 1-2 minutes
5. Check support email (and spam folder)

---

## ✅ Success!

**You'll know it worked when:**
- ✅ Green success message appears
- ✅ Console shows "Response status: 200"
- ✅ Email arrives in support inbox
- ✅ Can reply directly to customer

---

## 🆘 Still Not Working?

Try this diagnostic:

1. **Email Diagnostics page:**
   ```
   /admin/email-diagnostics
   ```

2. **Send test email:**
   - Click button
   - Check result
   - Read error messages carefully

3. **Check environment variables:**
   - Make sure `SMTP_PASSWORD` is set
   - Make sure `SMTP_USER` matches Email Settings
   - Make sure `SMTP_HOST` matches Email Settings
   - Make sure `SMTP_PORT` matches Email Settings

4. **Contact Supabase:**
   - Check if Edge Functions have email restrictions
   - Check if nodemailer is blocked

---

**Last resort:** Create a new test email account (Gmail, Outlook) and use that for testing to rule out email server issues.
