# Payment Settings & Bank Transfer Configuration Guide

## 🎯 Overview

You now have a complete Payment Settings admin panel where you can configure:

1. **Bank Transfer Details** - For customers to pay via direct deposit
2. **Company Information** - Shown on all invoices and quotations
3. **Payment Methods** - Enable/disable eWay, PayPal, and Bank Transfer

---

## 📍 How to Access

**Admin Panel Path:** `/admin/payment-settings`

**Direct Link:** Navigate to Admin Panel → **Payment Settings** (in the sidebar)

**Icon:** 💳 Credit Card icon

---

## 🏦 Bank Transfer Details Configuration

### What You Can Configure:

1. **Bank Name** (e.g., Commonwealth Bank)
2. **Account Name** (e.g., COSTPLUS100 PTY LTD)
3. **BSB Number** (e.g., 063-000)
4. **Account Number** (e.g., 1234 5678)
5. **Payment Reference Instructions** (e.g., "Please use invoice number as reference")

### Where This Appears:

✅ **Invoice Emails** - Shows in a beautiful blue box below the "PAY NOW" button
✅ **Invoice PDFs** - Will appear when PDF generation is implemented
✅ **Customer Portal** - When viewing invoices online

### Example Email Display:

```
💵 Or Pay via Bank Transfer

╔════════════════════════════════════╗
║ Bank: Commonwealth Bank            ║
║ Account Name: COSTPLUS100 PTY LTD  ║
║ BSB: 063-000                       ║
║ Account Number: 1234 5678          ║
║ Reference: INV-0001 ⚠️              ║
╚════════════════════════════════════╝

⚠️ Important: Please include the invoice number 
(INV-0001) as your payment reference to ensure 
proper allocation.
```

---

## 🏢 Company Information Configuration

### What You Can Configure:

1. **Legal Company Name** (e.g., COSTPLUS100 PTY LTD)
2. **Trading Name** (e.g., Costplus100)
3. **ABN** (e.g., 12 345 678 901)
4. **Phone** (e.g., 1300 COSTPLUS)
5. **Email** (e.g., info@costplus100.com.au)
6. **Website** (e.g., www.costplus100.com.au)
7. **Street Address** (e.g., 123 Industrial Drive)
8. **City** (e.g., Sydney)
9. **State** (NSW, VIC, QLD, SA, WA, TAS, NT, ACT)
10. **Postcode** (e.g., 2000)

### Where This Appears:

✅ **All Invoice Emails** - In the header and footer
✅ **All Quotation Emails** - In the header and footer
✅ **Invoice PDFs** - Company letterhead
✅ **Quotation PDFs** - Company letterhead

---

## 💳 Payment Methods Configuration

### Available Options:

1. **eWay Payment Gateway**
   - Credit & debit card payments
   - Instant processing
   - Toggle ON/OFF

2. **PayPal**
   - PayPal account payments
   - Instant processing
   - Toggle ON/OFF

3. **Bank Transfer**
   - Direct bank deposit
   - 1-3 business days processing
   - Toggle ON/OFF

### How It Works:

- **Enabled Methods** → Show in invoice emails and checkout page
- **Disabled Methods** → Hidden from customers
- You can enable multiple methods simultaneously

---

## 📧 How Payment Links Work in Invoices

### Customer Experience:

1. **Receives Invoice Email** with:
   - Professional TAX INVOICE header
   - Invoice details (INV-0001, QT-0001 reference)
   - Itemized product list
   - Total amount due

2. **Sees Two Payment Options:**

   **Option A: Online Payment (Instant)**
   ```
   💳 Ready to Pay?
   Click the button below to securely pay your 
   invoice online
   
   [PAY NOW - $1,234.56]
   
   Secure payment powered by eWay & PayPal
   ```

   **Option B: Bank Transfer (1-3 days)**
   ```
   💵 Or Pay via Bank Transfer
   
   Bank: Commonwealth Bank
   Account Name: COSTPLUS100 PTY LTD
   BSB: 063-000
   Account Number: 1234 5678
   Reference: INV-0001
   ```

3. **Clicks "PAY NOW" Button:**
   - Redirected to `/checkout?invoice=INV-0001&amount=1234.56`
   - Checkout page pre-filled with invoice details
   - Can pay via eWay (credit card) or PayPal
   - Payment processed instantly
   - Order created automatically
   - Invoice marked as PAID

4. **Or Makes Bank Transfer:**
   - Copies bank details from email
   - Makes transfer using invoice number as reference
   - Admin manually marks invoice as paid in system
   - Order created from paid invoice

---

## 🔄 Complete Workflow

### Admin Side:

```
1. Configure Payment Settings
   └─ Set bank details
   └─ Set company info
   └─ Enable payment methods
   
2. Create Quotation (QT-0001)
   └─ Add customer details
   └─ Add products/services
   └─ Set terms and pricing
   
3. Send Quotation Email
   └─ Customer receives professional quote
   
4. Convert to Invoice (INV-0001)
   └─ System automatically links QT-0001 ↔ INV-0001
   └─ Sends invoice email with payment options
   
5. Customer Pays
   └─ Online (instant) OR
   └─ Bank transfer (manual confirmation)
   
6. Invoice Marked as PAID
   └─ Order automatically created
   └─ Customer receives order confirmation
```

### Customer Side:

```
1. Receives Invoice Email
   ├─ Invoice Number: INV-0001
   ├─ Quotation Reference: QT-0001
   └─ Due Date: 30 days
   
2. Reviews Invoice Details
   ├─ Itemized products
   ├─ Subtotal, GST, Total
   └─ Payment instructions
   
3. Chooses Payment Method
   ├─ Option A: Click "PAY NOW" (instant)
   │   ├─ Pay via credit card (eWay)
   │   └─ Pay via PayPal
   │
   └─ Option B: Bank Transfer
       ├─ Copy bank details
       └─ Use INV-0001 as reference
       
4. Completes Payment
   └─ Receives order confirmation
```

---

## ✅ Step-by-Step Setup Guide

### Step 1: Set Your Bank Details

1. Go to **Admin Panel** → **Payment Settings**
2. Scroll to **"Bank Transfer Details"** section
3. Fill in all fields:
   - Bank Name: `Commonwealth Bank`
   - Account Name: `COSTPLUS100 PTY LTD`
   - BSB: `063-000`
   - Account Number: `1234 5678`
   - Reference Instructions: `Please use invoice number as reference`
4. Click **"Save Bank Details"**
5. ✅ Success message appears

### Step 2: Set Your Company Information

1. Scroll to **"Company Information"** section
2. Fill in all required fields:
   - Legal Company Name: `COSTPLUS100 PTY LTD`
   - Trading Name: `Costplus100`
   - ABN: `12 345 678 901`
   - Phone: `1300 COSTPLUS`
   - Email: `info@costplus100.com.au`
   - Website: `www.costplus100.com.au`
   - Address: `123 Industrial Drive`
   - City: `Sydney`
   - State: `NSW`
   - Postcode: `2000`
3. Click **"Save Company Info"**
4. ✅ Success message appears

### Step 3: Configure Payment Methods

1. Scroll to **"Payment Methods"** section
2. Toggle payment options:
   - ✅ eWay Payment Gateway (ON)
   - ✅ PayPal (ON)
   - ✅ Bank Transfer (ON)
3. Click **"Save Payment Settings"**
4. ✅ Success message appears

### Step 4: Test the System

1. Go to **Quotations** → **Create Quotation**
2. Fill in quotation details
3. Click **"Convert to Invoice"**
4. Check your email for the invoice
5. Verify:
   - ✅ Bank details appear correctly
   - ✅ "PAY NOW" button is present
   - ✅ Company info in header/footer
   - ✅ Invoice and quotation numbers display

---

## 🎨 Email Template Design

### Header Section:
```
╔═══════════════════════════════════════╗
║          TAX INVOICE                  ║
║          INV-0001                     ║
╚═══════════════════════════════════════╝
```

### Invoice Details Box (Blue):
```
┌─────────────────────────────────────┐
│ Invoice Number: INV-0001            │
│ Quotation Reference: QT-0001        │
│ Invoice Date: 30 March 2026         │
│ Due Date: 29 April 2026             │
└─────────────────────────────────────┘
```

### Payment Call-to-Action (Red):
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃      💳 Ready to Pay?              ┃
┃                                     ┃
┃   Click below to pay securely      ┃
┃                                     ┃
┃   ┌─────────────────────────┐      ┃
┃   │ PAY NOW - $1,234.56     │      ┃
┃   └─────────────────────────┘      ┃
┃                                     ┃
┃   Secure payment by eWay & PayPal  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Bank Details Box (White with Border):
```
┌─────────────────────────────────────┐
│ 💵 Or Pay via Bank Transfer         │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Bank: Commonwealth Bank         │ │
│ │ Account Name: COSTPLUS100       │ │
│ │ BSB: 063-000                    │ │
│ │ Account Number: 1234 5678       │ │
│ │ Reference: INV-0001 ⚠️           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ⚠️ Important: Include invoice number│
└─────────────────────────────────────┘
```

---

## 💡 Important Tips

### ✅ DO:
- Keep bank details accurate and up-to-date
- Use clear account names (legal entity name)
- Enable multiple payment methods for customer convenience
- Test by sending yourself an invoice
- Update company info before sending invoices

### ❌ DON'T:
- Share bank login credentials in emails
- Use personal account details for business transactions
- Forget to update ABN and legal company name
- Disable all payment methods (customers won't be able to pay)

---

## 🔧 Technical Details

### Backend Endpoints:

```
GET  /settings/bank-details      - Fetch bank details
POST /settings/bank-details      - Save bank details

GET  /settings/company-info      - Fetch company info
POST /settings/company-info      - Save company info

GET  /settings/payment-settings  - Fetch payment settings
POST /settings/payment-settings  - Save payment settings
```

### Data Storage:

All settings are stored in the KV store:
- `bank_details` - Bank account information
- `company_info` - Business details
- `payment_settings` - Payment method toggles

### Frontend Access:

The invoice email generator automatically:
1. Fetches bank details from KV store
2. Fetches company info from KV store
3. Generates payment link with invoice ID
4. Displays bank details in email template
5. Includes company info in header/footer

---

## 🚀 Next Steps

### Recommended Enhancements:

1. **PDF Generation** - Download invoices as PDF with bank details
2. **Payment Tracking** - Dashboard showing bank transfer status
3. **Payment Reminders** - Automated emails for overdue invoices
4. **Partial Payments** - Accept deposits/installments
5. **Payment Receipts** - Auto-send receipts after payment confirmed

---

## 📞 Support

If you need help configuring payment settings:

1. Check this guide first
2. Verify all required fields are filled
3. Test with a sample invoice
4. Check email logs for any errors

---

**All payment settings are now configured and ready to use!** 🎉
