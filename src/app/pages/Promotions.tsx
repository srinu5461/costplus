import { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { Product } from '../types/product';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { ChevronDown, ChevronRight, Tag, Filter, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useProducts } from '../../hooks/useProducts';

interface Promotion {
  id: string;
  productId: string;
  promotionalPrice: number;
  active: boolean;
}

interface Category {
  id: string;
  name: string;
  fullPath: string;
  productCount?: number;
}

export function Promotions() {
  // Load products from CDN (fast!)
  const { data: allProductsFromCDN, isLoading: productsLoading } = useProducts();
  const allProducts = allProductsFromCDN || [];

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  // Filters
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 24;

  const loading = productsLoading || promotionsLoading;

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    setPromotionsLoading(true);
    try {
      console.log('[Promotions] Loading promotions...');

      const promotionsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/promotions`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );

      if (!promotionsResponse.ok) {
        throw new Error('Failed to load promotions');
      }

      const promotionsData = await promotionsResponse.json();
      const loadedPromotions = Array.isArray(promotionsData) ? promotionsData : [];
      setPromotions(loadedPromotions);
      console.log(`[Promotions] ✅ Loaded ${loadedPromotions.length} promotions`);
    } catch (error) {
      console.error('[Promotions] ❌ Failed to load promotions:', error);
      alert('Failed to load promotions. Please refresh the page.');
    } finally {
      setPromotionsLoading(false);
    }
  };

  // Filter products from CDN when products or promotions change
  useEffect(() => {
    if (!allProducts || allProducts.length === 0 || promotions.length === 0) {
      setBrands([]);
      setCategories([]);
      return;
    }

    console.log(`[Promotions] Filtering ${allProducts.length} products from CDN...`);

    // Filter to only promotional products
    const promoProductIds = new Set(promotions.map(p => p.productId));
    const promoProducts = allProducts.filter((p: Product) => promoProductIds.has(p.id));
    console.log(`[Promotions] ✅ Found ${promoProducts.length} promotional products from CDN`);

    // Extract brands from promotional products
    const uniqueBrands = Array.from(new Set(promoProducts.map((p: Product) => p.brand).filter(Boolean)));
    setBrands(uniqueBrands.sort());

    // Extract unique categories from promotional products using FULL PATH as key
    const categoryPathsMap = new Map<string, { name: string; fullPath: string; count: number }>();
    promoProducts.forEach((p: Product) => {
      if (p.fullCategoryPath && p.fullCategoryPath.trim()) {
        const fullPath = p.fullCategoryPath.trim();
        // Use full path as the key to avoid duplicates
        const existing = categoryPathsMap.get(fullPath);
        if (existing) {
          existing.count++;
        } else {
          // Show the full path as the display name for clarity
          // This helps distinguish "Kitchen > Freezers" from "Bar > Freezers"
          categoryPathsMap.set(fullPath, {
            name: fullPath, // Show full path instead of just leaf name
            fullPath: fullPath,
            count: 1
          });
        }
      }
    });

    const uniqueCategories = Array.from(categoryPathsMap.values())
      .map(cat => ({
        id: cat.fullPath,
        name: cat.name,
        fullPath: cat.fullPath,
        productCount: cat.count
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

    setCategories(uniqueCategories);
    console.log(`[Promotions] ✅ Found ${uniqueBrands.length} brands, ${uniqueCategories.length} categories`);
  }, [allProducts, promotions]);

  // Get products that have active promotions (from CDN)
  const promotionalProducts = allProducts.filter(product => {
    return promotions.some(promo => promo.productId === product.id && promo.active);
  });

  // Apply filters
  const filteredProducts = promotionalProducts.filter(product => {
    // Category filter
    if (selectedCategories.size > 0) {
      const matchesCategory = Array.from(selectedCategories).some(catPath => {
        return product.fullCategoryPath?.toLowerCase().includes(catPath.toLowerCase());
      });
      if (!matchesCategory) return false;
    }

    // Brand filter
    if (selectedBrands.size > 0) {
      if (!product.brand || !selectedBrands.has(product.brand)) {
        return false;
      }
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const toggleCategory = (categoryPath: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryPath)) {
      newSelected.delete(categoryPath);
    } else {
      newSelected.add(categoryPath);
    }
    setSelectedCategories(newSelected);
    setCurrentPage(1);
  };

  const toggleBrand = (brand: string) => {
    const newSelected = new Set(selectedBrands);
    if (newSelected.has(brand)) {
      newSelected.delete(brand);
    } else {
      newSelected.add(brand);
    }
    setSelectedBrands(newSelected);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedCategories(new Set());
    setSelectedBrands(new Set());
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedCategories.size > 0 || selectedBrands.size > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E31837] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading promotions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#E31837] to-[#C41530] text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-3">
            <Tag className="size-10" />
            <h1 className="text-4xl font-bold">Special Promotions</h1>
          </div>
          <p className="text-xl text-white/90">
            {promotionalProducts.length} products on special offer
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className={`${showFilters ? 'w-64' : 'w-0'} transition-all duration-300 flex-shrink-0`}>
            {showFilters && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-lg text-[#2D3748] flex items-center gap-2">
                    <Filter className="size-5" />
                    Filters
                  </h2>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-[#E31837] hover:underline font-semibold"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Categories Filter */}
                <div className="mb-6">
                  <h3 className="font-semibold text-sm text-slate-700 mb-3 uppercase tracking-wide">
                    Categories
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {categories.slice(0, 20).map((category) => {
                      const isSelected = selectedCategories.has(category.fullPath);
                      // Format category name - replace > with • for better readability
                      const displayName = category.name.replace(/\s*>\s*/g, ' • ');

                      return (
                        <label
                          key={category.id}
                          className="flex items-start gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCategory(category.fullPath)}
                            className="mt-1 size-4 rounded border-slate-300 flex-shrink-0"
                          />
                          <span className="text-xs text-slate-700 flex-1 leading-relaxed">
                            {displayName}
                            {category.productCount && category.productCount > 0 && (
                              <span className="text-xs text-slate-400 ml-1">
                                ({category.productCount})
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Brands Filter */}
                <div>
                  <h3 className="font-semibold text-sm text-slate-700 mb-3 uppercase tracking-wide">
                    Brands
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {brands.slice(0, 20).map((brand) => {
                      const isSelected = selectedBrands.has(brand);
                      const brandProductCount = promotionalProducts.filter(p => p.brand === brand).length;

                      return (
                        <label
                          key={brand}
                          className="flex items-start gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleBrand(brand)}
                            className="mt-1 size-4 rounded border-slate-300"
                          />
                          <span className="text-sm text-slate-700 flex-1">
                            {brand}
                            <span className="text-xs text-slate-400 ml-1">
                              ({brandProductCount})
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Filter Toggle & Results Count */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Filter className="size-4" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
                <p className="text-slate-600">
                  <span className="font-semibold text-[#2D3748]">{filteredProducts.length}</span> promotional products
                  {hasActiveFilters && ' (filtered)'}
                </p>
              </div>

              {hasActiveFilters && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Active filters:</span>
                  {Array.from(selectedCategories).map(cat => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                    >
                      {categories.find(c => c.fullPath === cat)?.name || cat}
                      <button onClick={() => toggleCategory(cat)}>
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  {Array.from(selectedBrands).map(brand => (
                    <span
                      key={brand}
                      className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded"
                    >
                      {brand}
                      <button onClick={() => toggleBrand(brand)}>
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Products Grid */}
            {currentProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentProducts.map((product) => {
                  // Attach promotional price to product
                  const promotion = promotions.find(p => p.productId === product.id && p.active);
                  const productWithPromo = promotion
                    ? { ...product, promotionalPrice: promotion.promotionalPrice }
                    : product;

                  return (
                    <ProductCard key={product.id} product={productWithPromo} sectionTag="promotion" />
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
                <Tag className="size-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No products found</h3>
                <p className="text-slate-600 mb-4">
                  {hasActiveFilters
                    ? 'Try adjusting your filters to see more products'
                    : 'No promotional products available at this time'}
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2 rounded transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[#E31837] text-white font-semibold'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
