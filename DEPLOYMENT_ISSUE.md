# Bank Transfer Route Issue

## Problem
The `/orders/bank-transfer` route returns 404 even though the code is correct.

## Root Cause
Supabase Edge Functions are NOT auto-deploying when code changes in Figma Make.

## Code Status
✅ Route exists at line 23 in `supabase/functions/server/orders.tsx`
✅ Route is positioned BEFORE `/:id` parameterized routes  
✅ Orders router is mounted at line 3206 in `supabase/functions/server/index.tsx`

## Solution Required
The Supabase Edge Function needs to be manually redeployed for code changes to take effect.

### How to Deploy (Supabase Dashboard):
1. Go to Supabase Dashboard → Edge Functions
2. Find function `make-server-d1fbc049`
3. Click "Redeploy" or "Deploy"
4. Wait 30-60 seconds for deployment to complete
5. Test the bank transfer route again

### Alternative (Supabase CLI):
```bash
supabase functions deploy make-server-d1fbc049
```

## Test URL
After deployment, test:
```
POST https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/orders/bank-transfer
```

This should return an order ID, not a 404.
