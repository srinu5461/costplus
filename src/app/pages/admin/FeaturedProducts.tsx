import { useState, useEffect } from 'react';
import { Search, Save, Loader2, Plus, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Product } from '../../types/product';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notifications';

type SectionType = 'featured' | 'popular' | 'promotion';

export function FeaturedProducts() {
  const [activeTab, setActiveTab] = useState<SectionType>('featured');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [allSearchResults, setAllSearchResults] = useState<Product[]>([]); // Store ALL results
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(0);
  const RESULTS_PER_PAGE = 50;
  
  // Selected product IDs for each section
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [popularIds, setPopularIds] = useState<string[]>([]);
  const [promotionIds, setPromotionIds] = useState<string[]>([]);

  const MAX_PRODUCTS_PER_SECTION = 20;

  useEffect(() => {
    loadSectionData();
  }, []);

  // Load selected products whenever tab changes OR IDs change
  useEffect(() => {
    const loadProducts = async () => {
      const currentIds = getCurrentIds();
      logger.debug(`Loading products for ${activeTab}`, { count: currentIds.length });
      
      // Clear old products immediately when tab changes
      setSelectedProducts([]);
      setError(null);
      
      if (currentIds.length === 0) {
        setLoadingTab(false);
        return;
      }

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/products/batch`,
          {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ codes: currentIds }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load products: ${response.status}`);
        }

        const products = await response.json();
        logger.info(`Loaded products for ${activeTab}`, { count: products.length });
        setSelectedProducts(products);
      } catch (error) {
        logger.error('Failed to load selected products', error);
        setError(`Failed to load products: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoadingTab(false);
      }
    };

    loadProducts();
  }, [activeTab, featuredIds, popularIds, promotionIds]);

  const getCurrentIds = () => {
    switch (activeTab) {
      case 'featured': return featuredIds;
      case 'popular': return popularIds;
      case 'promotion': return promotionIds;
    }
  };

  const setCurrentIds = (ids: string[]) => {
    switch (activeTab) {
      case 'featured': setFeaturedIds(ids); break;
      case 'popular': setPopularIds(ids); break;
      case 'promotion': setPromotionIds(ids); break;
    }
  };

  const loadSectionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/featured-sections`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load sections: ${response.status}`);
      }

      const data = await response.json();
      setFeaturedIds(data.featured || []);
      setPopularIds(data.popular || []);
      setPromotionIds(data.promotion || []);
      logger.info('Section data loaded successfully');
    } catch (error) {
      logger.error('Failed to load section data', error);
      setError(`Failed to load section data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setAllSearchResults([]);
      setSearchPage(1);
      setSearchTotal(0);
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const currentIds = getCurrentIds();
      const excludeParam = currentIds.length > 0 ? `&exclude=${currentIds.join(',')}` : '';
      
      // Fetch ALL results at once (no pagination on server)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/products/search?q=${encodeURIComponent(searchTerm)}&page=1&limit=10000${excludeParam}`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      const allResults = data.products || [];
      
      // Store all results
      setAllSearchResults(allResults);
      setSearchTotal(allResults.length);
      setSearchPage(1);
      
      // Show first page
      setSearchResults(allResults.slice(0, RESULTS_PER_PAGE));
      
      logger.info('Search completed', { 
        query: searchTerm, 
        totalResults: allResults.length 
      });
    } catch (error) {
      logger.error('Failed to search products', error);
      setError(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSearching(false);
    }
  };

  // Client-side pagination - no API call!
  const goToPage = (page: number) => {
    const totalPages = Math.ceil(searchTotal / RESULTS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    
    setSearchPage(page);
    const start = (page - 1) * RESULTS_PER_PAGE;
    const end = start + RESULTS_PER_PAGE;
    setSearchResults(allSearchResults.slice(start, end));
    
    logger.debug('Client-side pagination', { page, totalPages });
  };

  const addProduct = (product: Product) => {
    const currentIds = getCurrentIds();
    if (currentIds.length >= MAX_PRODUCTS_PER_SECTION) {
      notify.warning(`Maximum ${MAX_PRODUCTS_PER_SECTION} products allowed per section`);
      return;
    }

    setCurrentIds([...currentIds, product.code]);
    setSelectedProducts([...selectedProducts, product]);
    
    // Remove from search results
    const newAllResults = allSearchResults.filter(p => p.code !== product.code);
    setAllSearchResults(newAllResults);
    
    // Update displayed page
    const start = (searchPage - 1) * RESULTS_PER_PAGE;
    const end = start + RESULTS_PER_PAGE;
    setSearchResults(newAllResults.slice(start, end));
    setSearchTotal(newAllResults.length);
    
    logger.debug('Product added', { code: product.code, section: activeTab });
  };

  const removeProduct = (productCode: string) => {
    const currentIds = getCurrentIds();
    setCurrentIds(currentIds.filter(id => id !== productCode));
    setSelectedProducts(selectedProducts.filter(p => p.code !== productCode));
    logger.debug('Product removed', { code: productCode, section: activeTab });
  };

  const saveSectionAssignments = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/featured-sections`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-API-Key': publicAnonKey,
          },
          body: JSON.stringify({
            featured: featuredIds,
            popular: popularIds,
            promotion: promotionIds,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to save: ${response.status} - ${errorData}`);
      }

      const timestamp = new Date().toLocaleTimeString();
      setLastSaved(timestamp);
      notify.success('Section assignments saved successfully!');
      logger.info('Section assignments saved', { timestamp });

      // Rebuild featured CDN file in background so homepage loads fast
      fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/sync-featured`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      ).catch(() => {});
    } catch (error) {
      logger.error('Failed to save section assignments', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to save: ${errorMsg}`);
      notify.error('Failed to save section assignments', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#2D3748] mb-2">Homepage Sections</h1>
        <p className="text-slate-600">Manage products in Featured, Popular, and Promotion sections (max 20 per section)</p>
        
        {/* Cache Reminder Banner */}
        <div className="mt-4 bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
          <p className="text-sm text-blue-900">
            ✅ <strong>Auto-Rebuild Enabled:</strong> Section caches are now automatically rebuilt when you click "Save Changes" below. Your customers will see updates within 5 minutes (cache refresh time).
          </p>
          <p className="text-sm text-blue-700 mt-2">
            💡 <strong>Optional:</strong> For immediate update, go to <strong>Dashboard</strong> → <strong>Cache Management</strong> → <strong>"Clear All Caches"</strong>
          </p>
        </div>
        
        {/* Error Alert */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 mb-1">Error</h3>
                <p className="text-xs text-red-600">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        {/* Stats Banner */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Selection Status</h3>
              <div className="flex flex-wrap gap-4 text-xs text-blue-600">
                <div>
                  <span className="font-medium">Featured:</span> {featuredIds.length}/{MAX_PRODUCTS_PER_SECTION}
                </div>
                <div>
                  <span className="font-medium">Popular:</span> {popularIds.length}/{MAX_PRODUCTS_PER_SECTION}
                </div>
                <div>
                  <span className="font-medium">Promotion:</span> {promotionIds.length}/{MAX_PRODUCTS_PER_SECTION}
                </div>
                {lastSaved && (
                  <div className="ml-auto">
                    <span className="font-medium">Last saved:</span> {lastSaved}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        {(['featured', 'popular', 'promotion'] as SectionType[]).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setShowSearch(false);
              setSearchTerm('');
              setSearchResults([]);
              setAllSearchResults([]);
              setSearchPage(1);
              setSearchTotal(0);
              setLoadingTab(true);
              setError(null);
            }}
            className={`px-6 py-3 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-[#E31837] border-b-2 border-[#E31837]'
                : 'text-slate-600 hover:text-[#2D3748]'
            }`}
          >
            {tab}
            <span className={`ml-2 text-sm px-2 py-1 rounded ${
              activeTab === tab ? 'bg-red-100 text-[#E31837]' : 'bg-slate-100'
            }`}>
              {tab === 'featured' && featuredIds.length}
              {tab === 'popular' && popularIds.length}
              {tab === 'promotion' && promotionIds.length}
            </span>
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowSearch(!showSearch)}
          disabled={loading || loadingTab}
          className="flex items-center gap-2 bg-[#2D3748] text-white px-6 py-2 rounded-lg hover:bg-[#1a202c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {showSearch ? (
            <>
              <X className="w-4 h-4" />
              Close Search
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add Products
            </>
          )}
        </button>

        <button
          onClick={saveSectionAssignments}
          disabled={saving || loading}
          className="flex items-center gap-2 bg-[#E31837] text-white px-6 py-2 rounded-lg hover:bg-[#C41530] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save All Changes
            </>
          )}
        </button>
      </div>

      {/* Search Interface */}
      {showSearch && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#2D3748] mb-4">Search Products to Add</h2>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, code, SKU, or brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !searching) {
                    setSearchPage(1);
                    searchProducts();
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
              />
            </div>
            <button
              onClick={() => {
                setSearchPage(1);
                searchProducts();
              }}
              disabled={searching || !searchTerm.trim()}
              className="flex items-center gap-2 bg-[#2D3748] text-white px-6 py-2 rounded-lg hover:bg-[#1a202c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search
                </>
              )}
            </button>
          </div>

          {/* Search Results with Pagination */}
          {searchResults.length > 0 && (
            <>
              {/* Pagination Header */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3 mb-3 flex items-center justify-between">
                <div className="text-sm text-blue-900">
                  <span className="font-semibold">{searchTotal.toLocaleString()}</span> products found
                  {searchTotal > RESULTS_PER_PAGE && (
                    <span className="ml-2 text-blue-700">
                      • Page {searchPage} of {Math.ceil(searchTotal / RESULTS_PER_PAGE)}
                    </span>
                  )}
                </div>
                {searchTotal > RESULTS_PER_PAGE && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(searchPage - 1)}
                      disabled={searchPage === 1}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-300 rounded text-sm text-blue-900 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <span className="text-sm font-medium text-blue-900 px-2 min-w-[80px] text-center">
                      {searchPage} / {Math.ceil(searchTotal / RESULTS_PER_PAGE)}
                    </span>
                    <button
                      onClick={() => goToPage(searchPage + 1)}
                      disabled={searchPage * RESULTS_PER_PAGE >= searchTotal}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-300 rounded text-sm text-blue-900 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Image</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Code</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Brand</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Price</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {searchResults.map(product => (
                        <tr key={product.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <img
                              src={product.mainImageUrl || product.image || 'https://via.placeholder.com/60'}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/60';
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{product.code || product.sku || '-'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-xs truncate">{product.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{product.brand || '-'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                            ${product.price?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => addProduct(product)}
                              disabled={getCurrentIds().length >= MAX_PRODUCTS_PER_SECTION}
                              className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3" />
                              Add
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {searchTerm && !searching && searchResults.length === 0 && allSearchResults.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No products found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}

      {/* Selected Products */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden" key={activeTab}>
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-[#2D3748]">
            Selected Products for {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            <span className="ml-2 text-sm font-normal text-slate-600">
              ({selectedProducts.length}/{MAX_PRODUCTS_PER_SECTION})
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#E31837] mb-4" />
            <p className="text-slate-600">Loading section data...</p>
          </div>
        ) : loadingTab ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#E31837] mb-4" />
            <p className="text-slate-600">Loading {activeTab} products...</p>
          </div>
        ) : selectedProducts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="mb-2">No products selected for this section</p>
            <p className="text-sm">Click "Add Products" to search and add products</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Image</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Product Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Brand</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedProducts.map((product, index) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                    <td className="px-4 py-3">
                      <img
                        src={product.mainImageUrl || product.image || 'https://via.placeholder.com/60'}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/60';
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{product.code || product.sku || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{product.brand || '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      ${product.price?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeProduct(product.code)}
                        className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}