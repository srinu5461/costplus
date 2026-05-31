# Complete Order, Quotation, Invoice & Returns Status Flow

## 📋 Overview
This document explains the complete logical flow for all order statuses, quotations, invoices, and returns in the Costplus Catering Equipment system.

---

## 🛒 ORDER STATUS FLOW

### Order Lifecycle Statuses

1. **🕐 Pending** 
   - Initial status when order is placed
   - Payment authorization pending
   - Admin Action: Review order details

2. **⚙️ Processing**
   - Payment confirmed and received
   - Order is being prepared for shipping
   - Admin Action: Pick and pack items

3. **📦 Ready to Ship**
   - Items packed and ready for dispatch
   - Admin Action: Generate shipping labels, arrange courier

4. **🚚 Shipped**
   - Order dispatched with tracking number
   - Customer receives tracking email
   - Admin Action: Update tracking information

5. **✅ Delivered**
   - Confirmed delivery to customer
   - Admin Action: Mark as delivered based on tracking

6. **🎉 Completed**
   - Final status - customer satisfied
   - No issues reported after delivery period
   - Order archived after 30 days

7. **❌ Cancelled**
   - Order cancelled before shipping
   - Admin Action: Process cancellation, refund if paid

8. **🔄 Return Initiated**
   - Customer has requested a return (NEW STATUS)
   - Links to Returns Management system
   - Admin Action: Review return request in Returns tab

9. **💰 Refund Requested**
   - Return approved, refund processing started
   - Admin Action: Process refund through payment gateway

10. **✔️ Refunded**
    - Refund completed and funds returned
    - Final status for returned orders

---

## 📊 QUOTATION STATUS FLOW

### Quotation Lifecycle

1. **📝 Draft**
   - Initial creation in admin panel
   - Not yet sent to customer
   - Admin Action: Add items, finalize pricing

2. **📤 Sent**
   - Quotation emailed to customer
   - Awaiting customer response
   - Admin Action: Follow up after X days

3. **👀 Viewed**
   - Customer opened quotation email/link
   - Admin Action: None - awaiting customer decision

4. **✅ Accepted**
   - Customer accepted quotation
   - Admin Action: Convert to order or invoice

5. **❌ Declined**
   - Customer rejected quotation
   - Admin Action: Archive, optional follow-up

6. **⏰ Expired**
   - Quotation validity period passed
   - Admin Action: Contact customer to refresh quote

7. **🔄 Revised**
   - Quotation updated with new pricing/items
   - Admin Action: Send revised version to customer

8. **✔️ Converted**
   - Successfully converted to order/invoice
   - Final status - quotation archived

---

## 🧾 INVOICE STATUS FLOW

### Invoice Lifecycle

1. **📝 Draft**
   - Invoice created but not finalized
   - Admin Action: Review and finalize details

2. **📤 Sent**
   - Invoice emailed to customer
   - Payment terms specified
   - Admin Action: None - awaiting payment

3. **⏰ Overdue**
   - Invoice past due date
   - Admin Action: Send payment reminders

4. **💰 Partially Paid**
   - Partial payment received
   - Admin Action: Track remaining balance

5. **✅ Paid**
   - Full payment received
   - Admin Action: Generate receipt, fulfill order

6. **❌ Cancelled**
   - Invoice cancelled before payment
   - Admin Action: Send cancellation notice

7. **🔄 Refunded**
   - Payment refunded to customer
   - Admin Action: Process refund, update records

---

## 🔄 RETURNS MANAGEMENT FLOW

### Return Request Lifecycle

1. **Customer Initiates Return**
   - Location: Customer Portal → My Orders → Request Return
   - Customer provides: Reason, items to return, photos (optional)
   - System creates return request with unique Return Number (e.g., RET-20260331-001)

2. **Return Request Pending** (Status: `pending`)
   - Appears in: Admin Panel → Returns Management
   - Admin reviews: Items, reason, order history
   - Admin Action: Approve or Reject

3. **Return Approved** (Status: `approved`)
   - Order Status Updated: `return_initiated` (NEW)
   - Customer receives email with:
     - Return approval
     - Return shipping label (if applicable)
     - Instructions for returning items
   - Admin Action: Track return shipment

4. **Items Received**
   - Admin inspects returned items
   - Verifies condition matches return reason
   - Admin Action: Approve refund or reject claim

5. **Refund Processing** (Status: `refunded`)
   - Order Status Updated: `refund_requested` → `refunded`
   - Refund processed through original payment method
   - Customer receives refund confirmation email
   - Timeline: 5-10 business days

6. **Return Rejected** (Status: `rejected`)
   - Customer receives rejection email with reason
   - Order Status: Remains current status (usually `delivered`)
   - Admin Action: Optional - offer store credit or exchange

---

## 🔗 INTEGRATION BETWEEN SYSTEMS

### How They Connect

```
QUOTATION → INVOICE → ORDER → RETURN
    ↓          ↓        ↓        ↓
  Draft      Draft    Pending  Initiated
    ↓          ↓        ↓        ↓
  Sent       Sent    Processing Approved
    ↓          ↓        ↓        ↓
 Accepted    Paid     Shipped  Refunded
    ↓          ↓        ↓        
 Converted  Order    Delivered
              ↓        ↓
           Completed  Completed
```

### Key Relationships

1. **Quotation → Order**
   - Accepted quotation can be converted to order
   - Quotation items → Order items
   - Status: `converted`

2. **Invoice → Order**
   - Paid invoice creates order
   - Invoice details → Order details
   - Status: `paid` → Order status: `processing`

3. **Order → Return**
   - Delivered orders can have returns
   - Order status becomes: `return_initiated`
   - Return links to original order ID

4. **Return → Refund**
   - Approved return triggers refund
   - Order status: `refunded`
   - Return status: `refunded`

---

## 📧 EMAIL NOTIFICATIONS

### Automated Emails Sent

**Orders:**
- Order Confirmation (status: `processing`)
- Shipping Quote (for "pay later" orders)
- Shipped Notification (status: `shipped`)
- Delivery Confirmation (status: `delivered`)

**Quotations:**
- Quotation Sent (status: `sent`)
- Quotation Accepted Confirmation
- Quotation Expired Reminder

**Invoices:**
- Invoice Sent (status: `sent`)
- Payment Reminder (status: `overdue`)
- Payment Receipt (status: `paid`)

**Returns:**
- Return Request Received
- Return Approved + Shipping Label
- Return Rejected + Reason
- Refund Processed Confirmation

---

## 👨‍💼 ADMIN WORKFLOW

### Daily Tasks by Status

**Orders Manager:**
1. Review `pending` orders → Move to `processing`
2. Pack `processing` orders → Move to `ready_to_ship`
3. Ship `ready_to_ship` → Update to `shipped` + add tracking
4. Check `return_initiated` → Go to Returns tab

**Returns Manager:**
1. Review `pending` returns → Approve or Reject
2. Track `approved` returns → Wait for items
3. Inspect received items → Process refunds
4. Update order status → `refunded`

**Invoices Manager:**
1. Send `draft` invoices → Status to `sent`
2. Check `overdue` invoices → Send reminders
3. Verify `paid` invoices → Create orders

**Quotations Manager:**
1. Finalize `draft` quotations → Send to customer
2. Follow up on `sent` quotations
3. Convert `accepted` → Create invoice/order

---

## 🎯 CUSTOMER PORTAL

### What Customers See

**My Orders Tab:**
- Order Number
- Status (user-friendly labels)
- Order Date
- Total Amount
- Action Buttons:
  - View Details
  - Track Shipment (if `shipped`)
  - Request Return (if `delivered` and within return window)

**My Returns Tab:**
- Return Number
- Order Reference
- Status
- Refund Amount
- Action Buttons:
  - View Details
  - Download Return Label (if `approved`)

---

## ⚠️ IMPORTANT NOTES

### Return Window
- Returns accepted within **30 days** of delivery
- Exceptions can be made by admin

### Refund Processing
- Refunds to original payment method
- Timeline: 5-10 business days
- eWay refunds are automated

### Status Transitions
- Some transitions are automatic (e.g., payment confirmed → `processing`)
- Others require admin action (e.g., `return_initiated` → `refunded`)

### Reporting
- All status changes are logged with timestamp
- Available in: Admin → Reports → Advanced Reports
- Filter by status, date range, customer

---

## 🚀 IMPLEMENTATION STATUS

✅ **Implemented:**
- All order statuses (including new `return_initiated`)
- Complete returns management system
- Quotation and Invoice lifecycle
- Email notifications for all stages
- Customer portal with orders and returns

✅ **Database Structure:**
- Orders: `kv_store` with key `order:{orderId}`
- Returns: `kv_store` with key `return:{returnId}`
- Quotations: `kv_store` with key `quotation:{quoteId}`
- Invoices: `kv_store` with key `invoice:{invoiceId}`

✅ **Admin Panels:**
- Orders Manager: `/admin/orders`
- Returns Manager: `/admin/returns`
- Quotations Manager: `/admin/quotations`
- Invoices Manager: `/admin/invoices`

---

## 📞 Support

For questions about status flow:
- Email: support@costplus100.com.au
- Phone: 1300-COSTPLUS
- Admin Portal: Help → Documentation

**Last Updated:** March 31, 2026
**Version:** 1.0
