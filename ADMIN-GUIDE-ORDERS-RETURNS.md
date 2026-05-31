# Complete Order & Returns Flow - Visual Guide

## 🔥 QUICK REFERENCE CARD

### When You See This Status in Orders → Do This:

| Order Status | What It Means | Where to Find It | Next Action |
|-------------|---------------|-----------------|-------------|
| 🕐 **Pending** | Just placed, payment pending | Orders Tab | Wait for payment or contact customer |
| ⚙️ **Processing** | Paid, needs packing | Orders Tab | Pick & pack items |
| 📦 **Ready to Ship** | Packed and ready | Orders Tab | Create shipping label, ship it |
| 🚚 **Shipped** | Out for delivery | Orders Tab | Monitor tracking |
| ✅ **Delivered** | Customer has it | Orders Tab | Wait for feedback or mark complete |
| 🎉 **Completed** | All done, archived soon | Orders Tab | No action needed |
| ❌ **Cancelled** | Order cancelled | Orders Tab | Process refund if paid |
| 🔄 **Return Initiated** | Customer wants to return | Orders Tab → **GO TO RETURNS TAB** |
| 💰 **Refund Requested** | Return approved, refund starting | Orders Tab | Process through payment gateway |
| ✔️ **Refunded** | Money returned | Orders Tab | Close and archive |

---

## 🔄 THE COMPLETE CUSTOMER JOURNEY

```
CUSTOMER PLACES ORDER
        ↓
   🕐 PENDING
   (Awaiting Payment)
        ↓
   ⚙️ PROCESSING  ← YOU ARE HERE: Pack the items
   (Payment Confirmed)
        ↓
   📦 READY TO SHIP  ← YOU ARE HERE: Create shipping label
   (Packed & Ready)
        ↓
   🚚 SHIPPED  ← YOU ARE HERE: Add tracking number
   (Out for Delivery)
        ↓
   ✅ DELIVERED
   (Customer Received)
        ↓
   ┌────────────────────────────────┐
   │                                │
   ↓                                ↓
🎉 COMPLETED              🔄 RETURN INITIATED
(Happy Customer!)         (Customer wants return)
                                   ↓
                          Check RETURNS TAB →
                                   ↓
                          [Admin Reviews Return]
                                   ↓
                          ┌──────────────────┐
                          ↓                  ↓
                    ✅ APPROVED         ❌ REJECTED
                          ↓                  ↓
              💰 REFUND REQUESTED    Back to Delivered
                          ↓
              ✔️ REFUNDED & CLOSED
```

---

## 🎯 THE RETURNS CONNECTION PROBLEM (SOLVED!)

### ❌ BEFORE (Confusing):
- Order status shows "Delivered"
- Customer submits return in Returns tab
- **Problem:** Admin can't find which orders have returns!
- Returns tab and Orders tab feel disconnected

### ✅ AFTER (Crystal Clear):
- Customer submits return
- **Order status automatically changes to: 🔄 Return Initiated**
- Admin sees orange badge in Orders tab
- **Click the return status → Jump to Returns tab**
- Everything is connected!

---

## 📍 WHERE TO FIND EVERYTHING

### Admin Panel Navigation

```
ADMIN DASHBOARD
    │
    ├─ 📦 ORDERS TAB
    │   │
    │   ├─ All order statuses shown here
    │   ├─ Status dropdown for quick updates
    │   ├─ 🔄 Return Initiated badge = Go to Returns
    │   └─ Actions: View, Edit, Ship, Refund
    │
    ├─ 🔄 RETURNS TAB
    │   │
    │   ├─ All return requests
    │   ├─ Links to original order
    │   ├─ Approve/Reject buttons
    │   └─ Refund processing
    │
    ├─ 📝 QUOTATIONS TAB
    │   │
    │   ├─ Draft → Sent → Accepted/Rejected
    │   └─ Convert to Invoice/Order
    │
    └─ 🧾 INVOICES TAB
        │
        ├─ Draft → Sent → Paid
        └─ Links to orders when paid
```

---

## 🚀 DAILY ADMIN WORKFLOW

### Morning Routine (9:00 AM):

1. **Check Orders Tab**
   - Any 🕐 Pending? → Follow up payment
   - Any ⚙️ Processing? → Start packing
   - Any 🔄 Return Initiated? → **Go to Returns Tab**

2. **Check Returns Tab**
   - Any ⏳ Pending reviews? → Approve/Reject
   - Any ✅ Approved returns? → Track shipment back
   - Any items received? → Process refunds

3. **Check Invoices Tab**
   - Any ⏰ Overdue? → Send reminders
   - Any 💰 Paid? → Create orders

### Afternoon Routine (2:00 PM):

4. **Process Shipments**
   - Find all 📦 Ready to Ship
   - Create shipping labels
   - Update to 🚚 Shipped
   - Add tracking numbers

5. **Check Quotations**
   - Follow up on pending quotes
   - Convert accepted quotes

---

## 📊 STATUS COUNTS & METRICS

### What Each Tab Shows:

**Orders Tab Dashboard Cards:**
```
┌─────────────────┐  ┌─────────────────┐
│ Total Orders    │  │ Processing      │
│      158        │  │       12        │
└─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│ Completed       │  │ Total Revenue   │
│      142        │  │   $45,892.50    │
└─────────────────┘  └─────────────────┘
```

**Returns Tab Dashboard Cards:**
```
┌─────────────────┐  ┌─────────────────┐
│ Total Returns   │  │ Pending Review  │
│       24        │  │        5        │
└─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│ Approved        │  │ Total Refunded  │
│       18        │  │   $3,245.00     │
└─────────────────┘  └─────────────────┘
```

---

## 🔗 HOW SYSTEMS CONNECT

### Example: Complete Return Flow

**Step 1: Customer Portal**
```
Customer logs in → My Orders → Order #12345
    ↓
Status: ✅ Delivered (March 15)
    ↓
Click "Request Return" button
    ↓
Fill return form:
    - Select items to return
    - Choose reason (e.g., "Wrong size")
    - Upload photos (optional)
    - Submit request
```

**Step 2: System Updates**
```
System creates:
    - Return #RET-20260331-001
    - Links to Order #12345
    - Status: ⏳ Pending

System updates:
    - Order #12345 status → 🔄 Return Initiated
    - Sends email to admin
    - Sends confirmation to customer
```

**Step 3: Admin Reviews (Returns Tab)**
```
Admin sees:
    - Return #RET-20260331-001
    - Status: ⏳ Pending
    - Linked Order: #12345
    - Customer: John Smith
    - Reason: Wrong size
    - Amount: $245.00

Admin reviews and clicks:
    ✅ Approve Return
```

**Step 4: System Processes Approval**
```
System:
    - Updates Return status → ✅ Approved
    - Order status remains → 🔄 Return Initiated
    - Sends email to customer with:
        • Return shipping label
        • Instructions
        • Estimated refund timeline
```

**Step 5: Customer Ships Back**
```
Customer:
    - Prints shipping label
    - Packs items
    - Drops at post office
    - Tracking updates

Admin monitors in Returns Tab:
    - Tracking shows "In Transit"
```

**Step 6: Items Received & Inspected**
```
Admin:
    - Receives return package
    - Inspects items (condition okay?)
    - If okay → Process Refund
```

**Step 7: Refund Processing**
```
Admin clicks "Process Refund" in Returns Tab

System:
    1. Updates Order status → 💰 Refund Requested
    2. Calls eWay API to refund $245.00
    3. Updates Order status → ✔️ Refunded
    4. Updates Return status → ✔️ Refunded
    5. Sends confirmation emails
    6. Archives after 30 days
```

---

## 💡 PRO TIPS FOR ADMINS

### Tip 1: Filter by Status
```
In Orders Tab → Use status filter:
- Show only "Return Initiated" to see all returns
- Show only "Processing" for packing queue
- Show only "Ready to Ship" for shipping tasks
```

### Tip 2: Search is Your Friend
```
Search bar accepts:
- Order ID: #12345
- Customer name: John Smith
- Email: john@example.com
- Transaction ID: TXN-ABC123
```

### Tip 3: Quick Status Changes
```
Don't open dialog for every status change!
→ Use dropdown directly in table
→ Click, select, done!
→ Saves 10 seconds per order
→ 100 orders = 16 minutes saved! ⏱️
```

### Tip 4: Returns Alert Badge
```
When you see 🔄 Return Initiated:
1. Click on order to view details
2. Note the Return Number (in order notes)
3. Open Returns Tab
4. Search for that Return Number
5. Process the return
```

### Tip 5: Bulk Actions
```
Select multiple orders with same status:
- Shift+Click to select range
- Update status for all at once
- (Coming in future update!)
```

---

## 📧 EMAIL NOTIFICATIONS CHEAT SHEET

| Trigger | Email Sent To | Email Contains |
|---------|--------------|----------------|
| Order Placed | Customer | Order confirmation, receipt |
| Order Shipped | Customer | Tracking number, delivery date |
| Order Delivered | Customer | Delivery confirmation, feedback request |
| Return Submitted | Admin & Customer | Return number, status pending |
| Return Approved | Customer | Shipping label, instructions |
| Return Rejected | Customer | Rejection reason, contact info |
| Refund Processed | Customer | Refund amount, timeline, receipt |
| Quotation Sent | Customer | Quote details, expiry date |
| Invoice Sent | Customer | Invoice PDF, payment details |
| Invoice Overdue | Customer | Payment reminder, new due date |

---

## 🎨 STATUS BADGE COLORS

Quick visual reference for status colors:

| Status | Color | Badge |
|--------|-------|-------|
| Pending | 🟡 Yellow | `bg-yellow-100 text-yellow-800` |
| Processing | 🔵 Blue | `bg-blue-100 text-blue-800` |
| Ready to Ship | 🟣 Purple | `bg-purple-100 text-purple-800` |
| Shipped | 🔷 Indigo | `bg-indigo-100 text-indigo-800` |
| Delivered | 🟢 Teal | `bg-teal-100 text-teal-800` |
| Completed | 🟩 Green | `bg-green-100 text-green-800` |
| Cancelled | 🔴 Red | `bg-red-100 text-red-800` |
| Return Initiated | 🟠 Orange | `bg-orange-100 text-orange-800` |
| Refund Requested | 🟧 Amber | `bg-amber-100 text-amber-800` |
| Refunded | ⚫ Gray | `bg-gray-100 text-gray-800` |

---

## ⚠️ COMMON MISTAKES TO AVOID

### ❌ Don't Do This:
1. Changing "Return Initiated" back to "Delivered" manually
   - System manages this automatically
   
2. Deleting orders that have returns
   - You'll lose the return connection!
   
3. Processing refunds before inspecting items
   - Always verify condition first
   
4. Forgetting to add tracking numbers
   - Customers need to track their orders
   
5. Ignoring "Shipping Needed" badge
   - Some orders require shipping quotes

### ✅ Do This Instead:
1. Let system manage status transitions
2. Archive orders instead of deleting
3. Inspect before refunding
4. Always add tracking to "Shipped" orders
5. Send shipping quotes within 24 hours

---

## 🆘 TROUBLESHOOTING

### "I can't find the return for an order!"

**Solution:**
1. Open Orders Tab
2. Find the order with 🔄 Return Initiated
3. Note the Order ID (e.g., #12345)
4. Go to Returns Tab
5. Search for "12345" in search bar
6. The return will show with link back to order

### "Customer says they haven't received refund"

**Solution:**
1. Check order status is ✔️ Refunded
2. Check Returns Tab for refund date
3. Refunds take 5-10 business days
4. Verify with payment gateway (eWay dashboard)
5. Contact customer with transaction details

### "Order stuck in Processing for days"

**Solution:**
1. Check if items are in stock
2. Review order notes for special instructions
3. Contact customer if needed
4. Update to Ready to Ship once packed
5. Never leave in Processing > 48 hours

---

## 📈 PERFORMANCE METRICS

Track these KPIs:

- **Average Time in Processing:** Should be < 24 hours
- **Orders Shipped Same Day:** Aim for > 80%
- **Return Rate:** Monitor (normal is 5-10%)
- **Return Approval Rate:** Should be > 85%
- **Refund Processing Time:** Should be < 48 hours
- **Customer Satisfaction:** Based on feedback after Delivered

---

## 🎓 TRAINING CHECKLIST

New admin? Complete this checklist:

- [ ] Understand all 10 order statuses
- [ ] Practice updating order status
- [ ] Submit a test return as customer
- [ ] Process a test return as admin
- [ ] Send a shipping quote
- [ ] Process a test refund
- [ ] Create a quotation
- [ ] Convert quotation to invoice
- [ ] Mark invoice as paid
- [ ] Generate reports from Reports tab
- [ ] Use search and filters effectively
- [ ] Read ORDER-STATUS-FLOW.md document

---

**Last Updated:** March 31, 2026
**Version:** 1.0
**Questions?** Contact: admin@costplus100.com.au
