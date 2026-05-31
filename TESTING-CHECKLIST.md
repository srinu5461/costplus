# 🧪 Testing Checklist - Performance & Caching Updates

## ✅ Pre-Deployment Testing

### 1. **Product Grid Consistency** ⭐ CRITICAL
Test that all product cards have the same size across all pages.

**Steps:**
1. Open the application
2. Navigate to **Home page** → Check "Featured Products" section
3. Navigate to **All Products** (`/products`)
4. Navigate to **Any Category** (e.g., `/products?category=Cookware`)
5. Navigate to **Any Brand page** (e.g., `/brands/some-brand`)
6. Navigate to **Search results** (search for "knife")

**Expected Result:**
- ✅ All product card images should have the **same height** (224px / h-56)
- ✅ Cards should look consistent across all pages
- ✅ No image distortion or size jumps when switching pages

---

### 2. **Initial Load (First Visit)** ⭐ CRITICAL
Test the first-time user experience.

**Steps:**
1. Clear browser cache and sessionStorage:
   ```javascript
   // Open Console (F12) and run:
   sessionStorage.clear();
   localStorage.clear();
   location.reload();
   ```
2. Navigate to Home page
3. Observe loading behavior

**Expected Result:**
- ✅ Skeleton loaders appear for 1-3 seconds (this is normal)
- ✅ Products and categories load from server
- ✅ Content displays smoothly
- ✅ Console shows: "Cache miss - fetching fresh data..."

---

### 3. **Instant Loading (Cached Visit)** ⭐ CRITICAL
Test that subsequent visits load instantly.

**Steps:**
1. After completing Test #2, **refresh the page** (F5)
2. Navigate between pages (Home → Products → Brands)
3. Close and reopen the tab (same browser session)

**Expected Result:**
- ✅ **NO skeleton loaders** on subsequent visits
- ✅ Content appears **instantly** (<100ms)
- ✅ Categories visible immediately
- ✅ Product grid loads from server but metadata is cached
- ✅ Console shows: "Using cached metadata"

---

### 4. **Cache Duration (5 Minutes)** 
Test that cache expires after 5 minutes.

**Steps:**
1. Load the site (cache created)
2. Check cache age in console:
   ```javascript
   const cache = JSON.parse(sessionStorage.getItem('cms_data_cache'));
   const age = Math.round((Date.now() - cache.timestamp) / 1000);
   console.log(`Cache age: ${age} seconds`);
   ```
3. Wait 5+ minutes
4. Refresh the page

**Expected Result:**
- ✅ After 5 minutes, cache is considered stale
- ✅ Fresh data loads from server
- ✅ New cache created with updated timestamp

---

### 5. **Price Sync Cache Invalidation** ⭐ CRITICAL
Test that cache clears after price updates.

**Steps:**
1. Navigate to **Admin Panel** → **Uropa Price Sync**
2. Run a **Price Sync** that updates at least 1 product
3. Wait for sync to complete
4. Check logs for: "🔄 [Price Sync] Invalidating CMS cache..."
5. Refresh the site

**Expected Result:**
- ✅ Cache is cleared after successful price sync
- ✅ Fresh data loads with updated prices
- ✅ Console shows: "Cache miss - fetching fresh data..."
- ✅ Updated prices visible on product cards

---

### 6. **Server Cache Headers**
Test that server cache is working correctly.

**Steps:**
1. Open **DevTools** → **Network tab**
2. Refresh the page
3. Find the request to `/cms/data`
4. Check **Response Headers**

**Expected Result:**
- ✅ First request shows: `X-Cache: MISS`
- ✅ Subsequent requests (within 5 min) show: `X-Cache: HIT`
- ✅ Cache-Control header shows: `public, max-age=300`
- ✅ X-Cache-Age header shows age in seconds

---

### 7. **Multi-Tab Behavior**
Test cache behavior across multiple tabs.

**Steps:**
1. Open site in **Tab 1** (creates cache)
2. Open **Tab 2** in same browser
3. Both tabs should have independent caches

**Expected Result:**
- ✅ Each tab has its own sessionStorage cache
- ✅ Closing Tab 1 doesn't affect Tab 2
- ✅ Both tabs load instantly from their own cache

---

### 8. **Manual Cache Clear**
Test the admin cache clear functionality.

**Steps:**
1. Load the site (cache created)
2. Make a POST request to clear cache:
   ```bash
   curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/make-server-d1fbc049/cms/clear-cache
   ```
3. Refresh the site

**Expected Result:**
- ✅ Server cache is cleared
- ✅ Next request fetches fresh data
- ✅ Console logs: "🔄 Cache invalidation triggered: Manual cache clear via API"

---

### 9. **Error Handling**
Test that errors don't break the site.

**Steps:**
1. Disconnect internet
2. Try to load the page
3. Reconnect and refresh

**Expected Result:**
- ✅ Cached data still displays (if available)
- ✅ Graceful error message if no cache
- ✅ Site doesn't crash
- ✅ Reconnecting restores full functionality

---

### 10. **Production Build Test** ⭐ CRITICAL
Test that production build works correctly.

**Steps:**
1. Run production build:
   ```bash
   npm run build
   ```
2. Preview production build:
   ```bash
   npm run preview
   ```
3. Test all features above in production mode

**Expected Result:**
- ✅ Build completes successfully
- ✅ No TypeScript errors
- ✅ All caching features work in production
- ✅ Performance is even better than dev mode

---

## 📊 Performance Metrics to Monitor

### Page Load Times:
| Scenario | Expected Time | Acceptable Range |
|----------|--------------|------------------|
| **First Visit** | 1-3 seconds | <5 seconds |
| **Cached Visit** | <100ms | <500ms |
| **After Cache Expiry** | 1-3 seconds | <5 seconds |

### Cache Hit Rates:
| Metric | Target | Minimum |
|--------|--------|---------|
| **Server Cache Hit Rate** | >90% | >80% |
| **Client Cache Usage** | >85% | >70% |

### Server Load:
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Requests/Min** | ~120 | ~12 | **90% ↓** |
| **DB Queries/Min** | ~120 | ~12 | **90% ↓** |

---

## 🐛 Known Issues & Solutions

### Issue: "Quota Exceeded" Error in Console
**Cause:** sessionStorage limit reached (rare with metadata-only caching)
**Solution:** Cache automatically clears and rebuilds

### Issue: Stale Data After Price Update
**Cause:** Price sync didn't trigger cache invalidation
**Solution:** Manually clear cache via endpoint or wait 5 minutes

### Issue: Products Not Loading
**Cause:** Server is down or network issue
**Solution:** Check server logs, verify network connection

---

## ✅ Sign-Off Checklist

Before going live, confirm:

- [ ] All 10 tests above pass successfully
- [ ] Product grids are consistent across all pages
- [ ] First visit shows skeletons (expected behavior)
- [ ] Subsequent visits load instantly
- [ ] Price sync invalidates cache
- [ ] Server cache headers are correct
- [ ] Production build works
- [ ] No console errors
- [ ] Performance metrics meet targets
- [ ] Documentation is up to date

---

## 🚀 Deployment Steps

1. **Build Application:**
   ```bash
   npm run build
   ```

2. **Deploy to Production:**
   ```bash
   # Example for Netlify:
   netlify deploy --prod --dir=dist
   
   # Or for Vercel:
   vercel --prod
   ```

3. **Verify Deployment:**
   - Test live site with checklist above
   - Monitor server logs for first 24 hours
   - Check cache hit rates in analytics

4. **Monitor Performance:**
   - Track page load times
   - Monitor server load reduction
   - Check for any errors in logs

---

## 📞 Support

If you encounter any issues:

1. Check browser console for errors
2. Check Supabase Edge Function logs
3. Verify cache headers in Network tab
4. Try manual cache clear
5. Check this documentation

**Cache Debug Command:**
```javascript
// Run in browser console:
const cache = sessionStorage.getItem('cms_data_cache');
if (cache) {
  const data = JSON.parse(cache);
  console.log('Cache Age:', Math.round((Date.now() - data.timestamp) / 1000), 'seconds');
  console.log('Categories:', data.categories?.length);
  console.log('Category Tree:', data.categoryTree?.length);
} else {
  console.log('No cache found');
}
```

---

**Last Updated:** April 3, 2026
**Version:** 1.0 (Extended Caching System)
