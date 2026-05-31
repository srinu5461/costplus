# Virtualized Product List System

A three-tier architecture for efficiently handling 15,000+ products with CDN caching and virtualized rendering.

## Architecture Overview

```
Database (KV Store) → JSON File (CDN) → Virtual List (React)
```

### Step 1: Backend Sync (Supabase Edge Function)

**File**: `/supabase/functions/server/sync-products.tsx`

Fetches all products from the KV store and saves them as a single `products.json` file in Supabase Storage.

**Key Features**:
- Public bucket for CDN access
- 1-hour cache control (`cacheControl: 3600`)
- Automatic bucket creation on startup
- Upsert to overwrite existing files

**Endpoint**: 
```
POST /make-server-d1fbc049/sync-products
GET /make-server-d1fbc049/products-url
```

### Step 2: Frontend Fetch (TanStack Query)

**File**: `/src/hooks/useProducts.tsx`

Custom React hook that fetches `products.json` from the CDN using TanStack Query.

**Key Features**:
- 5-minute stale time (no refetch within this window)
- 10-minute garbage collection
- Automatic retries (2 attempts)
- Smart caching to prevent unnecessary downloads

**Usage**:
```tsx
import { useProducts } from '../hooks/useProducts';

function MyComponent() {
  const { data: products, isLoading, error } = useProducts();
  // ...
}
```

### Step 3: Virtualized Display (react-window + Fuse.js)

**File**: `/src/app/components/VirtualizedProductList.tsx`

Virtualized list component that only renders visible items on screen, with client-side fuzzy search.

**Key Features**:
- Virtual scrolling (only renders ~20-30 visible items)
- Fuse.js fuzzy search across multiple fields
- Real-time filtering without pagination
- Smooth 60fps scrolling even with 15,000+ items

**Search Fields**:
- Product name
- Product code/SKU
- Brand
- Category
- Description

## How to Use

### 1. Access the Virtualized Product List

Navigate to: `/admin/products-virtualized`

### 2. Initial Sync

Click the **"Sync to CDN"** button to:
1. Fetch all products from the database
2. Convert to JSON
3. Upload to Supabase Storage with CDN caching
4. Products are now available at the CDN URL

### 3. Search and Browse

- Use the search bar to filter products by name, code, brand, or category
- Scroll through thousands of products smoothly
- Click "Refresh" to reload data from the CDN

## Performance Benefits

### Before (Traditional Pagination)
- ❌ Multiple API calls for each page
- ❌ Network latency on every scroll
- ❌ Complex state management for pagination
- ❌ Slow search (server-side queries)

### After (Virtualized + CDN)
- ✅ One-time JSON download (~2-5MB compressed)
- ✅ Instant client-side search with Fuse.js
- ✅ Smooth 60fps scrolling with react-window
- ✅ CDN caching reduces server load

## File Structure

```
/supabase/functions/server/
  └── sync-products.tsx         # Backend sync endpoint

/src/
  ├── hooks/
  │   └── useProducts.tsx       # TanStack Query hook
  ├── utils/
  │   └── queryClient.tsx       # Query client configuration
  └── app/
      ├── components/
      │   └── VirtualizedProductList.tsx  # Virtual list component
      └── pages/admin/
          └── ProductsVirtualized.tsx     # Admin page with sync button
```

## Dependencies

- `@tanstack/react-query` - Data fetching and caching
- `react-window` - Virtual scrolling
- `fuse.js` - Fuzzy search

## Configuration

### Cache Duration

**Server** (`sync-products.tsx`):
```tsx
cacheControl: '3600'  // 1 hour CDN cache
```

**Client** (`useProducts.tsx`):
```tsx
staleTime: 5 * 60 * 1000  // 5 minutes before refetch
gcTime: 10 * 60 * 1000    // 10 minutes cache retention
```

### Virtual List Settings

**Row Height** (`VirtualizedProductList.tsx`):
```tsx
itemSize={100}  // 100px per row
```

### Search Configuration

**Fuse.js Threshold** (`VirtualizedProductList.tsx`):
```tsx
threshold: 0.3  // 0 = exact match, 1 = match anything
```

## Troubleshooting

### "Products file not found" Error
**Solution**: Click the "Sync to CDN" button to create the initial JSON file.

### Search Not Working
**Solution**: Verify that the `keys` array in Fuse.js configuration matches your product structure.

### Slow Performance
**Solution**: 
- Reduce `itemSize` for smaller rows
- Decrease the number of search keys
- Check browser DevTools for network/memory issues

## Future Enhancements

- Incremental updates (delta sync)
- Background sync every X hours
- Compression (gzip/brotli)
- Service Worker caching for offline support
- Virtual grid (react-window-infinite-loader)
