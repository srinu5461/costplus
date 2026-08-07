import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router';
import { ProductCard } from '../components/ProductCard';
import { useCMS } from '../context/CMSContext';
import { useProducts } from '../../hooks/useProducts';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ChevronLeft, ChevronRight, ShieldCheck, Truck, CreditCard, HeadphonesIcon, Award, TrendingUp, ArrowRight, Phone, Mail, Search, X } from 'lucide-react';
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

let renderCount = 0;

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
  const [showCallPopup, setShowCallPopup] = useState(() => {
    const seen = sessionStorage.getItem('costplus_popup_seen');
    if (!seen) {
      sessionStorage.setItem('costplus_popup_seen', '1');
      return true;
    }
    return false;
  });

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
  const [sectionsLoaded, setSectionsLoaded] = useState(true); // Start as true to show content immediately
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

  // Extract unique brands from products with their logos from database
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
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="aspect-square bg-slate-200 animate-pulse"></div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4"></div>
        <div className="h-3 bg-slate-200 rounded animate-pulse w-1/2"></div>
        <div className="h-6 bg-slate-200 rounded animate-pulse w-1/3"></div>
        <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
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
      
      {/* ⚡ STATIC HERO BANNER: Show initially while banners load, or if no banners exist */}
      {/* ⚡ STATIC HERO BANNER: Show initially while banners load, or if no banners exist */}
{(!bannersLoaded || activeBanners.length === 0) && (
  <section className="bg-slate-100 py-4 w-full" data-banner-type="static">
    <div className="max-w-7xl mx-auto px-4 lg:px-6 w-full">
      <div className="relative overflow-hidden bg-slate-100 rounded-lg h-[200px] sm:h-[300px] md:h-[350px] lg:h-[450px] xl:h-[500px]">
        <img
          src={heroBannerImg}
          alt="Catering Equipment for Sydney, Melbourne and Brisbane"
          className="w-full h-full object-cover object-center"
          onLoad={() => console.log('✅ Static banner image loaded successfully')}
          onError={(e) => console.error('❌ Static banner image failed to load', e)}
        />
      </div>
    </div>
  </section>
)}

{/* Banner Carousel with Thumbnails - Only show when banners are loaded and valid */}
{bannersLoaded && activeBanners.length > 0 && (
  <section className="bg-slate-100 py-4 w-full" data-banner-type="carousel">
    <div className="max-w-7xl mx-auto px-4 lg:px-6 w-full">
      {/* Main Banner */}
      <div className="relative banner-carousel mb-4 overflow-hidden">
        <Slider 
          ref={sliderRef} 
          {...carouselSettings}
          beforeChange={(current, next) => setCurrentSlide(next)}
        >
          {activeBanners.map((slide, index) => (
            <div key={index} className="outline-none">
              {/* 📍 FIX: Changed outer div to a Link so the whole banner is clickable */}
              <Link
                to={slide.link || '/products'}
                className="block relative overflow-hidden rounded-lg bg-slate-100 h-[200px] sm:h-[300px] md:h-[350px] lg:h-[450px] xl:h-[500px] cursor-pointer group"
              >
                {/* Full Banner Image */}
                <ImageWithFallback
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-contain sm:object-cover object-center transition-transform duration-300 group-hover:scale-[1.01]"
                />
                
                {/* Subtle dark overlay effect on hover to show clickability */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 pointer-events-none" />
              </Link>
            </div>
          ))}
        </Slider>
      </div>

            {/* Thumbnail Navigation - Nisbets Style - Hidden on Mobile */}
            {activeBanners.length > 1 && (
              <div className="relative max-w-4xl mx-auto hidden md:block">
                {/* Left Arrow */}
                <button
                  onClick={() => sliderRef.current?.slickPrev()}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-slate-100 text-[#2D3748] rounded-full p-1.5 shadow-md transition-all"
                >
                  <ChevronLeft className="size-4" />
                </button>

                {/* Thumbnails - Auto-adjust width based on number of banners */}
                <div className="flex gap-2 mx-10 justify-center overflow-hidden">
                  {activeBanners.map((slide, index) => (
                    <button
                      key={index}
                      onClick={() => sliderRef.current?.slickGoTo(index)}
                      className={`relative rounded overflow-hidden transition-all flex-shrink-0 ${
                        currentSlide === index
                          ? 'ring-2 ring-[#E31837] scale-105'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ width: `${Math.min(180, Math.floor(700 / activeBanners.length))}px` }}
                    >
                      <div className="aspect-[16/9] bg-slate-200 overflow-hidden">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="w-full h-full object-cover"
                        />
                        {currentSlide === index && (
                          <div className="absolute inset-0 bg-[#E31837]/10"></div>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                        <p className="text-white text-[10px] font-medium truncate">{slide.title}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Right Arrow */}
                <button
                  onClick={() => sliderRef.current?.slickNext()}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-slate-100 text-[#2D3748] rounded-full p-1.5 shadow-md transition-all"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </section>
      )}
      
      {/* Featured Products */}
      {!isFullyLoading && displayFeaturedProducts.length > 0 && (
        <section key={`featured-${forceRenderKey}`} className="py-4 md:py-8 bg-white">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 w-full">
            <div className="text-center mb-4 md:mb-6">
              <h2 className="text-2xl md:text-3xl lg:text-4xl mb-1 font-bold">
                {getSectionConfig('featured')?.name || 'Featured Equipment'}
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                {getSectionConfig('featured')?.description || 'Top picks from our extensive catalog'}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-4">
              {displayFeaturedProducts.map((product, index) => (
                <ProductCard key={`${product.id}-${forceRenderKey}`} product={product} priority={index < 4} />
              ))}
            </div>

            {/* Pagination Controls */}
            {featuredTotalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <Button
                  onClick={() => setFeaturedPage(Math.max(0, featuredPage - 1))}
                  disabled={featuredPage === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <span className="text-sm font-medium">
                  Page {featuredPage + 1} of {featuredTotalPages}
                </span>
                <Button
                  onClick={() => setFeaturedPage(Math.min(featuredTotalPages - 1, featuredPage + 1))}
                  disabled={featuredPage >= featuredTotalPages - 1}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}

            {/* View All Button */}
            <div className="text-center mt-8">
              <Link to="/products?section=featured">
                <Button size="lg" variant="outline" className="group">
                  View All {getSectionConfig('featured')?.name || 'Featured Equipment'}
                  <ArrowRight className="size-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Value Proposition Section */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 w-full">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2D3748] mb-6">
              Transparent Pricing.<br className="hidden md:block" /> No Hidden Costs.
            </h2>
            <p className="text-lg md:text-xl text-slate-600 mb-8">
              We operate on a simple, honest pricing model that brings transparency back to the catering equipment industry.
            </p>

            <div className="bg-gradient-to-r from-[#E31837] to-[#C41230] text-white p-8 md:p-12 rounded-2xl shadow-2xl mb-8">
              <p className="text-3xl md:text-5xl font-bold mb-4">
                Cost Price + $100
              </p>
              <p className="text-xl md:text-2xl mb-0">That's it. No more.</p>
            </div>

            <p className="text-lg text-slate-700 mb-8">
              When you contact us, we provide the <strong className="text-[#2D3748]">true cost price</strong> plus our fixed $100 margin — what many call "mates rates."
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button size="lg" className="bg-[#E31837] hover:bg-[#C41230] text-white text-lg px-8 py-6 h-auto">
                  <Phone className="size-5 mr-2" />
                  Get Your Quote Now
                </Button>
              </Link>
              <Link to="/products">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto border-2">
                  Browse Equipment
                  <ArrowRight className="size-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 md:py-16 bg-slate-50 border-y">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#2D3748] mb-4">
              Trusted by Australia's Biggest Organizations
            </h2>
            <p className="text-lg text-slate-600">
              30+ years of combined industry experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center border-t-4 border-[#E31837]">
              <div className="text-5xl font-bold text-[#E31837] mb-2">30+</div>
              <p className="text-lg font-semibold text-[#2D3748] mb-2">Years Experience</p>
              <p className="text-slate-600">Combined industry knowledge from seasoned professionals</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg text-center border-t-4 border-[#E31837]">
              <div className="text-5xl font-bold text-[#E31837] mb-2">100%</div>
              <p className="text-lg font-semibold text-[#2D3748] mb-2">Transparency</p>
              <p className="text-slate-600">No hidden markups, fees, or membership charges</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg text-center border-t-4 border-[#E31837]">
              <div className="text-5xl font-bold text-[#E31837] mb-2">$100</div>
              <p className="text-lg font-semibold text-[#2D3748] mb-2">Fixed Markup</p>
              <p className="text-slate-600">Our only margin on every product we sell</p>
            </div>
          </div>

          <div className="mt-12 bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
            <p className="text-lg text-center mb-4 font-semibold text-[#2D3748]">
              We've Supplied Major Brands Including:
            </p>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8">
              <div className="text-2xl font-bold text-slate-700">Coles Group</div>
              <div className="text-2xl font-bold text-slate-700">Woolworths Group</div>
              <div className="text-2xl font-bold text-slate-700">The Coffee Club</div>
              <div className="text-lg text-slate-600">& State Councils</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#2D3748] mb-4">
              Why Choose Costplus100?
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              A buying club without membership fees, hidden catches, or marketing gimmicks
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-xl border-2 border-slate-200 hover:border-[#E31837] transition-all hover:shadow-lg">
              <div className="bg-red-50 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="size-7 text-[#E31837]" />
              </div>
              <h3 className="text-xl font-bold text-[#2D3748] mb-3">Best Price Guaranteed</h3>
              <p className="text-slate-600">
                Cost + $100 pricing means you always get the absolute best deal — no haggling needed.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-xl border-2 border-slate-200 hover:border-[#E31837] transition-all hover:shadow-lg">
              <div className="bg-blue-50 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <Award className="size-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-[#2D3748] mb-3">Industry Expertise</h3>
              <p className="text-slate-600">
                30+ years of combined experience supplying Australia's biggest organizations.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-xl border-2 border-slate-200 hover:border-[#E31837] transition-all hover:shadow-lg">
              <div className="bg-green-50 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="size-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-[#2D3748] mb-3">Wholesale Buying Power</h3>
              <p className="text-slate-600">
                Access to importer specials and wholesale opportunities normally unavailable to the public.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-xl border-2 border-slate-200 hover:border-[#E31837] transition-all hover:shadow-lg">
              <div className="bg-purple-50 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <CreditCard className="size-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-[#2D3748] mb-3">No Hidden Fees</h3>
              <p className="text-slate-600">
                No membership fees, no hidden markups, no catches. Just honest, transparent pricing.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-xl border-2 border-slate-200 hover:border-[#E31837] transition-all hover:shadow-lg">
              <div className="bg-orange-50 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <Truck className="size-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-[#2D3748] mb-3">Fast Delivery</h3>
              <p className="text-slate-600">
                Reliable delivery across Sydney, Melbourne, Brisbane and nationwide shipping available.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-xl border-2 border-slate-200 hover:border-[#E31837] transition-all hover:shadow-lg">
              <div className="bg-slate-50 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <HeadphonesIcon className="size-7 text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-[#2D3748] mb-3">Expert Support</h3>
              <p className="text-slate-600">
                Personal service from experienced professionals who understand your needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-[#2D3748] via-[#424B54] to-[#2D3748]">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 w-full text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Experience True Transparency?
          </h2>
          <p className="text-xl md:text-2xl text-slate-200 mb-8">
            Contact us today for honest Cost + $100 pricing on all catering equipment
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/contact">
              <Button size="lg" className="bg-[#E31837] hover:bg-[#C41230] text-white text-lg px-10 py-7 h-auto shadow-xl">
                <Phone className="size-6 mr-2" />
                Get Quote Now
              </Button>
            </Link>
            <Link to="/products">
              <Button size="lg" variant="outline" className="bg-white hover:bg-slate-100 text-[#2D3748] border-0 text-lg px-10 py-7 h-auto shadow-xl">
                <Search className="size-6 mr-2" />
                Browse Catalogue
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-white">
            <div>
              <Phone className="size-8 mx-auto mb-3 text-[#E31837]" />
              <p className="font-semibold text-lg mb-1">Call Us</p>
              <p className="text-slate-300">Get instant answers</p>
            </div>
            <div>
              <Mail className="size-8 mx-auto mb-3 text-[#E31837]" />
              <p className="font-semibold text-lg mb-1">Email Quote</p>
              <p className="text-slate-300">Detailed pricing info</p>
            </div>
            <div>
              <Search className="size-8 mx-auto mb-3 text-[#E31837]" />
              <p className="font-semibold text-lg mb-1">Browse First</p>
              <p className="text-slate-300">Explore our range</p>
            </div>
          </div>
        </div>
      </section>

      {/* Loading Skeleton for Featured Products */}
      {isFullyLoading && (
        <section className="py-4 md:py-8 bg-white">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 w-full">
            <div className="text-center mb-4 md:mb-6">
              <div className="h-10 bg-slate-200 rounded animate-pulse w-64 mx-auto mb-1"></div>
              <div className="h-5 bg-slate-200 rounded animate-pulse w-96 mx-auto max-w-full"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(8)].map((_, index) => (
                <ProductCardSkeleton key={`featured-skeleton-${index}`} />
              ))}
            </div>
          </div>
        </section>
      )}

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

      {/* Simple Closing Statement */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 w-full">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-[#E31837] to-[#C41230] text-white p-8 md:p-12 rounded-xl text-center shadow-2xl">
              <p className="text-2xl md:text-3xl lg:text-4xl font-bold mb-0">
                Simple, fair, and transparent — the way business should be.
              </p>
            </div>
          </div>
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
                href="tel:1800151654"
                className="flex items-center justify-center gap-3 w-full bg-[#E31837] hover:bg-[#C41230] text-white font-black text-lg md:text-xl py-4 md:py-5 rounded-xl transition-colors shadow-lg"
              >
                <Phone className="size-5 md:size-6 shrink-0" />
                1-800-151-654
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