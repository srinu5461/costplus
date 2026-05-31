import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Search, Package } from 'lucide-react';

export default function AllProducts() {
  const location = useLocation();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // Read search parameter from URL on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [location.search]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');

      // Try multiple key patterns to find products
      console.log('🔍 Searching for products...');
      
      // Pattern 1: product:*
      let { data, error: queryError } = await supabase
        .from('kv_store_577b3f26')
        .select('key, value')
        .like('key', 'product:%')
        .order('key', { ascending: true })
        .limit(1000);

      // Pattern 2: If no results, try opencart:product:*
      if (!data || data.length === 0) {
        console.log('⚠️ No products found with pattern "product:%", trying "opencart:product:%"...');
        const result = await supabase
          .from('kv_store_577b3f26')
          .select('key, value')
          .like('key', 'opencart:product:%')
          .order('key', { ascending: true })
          .limit(1000);
        data = result.data;
        queryError = result.error;
      }

      // Pattern 3: If still no results, try uropa:product:*
      if (!data || data.length === 0) {
        console.log('⚠️ No products found with pattern "opencart:product:%", trying "uropa:product:%"...');
        const result = await supabase
          .from('kv_store_577b3f26')
          .select('key, value')
          .like('key', 'uropa:product:%')
          .order('key', { ascending: true })
          .limit(1000);
        data = result.data;
        queryError = result.error;
      }

      if (queryError) {
        console.error('Database query error:', queryError);
        setError(`Database error: ${queryError.message}`);
        setLoading(false);
        return;
      }

      console.log(`✅ Found ${data?.length || 0} products in database`);

      if (!data || data.length === 0) {
        setError('No products found in database. Import products first.');
        setLoading(false);
        return;
      }

      // Parse products
      const parsedProducts = data.map((row: any) => {
        try {
          const productData = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
          return {
            id: row.key,
            ...productData
          };
        } catch (e) {
          console.error('Failed to parse product:', row.key, e);
          return null;
        }
      }).filter(Boolean);

      console.log(`Loaded ${parsedProducts.length} products`);
      setProducts(parsedProducts);
      setTotalCount(parsedProducts.length);
      setLoading(false);

    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError(`Failed to load products: ${err.message}`);
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(search) ||
      p.code?.toLowerCase().includes(search) ||
      p.sku?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Products</h1>
          <p className="text-gray-600">
            {loading ? 'Loading...' : `${totalCount} products in database`}
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products by name, code, or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-700 focus:border-transparent"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-slate-700 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Loading products from database...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-900 font-semibold mb-2">Error</p>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadProducts}
              className="mt-4 px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                {/* Product Image */}
                {product.image && (
                  <div className="aspect-square mb-4 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name || 'Product'}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="16"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                )}

                {/* Product Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                    {product.name || product.title || 'Unnamed Product'}
                  </h3>
                  
                  {product.code && (
                    <p className="text-sm text-gray-500 mb-2">
                      Code: {product.code}
                    </p>
                  )}

                  {product.sku && (
                    <p className="text-sm text-gray-500 mb-2">
                      SKU: {product.sku}
                    </p>
                  )}

                  {product.price && (
                    <p className="text-lg font-bold text-slate-700 mb-3">
                      ${parseFloat(product.price).toFixed(2)} <span className="text-xs text-gray-500">ex GST</span>
                    </p>
                  )}

                  {product.stock !== undefined && (
                    <p className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </p>
                  )}
                </div>

                {/* Add to Cart Button */}
                <button className="w-full mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors">
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredProducts.length === 0 && products.length > 0 && (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No products match "{searchTerm}"</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && products.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold mb-2">No Products Found</p>
            <p className="text-gray-600 mb-4">Import products to get started</p>
            <button
              onClick={() => window.location.href = '/admin/tools'}
              className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800"
            >
              Go to Import Tools
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}