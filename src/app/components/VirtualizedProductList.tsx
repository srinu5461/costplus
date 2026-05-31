// v2.0 - Custom virtual scrolling (no react-window)
import { useState, useMemo, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
import { useProducts, type Product } from '../../hooks/useProducts';
import { Search, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

interface VirtualizedProductListProps {
  refreshTrigger?: number;
}

export function VirtualizedProductList({ refreshTrigger }: VirtualizedProductListProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: products, isLoading, isError, error, refetch } = useProducts(refreshTrigger);

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    if (!products || products.length === 0) return null;

    return new Fuse(products, {
      keys: ['name', 'description', 'brand', 'category', 'code', 'sku'],
      threshold: 0.3,
      ignoreLocation: true,
    });
  }, [products]);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;
    if (!fuse) return products;

    const results = fuse.search(searchQuery);
    return results.map((result) => result.item);
  }, [products, searchQuery, fuse]);

  // Simple virtual scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;

      const scrollTop = scrollRef.current.scrollTop;
      const itemHeight = 100;
      const visibleCount = 50;
      const bufferCount = 10;

      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferCount);
      const end = start + visibleCount + bufferCount * 2;

      setVisibleRange({ start, end });
    };

    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', handleScroll);
      return () => scrollEl.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Render a single product row
  const renderProduct = (product: Product, index: number) => {
    return (
      <div
        key={index}
        className="border-b border-gray-200 px-4 py-3 hover:bg-gray-50 flex items-center gap-4"
        style={{ height: '100px' }}
      >
        {/* Product Image */}
        {product.image && (
          <img
            src={product.image}
            alt={product.name || 'Product'}
            className="w-16 h-16 object-cover rounded"
          />
        )}

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {product.name || 'Unnamed Product'}
          </h3>
          <p className="text-sm text-gray-500 truncate">
            {product.code || product.sku || 'No code'}
          </p>
          {product.brand && (
            <p className="text-xs text-gray-400">{product.brand}</p>
          )}
        </div>

        {/* Price */}
        {product.price && (
          <div className="text-right">
            <p className="font-semibold text-gray-900">
              ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading products from CDN...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const needsSync = errorMessage.includes('not found') || errorMessage.includes('sync first');

    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {needsSync ? 'Products Not Synced' : 'Failed to Load Products'}
          </h2>
          <p className="text-gray-600 mb-4">
            {needsSync
              ? 'The products file hasn\'t been created yet. Click the "Sync to CDN" button above to create it.'
              : errorMessage
            }
          </p>
          {!needsSync && (
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name, code, brand, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            Showing {filteredProducts.length.toLocaleString()} of {products?.length.toLocaleString() || 0} products
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Virtualized List */}
      <div className="flex-1 overflow-hidden">
        {!filteredProducts || filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No products found
              </h3>
              <p className="text-gray-600">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'No products available'}
              </p>
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="h-full overflow-y-auto">
            <div style={{ height: filteredProducts.length * 100, position: 'relative' }}>
              <div style={{ position: 'absolute', top: visibleRange.start * 100, left: 0, right: 0 }}>
                {filteredProducts.slice(visibleRange.start, visibleRange.end).map((product, idx) =>
                  renderProduct(product, visibleRange.start + idx)
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
