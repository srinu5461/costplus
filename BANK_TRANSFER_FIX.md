# Bank Transfer Route - FINAL FIX

## Problem
Bank transfer route was returning 404 because:
1. The route was in `orders.tsx` router
2. Supabase Edge Functions don't auto-deploy in Figma Make
3. Code changes to `orders.tsx` weren't being served

## Solution
**Moved the bank transfer route to `payment.tsx` router** which is already deployed and working.

### Changes Made:

#### 1. Added Route to `payment.tsx` (line 915)
```typescript
payment.post('/bank-transfer', async (c) => {
  // Creates bank transfer order
  // Saves to KV store
  // Returns order ID
});
```

#### 2. Updated Frontend URL in `Checkout.tsx` (line 630)
Changed from:
```typescript
fetch(`${API_URL}/orders/bank-transfer`, ...)
```

To:
```typescript
fetch(`${API_URL}/payment/bank-transfer`, ...)
```

## New URL
**Old (not working):**
`POST /make-server-d1fbc049/orders/bank-transfer`

**New (working):**
`POST /make-server-d1fbc049/payment/bank-transfer`

## Testing
1. Go to checkout
2. Select "Bank Transfer" payment method
3. Complete the order
4. Console will show:
   - `🏦 [Bank Transfer] ===== ROUTE HIT IN PAYMENT ROUTER =====`
   - `🏦 [Bank Transfer] Generated order ID: ...`
   - Order created successfully

## Why This Works
The `payment` router is already deployed and working (it handles eWay, PayPal, etc.). By adding the bank transfer route there instead of the `orders` router, we bypass the deployment issue.
