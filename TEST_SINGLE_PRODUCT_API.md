# 🧪 Test Single Product API

## Quick Test

**Before deploying**, test if the API endpoint is working:

### Option 1: Browser Test
Open this URL in your browser (replace with your actual project ID and product code):

```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-d1fbc049/product/YOUR_PRODUCT_CODE
```

Example:
```
https://abc123xyz.supabase.co/functions/v1/make-server-d1fbc049/product/ABC123
```

**Expected Response:**
```json
{
  "id": "ABC123",
  "name": "Product Name",
  "code": "ABC123",
  "price": 99.99,
  ...
}
```

### Option 2: Console Test
Open browser console on your site and run:

```javascript
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-d1fbc049/product/ABC123', {
  headers: {
    'Authorization': 'Bearer YOUR_ANON_KEY'
  }
})
  .then(r => r.json())
  .then(data => console.log('✅ Product:', data))
  .catch(err => console.error('❌ Error:', err));
```

## Debug Checklist

If API call is NOT happening, check:

### 1. Check Console Logs
Look for this debug log:
```
🔍 [ProductDetail] Checking if should fetch from API: {
  id: "ABC123",
  productInCMS: false,
  cachedProduct: false,
  apiLoading: false,
  apiProduct: false,
  allProductsCount: 0
}
```

**If you see this:**
- `productInCMS: true` → Product found in CMS data, won't call API ✅
- `cachedProduct: true` → Product found in cache, won't call API ✅
- `allProductsCount: 0` → No products loaded, WILL call API ✅

### 2. Check Network Tab
1. Open DevTools → Network tab
2. Filter by "product"
3. Look for: `make-server-d1fbc049/product/ABC123`

**If you see the request:**
- Status 200 → API working ✅
- Status 404 → Product not in database ❌
- Status 500 → Server error ❌

**If you DON'T see the request:**
- API call is being blocked by conditions
- Check console logs for why

### 3. Common Issues

**Issue:** "Failed to fetch chunk"
**Solution:** This is the old CDN error - ignore it, API should still be called

**Issue:** No API call happening
**Reason:** One of these is true:
- Product already in `allProducts` array
- Product cached in localStorage
- `apiLoading` is stuck as true

**Issue:** 404 Not Found
**Reason:** Product doesn't exist in database OR server not deployed

### 4. Force API Call Test

To force an API call, run this in browser console:

```javascript
// Clear cache
localStorage.clear();

// Reload page
location.reload();

// Then navigate to product page
// You should see API call in Network tab
```

---

## Expected Flow (Google Ad → Product Page)

```
User clicks: yoursite.com/products/ABC123
    ↓
1. Page loads, useParams gets id="ABC123"
    ↓
2. Check localStorage cache → Not found
    ↓
3. Check allProducts array → Empty (CMS not loaded yet)
    ↓
4. shouldFetchFromAPI = true
    ↓
5. Call: /make-server-d1fbc049/product/ABC123
    ↓
6. Response in ~200ms → Display product
```

---

**After confirming API works, deploy and test live!**
