import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router';
import { ProductCard } from '../components/ProductCard';
import { useCMS } from '../context/CMSContext';
import { useCart } from '../context/CartContext';
import { useProducts } from '../../hooks/useProducts';

// Convert Supabase Storage URLs to WebP using image transformation API
function toWebP(url: string, width?: number): string {
  if (!url || !url.includes('supabase.co/storage')) return url;
  const params = new URLSearchParams();
  params.set('format', 'webp');
  params.set('quality', '80');
  if (width) params.set('width', String(width));
  return `${url}?${params.toString()}`;
}
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ChevronLeft, ChevronRight, ShieldCheck, Truck, CreditCard, HeadphonesIcon, Award, TrendingUp, ArrowRight, Phone, Mail, Search, X, ShoppingCart, Plus, Minus } from 'lucide-react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { fetchWithRetry, getOptimizedImageUrl } from '../utils/env';
import { logger } from '../utils/logger';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { updateSEOTags, homepageSEO } from '../utils/seo';
import { SEOHead, generateOrganizationSchema, generateLocalBusinessSchema } from '../components/SEOHead';
import { heroConfig } from '../../config/hero';
import heroBannerImg from '../../imports/hero-banner.png';
import { buildCategoryTree } from '../utils/categoryTree';
import { categoryToSlug } from '../utils/slugify';

// ⚡ CACHE KEYS
const CACHE_KEY_HOMEPAGE = 'costplus100_homepage_data';
const CACHE_KEY_TIMESTAMP = 'costplus100_homepage_timestamp';
const CACHE_KEY_VERSION = 'costplus100_homepage_cache_version';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// ⚡ INSTANT CACHE: Try to load from localStorage first
const getCachedData = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY_HOMEPAGE);
    const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
    const version = localStorage.getItem(CACHE_KEY_VERSION);
    
    if (cached && timestamp && version) {
      const age = Date.now() - parseInt(timestamp);
      if (age < CACHE_DURATION) {
        return JSON.parse(cached);
      }
    }
  } catch (error) {
    // Ignore cache errors
  }
  return null;
};

// ⚡ Save to cache
const setCachedData = (data: any) => {
  try {
    localStorage.setItem(CACHE_KEY_HOMEPAGE, JSON.stringify(data));
    localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
    localStorage.setItem(CACHE_KEY_VERSION, '1.0.0'); // Add a version number
  } catch (error) {
    // Ignore cache errors
  }
};

function MultiBuyCard({ product, onAddToCart }: { product: any; onAddToCart: (p: any, qty: number) => void }) {
  const [qty, setQty] = useState(1);
  const mbPrice = (product.sellingPrice || product.salePrice || product.price) ?? 0;
  const mbOption = product.multiBuyOptions?.[1];
  // pick best multibuy tier for current qty
  const tiers: any[] = product.multiBuyOptions || [];
  const activeTier = [...tiers].reverse().find((t: any) => qty >= t.quantity);
  const effectivePrice = activeTier ? activeTier.price : mbPrice;

  return (
    <div className="group bg-white rounded-xl border border-slate-200 hover:border-yellow-400 hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Image */}
      <Link to={`/products/${product.id}`} className="block relative aspect-square bg-slate-50 overflow-hidden">
        {(product.mainImageUrl || product.image) ? (
          <img src={product.mainImageUrl || product.image} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-2" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No image</div>
        )}
        <div className="absolute top-2 left-2 bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">Multi-buy</div>
        {(product.brandLogo || product.brandLogoUrl) && (
          <img src={product.brandLogo || product.brandLogoUrl} alt={product.brand} className="absolute bottom-1 right-1 h-5 object-contain bg-white/90 rounded px-1 shadow-sm" />
        )}
      </Link>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <Link to={`/products/${product.id}`}>
          <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 hover:text-[#E31837] transition-colors">{product.name}</p>
        </Link>
        {product.code && (
          <p className="text-xs text-slate-500">Code: <span className="font-semibold text-slate-700">{product.code}</span></p>
        )}

        {/* Price */}
        <div className="mt-auto pt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-[#E31837]">${effectivePrice.toFixed(2)}</span>
            <span className="text-xs text-slate-400">ex GST</span>
          </div>
          {mbOption && (
            <p className="text-xs text-green-700 font-bold bg-green-50 border border-green-100 rounded px-1.5 py-0.5 mt-0.5 inline-block">
              {mbOption.quantity}+ packs @ ${mbOption.price?.toFixed(2)} each
            </p>
          )}
        </div>

        {/* Quantity + Add to Cart */}
        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-2 py-1.5 hover:bg-slate-100 transition-colors text-slate-600">
              <Minus className="size-3" />
            </button>
            <span className="px-2 py-1 text-xs font-bold text-slate-800 min-w-[24px] text-center">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="px-2 py-1.5 hover:bg-slate-100 transition-colors text-slate-600">
              <Plus className="size-3" />
            </button>
          </div>
          <button
            onClick={() => onAddToCart(product, qty)}
            className="flex-1 flex items-center justify-center gap-1 bg-[#2D3748] hover:bg-[#E31837] text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
          >
            <ShoppingCart className="size-3.5" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

let renderCount = 0;
let featuredLoaded = false; // module-level flag: prevent re-fetching featured IDs on navigation back

export function Home() {
  renderCount++;
  console.log(`🏠 HOME RENDER #${renderCount}`);
  // ✅ Get metadata from CMS (categories, header, footer)
  let data, cmsLoading;
  try {
    const cms = useCMS();
    data = cms.data;
    cmsLoading = cms.loading;
  } catch (e) {
    logger.error('Home: CMSProvider not available, using empty data');
    data = {
      products: [],
      categories: [],
      categoryTree: [],
      header: { logo: '', phone: '', workingHours: '', navigation: [] },
      footer: { about: '', email: '', phone: '', address: '', socialMedia: {} },
      homepage: { hero: { title: '', subtitle: '', image: '' }, features: [] },
    };
    cmsLoading = false;
  }

  // ⚡ Load products from CDN (already cached by React Query)
  const { data: productsFromCDN, isLoading: productsLoading } = useProducts();
  const { addToCart } = useCart();
  const products = productsFromCDN || [];

  // Use categories from CMSContext
  useEffect(() => {
    if (data.categories && data.categories.length > 0) {
      setHomepageCategories(data.categories);
    }
    if (data.categoryTree && data.categoryTree.length > 0) {
      setHomepageCategoryTree(data.categoryTree);
    }
  }, [data.categories, data.categoryTree]);

  // ⚡ ENABLE CACHE: Load from cache first for instant display
  // Check cache on mount - load cached data immediately if available
  useEffect(() => {
    const cachedData = getCachedData();
    if (cachedData && products && products.length > 0) {
      console.log('⚡ INSTANT CACHE HIT: Loading from localStorage');

      // Load cached IDs and filter from current products
      const featuredIds = cachedData.featuredIds || [];
      const popularIds = cachedData.popularIds || [];
      const promotionIds = cachedData.promotionIds || [];

      const cached = {
        featured: products.filter((p: any) =>
          featuredIds.includes(p.code) || featuredIds.includes(p.id)
        ).sort((a: any, b: any) => {
          const priceA = parseFloat(a.price || a.standardPrice || 0);
          const priceB = parseFloat(b.price || b.standardPrice || 0);
          return priceB - priceA; // High to low
        }).slice(0, 20),
        popular: products.filter((p: any) =>
          popularIds.includes(p.code) || popularIds.includes(p.id)
        ).slice(0, 20),
        promotional: products.filter((p: any) =>
          promotionIds.includes(p.code) || promotionIds.includes(p.id)
        ).slice(0, 20),
        banners: cachedData.banners || [],
        sectionsConfig: cachedData.sectionsConfig || []
      };

      setFeaturedProducts(cached.featured);
      setPopularProducts(cached.popular);
      setPromotionalProducts(cached.promotional);
      setSectionsConfig(cached.sectionsConfig);
      setSectionsLoaded(true);

      // Only set banners after checking if they're valid
      if (cached.banners && cached.banners.length > 0) {
        // Filter to only valid banners
        const validBanners = cached.banners.filter((b: any) =>
          b.active !== false &&
          b.image &&
          b.image.trim() !== '' &&
          !b.image.includes('placeholder') &&
          (b.image.startsWith('http') || b.image.startsWith('data:'))
        );

        if (validBanners.length > 0) {
          setBanners(validBanners);
          // Delay showing carousel to allow static banner to render first
          setTimeout(() => {
            setBannersLoaded(true);
          }, 500);
        }
      }
    }
  }, [products.length]); // Run when products load

  const [featuredProducts, setFeaturedProductsRaw] = useState<any[]>([]);
  const [popularProducts, setPopularProductsRaw] = useState<any[]>([]);
  const [promotionalProducts, setPromotionalProductsRaw] = useState<any[]>([]);
  const [forceRenderKey, setForceRenderKey] = useState(0);
  const [showCallPopup, setShowCallPopup] = useState(false);

  // Wrap setters to log every state change
  const setFeaturedProducts = (data: any[]) => {
    console.log('📝 setFeaturedProducts called with:', data.length, 'items, first:', data[0]?.code);
    if (data.length > 0 && data[0]?.code) {
      console.log('   Full codes:', data.map(p => p.code).slice(0, 5).join(', '));
    }
    setFeaturedProductsRaw(data);
  };

  const setPopularProducts = (data: any[]) => {
    console.log('📝 setPopularProducts called with:', data.length, 'items, first:', data[0]?.code);
    setPopularProductsRaw(data);
  };

  const setPromotionalProducts = (data: any[]) => {
    console.log('📝 setPromotionalProducts called with:', data.length, 'items, first:', data[0]?.code);
    setPromotionalProductsRaw(data);
  };
  const [homepageCategories, setHomepageCategories] = useState<string[]>([]);
  const [homepageCategoryTree, setHomepageCategoryTree] = useState<any[]>([]);

  // ⚡ LOAD BANNERS: Always start empty, load from server
  const [banners, setBanners] = useState<any[]>([]);
  const [bannersLoaded, setBannersLoaded] = useState(false);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const [sectionsConfig, setSectionsConfig] = useState<any[]>([]);

  // ⚡ STATIC HERO: Use as fallback only when no banners
  const staticHero = heroConfig;
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<any>(null);
  
  // ✅ DEBUG: Track loading errors for production debugging
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const lastFetchTimeRef = useRef<number>(0);

  // ✅ REMOVED: Don't show cached banners immediately - always load fresh from server
  // This ensures static banner shows first while carousel loads

  // ⚡ Load featured product IDs from dedicated CDN file, but use CDN chunk product
  // data for prices so they stay in sync with sync-products (not sync-featured).
  useEffect(() => {
    // Only run once per browser session — prevents re-fetch on navigation back causing product flicker
    if (featuredLoaded) return;

    const loadFeaturedFromCDN = async () => {
      try {
        const urlRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/featured-url`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
        if (!urlRes.ok) return;
        const { url } = await urlRes.json();
        if (!url) return;

        const dataRes = await fetch(url, { cache: 'no-store' });
        if (!dataRes.ok) return;
        const data = await dataRes.json();

        if (data.products && data.products.length > 0) {
          // Use CDN chunk products for pricing (fresh after sync-products),
          // falling back to featured-products.json only if chunks not loaded yet.
          const sourceProducts = products.length > 0 ? products : data.products;

          const featured = sourceProducts.filter((p: any) => data.featuredIds?.includes(p.code) || data.featuredIds?.includes(p.id));
          const popular = sourceProducts.filter((p: any) => data.popularIds?.includes(p.code) || data.popularIds?.includes(p.id));
          const promo = sourceProducts.filter((p: any) => data.promoIds?.includes(p.code) || data.promoIds?.includes(p.id));

          if (featured.length > 0) setFeaturedProducts(featured);
          if (popular.length > 0) setPopularProducts(popular);
          if (promo.length > 0) setPromotionalProducts(promo);
          setSectionsLoaded(true);
          featuredLoaded = true;
          console.log(`⚡ [Featured CDN] Loaded ${featured.length} featured products (source: ${products.length > 0 ? 'CDN chunks' : 'featured-products.json'})`);
        }
      } catch (e) {
        // Silently fall through to full product load
      }
    };
    loadFeaturedFromCDN();
  }, [products.length]);

  // Fetch featured sections when products are loaded
  useEffect(() => {
    // Update SEO meta tags for homepage
    updateSEOTags(homepageSEO);

    // Only fetch when products are loaded
    if (products && products.length > 0) {
      // Check if we have fresh cached data
      const cachedData = getCachedData();
      if (cachedData) {
        console.log('⚡ Cache is fresh - skipping server fetch');
        // Cache is already loaded in the other useEffect
        return;
      }

      console.log('🔄 No cache or stale - fetching from server...');
      fetchHomepageData();
    }
  }, [products.length]); // Re-run when products load

  const fetchSectionsConfig = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/sections-config`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setSectionsConfig(data);
      }
    } catch (error) {
      // Silently fail - use default section names
    }
  };

  const fetchHomepageData = async () => {
    const fetchId = Math.random().toString(36).substring(7);
    try {
      console.log(`🔄 [${fetchId}] Fetching homepage metadata (sections IDs + banners)...`);

      // Fetch sections IDs AND banners from backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/homepage-metadata`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const metadata = await response.json();
        console.log('📦 Metadata received:', {
          featuredIds: metadata.featuredIds?.length || 0,
          popularIds: metadata.popularIds?.length || 0,
          promotionIds: metadata.promotionIds?.length || 0,
          banners: metadata.banners?.length || 0,
          sectionsConfig: metadata.sectionsConfig?.length || 0
        });

        // Wait for products to load from CDN
        if (!products || products.length === 0) {
          console.log('⏳ Waiting for products to load from CDN...');
          // Store metadata for when products arrive
          return;
        }

        // Filter products from CDN by the IDs
        const featuredIds = metadata.featuredIds || [];
        const popularIds = metadata.popularIds || [];
        const promotionIds = metadata.promotionIds || [];

        const newFeatured = products.filter((p: any) =>
          featuredIds.includes(p.code) ||
          featuredIds.includes(p.id) ||
          featuredIds.includes(p.sku) ||
          featuredIds.includes(p.productCode)
        )
        .sort((a: any, b: any) => {
          const priceA = parseFloat(a.price || a.standardPrice || 0);
          const priceB = parseFloat(b.price || b.standardPrice || 0);
          return priceB - priceA; // High to low
        })
        .slice(0, 20);

        const newPopular = products.filter((p: any) =>
          popularIds.includes(p.code) ||
          popularIds.includes(p.id) ||
          popularIds.includes(p.sku) ||
          popularIds.includes(p.productCode)
        ).slice(0, 20);

        const newPromo = products.filter((p: any) =>
          promotionIds.includes(p.code) ||
          promotionIds.includes(p.id) ||
          promotionIds.includes(p.sku) ||
          promotionIds.includes(p.productCode)
        ).slice(0, 20);

        console.log(`✅ Filtered from CDN: ${newFeatured.length} featured, ${newPopular.length} popular, ${newPromo.length} promo`);

        setFeaturedProducts(newFeatured);
        setPopularProducts(newPopular);
        setPromotionalProducts(newPromo);

        // Set banners from metadata
        const bannersData = metadata.banners || [];
        const hasValidBanners = bannersData.length > 0 &&
          bannersData.some((b: any) =>
            b.active !== false &&
            b.image &&
            b.image.trim() !== '' &&
            !b.image.includes('placeholder') &&
            (b.image.startsWith('http') || b.image.startsWith('data:'))
          );

        if (hasValidBanners) {
          const validBanners = bannersData.filter((b: any) =>
            b.active !== false &&
            b.image &&
            b.image.trim() !== '' &&
            !b.image.includes('placeholder') &&
            (b.image.startsWith('http') || b.image.startsWith('data:'))
          );
          const sortedBanners = validBanners.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
          setBanners(sortedBanners);
          setBannersLoaded(true);
          console.log(`✅ Set ${sortedBanners.length} banners`);
        } else {
          console.log('📸 No banners - showing static banner');
          setBanners([]);
          setBannersLoaded(false);
        }

        // Set sections config
        if (metadata.sectionsConfig) {
          setSectionsConfig(metadata.sectionsConfig);
        }

        // ⚡ SAVE TO CACHE: Store IDs and metadata for instant loading next time
        setCachedData({
          featuredIds: metadata.featuredIds || [],
          popularIds: metadata.popularIds || [],
          promotionIds: metadata.promotionIds || [],
          banners: bannersData,
          sectionsConfig: metadata.sectionsConfig || []
        });

        console.log(`✅ [${fetchId}] Homepage metadata loaded and cached!`);
        console.log('✅ Homepage data loaded successfully!');
      } else {
        const errorText = await response.text();
        console.error('❌ /homepage-data error response:', response.status, errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      // FALLBACK: Don't use fallback data - just log error
      console.error('❌ CATCH BLOCK RUNNING! Error:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack');
      console.log('⚠️ FALLBACK DISABLED - Homepage will show empty until server is available');
      // Don't overwrite with old product.section data
    } finally {
      console.log('✅ fetchHomepageData completed');
      setSectionsLoaded(true);
    }
  };

  // ⚡ Banner loading handled in fetchHomepageData with preloading
  const fetchBannersInBackground = async () => {
    // Banner loading now integrated into fetchHomepageData with image preloading
    return;
  };

  // ⚡ Filter active banners - always filter from banners array
  const activeBanners = banners.filter((b: any) =>
    b.active !== false &&
    b.image &&
    b.image.trim() !== '' &&
    !b.image.includes('placeholder') &&
    (b.image.startsWith('http') || b.image.startsWith('data:'))
  );

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔄 STATE CHANGED (useEffect fired):');
    console.log('  Featured:', featuredProducts.length, 'first:', featuredProducts[0]?.code);
    if (featuredProducts.length > 0) {
      console.log('  All featured codes:', featuredProducts.map(p => p.code).slice(0, 5).join(', '));
    }
  }, [featuredProducts, popularProducts, promotionalProducts]);

  // Debug: Log banner data and loading state (run only once)
  useEffect(() => {
    const debugInfo = {
      bannersLoaded,
      bannersCount: banners.length,
      activeBannersCount: activeBanners.length,
      shouldShowStatic: !bannersLoaded || activeBanners.length === 0,
      shouldShowCarousel: bannersLoaded && activeBanners.length > 0,
      importedBannerPath: heroBannerImg
    };
    console.log('🎯 Banner Debug:', debugInfo);
  }, [bannersLoaded, banners.length, activeBanners.length]); // ✅ Only re-run when counts change, not array refs

  // ✅ Pagination for sections (8 products per page)
  const [featuredPage, setFeaturedPage] = useState(0);
  const [popularPage, setPopularPage] = useState(0);
  const [promotionPage, setPromotionPage] = useState(0);
  const PRODUCTS_PER_PAGE = 8;

  // ✅ Compute section products with proper fallback handling
  // ✅ Products are now fetched directly from /homepage-data endpoint (cached on server)
  // No need to filter from all products - we get them ready to use!

  // Paginated products for each section
  const displayFeaturedProducts = useMemo(() => {
    const start = featuredPage * PRODUCTS_PER_PAGE;
    return featuredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [featuredProducts, featuredPage]);

  const displayPopularProducts = useMemo(() => {
    const start = popularPage * PRODUCTS_PER_PAGE;
    return popularProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [popularProducts, popularPage]);

  const displayPromotionalProducts = useMemo(() => {
    const start = promotionPage * PRODUCTS_PER_PAGE;
    return promotionalProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [promotionalProducts, promotionPage]);

  // Calculate total pages for each section
  const featuredTotalPages = Math.ceil(featuredProducts.length / PRODUCTS_PER_PAGE);
  const popularTotalPages = Math.ceil(popularProducts.length / PRODUCTS_PER_PAGE);
  const promotionTotalPages = Math.ceil(promotionalProducts.length / PRODUCTS_PER_PAGE);

  // Multi-buy products — those with at least 2 price tiers
  const multiBuyProducts = useMemo(() => {
    return products
      .filter((p: any) => p.multiBuyOptions && p.multiBuyOptions.length >= 2)
      .slice(0, 8);
  }, [products]);

  // Extract unique brands from products with their logos from database
  const fullCategoryTree = useMemo(() => buildCategoryTree(data?.categoryTree || []), [data?.categoryTree]);

  const brands = useMemo(() => {
    const brandMap = new Map<string, { name: string; logoUrl: string }>();
    
    products.forEach((p) => {
      if (p.brand && p.brandLogoUrl && !brandMap.has(p.brand)) {
        brandMap.set(p.brand, {
          name: p.brand,
          logoUrl: p.brandLogoUrl
        });
      }
    });
    
    return Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Get section configuration - filter only active sections
  const activeSections = useMemo(() => {
    return sectionsConfig
      .filter(section => section.active)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [sectionsConfig]);

  // Helper to get section config by ID
  const getSectionConfig = (sectionId: string) => {
    return sectionsConfig.find(s => s.id === sectionId);
  };

  // Carousel settings
  const carouselSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: false,
    arrows: true,
  };

  // ✅ Show skeletons if we don't have products to display in sections yet
  // Check actual section products, not just global products array
  // PERMANENT FIX: Only show skeleton during initial load (sectionsLoaded = false)
  // After that, show sections even if empty (admin hasn't configured them yet)
  const isFullyLoading = !sectionsLoaded;

  // Product Card Skeleton Component
  const ProductCardSkeleton = () => (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
      {/* Image area */}
      <div className="aspect-square relative overflow-hidden bg-slate-100">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-[shimmer_1.5s_infinite]" style={{ backgroundSize: '200% 100%' }} />
      </div>
      {/* Content area */}
      <div className="p-3 space-y-2.5">
        {/* Brand badge */}
        <div className="h-3 w-16 bg-slate-200 rounded-full animate-pulse" />
        {/* Product name — two lines */}
        <div className="space-y-1.5">
          <div className="h-4 bg-slate-200 rounded animate-pulse w-full" />
          <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
        </div>
        {/* Price */}
        <div className="h-6 bg-slate-200 rounded animate-pulse w-1/3" />
        {/* Add to cart button */}
        <div className="h-9 bg-slate-200 rounded-lg animate-pulse w-full" />
      </div>
    </div>
  );

  // Brand Card Skeleton Component
  const BrandCardSkeleton = () => (
    <div className="flex-shrink-0 bg-white rounded-xl p-5 md:p-6 border-2 border-slate-200 min-w-[180px] max-w-[180px]">
      <div className="w-full h-32 mb-4 rounded-lg bg-slate-200 animate-pulse"></div>
      <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4 mx-auto"></div>
    </div>
  );

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden">
      <h1 className="sr-only">Catering Equipment &amp; Commercial Kitchen Supplies Australia | Cost Plus 100</h1>
      {/* SEO Meta Tags and Structured Data for Homepage */}
      <SEOHead
        title="CostPlus Catering Equipment - Professional Kitchen Equipment Australia"
        description="Australia's premier supplier of commercial catering equipment. Shop 13,777+ professional products from leading brands. Serving Sydney, Melbourne, Brisbane, Perth, and Adelaide with competitive pricing for restaurants, hotels, and professional kitchens."
        keywords="catering equipment australia, catering equipment sydney, catering equipment melbourne, catering equipment brisbane, catering equipment perth, catering equipment adelaide, commercial kitchen equipment, commercial kitchen equipment sydney, commercial kitchen equipment melbourne, restaurant equipment, hospitality equipment, commercial cooking equipment, food service equipment, professional catering supplies australia"
        schema={{
          '@context': 'https://schema.org',
          '@graph': [
            generateOrganizationSchema(),
            generateLocalBusinessSchema()
          ]
        }}
      />

      {/* Removed top red banner - moved to CTA section */}

      {/* DEBUG ERROR BANNER - Shows if data fails to load */}
      {loadingError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 mb-4" role="alert">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-bold flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  Unable to Connect to Server
                </p>
                <p className="text-sm mt-1">
                  The application is running in offline mode with default content. Some features may be limited.
                </p>
                {Object.keys(debugInfo).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer hover:underline">Technical Details (for debugging)</summary>
                    <pre className="text-xs mt-1 overflow-auto bg-yellow-100 p-2 rounded">{JSON.stringify(debugInfo, null, 2)}</pre>
                  </details>
                )}
              </div>
              <button
                onClick={() => {
                  setLoadingError(null);
                  setDebugInfo({});
                  window.location.reload();
                }}
                className="ml-4 px-3 py-1 bg-yellow-200 hover:bg-yellow-300 text-yellow-900 rounded text-sm font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ── HERO: Sidebar + Right Column ── */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 w-full overflow-hidden">
        <div className="flex gap-3 items-start min-w-0">

          {/* ── LEFT: Category Sidebar ── */}
          <div className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-white rounded-lg border border-slate-200 overflow-hidden" style={{ minHeight: 360 }}>
            {/* Header */}
            <div className="bg-[#2D3748] text-white px-3 py-2 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider">All Categories</span>
            </div>
            {/* Category Tree */}
            <div className="flex-1 overflow-y-auto">
              {fullCategoryTree.filter((cat: any) => cat.enabled !== false).map((cat: any) => (
                <div key={cat.fullPath || cat.name} className="border-b border-slate-100">
                  <Link
                    to={cat.fullPath ? `/products/c/${categoryToSlug(cat.fullPath)}` : `/products?category=${encodeURIComponent(cat.name)}`}
                    className="flex items-center justify-between px-3 py-2 hover:bg-[#E31837] hover:text-white transition-colors text-base font-bold text-slate-800 group"
                  >
                    <span className="leading-tight">{cat.name}</span>
                    {cat.children?.length > 0 && <ChevronRight className="size-3 text-slate-400 flex-shrink-0 group-hover:text-white" />}
                  </Link>
                  {cat.children?.filter((s: any) => s.enabled !== false).slice(0, 6).map((sub: any) => (
                    <Link
                      key={sub.fullPath || sub.name}
                      to={sub.fullPath ? `/products/c/${categoryToSlug(sub.fullPath)}` : `/products?category=${encodeURIComponent(sub.name)}`}
                      className="flex items-center gap-1 pl-5 pr-3 py-1 text-sm text-slate-600 hover:text-[#E31837] hover:bg-slate-50 transition-colors truncate"
                    >
                      <span className="text-slate-300 mr-0.5">›</span>{sub.name}
                    </Link>
                  ))}
                  {cat.children?.length > 6 && (
                    <Link
                      to={cat.fullPath ? `/products/c/${categoryToSlug(cat.fullPath)}` : `/products?category=${encodeURIComponent(cat.name)}`}
                      className="block pl-5 pr-3 py-1 text-xs text-[#E31837] hover:underline"
                    >
                      +{cat.children.length - 6} more →
                    </Link>
                  )}
                </div>
              ))}
            </div>
            {/* Sidebar Footer: Shipping + Payment */}
            <div className="border-t border-slate-200 px-3 pt-2 pb-3 bg-slate-50">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Shipping Partners</p>
              <div className="flex flex-col gap-1.5 mb-2">
                {/* COPE Sensitive Freight */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded px-3 py-2">
                  <div className="flex items-center gap-0.5">
                    <span className="bg-red-600 text-white text-xs font-black px-1.5 py-1 tracking-widest">C</span>
                    <span className="bg-red-600 text-white text-xs font-black px-1.5 py-1 tracking-widest">O</span>
                    <span className="bg-red-600 text-white text-xs font-black px-1.5 py-1 tracking-widest">P</span>
                    <span className="bg-red-600 text-white text-xs font-black px-1.5 py-1 tracking-widest">E</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 leading-tight">Sensitive<br/>Freight</span>
                </div>
                {/* StarTrack */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded px-3 py-2">
                  <div className="bg-red-600 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                    <div className="bg-white rounded-full w-2.5 h-2.5" />
                  </div>
                  <span className="text-sm font-black text-slate-800 tracking-tight"><span className="text-slate-700">STAR</span><span className="text-blue-500">TRACK</span></span>
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">We Accept</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Visa_Logo.png/120px-Visa_Logo.png" alt="Visa" className="h-6 object-contain bg-white border border-slate-200 rounded px-1" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/120px-Mastercard-logo.svg.png" alt="Mastercard" className="h-6 object-contain bg-white border border-slate-200 rounded px-1" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/American_Express_logo.svg/120px-American_Express_logo.svg.png" alt="Amex" className="h-6 object-contain bg-white border border-slate-200 rounded px-1" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/120px-Google_Pay_Logo.svg.png" alt="Google Pay" className="h-6 object-contain bg-white border border-slate-200 rounded px-1" />
              </div>
            </div>
          </div>

          {/* ── RIGHT: Banner + Featured + Multibuy ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Banner */}
            {(!bannersLoaded || activeBanners.length === 0) && (
              <div className="relative overflow-hidden bg-slate-100 rounded-lg h-[220px] sm:h-[300px] md:h-[360px]" data-banner-type="static">
                <img
                  src={heroBannerImg}
                  alt="Catering Equipment for Sydney, Melbourne and Brisbane"
                  className="w-full h-full object-cover object-center"
                  fetchPriority="high"
                  loading="eager"
                />
              </div>
            )}

{/* Banner Carousel - Only show when banners are loaded and valid */}
            {bannersLoaded && activeBanners.length > 0 && (
              <div className="relative rounded-lg overflow-hidden h-[220px] sm:h-[300px] md:h-[360px]" data-banner-type="carousel">
                <Slider
                  ref={sliderRef}
                  {...carouselSettings}
                  beforeChange={(current, next) => setCurrentSlide(next)}
                >
                  {activeBanners.map((slide, index) => (
                    <div key={index} className="outline-none">
                      <Link
                        to={slide.link || '/products'}
                        className="block relative overflow-hidden rounded-lg bg-slate-100 h-[220px] sm:h-[300px] md:h-[360px] cursor-pointer group"
                      >
                        <ImageWithFallback
                          src={toWebP(slide.image, 1200)}
                          alt={slide.title}
                          className="w-full h-full object-contain md:object-cover object-center transition-transform duration-300 group-hover:scale-[1.01]"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 pointer-events-none" />
                      </Link>
                    </div>
                  ))}
                </Slider>
              </div>
            )}

            {/* Featured Products */}
            {isFullyLoading ? (
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
                </div>
              </div>
            ) : displayFeaturedProducts.length > 0 ? (
              <div key={`featured-${forceRenderKey}`} className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-[#2D3748]">{getSectionConfig('featured')?.name || 'Featured Equipment'}</h2>
                  <Link to="/products?section=featured" className="text-sm text-[#E31837] hover:underline font-semibold flex items-center gap-1">View All <ArrowRight className="size-3" /></Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {displayFeaturedProducts.slice(0, 8).map((product, index) => (
                    <ProductCard key={`${product.id}-${forceRenderKey}`} product={product} priority={index < 4} />
                  ))}
                </div>
              </div>
            ) : null}

            {/* Multi-buy Deals */}
            {multiBuyProducts.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-[#2D3748]">Multi-buy Deals</h2>
                  <Link to="/products?multibuy=true" className="text-sm text-[#E31837] hover:underline font-semibold flex items-center gap-1">View All <ArrowRight className="size-3" /></Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {multiBuyProducts.slice(0, 8).map((product: any) => (
                    <MultiBuyCard key={product.id} product={product} onAddToCart={addToCart} />
                  ))}
                </div>
              </div>
            )}

          </div>{/* end right column */}
        </div>{/* end flex row */}
      </div>{/* end max-w container */}


      {/* Popular Products - REMOVED */}
      {/* {!isFullyLoading && displayPopularProducts.length > 0 && (
        <section className="py-8 md:py-16 bg-[#F9FAFB]">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 w-full">
            <div className="text-center mb-6 md:mb-10">
              <h2 className="text-2xl md:text-3xl lg:text-4xl mb-2 font-bold">
                {getSectionConfig('popular')?.name || 'Popular Equipment'}
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                {getSectionConfig('popular')?.description || 'Most loved by professional kitchens'}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {displayPopularProducts.map((product) => (
                <ProductCard key={product.id} product={product} sectionTag="popular" />
              ))}
            </div>
            <div className="text-center mt-8">
              <Link to="/products?section=popular">
                <Button size="lg" variant="outline" className="group">
                  View All {getSectionConfig('popular')?.name || 'Popular Equipment'}
                  <ArrowRight className="size-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {isFullyLoading && (
        <section className="py-8 md:py-16 bg-[#F9FAFB]">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 w-full">
            <div className="text-center mb-6 md:mb-10">
              <div className="h-10 bg-slate-200 rounded animate-pulse w-64 mx-auto mb-2"></div>
              <div className="h-5 bg-slate-200 rounded animate-pulse w-96 mx-auto max-w-full"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(8)].map((_, index) => (
                <ProductCardSkeleton key={`popular-skeleton-${index}`} />
              ))}
            </div>
          </div>
        </section>
      )} */}


      {/* Why Choose Us - REMOVED */}
      {/* <section className="py-8 md:py-16 bg-[#2D3748] text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 w-full">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-3 font-bold">Why Choose Costplus100?</h2>
            <p className="text-slate-300 text-sm md:text-base lg:text-lg">Trusted by professional kitchens across the country</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-white/10 size-14 md:size-16 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <ShieldCheck className="size-7 md:size-8 text-[#E31837]" />
              </div>
              <h3 className="text-lg md:text-xl mb-2 font-semibold">Commercial Grade</h3>
              <p className="text-slate-300 text-sm md:text-base">
                All equipment meets NSF and professional kitchen standards
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white/10 size-14 md:size-16 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Truck className="size-7 md:size-8 text-[#E31837]" />
              </div>
              <h3 className="text-lg md:text-xl mb-2 font-semibold">Fast Delivery</h3>
              <p className="text-slate-300 text-sm md:text-base">
                Quick dispatch and reliable shipping to get you operational fast
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white/10 size-14 md:size-16 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <CreditCard className="size-7 md:size-8 text-[#E31837]" />
              </div>
              <h3 className="text-lg md:text-xl mb-2 font-semibold">Competitive Pricing</h3>
              <p className="text-slate-300 text-sm md:text-base">
                Get the best deals on high-quality commercial kitchen equipment
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white/10 size-14 md:size-16 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <HeadphonesIcon className="size-7 md:size-8 text-[#E31837]" />
              </div>
              <h3 className="text-lg md:text-xl mb-2 font-semibold">Customer Support</h3>
              <p className="text-slate-300 text-sm md:text-base">
                Our team is always ready to assist with any questions or concerns
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white/10 size-14 md:size-16 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Award className="size-7 md:size-8 text-[#E31837]" />
              </div>
              <h3 className="text-lg md:text-xl mb-2 font-semibold">Quality Assurance</h3>
              <p className="text-slate-300 text-sm md:text-base">
                We stand behind the quality of our products and services
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white/10 size-14 md:size-16 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <TrendingUp className="size-7 md:size-8 text-[#E31837]" />
              </div>
              <h3 className="text-lg md:text-xl mb-2 font-semibold">Innovative Solutions</h3>
              <p className="text-slate-300 text-sm md:text-base">
                Stay ahead with our cutting-edge commercial kitchen equipment
              </p>
            </div>
          </div>
        </div>
      </section> */}

      {/* Shop by Brand - REMOVED */}
      {/* <section className="py-12 md:py-16 bg-slate-50 border-y">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 w-full">
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#2D3748] mb-2">Shop by Brand</h2>
            <p className="text-muted-foreground text-sm md:text-base lg:text-lg">Trusted manufacturers of professional equipment</p>
          </div>
          {isFullyLoading ? (
            <div className="relative overflow-hidden py-4">
              <div className="flex animate-scroll-brands gap-6 md:gap-8">
                {[...Array(5)].map((_, index) => (
                  <BrandCardSkeleton key={`brand-1-${index}`} />
                ))}
                {[...Array(5)].map((_, index) => (
                  <BrandCardSkeleton key={`brand-2-${index}`} />
                ))}
              </div>
            </div>
          ) : (
            brands.length > 0 ? (
              <>
                <div className="relative overflow-hidden py-4">
                  <div className="flex flex-row flex-nowrap animate-scroll-brands gap-6 md:gap-8 items-center" style={{ width: 'max-content' }}>
                    {brands.slice(0, 10).map((brand, index) => (
                      <Link
                        key={`brand-1-${index}`}
                        to={`/brands/${encodeURIComponent(brand.name.toLowerCase())}`}
                        className="flex-shrink-0 flex flex-col items-center justify-between bg-white hover:bg-slate-50 transition-all rounded-xl p-5 md:p-6 border-2 border-slate-200 hover:border-[#E31837] hover:shadow-xl group cursor-pointer w-[180px]"
                      >
                        <div className="w-full h-32 mb-4 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center p-3">
                          <img
                            src={brand.logoUrl}
                            alt={brand.name}
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <span className="text-sm md:text-base font-bold text-[#2D3748] group-hover:text-[#E31837] transition-colors text-center line-clamp-2">
                          {brand.name}
                        </span>
                      </Link>
                    ))}
                    {brands.slice(0, 10).map((brand, index) => (
                      <Link
                        key={`brand-2-${index}`}
                        to={`/brands/${encodeURIComponent(brand.name.toLowerCase())}`}
                        className="flex-shrink-0 flex flex-col items-center justify-between bg-white hover:bg-slate-50 transition-all rounded-xl p-5 md:p-6 border-2 border-slate-200 hover:border-[#E31837] hover:shadow-xl group cursor-pointer w-[180px]"
                      >
                        <div className="w-full h-32 mb-4 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center p-3">
                          <img
                            src={brand.logoUrl}
                            alt={brand.name}
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <span className="text-sm md:text-base font-bold text-[#2D3748] group-hover:text-[#E31837] transition-colors text-center line-clamp-2">
                          {brand.name}
                        </span>
                      </Link>
                    ))}
                    {brands.slice(0, 10).map((brand, index) => (
                      <Link
                        key={`brand-3-${index}`}
                        to={`/brands/${encodeURIComponent(brand.name.toLowerCase())}`}
                        className="flex-shrink-0 flex flex-col items-center justify-between bg-white hover:bg-slate-50 transition-all rounded-xl p-5 md:p-6 border-2 border-slate-200 hover:border-[#E31837] hover:shadow-xl group cursor-pointer w-[180px]"
                      >
                        <div className="w-full h-32 mb-4 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center p-3">
                          <img
                            src={brand.logoUrl}
                            alt={brand.name}
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <span className="text-sm md:text-base font-bold text-[#2D3748] group-hover:text-[#E31837] transition-colors text-center line-clamp-2">
                          {brand.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="text-center mt-8">
                  <Link to="/brands">
                    <Button size="lg" variant="outline" className="group">
                      View All Brands
                      <ArrowRight className="size-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </>
            ) : null
          )}
        </div>
      </section> */}

      {/* About Us Section */}
      <section className="py-10 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 lg:px-6">
          <h2 className="text-2xl font-bold text-[#2D3748] mb-4">About Costplus100</h2>

          <p className="text-slate-700 leading-relaxed mb-4">
            We are a group of highly experienced catering industry suppliers with more than 30 years of combined industry knowledge.
            After supplying some of Australia's biggest organisations, we came together to create a fresh business model designed to
            benefit everyday consumers, cafés, caterers, and businesses alike.
          </p>

          <p className="text-slate-700 leading-relaxed mb-4">
            Over the years, we have supplied major organisations including <strong>Coles Group, Woolworths Group, The Coffee Club</strong>,
            and state councils — just to name a few.
          </p>

          <p className="text-slate-700 leading-relaxed mb-4">
            Our goal is simple: bring honesty, transparency, and fair pricing back into the industry.
            Think of us as a <strong>buying club without the membership fees</strong>, hidden catches, or marketing gimmicks.
          </p>

          <p className="text-slate-700 leading-relaxed mb-4">
            We operate on a straightforward and publicly declared pricing model — <strong>Cost Price + $100 markup</strong>. No more.
            That means when you contact us, we will provide you with the true cost price plus our fixed $100 margin — what many would call "mates rates."
          </p>

          <p className="text-slate-700 leading-relaxed">
            Whether you are a restaurant owner, café operator, hotel manager, or home cook looking for professional equipment,
            we are here to give you the best possible price with total transparency.
          </p>
        </div>
      </section>

      {/* Costplus $100 Call Popup */}
      {showCallPopup && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm md:max-w-md">
          <div className="bg-[#2D3748] text-white rounded-2xl shadow-2xl overflow-hidden border-2 border-[#E31837]">
            {/* Red header bar */}
            <div className="bg-[#E31837] px-5 py-3 flex items-center justify-between">
              <span className="font-black text-sm md:text-base tracking-wide uppercase">Costplus $100 Prices</span>
              <button
                onClick={() => setShowCallPopup(false)}
                className="text-white/80 hover:text-white transition-colors rounded-full p-0.5 hover:bg-white/20"
                aria-label="Close popup"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 md:px-6 md:py-6 space-y-4">
              <p className="text-xl md:text-2xl font-black leading-snug text-white">
                Ignore all prices.
              </p>
              <p className="text-slate-200 text-sm md:text-base leading-relaxed">
                Call us for your real{" "}
                <span className="text-white font-black">
                  Costplus <span className="text-[#E31837]">$100</span>
                </span>{" "}
                price — simple and fair.
              </p>

              <a
                href="tel:1800151624"
                className="flex items-center justify-center gap-3 w-full bg-[#E31837] hover:bg-[#C41230] text-white font-black text-lg md:text-xl py-4 md:py-5 rounded-xl transition-colors shadow-lg"
              >
                <Phone className="size-5 md:size-6 shrink-0" />
                1-800-151-624
              </a>

              <p className="text-center text-xs md:text-sm text-slate-400 font-medium tracking-wide">
                NO CATCH &nbsp;·&nbsp; NO BULL &nbsp;·&nbsp; SIMPLE &amp; FAIR
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}