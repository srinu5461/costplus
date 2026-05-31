# 🛒 Shopping Cart System - Complete Overview

## 📦 **What Shopping Cart We're Using**

Your e-commerce project uses a **custom-built React Context-based shopping cart system** - NOT a third-party solution like Snipcart, WooCommerce, or Shopify.

---

## 🏗️ **Architecture Overview**

### **Technology Stack:**
```
Frontend:  React 18 + TypeScript
State:     React Context API
Storage:   In-Memory (RAM) - No localStorage/sessionStorage
Routing:   React Router v7
UI:        Shadcn/ui + Tailwind CSS v4
Payments:  eWay Payment Gateway (Australia)
Backend:   Supabase Edge Functions + Hono
Database:  Supabase PostgreSQL
```

---

## 🔧 **Core Components**

### **1. CartContext** (`/src/app/context/CartContext.tsx`)

**Purpose:** Central state management for the shopping cart

**Features:**
- ✅ Add products to cart
- ✅ Remove products from cart
- ✅ Update quantities
- ✅ Clear entire cart
- ✅ Calculate totals
- ✅ Count items
- ✅ MultiBuy pricing support
- ✅ Toast notifications (using Sonner)

**State Structure:**
```typescript
interface CartItem {
  product: Product;
  quantity: number;
}

cart: CartItem[] = []
```

**Available Methods:**
```typescript
addToCart(product: Product, quantity?: number)
removeFromCart(productId: string)
updateQuantity(productId: string, quantity: number)
clearCart()
getCartTotal(): number
getCartCount(): number
getItemPrice(item: CartItem): number
```

---

### **2. Cart Page** (`/src/app/pages/Cart.tsx`)

**Route:** `/cart`

**Features:**
- ✅ Display all cart items with images
- ✅ Show product name, category, price
- ✅ Quantity controls (+/- buttons)
- ✅ Remove item button
- ✅ MultiBuy badge display
- ✅ Real-time savings calculations
- ✅ Price breakdown:
  - Subtotal (products)
  - GST (10%)
  - Shipping (TBD at checkout)
  - Final Total
- ✅ Empty cart state
- ✅ "Proceed to Checkout" button

**UI Elements:**
```
┌─────────────────────────────────────────────────────────────┐
│ Shopping Cart                                               │
│ Review your items before checkout                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [IMG] Product Name                              [🗑️]      │
│        Category                                             │
│        🏷️ MultiBuy: 5+ @ $100.00 each                       │
│        [-] 5 [+]                                            │
│        Regular: $150.00 → You pay: $100.00                  │
│        Savings: $50.00                                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Order Summary                                               │
│ Subtotal:           $500.00                                 │
│ GST (10%):          $50.00                                  │
│ Shipping:           Calculated at checkout                  │
│ ─────────────────────────────────                           │
│ Total:              $550.00                                 │
│                                                             │
│ [Proceed to Checkout →]                                     │
└─────────────────────────────────────────────────────────────┘
```

---

### **3. Checkout Flow** (`/src/app/pages/Checkout.tsx`)

**Route:** `/checkout`

**Features:**
- ✅ **3-Step Process:**
  1. Customer Information (Login/Guest)
  2. Shipping Address
  3. Payment Method
  
- ✅ **Customer Authentication:**
  - Existing customer login
  - Guest checkout option
  - Password reset functionality
  - Session management via Supabase Auth

- ✅ **Shipping Options:**
  - Standard shipping
  - Pay shipping later (quote required)
  - Pickup option
  - Real-time shipping calculation

- ✅ **Payment Integration:**
  - eWay payment gateway
  - Credit/Debit card processing
  - Secure tokenization
  - PCI compliance
  - Transaction ID tracking

- ✅ **Order Creation:**
  - Stores order in Supabase KV store
  - Generates unique order ID
  - Links to customer account
  - Captures transaction details
  - Sends confirmation emails

---

### **4. Header Cart Badge** (`/src/app/components/Header.tsx`)

**Features:**
- ✅ Real-time cart count badge
- ✅ Red notification bubble
- ✅ Updates instantly when items added/removed
- ✅ Click to navigate to `/cart`
- ✅ Visible on all pages

**UI:**
```
┌──────────────────────────────────────┐
│ Logo  [Search...]  🛒(3)  👤 Login  │
└──────────────────────────────────────┘
                      ↑
                    Badge shows: 3 items
```

---

### **5. Product Pages Integration**

#### **Product Listing** (`/src/app/pages/Products.tsx`)
- "Add to Cart" button on each product card
- Quick add with default quantity (1)
- Toast notification on add

#### **Product Detail** (`/src/app/pages/ProductDetail.tsx`)
- Quantity selector
- "Add to Cart" button
- MultiBuy calculator
- Stock availability check
- Related products suggestions

---

## 🎯 **Key Features**

### **1. MultiBuy Pricing System**

**Location:** `/src/app/utils/multibuy.ts`

**How it works:**
```typescript
Product has multibuy_options:
[
  { quantity: 5, price: 100.00 },
  { quantity: 10, price: 90.00 },
  { quantity: 20, price: 80.00 }
]

Customer adds 5 items:
- Regular price: $150.00 each
- MultiBuy price: $100.00 each
- Savings: $50.00 per item × 5 = $250.00 saved!
```

**Features:**
- ✅ Automatic price calculation
- ✅ Visual savings display
- ✅ Orange "MultiBuy" badge
- ✅ Works in cart and checkout
- ✅ Applied automatically

---

### **2. Toast Notifications**

**Library:** Sonner (lightweight toast library)

**Events:**
- ✅ Item added to cart
- ✅ Item removed from cart
- ✅ Quantity updated
- ✅ Error messages
- ✅ Success confirmations

**Example:**
```
┌───────────────────────────────────┐
│ ✅ Added to cart                  │
│ Commercial Freezer (2)            │
└───────────────────────────────────┘
```

---

### **3. Responsive Design**

**Mobile:**
- Stack layout for cart items
- Touch-friendly buttons
- Swipe to remove (future feature)
- Bottom sticky checkout button

**Tablet:**
- 2-column grid layout
- Sidebar summary

**Desktop:**
- 3-column layout (2 for items, 1 for summary)
- Fixed summary sidebar
- Hover effects

---

### **4. Empty Cart State**

**Features:**
- Large shopping bag icon
- "Your Cart is Empty" message
- "Browse Products" CTA button
- Links to product catalog

---

## 🔄 **Complete User Flow**

### **Scenario: Customer purchases 10 items**

```
1. Browse Products
   ↓
2. Click "Add to Cart" (quantity: 10)
   ↓
   ✅ Toast: "Added to cart - Product Name (10)"
   ↓
3. Header badge updates: 🛒(10)
   ↓
4. Click cart icon → Navigate to /cart
   ↓
5. Cart Page displays:
   - Product with MultiBuy badge
   - Regular: $150.00 → You pay: $90.00
   - Savings: $60.00 per item
   - Total savings: $600.00
   ↓
6. Click "Proceed to Checkout"
   ↓
7. Checkout Step 1: Customer Info
   - Login or continue as guest
   ↓
8. Checkout Step 2: Shipping Address
   - Enter address
   - Select shipping method
   ↓
9. Checkout Step 3: Payment
   - Enter card details (eWay)
   - Review order
   - Click "Place Order"
   ↓
10. Payment processed via eWay
    ↓
11. Order created in database
    ↓
12. Confirmation email sent
    ↓
13. Redirect to /order/:orderId
    ↓
14. Cart automatically cleared
    ↓
15. Order confirmation page displayed ✅
```

---

## 💾 **Data Storage**

### **Where is cart data stored?**

**Current:** In-memory (React state)
- ✅ Fast performance
- ✅ No database calls needed
- ❌ Lost on page refresh
- ❌ Not persistent across devices
- ❌ Lost on browser close

**Future Enhancement Options:**

1. **localStorage** (Browser Storage)
   ```typescript
   // Save cart on change
   localStorage.setItem('cart', JSON.stringify(cart));
   
   // Load cart on mount
   const savedCart = localStorage.getItem('cart');
   ```
   
2. **Supabase KV Store** (Cloud Storage)
   ```typescript
   // Save cart to user account
   await kv.set(`cart:${userId}`, cart);
   
   // Load cart from user account
   const cart = await kv.get(`cart:${userId}`);
   ```

3. **Session Storage** (Temporary)
   ```typescript
   sessionStorage.setItem('cart', JSON.stringify(cart));
   ```

**Recommendation:**
- **Authenticated Users:** Save to Supabase KV (syncs across devices)
- **Guest Users:** Save to localStorage (persists across page refresh)

---

## 🔐 **Security Considerations**

### **Current Implementation:**

1. **Cart Validation:**
   - ✅ Quantity limits enforced
   - ✅ Stock availability checked
   - ✅ Price recalculated server-side at checkout

2. **Payment Security:**
   - ✅ eWay tokenization (no card data stored)
   - ✅ HTTPS only
   - ✅ PCI DSS compliant
   - ✅ Server-side payment processing

3. **Price Integrity:**
   - ✅ Prices stored in database
   - ✅ Never trust frontend prices
   - ✅ Recalculate on server before payment
   - ✅ MultiBuy validation on server

---

## 🛠️ **Admin Management**

### **Order Management:**

**Location:** `/admin/orders`

**Features:**
- ✅ View all orders
- ✅ Order status tracking (10 statuses)
- ✅ Customer details
- ✅ Payment status
- ✅ Transaction IDs
- ✅ Order items list
- ✅ Shipping information
- ✅ Refund processing
- ✅ Return management
- ✅ Email invoices
- ✅ Shipping quotes

**Order Statuses:**
1. 🕐 Pending
2. ⚙️ Processing
3. 📦 Ready to Ship
4. 🚚 Shipped
5. ✅ Delivered
6. 🎉 Completed
7. ❌ Cancelled
8. 🔄 Return Initiated
9. 💰 Refund Requested
10. ✔️ Refunded

---

## 📊 **Database Schema**

### **Orders Table** (Simplified)

```typescript
interface Order {
  id: string;                    // Unique order ID
  created_at: string;            // Order date
  customer_id?: string;          // Customer ID (if logged in)
  customer_email: string;        // Customer email
  order_items: OrderItem[];      // Array of products
  shipping: ShippingAddress;     // Shipping details
  billing: BillingAddress;       // Billing details
  subtotal: number;              // Products total
  tax_amount: number;            // GST (10%)
  shipping_amount: number;       // Shipping cost
  total_amount: number;          // Final total
  payment_method: string;        // "eway"
  payment_status: string;        // "completed", "pending", "failed"
  order_status: string;          // 1 of 10 statuses
  transaction_id: string;        // eWay transaction ID
  notes?: string;                // Admin notes
}

interface OrderItem {
  product: Product;              // Full product object
  quantity: number;              // Quantity ordered
  price: number;                 // Price at time of purchase
  multibuy_applied: boolean;     // Was MultiBuy discount applied?
}
```

---

## 🚀 **Performance Optimizations**

### **1. Lazy Loading:**
- Cart page is lazy-loaded
- Only loads when user navigates to `/cart`
- Reduces initial bundle size

### **2. Memoization:**
- Cart totals calculated with `useMemo`
- Prevents unnecessary recalculations
- Better performance with large carts

### **3. Debouncing:**
- Quantity updates debounced
- Prevents rapid API calls
- Smoother user experience

### **4. Image Optimization:**
- Product images lazy-loaded
- WebP format supported
- Responsive images (srcset)

---

## 🎨 **Design System**

### **Colors:**
- **Primary:** Costplus100 Brand Red (#E31837)
- **Secondary:** Dark Navy (#2D3748)
- **Success:** Green (#22C55E)
- **Warning:** Orange (#F97316)
- **Error:** Red (#EF4444)

### **Typography:**
- **Font:** System font stack (fast load)
- **Headings:** Bold, dark navy
- **Body:** Regular, slate-700
- **Prices:** Bold, brand red

### **Spacing:**
- **Mobile:** 4px grid
- **Desktop:** 8px grid
- **Max Width:** 1280px (7xl)

---

## 📱 **Customer Experience**

### **What Customers See:**

1. **Product Page:**
   - Product image
   - Name, description, price
   - MultiBuy badge (if applicable)
   - Quantity selector
   - "Add to Cart" button

2. **Cart Badge:**
   - Number of items in header
   - Updates in real-time
   - Red notification bubble

3. **Cart Page:**
   - All items listed
   - Quantity controls
   - Remove buttons
   - Price breakdown
   - Savings calculations
   - "Checkout" button

4. **Checkout:**
   - 3-step wizard
   - Progress indicator
   - Form validation
   - Secure payment
   - Order review

5. **Confirmation:**
   - Order number
   - Estimated delivery
   - Order summary
   - Email confirmation
   - Track order link

---

## 🔄 **Future Enhancements**

### **Planned Features:**

1. **Persistent Cart:**
   - Save to localStorage for guests
   - Save to database for logged-in users
   - Sync across devices

2. **Cart Recovery:**
   - Email abandoned cart reminders
   - "Save for later" functionality
   - Share cart link

3. **Advanced Features:**
   - Wishlist integration
   - Compare products
   - Recently viewed
   - Recommended products

4. **Coupons & Discounts:**
   - Promo code support
   - Automatic discounts
   - Volume discounts
   - Seasonal sales

5. **Social Features:**
   - Share cart with team
   - Bulk ordering for businesses
   - Quote requests
   - Project lists

---

## 📞 **Technical Support**

### **Common Issues:**

**Issue:** Cart items disappear on refresh
- **Cause:** Cart stored in memory (React state)
- **Solution:** Implement localStorage persistence

**Issue:** Wrong total showing
- **Cause:** MultiBuy calculation error
- **Solution:** Check `getEffectivePrice()` function

**Issue:** "Add to Cart" not working
- **Cause:** CartProvider not wrapping component
- **Solution:** Check ProviderWrapper in routes

**Issue:** Payment failing
- **Cause:** eWay credentials not configured
- **Solution:** Check PaymentSettings in admin

---

## 🎯 **Summary**

Your shopping cart system is:

✅ **Custom-built** - Full control, no vendor lock-in
✅ **React Context** - Clean, modern state management
✅ **Type-safe** - TypeScript for reliability
✅ **Feature-rich** - MultiBuy, guest checkout, etc.
✅ **Scalable** - Can handle large product catalogs
✅ **Secure** - Server-side validation & eWay integration
✅ **Beautiful** - Costplus100 branding throughout
✅ **Fast** - Optimized performance
✅ **Mobile-first** - Responsive design

---

**Last Updated:** March 31, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
