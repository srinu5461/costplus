import { useParams, Link, useNavigate } from 'react-router';
import { categoryToSlug } from '../utils/slugify';
import { useState, useMemo, useEffect } from 'react';
import { useCMS, CategoryNode } from '../context/CMSContext';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  ArrowLeft,
  ShoppingCart,
  Heart,
  Share2,
  Truck,
  Shield,
  CheckCircle2,
  Star,
  Plus,
  Minus,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  MapPin,
  Award,
  RefreshCw,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { buildCategoryTree } from '../utils/categoryTree';
import { AgeRestrictionModal } from '../components/AgeRestrictionModal';
import { SizeSelector } from '../components/SizeSelector';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getProductBadge, getSpecialsForProduct } from '../utils/bogoCalculator';
import { SEOHead, generateProductSchema, generateBreadcrumbSchema } from '../components/SEOHead';
import { useProducts } from '../../hooks/useProducts';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function ProductDetail() {
  const { id } = useParams();

  // ✅ Get metadata from CMS
  let data;
  let refreshData: (() => Promise<void>) | undefined;
  let cmsLoading = false;
  try {
    const cms = useCMS();
    data = cms.data;
    refreshData = cms.refreshData;
    cmsLoading = cms.loading;
  } catch (e) {
    console.error('ProductDetail: CMSProvider not available, using empty data');
    data = {
      products: [],
      categories: [],
      categoryTree: [],
      header: { logo: '', phone: '', workingHours: '', navigation: [] },
      footer: { about: '', email: '', phone: '', address: '', socialMedia: {} },
      homepage: { hero: { title: '', subtitle: '', image: '' }, features: [] },
    };
  }

  // ⚡ DIRECT PRODUCT API: Fetch single product for direct URLs (Google Ads, etc)
  const [apiProduct, setApiProduct] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ⚡ DON'T load CDN JSON for single product pages (wasteful to load 13,781 products for 1 product)
  // Instead, we'll fetch this single product from API or use CMS products if already loaded

  // Use CMS products ONLY if they're already loaded (don't wait for them)
  const allProducts = data.products || [];

  // CDN products for related products (avoids OOM server fetch)
  const { data: cdnProducts } = useProducts();

  const loading = cmsLoading;

  // ⚡ Load cached product immediately for instant display on refresh
  const [cachedProduct, setCachedProduct] = useState(() => {
    try {
      const cached = localStorage.getItem(`product_${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Get current cache version from localStorage
        const currentVersion = localStorage.getItem('cms_cache_version') || '1';
        const cacheVersion = parsed.version || '1';

        // Use cache if version matches (no time expiration!)
        if (currentVersion === cacheVersion) {
          // ✅ VALIDATE: Check that cached product actually matches the requested ID
          const cachedProductId = parsed.product?.code || parsed.product?.productCode || parsed.product?.sku || parsed.product?.id;
          const idsMatch = cachedProductId === id;

          if (idsMatch) {
            console.log(`✅ [ProductDetail] Using cached product for ${id} (version: ${cacheVersion})`);
            return parsed.product;
          } else {
            console.warn(`⚠️ [ProductDetail] Initial cache ID mismatch! Requested ${id} but cache has ${cachedProductId}`);
          }
        } else {
          console.log(`⚠️ [ProductDetail] Cache version mismatch for ${id}, will load fresh`);
        }
      }
    } catch (error) {
      console.warn('[ProductDetail] Failed to load cached product:', error);
    }
    return null;
  });

  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizePrice, setSizePrice] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [openSection, setOpenSection] = useState<string | null>('specs');
  const [showAgeRestrictionModal, setShowAgeRestrictionModal] = useState(false);
  const [pendingCartAction, setPendingCartAction] = useState<'add' | 'buy' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [specialBadge, setSpecialBadge] = useState<{ text: string; color: string } | null>(null);
  const [activeSpecial, setActiveSpecial] = useState<any>(null);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [zoomImageIndex, setZoomImageIndex] = useState(0);

  // 🎯 Promotional pricing from separate promotions API
  const [promotion, setPromotion] = useState<{ id: string; productId: string; promotionalPrice: number; active: boolean } | null>(null);

  // 🔥 FIX: Move customer state hooks BEFORE early return
  // Get customer from localStorage
  const [customerData, setCustomerData] = useState(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('customer');
    return stored ? JSON.parse(stored) : null;
  });
  
  // Refresh customer session data on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const refreshCustomerSession = async () => {
      const stored = localStorage.getItem('customer');
      if (!stored) return;
      
      try {
        const customer = JSON.parse(stored);
        if (!customer.email) return;
        
        // Fetch fresh customer data from server
        const response = await fetch(
          `${API_URL}/customers/by-email/${encodeURIComponent(customer.email)}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );
        
        if (response.ok) {
          const freshData = await response.json();
          
          // Check if permissions have changed
          const costPriceChanged = customer.can_see_cost_price !== freshData.can_see_cost_price;
          const discountChanged = customer.discount_percentage !== freshData.discount_percentage;
          const costPlusHundredChanged = customer.cost_plus_hundred_access !== freshData.cost_plus_hundred_access;
          const permissionsChanged = costPriceChanged || discountChanged || costPlusHundredChanged;
          
          if (permissionsChanged) {
            // Update localStorage with fresh data
            localStorage.setItem('customer', JSON.stringify(freshData));
            setCustomerData(freshData);
            
            // Force page refresh to show updated prices
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }
        }
      } catch (error) {
        console.error('Error refreshing customer session:', error);
      }
    };
    
    refreshCustomerSession();
  }, []); // Run once on mount

  // ⚡ CRITICAL: Reset state when navigating between products
  useEffect(() => {
    console.log(`🔄 [ProductDetail] Route changed to product ${id}, resetting state...`);

    // Reset API state
    setApiProduct(null);
    setApiLoading(false);
    setApiError(null);

    // Load fresh cached product for this ID
    try {
      const cached = localStorage.getItem(`product_${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const currentVersion = localStorage.getItem('cms_cache_version') || '1';
        const cacheVersion = parsed.version || '1';

        if (currentVersion === cacheVersion) {
          // ✅ VALIDATE: Check that cached product actually matches the requested ID
          const cachedProductId = parsed.product?.code || parsed.product?.productCode || parsed.product?.sku || parsed.product?.id;
          const idsMatch = cachedProductId === id;

          console.log(`🔍 [ProductDetail] Cache validation:`, {
            requestedId: id,
            cachedProductId,
            cachedProductName: parsed.product?.name,
            idsMatch
          });

          if (idsMatch) {
            console.log(`✅ [ProductDetail] Using cached product for ${id}`);
            setCachedProduct(parsed.product);
          } else {
            console.warn(`⚠️ [ProductDetail] Cache ID mismatch! Requested ${id} but cache has ${cachedProductId}, will load fresh`);
            setCachedProduct(null);
          }
        } else {
          console.log(`⚠️ [ProductDetail] Cache version mismatch for ${id}, will load fresh`);
          setCachedProduct(null);
        }
      } else {
        setCachedProduct(null);
      }
    } catch (error) {
      console.warn('[ProductDetail] Failed to load cached product:', error);
      setCachedProduct(null);
    }

    // Reset UI state
    setSelectedImage(0);
    setQuantity(1);
    setOpenSection('specs');
  }, [id]); // Re-run when id changes

  // ⚡ ALWAYS fetch single product from API when no product found
  // This is faster than loading 13,781 products from CDN just to show 1 product
  useEffect(() => {
    // Check if we already have the product from CMS data
    const productInCMS = allProducts.find(p =>
      p.id === id || p.code === id || p.productCode === id || p.sku === id
    );

    // Debug logging
    console.log(`🔍 [ProductDetail] Checking if should fetch from API:`, {
      id,
      productInCMS: !!productInCMS,
      cachedProduct: !!cachedProduct,
      apiLoading,
      apiProduct: !!apiProduct,
      allProductsCount: allProducts.length,
    });

    const shouldFetchFromAPI =
      id &&
      !productInCMS &&
      !cachedProduct &&
      !apiLoading &&
      !apiProduct;

    if (shouldFetchFromAPI) {
      console.log(`⚡ [Single Product API] Fetching product ${id} from database (faster than loading 13,781 products from CDN)`);
      setApiLoading(true);
      setApiError(null);

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      fetch(`${API_URL}/product/${id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        signal: controller.signal,
      })
        .then(res => {
          clearTimeout(timeoutId);
          if (!res.ok) {
            return res.json().then(data => {
              throw new Error(data.error || `Product not found: ${res.status}`);
            });
          }
          return res.json();
        })
        .then(product => {
          console.log(`✅ [Single Product API] Loaded ${product.name || product.code} from database (1 product in ~200ms vs 13,781 products in ~5s from CDN)`);
          setApiProduct(product);
          setApiLoading(false);
        })
        .catch(err => {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            console.warn(`⚠️  [Single Product API] Request timed out`);
            setApiError('Request timed out');
          } else {
            console.warn(`⚠️  [Single Product API] Failed to fetch product:`, err);
            setApiError(err.message);
          }
          setApiLoading(false);
        });
    }
  }, [id, allProducts, cachedProduct, apiLoading, apiProduct]);

  // ⚡ FAST PATH: Try to find product in loaded data first
  let product = allProducts.find(p => p.id === id);

  // ✅ If not found by ID, try to find by code/productCode/SKU
  if (!product) {
    product = allProducts.find(p =>
      p.code === id ||
      p.productCode === id ||
      p.sku === id
    );
  }

  // ⚡ PRIORITY: API product (for direct URLs) > Products array > Cached
  // BUT: Validate that apiProduct actually matches the requested ID (prevent stale state during navigation)
  const apiProductMatches = apiProduct && (
    apiProduct.id === id ||
    apiProduct.code === id ||
    apiProduct.productCode === id ||
    apiProduct.sku === id
  );

  const finalProduct = apiProductMatches ? apiProduct : product;

  // ⚡ Cache the product when loaded for instant display on next visit
  useEffect(() => {
    if (finalProduct && id) {
      try {
        // ✅ VALIDATE: Only cache if product actually matches the requested ID
        const productId = finalProduct.code || finalProduct.productCode || finalProduct.sku || finalProduct.id;
        const idsMatch = productId === id;

        console.log(`💾 [ProductDetail] Cache check:`, {
          requestedId: id,
          productId,
          productName: finalProduct.name,
          idsMatch,
          willCache: idsMatch
        });

        if (!idsMatch) {
          console.warn(`⚠️ [ProductDetail] NOT caching - product ID mismatch! Requested ${id} but got ${productId}`);
          return;
        }

        // Get current cache version
        const currentVersion = localStorage.getItem('cms_cache_version') || '1';

        localStorage.setItem(`product_${id}`, JSON.stringify({
          product: finalProduct,
          timestamp: Date.now(),
          version: currentVersion
        }));
        console.log(`✅ [ProductDetail] Cached product ${id} (${finalProduct.name})`);

        // Update cached product state if it was different
        if (cachedProduct?.id !== finalProduct.id) {
          setCachedProduct(finalProduct);
        }
      } catch (error) {
        console.warn('[ProductDetail] Failed to cache product:', error);
      }
    }
  }, [finalProduct, id]);

  // Refresh customer session on mount
  useEffect(() => {
    if (finalProduct) {
      // Product loaded - no logging needed
    }
  }, [finalProduct]);

  // Fetch special badge and special data for this product (works with cached product too)
  useEffect(() => {
    const fetchSpecialData = async () => {
      const productToCheck = finalProduct || cachedProduct;
      if (productToCheck) {
        const productCode = productToCheck.code || productToCheck.sku || '';
        const brand = productToCheck.brand;
        const categoryId = productToCheck.categoryId;

        if (productCode || brand || categoryId) {
          // Fetch badge
          const badge = await getProductBadge(productCode, brand, categoryId);
          setSpecialBadge(badge);

          // Fetch actual special data for pricing
          const specials = await getSpecialsForProduct(productCode, brand, categoryId);
          if (specials && specials.length > 0) {
            setActiveSpecial(specials[0]);
          } else {
            setActiveSpecial(null);
          }
        }
      }
    };

    fetchSpecialData();
  }, [finalProduct?.code, finalProduct?.sku, finalProduct?.brand, finalProduct?.categoryId, cachedProduct]);

  // Build category tree for path resolution
  const categoryTree = useMemo(() => {
    return buildCategoryTree(data.categoryTree);
  }, [data.categoryTree]);

  // Build category ID → full path mapping
  const categoryIdToPath = useMemo(() => {
    const map = new Map<string, string>();
    
    const buildCategoryMap = (nodes: CategoryNode[]) => {
      for (const node of nodes) {
        if (node.id) {
          map.set(node.id, node.fullPath);
        }
        if ((node as any).categoryId) {
          map.set((node as any).categoryId, node.fullPath);
        }
        if (node.children && node.children.length > 0) {
          buildCategoryMap(node.children);
        }
      }
    };
    
    buildCategoryMap(categoryTree);
    return map;
  }, [categoryTree]);

  // ⚡ Use cached product while fresh data loads, prefer API/fresh data if available
  // BUT: Validate that cachedProduct actually matches the requested ID (prevent stale cache during navigation)
  const cachedProductMatches = cachedProduct && (
    cachedProduct.id === id ||
    cachedProduct.code === id ||
    cachedProduct.productCode === id ||
    cachedProduct.sku === id
  );

  const displayProduct = finalProduct || (cachedProductMatches ? cachedProduct : null);

  // 🖼️ Product images - MUST BE BEFORE EARLY RETURNS
  const productImage = displayProduct?.image || 'https://via.placeholder.com/400x400?text=No+Image';
  const productImages = useMemo(() => {
    // Priority: images > galleryImages > allImages > main image
    if (displayProduct?.images && Array.isArray(displayProduct.images) && displayProduct.images.length > 0) {
      return displayProduct.images;
    }
    if (displayProduct?.galleryImages && Array.isArray(displayProduct.galleryImages) && displayProduct.galleryImages.length > 0) {
      return displayProduct.galleryImages;
    }
    if (displayProduct?.allImages && Array.isArray(displayProduct.allImages) && displayProduct.allImages.length > 0) {
      return displayProduct.allImages;
    }
    // Otherwise, use the main product image
    return [productImage];
  }, [displayProduct?.images, displayProduct?.galleryImages, displayProduct?.allImages, productImage]);

  // ⚡ Log data source for debugging - MUST BE BEFORE EARLY RETURNS
  useEffect(() => {
    if (displayProduct) {
      const source = apiProduct
        ? 'Single Product API (1 product in ~200ms - faster than loading 13,781 from CDN)'
        : data.products && data.products.length > 0
        ? 'CMS Database (all products already loaded)'
        : 'Cached (localStorage)';

      console.log(`✅ [ProductDetail] Product loaded from: ${source}`);
      console.log(`ℹ️  Product: ${displayProduct.name || displayProduct.code}`);
    }
  }, [displayProduct, apiProduct, data.products]);

  // 🎯 Fetch promotional pricing for this product
  useEffect(() => {
    if (!displayProduct?.id) {
      setPromotion(null);
      return;
    }

    const fetchPromotion = async () => {
      try {
        const response = await fetch(
          `${API_URL}/promotions/product/${displayProduct.id}`,
          {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.active) {
            setPromotion(data);
          } else {
            setPromotion(null);
          }
        } else {
          setPromotion(null);
        }
      } catch (error) {
        console.debug('Promotion fetch failed:', error);
        setPromotion(null);
      }
    };

    fetchPromotion();
  }, [displayProduct?.id]);

  // Reset selected image index if it's out of bounds - MUST BE BEFORE EARLY RETURNS
  useEffect(() => {
    if (selectedImage >= productImages.length) {
      setSelectedImage(0);
    }
  }, [productImages.length, selectedImage]);

  // Related products: use CDN chunks (avoids OOM server fetch)
  const allProductsForRelated = cdnProducts && cdnProducts.length > 0
    ? cdnProducts
    : allProducts;

  // Filter related products from the same category
  const relatedAccessoriesAndSpares = useMemo(() => {
    if (!displayProduct) {
      return [];
    }

    // Use allProductsForRelated (fetched specifically for related products)
    const productsToFilter = allProductsForRelated.length > 0 ? allProductsForRelated : allProducts;

    if (productsToFilter.length === 0) {
      return [];
    }

    const currentProductId = displayProduct.id;
    const currentProductCode = displayProduct.code;
    const currentProductSku = displayProduct.sku;
    const currentCategory = displayProduct.category || displayProduct.categoryName;
    const currentCategoryId = displayProduct.categoryId;
    const currentBrand = displayProduct.brand;

    // Normalize category strings to handle "Refrigeration & Ice Machines" vs "Refrigeration And Ice Machines"
    const normalizeCategory = (cat: string) => {
      if (!cat) return '';
      return cat.toLowerCase().replace(/\s+/g, ' ').replace(/\s*&\s*/g, ' and ').trim();
    };

    const currentCatNormalized = normalizeCategory(currentCategory);

    // Filter for products from the same category, preferably same brand
    const sameCategoryProducts = productsToFilter
      .filter(p => {
        // Must not be the current product (check all ID fields)
        const isDifferent =
          p.id !== currentProductId &&
          p.code !== currentProductCode &&
          p.code !== currentProductId &&
          p.sku !== currentProductSku &&
          p.sku !== currentProductId;

        if (!isDifferent) return false;

        // Normalize product categories for comparison
        const productCategoryNormalized = normalizeCategory(p.category || '');
        const productCategoryNameNormalized = normalizeCategory(p.categoryName || '');

        // Check if same category (with normalization to handle & vs and)
        const categoryNameMatch = currentCatNormalized && (
          productCategoryNormalized === currentCatNormalized ||
          productCategoryNameNormalized === currentCatNormalized
        );

        const categoryIdMatch = currentCategoryId && (p.categoryId === currentCategoryId);

        return categoryNameMatch || categoryIdMatch;
      });

    // Prioritize same brand within the same category
    const sameBrandProducts = sameCategoryProducts.filter(p => currentBrand && p.brand === currentBrand);

    // If we have same brand products, prioritize those, otherwise use all same category
    const productsToShow = sameBrandProducts.length > 0 ? sameBrandProducts : sameCategoryProducts;

    // Shuffle to get random products instead of always the same first 4
    const shuffled = [...productsToShow].sort(() => Math.random() - 0.5);
    const filtered = shuffled.slice(0, 4);

    return filtered;
  }, [displayProduct, allProductsForRelated, allProducts]); // Re-calculate when product loads or products list changes

  // Get accessories - ONLY from product's specific accessories field
  const accessories = useMemo(() => {
    if (!displayProduct?.accessories || displayProduct.accessories.length === 0) {
      return [];
    }
    const productsToFilter = allProductsForRelated.length > 0 ? allProductsForRelated : allProducts;
    if (productsToFilter.length === 0) {
      return [];
    }
    return productsToFilter.filter(p => displayProduct.accessories?.includes(p.id));
  }, [displayProduct, allProductsForRelated, allProducts]);

  // ⚡ Show loading state if still loading and no cached version
  const isStillLoading = (loading || apiLoading) && !finalProduct && !cachedProduct;

  if (isStillLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-20">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-slate-200 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-12 bg-slate-200 rounded w-3/4"></div>
              <div className="h-6 bg-slate-200 rounded w-1/4"></div>
              <div className="h-32 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ⚡ Show not found only if we're done loading AND no product found
  if (!displayProduct && !loading && !apiLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-20 text-center">
        <h1 className="text-3xl mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The product you're looking for (ID/Code: {id}) could not be found in our catalog.
        </p>
        <Link to="/products">
          <Button>
            <ArrowLeft className="mr-2 size-4" />
            Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  const customer = customerData;

  // Check customer pricing level
  const canBuyAtCostPrice = customer?.can_see_cost_price || false;
  const customerDiscountPercentage = customer?.discount_percentage || 0;
  const hasCostPlusHundredAccess = customer?.cost_plus_hundred_access || false;

  // Get the cost price (tradePrice from Uropa API is the supplier's selling price = our cost)
  const productCostPrice = displayProduct.tradePrice || displayProduct.baseCost || displayProduct.costPrice || 0;

  // Universal Cost+$100 logic (all customers, $500–$10,000 product price, toggle on)
  const universalCostPlusEnabled = localStorage.getItem('costplus100_universal_pricing_enabled') !== 'false';
  const productPriceForRange = displayProduct.price || 0;
  const inCostPlusRange = productPriceForRange >= 500 && productPriceForRange <= 10000;
  const showUniversalCostPlus = universalCostPlusEnabled && inCostPlusRange && productCostPrice > 0;

  // Legacy per-customer Cost+$100 (when universal toggle is off)
  const costPlusHundredCategories = ['refrigeration', 'ice machines', 'commercial kitchen machines'];
  const categoryForCostPlusCheck = displayProduct.category?.toLowerCase() || '';
  const isInCostPlusHundredCategory = costPlusHundredCategories.some(cat => categoryForCostPlusCheck.includes(cat));
  const meetsMinimumPriceThreshold = productCostPrice >= 500;
  const showLegacyCostPlus = !universalCostPlusEnabled && hasCostPlusHundredAccess && isInCostPlusHundredCategory && meetsMinimumPriceThreshold;

  const hasPromotion = promotion !== null;
  const promotionalPrice = hasPromotion ? promotion.promotionalPrice : null;
  const promotionalSavings = hasPromotion ? (displayProduct.price - promotion.promotionalPrice) : null;
  const wasPrice = hasPromotion ? displayProduct.price : null;

  // Special discount pricing (from specials system - BOGO, percentage, etc.)
  let specialDiscountPrice = null;
  let specialDiscountSavings = null;
  let specialDiscountPercent = null;
  if (activeSpecial && !hasPromotion) {
    if (activeSpecial.type === 'percentage' && activeSpecial.discountValue) {
      specialDiscountPercent = activeSpecial.discountValue;
      specialDiscountPrice = displayProduct.price * (1 - activeSpecial.discountValue / 100);
      specialDiscountSavings = displayProduct.price - specialDiscountPrice;
    } else if (activeSpecial.type === 'fixed_amount' && activeSpecial.discountValue) {
      specialDiscountPrice = Math.max(0, displayProduct.price - activeSpecial.discountValue);
      specialDiscountSavings = activeSpecial.discountValue;
    }
  }

  // Base price - use size variant price if selected, otherwise use product price
  const basePrice = sizePrice !== null ? sizePrice : displayProduct.price;

  let displayPrice = basePrice;
  let actualSellingPrice = basePrice;
  let priceLabel = 'Price';
  let showCostPrice = false;

  // Priority: Promotional > Special Discount > Universal Cost+$100 > Legacy Cost+$100 > Cost Price > VIP Discount > Regular
  if (hasPromotion) {
    displayPrice = sizePrice !== null ? sizePrice : promotionalPrice!;
    actualSellingPrice = sizePrice !== null ? sizePrice : promotionalPrice!;
    priceLabel = 'Promotional Price';
  } else if (specialDiscountPrice !== null) {
    displayPrice = sizePrice !== null ? sizePrice : specialDiscountPrice;
    actualSellingPrice = sizePrice !== null ? sizePrice : specialDiscountPrice;
    priceLabel = 'Special Price';
  } else if (showUniversalCostPlus) {
    const costPlusHundredPrice = (productCostPrice + 150) * 1.025;
    displayPrice = sizePrice !== null ? sizePrice : costPlusHundredPrice;
    actualSellingPrice = sizePrice !== null ? sizePrice : costPlusHundredPrice;
    priceLabel = 'Cost+$100 Price';
    showCostPrice = true;
  } else if (showLegacyCostPlus) {
    const costPlusHundredPrice = (productCostPrice + 150) * 1.025;
    displayPrice = sizePrice !== null ? sizePrice : costPlusHundredPrice;
    actualSellingPrice = sizePrice !== null ? sizePrice : costPlusHundredPrice;
    priceLabel = 'Your Cost+$100 Price';
    showCostPrice = true;
  } else if (canBuyAtCostPrice) {
    displayPrice = sizePrice !== null ? sizePrice : productCostPrice;
    actualSellingPrice = sizePrice !== null ? sizePrice : productCostPrice;
    priceLabel = 'Your Cost Price';
    showCostPrice = true;
  } else {
    displayPrice = basePrice;
    actualSellingPrice = basePrice;
    priceLabel = customerDiscountPercentage > 0 ? `Price (before ${customerDiscountPercentage}% discount)` : 'Price';
  }

  // Calculate discounted price if customer has discount (only when no promotion)
  const originalPrice = basePrice;
  const discountedPrice = !hasPromotion && customerDiscountPercentage > 0
    ? basePrice * (1 - customerDiscountPercentage / 100)
    : basePrice;

  const handleAddToCart = () => {
    // Check if product has size variants and no size is selected
    if (displayProduct.sizeVariants && displayProduct.sizeVariants.length > 0 && !selectedSize) {
      alert('Please select a size before adding to cart');
      return;
    }

    // Check if product is age restricted
    if (displayProduct.ageRestricted) {
      setPendingCartAction('add');
      setShowAgeRestrictionModal(true);
      return;
    }

    // Attach promotional price, size, and size price to product if they exist
    let productToAdd = { ...displayProduct };

    if (hasPromotion) {
      productToAdd.promotionalPrice = promotion.promotionalPrice;
    }

    if (selectedSize && sizePrice !== null) {
      productToAdd.selectedSize = selectedSize;
      productToAdd.price = sizePrice; // Override price with size-specific price
    }

    addToCart(productToAdd, quantity);
    // Show success feedback (could add a toast here)
  };

  const handleBuyNow = () => {
    // Check if product has size variants and no size is selected
    if (displayProduct.sizeVariants && displayProduct.sizeVariants.length > 0 && !selectedSize) {
      alert('Please select a size before proceeding');
      return;
    }

    // Check if product is age restricted
    if (displayProduct.ageRestricted) {
      setPendingCartAction('buy');
      setShowAgeRestrictionModal(true);
      return;
    }

    // Attach promotional price, size, and size price to product if they exist
    let productToAdd = { ...displayProduct };

    if (hasPromotion) {
      productToAdd.promotionalPrice = promotion.promotionalPrice;
    }

    if (selectedSize && sizePrice !== null) {
      productToAdd.selectedSize = selectedSize;
      productToAdd.price = sizePrice; // Override price with size-specific price
    }

    addToCart(productToAdd, quantity);
    navigate('/checkout');
  };

  const handleAgeRestrictionConfirm = () => {
    setShowAgeRestrictionModal(false);

    // Attach promotional price, size, and size price to product if they exist
    let productToAdd = { ...displayProduct };

    if (hasPromotion) {
      productToAdd.promotionalPrice = promotion.promotionalPrice;
    }

    if (selectedSize && sizePrice !== null) {
      productToAdd.selectedSize = selectedSize;
      productToAdd.price = sizePrice; // Override price with size-specific price
    }

    // Add to cart
    addToCart(productToAdd, quantity);

    // If buy now, navigate to checkout
    if (pendingCartAction === 'buy') {
      navigate('/checkout');
    }

    setPendingCartAction(null);
  };

  const handleAgeRestrictionClose = () => {
    setShowAgeRestrictionModal(false);
    setPendingCartAction(null);
  };

  const incrementQuantity = () => setQuantity(q => q + 1);
  const decrementQuantity = () => setQuantity(q => Math.max(1, q - 1));

  // Handle size selection
  const handleSizeChange = (size: string, price: number) => {
    setSelectedSize(size);
    setSizePrice(price);
  };

  // Defensive checks for product properties
  const productName = displayProduct?.name || 'Unnamed Product';
  const productPrice = typeof displayProduct?.price === 'number' ? displayProduct.price : parseFloat(String(displayProduct?.price || 0).replace(/[^0-9.-]+/g, '')) || 0;
  const productCategory = displayProduct?.category || 'Uncategorized';
  const productDescription = displayProduct?.description;
  const productBrand = displayProduct?.brand;
  const uropaPromisedDate = displayProduct?.uropaPromisedDate || '';
  const uropaMessageEnum = (displayProduct as any)?.uropaMessageEnum || '';
  const uropaAvailabilityMessage = (displayProduct as any)?.uropaAvailabilityMessage || '';
  const isUropaBackorder = uropaMessageEnum === 'AM_ON_BACKORDER';
  const backOrderAvailable = displayProduct?.backOrderAvailable || isUropaBackorder || false;
  // If promised date is in the future, treat as out of stock until it arrives
  const promisedDateInFuture = uropaPromisedDate ? new Date(uropaPromisedDate) > new Date() : false;
  // Also treat Uropa backorder status as not in-stock for display purposes
  const productInStock = (promisedDateInFuture || isUropaBackorder) ? false : (displayProduct?.inStock ?? true);
  const productRating = displayProduct?.rating || 4.7;
  const productBrandLogo = displayProduct?.brandLogo || displayProduct?.brandLogoUrl;
  const productCode = displayProduct?.code || displayProduct?.sku || '';
  
  // Get full category path - try to resolve from category IDs first
  let fullCategoryPath = displayProduct?.wholePath || productCategory;
  
  // If wholePath is not available, try to build it from category level IDs
  if (!displayProduct?.wholePath || displayProduct?.wholePath === productCategory) {
    const productCategoryIds = [
      (displayProduct as any).categoryLevel1Id,
      (displayProduct as any).categoryLevel2Id,
      (displayProduct as any).categoryLevel3Id,
      (displayProduct as any).categoryLevel4Id,
    ].filter(Boolean);
    
    // Try to find the full path for the deepest category level
    for (let i = productCategoryIds.length - 1; i >= 0; i--) {
      const categoryId = productCategoryIds[i];
      const resolvedPath = categoryIdToPath.get(categoryId);
      
      if (resolvedPath) {
        fullCategoryPath = resolvedPath;
        break;
      }
    }
  }
  
  const categorySegments = fullCategoryPath.split('>').map(s => s.trim()).filter(Boolean);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* SEO Meta Tags and Structured Data */}
      {displayProduct && (
        <SEOHead
          title={`${displayProduct.name} - ${displayProduct.brand || 'Commercial Equipment'} | CostPlus Catering Equipment`}
          description={`${displayProduct.description || displayProduct.name} - ${displayProduct.brand ? `${displayProduct.brand} brand. ` : ''}Professional catering equipment for Sydney, Melbourne, Brisbane. ${displayProduct.inStock ? 'In stock.' : ''} Buy online with competitive pricing and Australia-wide delivery.`}
          keywords={`${displayProduct.name}, ${displayProduct.brand || ''}, ${fullCategoryPath.replace(/>/g, ',')}, commercial catering equipment, catering equipment sydney, catering equipment melbourne, catering equipment brisbane, restaurant equipment, hospitality supplies, professional kitchen equipment`}
          image={productImages[0]}
          type="product"
          canonical={`https://costplus100.com.au/products/${id}`}
          schema={{
            '@context': 'https://schema.org',
            '@graph': [
              generateProductSchema(displayProduct),
              generateBreadcrumbSchema([
                { name: 'Home', url: '/' },
                ...categorySegments.map((segment, index) => ({
                  name: segment,
                  url: `/products/c/${categoryToSlug(categorySegments.slice(0, index + 1).join(' > '))}`
                })),
                { name: displayProduct.name, url: `/products/${id}` }
              ])
            ]
          }}
        />
      )}

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground flex-wrap">
              <Link to="/" className="hover:text-[#E31837] transition-colors">Home</Link>
              <span>/</span>
              {categorySegments.map((segment, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Link 
                    to={`/products/c/${categoryToSlug(categorySegments.slice(0, index + 1).join(' > '))}`}
                    className="hover:text-[#E31837] transition-colors"
                  >
                    {segment}
                  </Link>
                  <span>/</span>
                </div>
              ))}
              <span className="text-slate-900 font-medium truncate">{productName}</span>
            </div>
            
            {/* 🔥 REFRESH BUTTON - Force fresh data from server */}
            {refreshData && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setRefreshing(true);
                  try {
                    // Clear ALL caches
                    localStorage.removeItem('cms_data_cache');
                    localStorage.removeItem('cms_cache_timestamp');
                    
                    // Force refresh from server
                    await refreshData();
                    
                    console.log('✅ Data refreshed from server');
                  } catch (error) {
                    console.error('❌ Failed to refresh data:', error);
                  } finally {
                    setRefreshing(false);
                  }
                }}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Product Section */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8">
          {/* Left: Image Gallery with Vertical Thumbnails */}
          <div className="flex flex-col-reverse lg:flex-row gap-3 lg:w-auto">
            {/* Thumbnails - Vertical on desktop, horizontal on mobile */}
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
              {productImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedImage(idx);
                    setZoomImageIndex(idx);
                    setShowImageZoom(true);
                  }}
                  className={`flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 border-2 rounded overflow-hidden transition-all ${
                    selectedImage === idx
                      ? 'border-[#E31837]'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${productName} thumbnail ${idx + 1}`}
                    className="w-full h-full object-contain p-1 bg-slate-50"
                  />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div className="relative border border-slate-200 rounded bg-slate-50 p-2 lg:p-3 w-fit">
              {!productInStock && (
                <Badge className="absolute top-4 left-4 bg-red-600 hover:bg-red-600 z-10">
                  OUT OF STOCK
                </Badge>
              )}
              {specialBadge ? (
                <Badge
                  className="absolute top-4 right-4 font-bold z-10"
                  style={{ backgroundColor: specialBadge.color, color: 'white' }}
                >
                  {specialBadge.text}
                </Badge>
              ) : (
                <Badge className="absolute top-4 right-4 bg-[#E31837] hover:bg-[#E31837] font-bold z-10">
                  LOW PRICE
                </Badge>
              )}
              <img
                src={productImages[selectedImage]}
                alt={productName}
                className="w-full lg:w-[500px] h-[240px] lg:h-[320px] object-contain cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => {
                  setZoomImageIndex(selectedImage);
                  setShowImageZoom(true);
                }}
              />
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="space-y-4">
            {/* Title Section */}
            <div>
              <div className="flex items-start gap-3 mb-3">
                <h1 className="text-2xl lg:text-3xl font-bold text-[#2D3748] flex-1">{productName}</h1>
                {displayProduct.ageRestricted && (
                  <Badge className="bg-orange-500 hover:bg-orange-500 font-bold text-sm px-3 py-1">
                    🔞 18+ Only
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-600 mb-3">
                {displayProduct.shortDescription || `High-quality ${productCategory.toLowerCase()} for professional use.`}
              </p>
              
              {/* Age Restriction Warning */}
              {displayProduct.ageRestricted && (
                <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded">
                  <p className="text-sm text-orange-900">
                    <strong>⚠️ Age Restricted Product:</strong> You must be 18 years or older to purchase this item. Age verification will be required at checkout.
                  </p>
                </div>
              )}
              
              {/* Brand Logo */}
              {productBrandLogo && (
                <div className="mb-3">
                  <img 
                    src={productBrandLogo} 
                    alt={productBrand}
                    className="h-8 object-contain"
                  />
                </div>
              )}
              
              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`size-4 ${i < Math.floor(productRating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">{productRating} (24)</span>
              </div>
            </div>

            {/* Price Section */}
            <div className="pb-4 border-b">
              <div className="mb-1">
                <span className="text-sm text-slate-600">{priceLabel}</span>
              </div>

              {hasPromotion ? (
                // PROMOTIONAL PRICING: Show DB price as "was", promotional price as current
                <div>
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-2xl font-bold text-slate-400 line-through">${wasPrice!.toFixed(2)}</span>
                    <Badge className="bg-[#E31837] hover:bg-[#E31837] font-bold">SAVE ${promotionalSavings!.toFixed(2)}</Badge>
                  </div>
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-4xl font-bold text-[#E31837]">${displayPrice.toFixed(2)}</span>
                    <span className="text-sm text-slate-600">ex GST</span>
                  </div>
                  <div className="text-sm text-slate-600 mb-2">
                    (${(displayPrice / 1).toFixed(2)} per unit)
                  </div>
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#E31837] hover:bg-[#E31837] text-xs">🎉 SPECIAL PROMO</Badge>
                    </div>
                    <p className="text-xs text-red-700 mt-1">
                      Limited time promotional pricing! Save ${promotionalSavings!.toFixed(2)} on this product.
                    </p>
                  </div>
                </div>
              ) : specialDiscountPrice !== null ? (
                // SPECIAL DISCOUNT: Show original price as "was", special price as current
                <div>
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-2xl font-bold text-slate-400 line-through">${displayProduct.price.toFixed(2)}</span>
                    <Badge className="bg-purple-600 hover:bg-purple-600 font-bold">
                      {specialDiscountPercent ? `${specialDiscountPercent}% OFF` : `SAVE $${specialDiscountSavings!.toFixed(2)}`}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-4xl font-bold text-[#E31837]">${displayPrice.toFixed(2)}</span>
                    <span className="text-sm text-slate-600">ex GST</span>
                  </div>
                  <div className="text-sm text-slate-600 mb-2">
                    (${(displayPrice / 1).toFixed(2)} per unit)
                  </div>
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-600 hover:bg-purple-600 text-xs">🎁 SPECIAL OFFER</Badge>
                    </div>
                    <p className="text-xs text-purple-700 mt-1">
                      {activeSpecial.name} - Save ${specialDiscountSavings!.toFixed(2)} on this product!
                    </p>
                  </div>
                </div>
              ) : (showUniversalCostPlus || showLegacyCostPlus) ? (
                // COST+$100 PRICING: Universal (all customers $500–$10k) or legacy per-customer
                <div>
                  <div className="flex items-baseline gap-3 mb-1">
                    {displayProduct.price > displayPrice && (
                      <span className="text-2xl font-bold text-slate-400 line-through">${displayProduct.price.toFixed(2)}</span>
                    )}
                    <Badge className="bg-purple-600 hover:bg-purple-600 font-bold">COST+$100</Badge>
                  </div>
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-4xl font-bold text-[#E31837]">${displayPrice.toFixed(2)}</span>
                    <span className="text-sm text-slate-600">ex GST</span>
                  </div>
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
                    <div className="flex items-center gap-2">
                      <Award className="size-4 text-purple-700" />
                      <span className="text-sm font-semibold text-purple-900">Cost+$100 Transparent Pricing</span>
                    </div>
                    <p className="text-xs text-purple-700 mt-1">
                      You're seeing our cost price + $100 — total transparency, no hidden markups.
                    </p>
                  </div>
                </div>
              ) : canBuyAtCostPrice ? (
                // COST PRICE CUSTOMER: Show only cost price, no discounts
                <div>
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-4xl font-bold text-[#E31837]">${displayPrice.toFixed(2)}</span>
                    <span className="text-sm text-slate-600">ex GST</span>
                  </div>
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                    <div className="flex items-center gap-2">
                      <Award className="size-4 text-amber-700" />
                      <span className="text-sm font-semibold text-amber-900">Wholesale/Trade Price</span>
                    </div>
                    <p className="text-xs text-amber-700 mt-1">
                      You're purchasing at cost price. Standard discounts and multibuys don't apply.
                    </p>
                  </div>
                </div>
              ) : customerDiscountPercentage > 0 ? (
                // DISCOUNT % CUSTOMER: Show regular price with discount applied
                <div>
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-2xl font-bold text-slate-400 line-through">${originalPrice.toFixed(2)}</span>
                    <Badge className="bg-green-600 hover:bg-green-600">-{customerDiscountPercentage}% VIP</Badge>
                  </div>
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-4xl font-bold text-[#E31837]">${discountedPrice.toFixed(2)}</span>
                    <span className="text-sm text-slate-600">ex GST</span>
                  </div>
                  <div className="text-sm text-slate-600 mb-2">
                    (${(discountedPrice / 1).toFixed(2)} per unit)
                  </div>
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center gap-2">
                      <Award className="size-4 text-blue-700" />
                      <span className="text-sm font-semibold text-blue-900">VIP Customer Discount</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Your {customerDiscountPercentage}% discount stacks with multibuy offers below!
                    </p>
                  </div>
                </div>
              ) : (
                // NORMAL CUSTOMER: Show regular price (with wasPrice strikethrough if available)
                <div>
                  {displayProduct.wasPrice && parseFloat(String(displayProduct.wasPrice)) > displayPrice && (
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="text-2xl font-bold text-slate-400 line-through">${parseFloat(String(displayProduct.wasPrice)).toFixed(2)}</span>
                      <Badge className="bg-[#E31837] hover:bg-[#E31837] font-bold">
                        SAVE ${(parseFloat(String(displayProduct.wasPrice)) - displayPrice).toFixed(2)}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-4xl font-bold text-[#E31837]">${displayPrice.toFixed(2)}</span>
                    <span className="text-sm text-slate-600">ex GST</span>
                  </div>
                  <div className="text-sm text-slate-600 mb-2">
                    (${(displayPrice / 1).toFixed(2)} per unit)
                  </div>
                </div>
              )}
              
              {/* Product Code */}
              {productCode && (
                <div className="text-sm text-slate-600 mt-3">
                  Product Code: <span className="font-semibold text-slate-900">{productCode}</span>
                </div>
              )}
            </div>

            {/* Stock Status */}
            {productInStock && (
              <div className="flex items-center gap-2 py-2">
                <CheckCircle2 className="size-5 text-green-600" />
                <span className="text-sm font-semibold text-green-600">In Stock</span>
              </div>
            )}
            {!productInStock && backOrderAvailable && (
              <div className="flex flex-col gap-1 py-2 px-3 bg-amber-50 border border-amber-200 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">Available on Backorder</span>
                </div>
                {uropaPromisedDate && (
                  <span className="text-xs text-amber-600 ml-7">Expected: {new Date(uropaPromisedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                )}
                {uropaAvailabilityMessage && !uropaPromisedDate && (
                  <span className="text-xs text-amber-600 ml-7">{uropaAvailabilityMessage}</span>
                )}
              </div>
            )}
            {!productInStock && !backOrderAvailable && (
              <div className="flex items-center gap-2 py-2">
                <X className="size-5 text-red-600" />
                <span className="text-sm font-semibold text-red-600">Out of Stock</span>
              </div>
            )}

            {/* Size Selector - For clothing, aprons, footwear categories */}
            {displayProduct.sizeVariants && displayProduct.sizeVariants.length > 0 && (
              <div className="py-4 border-t border-b">
                <SizeSelector
                  variants={displayProduct.sizeVariants}
                  selectedSize={selectedSize}
                  onSizeChange={handleSizeChange}
                />
              </div>
            )}

            {/* MultiBuy Savings Table - Hidden for Cost Price customers */}
            {!canBuyAtCostPrice && displayProduct.multiBuyOptions && displayProduct.multiBuyOptions.length > 0 && (
              <div className="py-4 border-t border-b">
                <h3 className="text-sm font-bold text-[#E31837] mb-3">Multibuy savings</h3>
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left py-2 px-3 font-semibold">Qty</th>
                        <th className="text-right py-2 px-3 font-semibold">Web Price</th>
                        <th className="text-right py-2 px-3 font-semibold">Per unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {displayProduct.multiBuyOptions.map((option, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="py-2 px-3">{option.quantity}+ packs</td>
                          <td className="text-right py-2 px-3 font-bold text-[#E31837]">${(option.price * option.quantity).toFixed(2)}</td>
                          <td className="text-right py-2 px-3">${option.price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Add to Cart Section */}
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-slate-300 rounded">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={decrementQuantity}
                    className="h-10 px-3 hover:bg-slate-100"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <input 
                    type="number" 
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center border-x border-slate-300 h-10 outline-none"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={incrementQuantity}
                    className="h-10 px-3 hover:bg-slate-100"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <Button 
                  size="lg" 
                  className="flex-1 bg-[#E31837] hover:bg-[#E31837]/90 h-10 font-semibold"
                  onClick={handleAddToCart}
                  disabled={!productInStock && !backOrderAvailable}
                >
                  <ShoppingCart className="mr-2 size-4" />
                  Add to Cart
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1 h-9 text-sm border-slate-300"
                  onClick={handleBuyNow}
                >
                  Buy Now
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-9 px-3 border-slate-300"
                >
                  <Heart className="size-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-9 px-3 border-slate-300"
                >
                  <Share2 className="size-4" />
                </Button>
              </div>
            </div>

            {/* Click & Collect */}
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <MapPin className="size-5 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-sm">Click & Collect Available</div>
                    <button className="text-xs text-orange-600 hover:underline">
                      Check stock at your local store &gt;
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Collapsible Sections */}
        <div className="mt-8 space-y-2">
          {/* Product Information - Combined Description and Features */}
          <Card>
            <button
              onClick={() => toggleSection('specs')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <h2 className="text-lg font-bold text-[#2D3748]">Product Information</h2>
              <ChevronDown 
                className={`size-5 transition-transform ${openSection === 'specs' ? 'rotate-180' : ''}`}
              />
            </button>
            {openSection === 'specs' && (
              <CardContent className="p-6 pt-0 border-t">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Product Description - Left Column */}
                  <div>
                    <h3 className="font-semibold mb-3 text-[#2D3748]">Product description</h3>
                    <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                      {productDescription ? (
                        <div dangerouslySetInnerHTML={{ __html: productDescription }} />
                      ) : (
                        <p>
                          Professional-grade {productName} designed for commercial use. 
                          Built with durability and performance in mind.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Product Features - Right Column */}
                  <div>
                    <h3 className="font-semibold mb-3 text-[#2D3748]">Product features</h3>
                    <div className="text-sm specifications-bullets">
                      {displayProduct.specifications ? (
                        typeof displayProduct.specifications === 'string' ? (
                          <div 
                            dangerouslySetInnerHTML={{ 
                              __html: displayProduct.specifications
                                // Remove ALL variations of \n escape sequences
                                .replace(/\\\\\\\\\\\\\\\\n/g, ' ')  // \\\\\\\\n -> space
                                .replace(/\\\\\\\\\\\\n/g, ' ')      // \\\\\\n -> space
                                .replace(/\\\\\\\\n/g, ' ')          // \\\\n -> space
                                .replace(/\\\\n/g, ' ')              // \\n -> space
                                .replace(/\\n/g, ' ')                // \n -> space
                                .replace(/\n/g, ' ')                 // actual newline -> space
                                .replace(/\r/g, ' ')                 // carriage return -> space
                                .replace(/\s+/g, ' ')                // multiple spaces -> single space
                                .trim()
                            }}
                          />
                        ) : Array.isArray(displayProduct.specifications) ? (
                          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                            {displayProduct.specifications
                              .filter((spec: any) => {
                                // Filter out empty specs
                                if (typeof spec === 'string') return spec.length > 0;
                                
                                const label = spec.name || spec.label || spec.key || spec.field;
                                const value = spec.value || spec.val || spec.data;
                                
                                // Only filter out if both label and value are empty
                                if (!label && !value) return false;
                                
                                // Filter out internal/metadata fields that shouldn't be shown
                                const labelStr = label ? label.toString().toLowerCase() : '';
                                const hideFields = [
                                  'clearance category',
                                  'featured product',
                                  'type',
                                  'width',
                                  'length',
                                  'number of reviews',
                                  'brand ranking',
                                  'facet',
                                  'comparison',
                                  'internal'
                                ];
                                
                                if (hideFields.some(field => labelStr.includes(field))) {
                                  return false;
                                }
                                
                                return true;
                              })
                              .map((spec: any, index: number) => {
                                // Helper function to clean all newline variations
                                const cleanText = (text: string): string => {
                                  if (!text) return '';
                                  return String(text)
                                    // Remove all variations of \n escape sequences
                                    .replace(/\\\\\\\\n/g, ' ')  // \\\\n -> space
                                    .replace(/\\\\n/g, ' ')      // \\n -> space  
                                    .replace(/\\n/g, ' ')        // \n -> space
                                    .replace(/\n/g, ' ')         // actual newline -> space
                                    .replace(/\r/g, ' ')         // carriage return -> space
                                    // Clean up multiple spaces
                                    .replace(/\s+/g, ' ')
                                    .trim();
                                };
                                
                                if (typeof spec === 'string') {
                                  const cleanSpec = cleanText(spec);
                                  if (!cleanSpec) return null;
                                  return <li key={index}>{cleanSpec}</li>;
                                }
                                
                                // Handle object with name/value pairs
                                const label = spec.name || spec.label || spec.key || spec.field;
                                const value = spec.value || spec.val || spec.data;
                                
                                // Clean up label and value
                                const cleanLabel = cleanText(label);
                                const cleanValue = cleanText(value);
                                
                                // If label is "DATA 1", "DATA 2", etc., show only the value
                                if (cleanLabel && cleanLabel.toUpperCase().startsWith('DATA')) {
                                  if (cleanValue) {
                                    return <li key={index}>{cleanValue}</li>;
                                  }
                                  return null;
                                }
                                
                                // For other specs, show "Label: Value" format (no bold)
                                if (cleanLabel && cleanValue) {
                                  return <li key={index}>{cleanLabel}: {cleanValue}</li>;
                                } else if (cleanValue) {
                                  return <li key={index}>{cleanValue}</li>;
                                } else if (cleanLabel) {
                                  return <li key={index}>{cleanLabel}</li>;
                                }
                                
                                return null;
                              })
                              .filter(Boolean)}
                          </ul>
                        ) : typeof displayProduct.specifications === 'object' ? (
                          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                            {Object.entries(displayProduct.specifications)
                              .filter(([key]) => !key.toUpperCase().startsWith('DATA'))
                              .map(([key, value]: [string, any]) => (
                                <li key={key}>{key}: {String(value)}</li>
                              ))}
                          </ul>
                        ) : (
                          <p className="text-slate-600">{String(displayProduct.specifications)}</p>
                        )
                      ) : (
                        <p className="text-slate-600">No product features available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Accessories - Show product-specific accessories first, then related products from same category */}
        {accessories.length > 0 ? (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 text-[#2D3748]">
              Recommended Accessories
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {accessories.map((accessory) => (
                <ProductCard key={accessory.id} product={accessory} />
              ))}
            </div>
          </div>
        ) : null}

        {relatedAccessoriesAndSpares.length > 0 ? (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 text-[#2D3748]">
              {displayProduct?.category || displayProduct?.categoryName
                ? `More ${displayProduct.category || displayProduct.categoryName} Products`
                : 'Related Products'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedAccessoriesAndSpares.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Age Restriction Modal */}
      <AgeRestrictionModal
        isOpen={showAgeRestrictionModal}
        onClose={handleAgeRestrictionClose}
        onConfirm={handleAgeRestrictionConfirm}
        productName={productName}
      />

      {/* Image Zoom Modal */}
      {showImageZoom && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageZoom(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setShowImageZoom(false)}
            className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors z-10"
          >
            <X size={32} />
          </button>

          {/* Previous Button */}
          {productImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomImageIndex((prev) =>
                  prev === 0 ? productImages.length - 1 : prev - 1
                );
              }}
              className="absolute left-4 text-white hover:text-slate-300 transition-colors z-10"
            >
              <ChevronLeft size={48} />
            </button>
          )}

          {/* Image Container */}
          <div
            className="max-w-[95vw] max-h-[95vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={productImages[zoomImageIndex]}
              alt={`${productName} - Image ${zoomImageIndex + 1}`}
              className="max-w-full max-h-[95vh] object-contain"
            />
          </div>

          {/* Next Button */}
          {productImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomImageIndex((prev) =>
                  prev === productImages.length - 1 ? 0 : prev + 1
                );
              }}
              className="absolute right-4 text-white hover:text-slate-300 transition-colors z-10"
            >
              <ChevronRight size={48} />
            </button>
          )}

          {/* Image Counter */}
          {productImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-full text-sm">
              {zoomImageIndex + 1} / {productImages.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}