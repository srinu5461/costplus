# 📧 Contact Form Email Setup Guide

## ✅ What's Been Done

### 1. **Frontend: Contact Us Page**
- Location: `/src/app/pages/Contact.tsx`
- ✅ Contact form with name, email, subject, and message fields
- ✅ Sends data to backend API endpoint
- ✅ Shows success/error messages

### 2. **Backend: Email Sending**
- Location: `/supabase/functions/server/index.tsx`
- ✅ Endpoint: `POST /make-server-d1fbc049/contact/send`
- ✅ Uses configured SMTP settings from database
- ✅ Uses nodemailer to send emails
- ✅ Sends emails to **support email** address (different from SMTP sender)

### 3. **Admin Panel: Company Settings**
- Location: `/src/app/pages/admin/CompanySettings.tsx`
- ✅ Added **"Support Email"** field
- ✅ This is where contact form emails will be sent

---

## 🎯 How It Works

### **Email Flow:**

```
Customer fills form → Backend receives → Sends email using SMTP → Arrives at Support Email
```

### **Key Details:**

1. **SMTP Settings (Sender):**
   - Location: Admin → Email Settings
   - Example: `info@costplus100.com.au`
   - This is the "From" address

2. **Support Email (Recipient):**
   - Location: Admin → Company Settings
   - Example: `support@costplus100.com.au`
   - This is where contact form emails go

3. **Reply-To:**
   - Automatically set to the customer's email
   - You can hit "Reply" to respond directly to them

---

## 📋 Setup Checklist

### ✅ Step 1: Configure SMTP Settings
1. Go to: **Admin Panel → Email Settings**
2. Fill in:
   - SMTP Host (e.g., `smtp.office365.com`)
   - SMTP Port (e.g., `587`)
   - SMTP User (e.g., `info@costplus100.com.au`)
   - SMTP Password (your email password)
3. Click **"Test Connection"** to verify
4. Click **"Save Settings"**

### ✅ Step 2: Configure Support Email
1. Go to: **Admin Panel → Company Settings**
2. Find the **"Support Email"** field
3. Enter the email where you want to receive contact form messages
   - Example: `support@costplus100.com.au`
   - Example: `sales@costplus100.com.au`
   - Example: `yourname@costplus100.com.au`
4. Click **"Save Company Information"**

### ✅ Step 3: Test the Contact Form
1. Go to your website's **Contact Us** page
2. Fill in the form with test data
3. Click **"Send Message"**
4. Check the support email inbox for the message

---

## 📧 Email Features

### **What the email looks like:**

```
Subject: Contact Form: [Customer's Subject]

📨 New Contact Form Submission

From: John Smith
Email: john@example.com
Subject: Product Inquiry
Date: 27/03/2026 2:30 PM

Message:
Hi, I'm interested in your catering equipment...

---
To reply: Simply hit "Reply" to respond directly to john@example.com
```

### **Email Features:**
- ✅ Professional HTML formatting
- ✅ Costplus100 branding (dark navy header)
- ✅ All contact details clearly displayed
- ✅ Reply-To set to customer's email
- ✅ Timestamp in Australian format
- ✅ Clean, easy-to-read layout

---

## 🔧 Testing

### **Test on Localhost:**

1. **Start the server:**
   ```bash
   pnpm dev
   ```

2. **Fill in the contact form:**
   - Go to: `http://localhost:5173/contact`
   - Enter test data
   - Submit

3. **Check logs:**
   - Look in terminal for: `Contact form email sent successfully to: support@...`
   - Check browser console (F12) for any errors

4. **Check email:**
   - Wait 10-30 seconds
   - Check the support email inbox
   - Look in spam folder if not there

---

## 🎨 Customization Options

### **Change Recipient Email:**
The contact form sends emails to the **Support Email** configured in Company Settings.

**Priority order:**
1. **Support Email** (if configured) ← **RECOMMENDED**
2. Main Company Email (if support email empty)
3. SMTP User Email (fallback)

### **Change Email Template:**
Edit the email HTML in:
- File: `/supabase/functions/server/index.tsx`
- Search for: `emailHtml` in the contact form endpoint
- Customize the HTML as needed

---

## 🐛 Troubleshooting

### ❌ **"Email notification pending SMTP configuration"**
**Problem:** SMTP settings not configured  
**Solution:**
1. Go to Admin → Email Settings
2. Fill in all SMTP fields
3. Click "Test Connection"
4. Save settings

### ❌ **Email not arriving**
**Possible causes:**
1. **Wrong SMTP password**
   - Re-enter password in Email Settings
   - Test connection

2. **Email in spam folder**
   - Check spam/junk folder
   - Add sender to contacts

3. **SMTP server blocking**
   - Check SMTP host/port are correct
   - Try port 587 instead of 465
   - Check if less secure apps need enabling

4. **Support email not configured**
   - Go to Company Settings
   - Fill in Support Email field
   - Save

### ❌ **"Submission stored successfully" but no email**
**Problem:** Email sending failed but form submission saved  
**Why:** This is intentional - we don't lose customer messages  
**Solution:**
1. Check SMTP settings
2. Test connection
3. View stored submissions in admin panel (if endpoint exists)

---

## 📊 Stored Submissions

Contact form submissions are stored in the database even if email sending fails.

**Storage location:** `contact_submissions` key in KV store

**Data stored:**
- Customer name
- Customer email
- Subject
- Message
- Timestamp
- Read status

---

## 🔐 Security Notes

1. ✅ Form validation (all fields required)
2. ✅ Email validation
3. ✅ SMTP password stored securely in environment variables
4. ✅ Reply-To properly set
5. ✅ XSS protection (email content escaped)

---

## ✅ Summary

**What you have now:**
- ✅ Working contact form on `/contact` page
- ✅ Email sending using your SMTP settings
- ✅ Emails go to **support email** (configurable)
- ✅ Reply-To set to customer's email
- ✅ Professional HTML email template
- ✅ Backup storage of all submissions
- ✅ Success/error messages

**To test:**
1. Configure SMTP in Admin → Email Settings
2. Set Support Email in Admin → Company Settings
3. Submit test message on Contact page
4. Check support email inbox

**Done!** 🎉
