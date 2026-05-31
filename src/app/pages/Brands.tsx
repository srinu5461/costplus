import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router';
import { ProductCard } from '../components/ProductCard';
import { useCMS } from '../context/CMSContext';
import { useProducts } from '../../hooks/useProducts';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Search, ChevronRight, Package, ChevronLeft } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export function Brands() {
  const { brandName } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ✅ Get metadata from CMS
  const cms = useCMS();
  const data = cms.data;
  const cmsLoading = cms.loading;

  // ⚡ Get products from CDN JSON (with fallback)
  const { data: productsFromCDN, isLoading: productsLoading, isError: productsError } = useProducts();

  // ✅ SMART FALLBACK: Use CDN if available, otherwise use CMS products
  const products = (productsFromCDN && productsFromCDN.length > 0)
    ? productsFromCDN
    : data.products || [];

  const loading = cmsLoading || (productsLoading && !data.products?.length);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // ✅ Get initial sort from URL parameter - DEFAULT to highest price first
  const sortParam = searchParams.get('sort');
  const [sortBy, setSortBy] = useState<string>(sortParam || 'priceHigh');
  
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const PRODUCTS_PER_PAGE = 20;

  // Get all unique brands with product counts and logos
  const brands = useMemo(() => {
    const brandMap = new Map<string, { 
      name: string; 
      productCount: number;
      logoUrl?: string;
      products: typeof products;
    }>();
    
    products.forEach((p) => {
      if (p.brand) {
        const existing = brandMap.get(p.brand);
        if (existing) {
          existing.productCount++;
          existing.products.push(p);
        } else {
          brandMap.set(p.brand, {
            name: p.brand,
            productCount: 1,
            logoUrl: (p as any).brandLogoUrl,
            products: [p]
          });
        }
      }
    });
    
    return Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Filter brands by search query
  const filteredBrands = useMemo(() => {
    if (!searchQuery) return brands;
    return brands.filter((b) => 
      b.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [brands, searchQuery]);

  // Get products for selected brand
  const selectedBrand = brandName ? brands.find(b => b.name.toLowerCase() === brandName.toLowerCase()) : null;
  
  // Get categories for the selected brand's products
  const brandCategories = useMemo(() => {
    if (!selectedBrand) return [];
    const categorySet = new Set<string>();
    selectedBrand.products.forEach(p => {
      // Get the deepest category level
      const categoryLevel4 = (p as any).categoryLevel4;
      const categoryLevel3 = (p as any).categoryLevel3;
      const categoryLevel2 = (p as any).categoryLevel2;
      const categoryLevel1 = (p as any).categoryLevel1;
      
      const category = categoryLevel4 || categoryLevel3 || categoryLevel2 || categoryLevel1;
      if (category) categorySet.add(category);
    });
    return Array.from(categorySet).sort();
  }, [selectedBrand]);

  // Get price stats for brand products
  const brandPriceStats = useMemo(() => {
    if (!selectedBrand) return { min: 0, max: 10000 };
    const prices = selectedBrand.products.map((p) => {
      const price = typeof p.price === 'string' 
        ? parseFloat(p.price.replace(/[^0-9.-]+/g, ''))
        : p.price;
      return price;
    }).filter((p) => !isNaN(p));
    
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices))
    };
  }, [selectedBrand]);

  // Filter brand products by price and category
  const filteredBrandProducts = useMemo(() => {
    if (!selectedBrand) return [];
    
    let filtered = selectedBrand.products;
    
    // Filter by price range
    if (priceRange[0] > brandPriceStats.min || priceRange[1] < brandPriceStats.max) {
      filtered = filtered.filter((p) => {
        const price = typeof p.price === 'string' 
          ? parseFloat(p.price.replace(/[^0-9.-]+/g, ''))
          : p.price;
        return price >= priceRange[0] && price <= priceRange[1];
      });
    }
    
    // Filter by selected categories
    if (selectedCategories.size > 0) {
      filtered = filtered.filter((p) => {
        const categoryLevel4 = (p as any).categoryLevel4;
        const categoryLevel3 = (p as any).categoryLevel3;
        const categoryLevel2 = (p as any).categoryLevel2;
        const categoryLevel1 = (p as any).categoryLevel1;
        
        const category = categoryLevel4 || categoryLevel3 || categoryLevel2 || categoryLevel1;
        return category && selectedCategories.has(category);
      });
    }
    
    return filtered;
  }, [selectedBrand, priceRange, selectedCategories, brandPriceStats]);
  
  // Sort and paginate brand products
  const sortedBrandProducts = useMemo(() => {
    if (!selectedBrand) return [];
    
    const productsArray = Array.from(filteredBrandProducts);
    
    switch (sortBy) {
      case 'priceLow':
        return productsArray.sort((a, b) => {
          const priceA = typeof a.price === 'string' 
            ? parseFloat(a.price.replace(/[^0-9.-]+/g, '')) 
            : (typeof a.price === 'number' ? a.price : 0);
          const priceB = typeof b.price === 'string' 
            ? parseFloat(b.price.replace(/[^0-9.-]+/g, '')) 
            : (typeof b.price === 'number' ? b.price : 0);
          return priceA - priceB;
        });
      case 'priceHigh':
        return productsArray.sort((a, b) => {
          const priceA = typeof a.price === 'string' 
            ? parseFloat(a.price.replace(/[^0-9.-]+/g, '')) 
            : (typeof a.price === 'number' ? a.price : 0);
          const priceB = typeof b.price === 'string' 
            ? parseFloat(b.price.replace(/[^0-9.-]+/g, '')) 
            : (typeof b.price === 'number' ? b.price : 0);
          return priceB - priceA;
        });
      case 'name':
        return productsArray.sort((a, b) => a.name.localeCompare(b.name));
      case 'featured':
      default:
        // Default: sort by highest price first
        return productsArray.sort((a, b) => {
          const priceA = typeof a.price === 'string'
            ? parseFloat(a.price.replace(/[^0-9.-]+/g, ''))
            : (typeof a.price === 'number' ? a.price : 0);
          const priceB = typeof b.price === 'string'
            ? parseFloat(b.price.replace(/[^0-9.-]+/g, ''))
            : (typeof b.price === 'number' ? b.price : 0);
          return priceB - priceA; // Highest price first
        });
    }
  }, [filteredBrandProducts, sortBy]);

  const toggleCategory = (category: string) => {
    const newCategories = new Set(selectedCategories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
    } else {
      newCategories.add(category);
    }
    setSelectedCategories(newCategories);
    setCurrentPage(1); // Reset to first page
  };

  const clearFilters = () => {
    setPriceRange([brandPriceStats.min, brandPriceStats.max]);
    setSelectedCategories(new Set());
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(sortedBrandProducts.length / PRODUCTS_PER_PAGE);
  const paginatedBrandProducts = sortedBrandProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );
  
  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // If viewing a specific brand
  if (brandName && selectedBrand) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Products Section with Sidebar */}
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          {/* Breadcrumb and Brand Title - Combined at Top */}
          <div className="mb-4 pb-4 border-b bg-gradient-to-b from-slate-50 to-white -mx-4 lg:-mx-6 px-4 lg:px-6 py-4 rounded-lg">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-[#E31837] transition-colors">
                Home
              </Link>
              <ChevronRight className="size-4" />
              <Link to="/brands" className="hover:text-[#E31837] transition-colors">
                Brands
              </Link>
              <ChevronRight className="size-4" />
              <span className="text-slate-900 font-medium">{selectedBrand.name}</span>
            </div>

            {/* Brand Title - Centered */}
            <div className="text-center">
              {/* Brand Logo */}
              {selectedBrand.logoUrl && (
                <div className="flex justify-center mb-2">
                  <div className="w-20 h-20 bg-white border rounded-lg p-2 flex items-center justify-center">
                    <img
                      src={selectedBrand.logoUrl}
                      alt={selectedBrand.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              <h1 className="text-2xl md:text-3xl font-bold mb-1">{selectedBrand.name}</h1>
              <p className="text-muted-foreground text-sm mb-1">
                Professional catering equipment from {selectedBrand.name}
              </p>
              <Badge variant="outline" className="w-fit mx-auto">
                {sortedBrandProducts.length} Products
              </Badge>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Sidebar Filters */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="space-y-4 sticky top-24">
                {/* Price Range Card */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-medium mb-4">Price Range (Ex GST)</h3>
                    <div className="space-y-4">
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">Min</label>
                          <Input
                            type="number"
                            value={priceRange[0]}
                            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                            className="h-9"
                            min={brandPriceStats.min}
                            max={brandPriceStats.max}
                          />
                        </div>
                        <span className="text-muted-foreground mt-5">-</span>
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">Max</label>
                          <Input
                            type="number"
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                            className="h-9"
                            min={brandPriceStats.min}
                            max={brandPriceStats.max}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ${brandPriceStats.min} - ${brandPriceStats.max}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Category Filter Card */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-medium mb-4">Categories</h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {brandCategories.map((category) => (
                        <label key={category} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedCategories.has(category)}
                            onChange={() => toggleCategory(category)}
                            className="rounded"
                          />
                          <span className="text-sm">{category}</span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Clear Filters Button */}
                {(priceRange[0] !== brandPriceStats.min || priceRange[1] !== brandPriceStats.max || selectedCategories.size > 0) && (
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="w-full"
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            </aside>

            {/* Products Grid */}
            <div className="flex-1">
              {sortedBrandProducts.length > 0 ? (
                <>
                  {/* Sorting and Results Info */}
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * PRODUCTS_PER_PAGE) + 1} - {Math.min(currentPage * PRODUCTS_PER_PAGE, sortedBrandProducts.length)} of {sortedBrandProducts.length} products
                    </p>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="featured">Featured</SelectItem>
                        <SelectItem value="priceLow">Price: Low to High</SelectItem>
                        <SelectItem value="priceHigh">Price: High to Low</SelectItem>
                        <SelectItem value="name">Name: A to Z</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pagination Controls - Top */}
                  {totalPages > 1 && (
                    <div className="mb-6 flex justify-center items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="size-4 mr-1" />
                        Previous
                      </Button>

                      <div className="flex gap-1">
                        {/* Show first page */}
                        {currentPage > 3 && (
                          <>
                            <Button
                              variant={1 === currentPage ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => goToPage(1)}
                              className="w-10"
                            >
                              1
                            </Button>
                            {currentPage > 4 && <span className="flex items-center px-2">...</span>}
                          </>
                        )}

                        {/* Show pages around current page */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => page >= currentPage - 2 && page <= currentPage + 2)
                          .map((page) => (
                            <Button
                              key={page}
                              variant={page === currentPage ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => goToPage(page)}
                              className="w-10"
                            >
                              {page}
                            </Button>
                          ))}

                        {/* Show last page */}
                        {currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && <span className="flex items-center px-2">...</span>}
                            <Button
                              variant={totalPages === currentPage ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => goToPage(totalPages)}
                              className="w-10"
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="size-4 ml-1" />
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {paginatedBrandProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  {/* Pagination Controls - Bottom */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex justify-center items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="size-4 mr-1" />
                        Previous
                      </Button>

                      <div className="flex gap-1">
                        {/* Show first page */}
                        {currentPage > 3 && (
                          <>
                            <Button
                              variant={1 === currentPage ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => goToPage(1)}
                              className="w-10"
                            >
                              1
                            </Button>
                            {currentPage > 4 && <span className="flex items-center px-2">...</span>}
                          </>
                        )}

                        {/* Show pages around current page */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => page >= currentPage - 2 && page <= currentPage + 2)
                          .map((page) => (
                            <Button
                              key={page}
                              variant={page === currentPage ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => goToPage(page)}
                              className="w-10"
                            >
                              {page}
                            </Button>
                          ))}

                        {/* Show last page */}
                        {currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && <span className="flex items-center px-2">...</span>}
                            <Button
                              variant={totalPages === currentPage ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => goToPage(totalPages)}
                              className="w-10"
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="size-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground text-lg mb-2">
                      No products found for {selectedBrand.name}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Try adjusting your filters or browse all brands
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/brands')}
                    >
                      Browse All Brands
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show all brands grid
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {/* Breadcrumb and Title - Combined at Top */}
        <div className="mb-4 pb-4 border-b bg-gradient-to-b from-slate-50 to-white -mx-4 px-4 py-4 rounded-lg">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-[#E31837] transition-colors">
              Home
            </Link>
            <ChevronRight className="size-4" />
            <span className="text-slate-900 font-medium">Brands</span>
          </div>

          {/* Title Section - Centered */}
          <div className="text-center mb-4">
            <h1 className="text-2xl lg:text-4xl font-bold mb-1">Shop by Brand</h1>
            <p className="text-muted-foreground text-sm lg:text-base mb-2">
              Browse products from top catering equipment manufacturers
            </p>
            <Badge variant="outline" className="w-fit mx-auto">
              {filteredBrands.length} Brands
            </Badge>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </div>
        </div>

        {/* Brands Grid */}
        <div className="px-4">
          {filteredBrands.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {filteredBrands.map((brand) => (
              <Link
                key={brand.name}
                to={`/brands/${encodeURIComponent(brand.name.toLowerCase())}`}
                className="block"
              >
                <Card className="h-full hover:shadow-xl transition-all border hover:border-slate-900 group w-full">
                  <CardContent className="p-6">
                    {/* Brand Logo */}
                    <div className="h-24 mb-4 flex items-center justify-center bg-white rounded-lg border">
                      {brand.logoUrl ? (
                        <img 
                          src={brand.logoUrl} 
                          alt={brand.name}
                          className="max-w-full max-h-full object-contain p-2"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="text-slate-400 text-3xl">📦</div>';
                            }
                          }}
                        />
                      ) : (
                        <div className="text-slate-400 text-3xl">
                          <Package className="size-12" />
                        </div>
                      )}
                    </div>
                    
                    {/* Brand Name */}
                    <h3 className="font-medium text-center mb-2 line-clamp-2 group-hover:text-slate-900">
                      {brand.name}
                    </h3>
                    
                    {/* Product Count */}
                    <p className="text-sm text-muted-foreground text-center">
                      {brand.productCount} {brand.productCount === 1 ? 'product' : 'products'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg mb-2">
                No brands found
              </p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search query
              </p>
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </div>
  );
}