import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Product } from '../types/product';
import { products as initialProducts, categories as initialCategories } from '../data/products';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from '../../lib/supabase';
import { getCachedData, setCachedData, clearCache as clearCacheUtil, isCacheValid } from '../utils/cache';
import { getCachedDataIDB, setCachedDataIDB, clearAllCacheIDB, isIndexedDBSupported } from '../utils/indexedDB';

export interface CategoryNode {
  name: string;
  slug: string;
  code: string;
  path: string;
  fullPath: string;
  level: number;
  parent: string;
  imageUrl: string;
  productCount: number;
  hasChildren: boolean;
  children?: CategoryNode[];
  enabled?: boolean; // ✅ Can disable categories from menu
  order?: number; // ✅ Can reorder categories
}

interface HeaderSettings {
  logo: string;
  logoUrl?: string;
  phone: string;
  workingHours: string;
  navigation: Array<{ 
    label: string; 
    path: string; 
    enabled?: boolean; // ✅ Can disable menu items
    order?: number; // ✅ Can reorder menu items
  }>;
}

interface FooterSettings {
  about: string;
  email: string;
  phone: string;
  address: string;
  socialMedia: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
}

interface HomePageSettings {
  hero: {
    title: string;
    subtitle: string;
    image: string;
  };
  features: Array<{ icon: string; title: string; description: string }>;
}

interface CMSData {
  products: Product[];
  categories: string[];
  categoryTree: CategoryNode[];
  header: HeaderSettings;
  footer: FooterSettings;
  homepage: HomePageSettings;
}

interface CMSContextType {
  data: CMSData;
  loading: boolean;
  updateProducts: (products: Product[]) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateCategories: (categories: string[] | CategoryNode[]) => Promise<void>;
  updateHeader: (header: HeaderSettings) => Promise<void>;
  updateFooter: (footer: FooterSettings) => Promise<void>;
  updateHomePage: (homepage: HomePageSettings) => Promise<void>;
  initializeData: () => Promise<void>;
  clearCache: () => void;
  refreshData: () => Promise<void>;
  cacheTimestamp: number | null;
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

console.log('===================================================');
console.log('CMSContext.tsx v2 - FILE IS BEING EXECUTED');
console.log('===================================================');

const defaultData: CMSData = {
  products: initialProducts,
  categories: initialCategories,
  categoryTree: [],
  header: {
    logo: 'Costplus100',
    logoUrl: '', // ✅ No default logo - let the saved one load or fallback to text
    phone: '1-800-CATER-PRO',
    workingHours: 'Mon-Fri: 8:00 AM - 6:00 PM EST',
    navigation: [
      { label: 'All Products', path: '/products', enabled: true, order: 0 },
      { label: 'Ovens & Ranges', path: '/products?category=Ovens & Ranges', enabled: true, order: 1 },
      { label: 'Refrigeration', path: '/products?category=Refrigeration', enabled: true, order: 2 },
      { label: 'Food Prep', path: '/products?category=Food Prep', enabled: true, order: 3 },
      { label: 'Cookware', path: '/products?category=Cookware', enabled: true, order: 4 },
      { label: 'Storage', path: '/products?category=Storage', enabled: true, order: 5 },
      { label: 'Serving Equipment', path: '/products?category=Serving Equipment', enabled: true, order: 6 },
      { label: 'Clearance', path: '/products?clearance=true', enabled: false, order: 7 },
      { label: 'Special Offers', path: '/products?special=true', enabled: false, order: 8 },
    ],
  },
  footer: {
    about: 'CaterPro is your trusted partner for professional catering equipment. We provide commercial-grade products from leading brands.',
    email: 'info@caterpro.com',
    phone: '1-800-CATER-PRO',
    address: '123 Commercial Street, New York, NY 10001',
    socialMedia: {
      facebook: 'https://facebook.com',
      twitter: 'https://twitter.com',
      instagram: 'https://instagram.com',
      linkedin: 'https://linkedin.com',
    },
  },
  homepage: {
    hero: {
      title: 'Equip Your Kitchen for Success',
      subtitle: 'Commercial-grade catering equipment from leading brands. Quality you can trust, prices you\'ll love.',
      image: 'https://images.unsplash.com/photo-1767785990437-dfe1fe516fe8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBjb21tZXJjaWFsJTIwa2l0Y2hlbiUyMHJlc3RhdXJhbnR8ZW58MXx8fHwxNzc0NDE0ODIyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    },
    features: [
      {
        icon: 'shield',
        title: 'Commercial Grade',
        description: 'All equipment meets NSF and professional kitchen standards',
      },
      {
        icon: 'clock',
        title: 'Fast Delivery',
        description: 'Quick dispatch and reliable shipping to get you operational fast',
      },
      {
        icon: 'headphones',
        title: 'Expert Guidance',
        description: 'Our specialists help you choose the right equipment for your needs',
      },
    ],
  },
};

export function CMSProvider({ children }: { children: ReactNode }) {
  console.log('========================================');
  console.log('🔧 CMSProvider: FUNCTION CALLED');
  console.log('🔧 Children provided:', !!children);
  console.log('========================================');

  const [data, setData] = useState<CMSData>(() => {
    console.log('🔧 Initializing data state...');
    // ⚡ INSTANT LOADING: Load metadata from cache (products loaded from server progressively)
    try {
      const cached = getCachedData();
      if (cached && isCacheValid(cached)) {
        console.log(`✅ CMSProvider: Using cached metadata for INSTANT load`);
        return {
          products: [], // Products will be loaded from server (too large for client cache)
          categories: cached.categories || defaultData.categories,
          categoryTree: cached.categoryTree || defaultData.categoryTree,
          header: cached.header || defaultData.header,
          footer: cached.footer || defaultData.footer,
          homepage: cached.homepage || defaultData.homepage,
        };
      } else {
        if (cached) {
          console.warn('⚠️  CMSProvider: Cached data version mismatch - will refresh from server');
          clearCacheUtil();
        }
      }
    } catch (e) {
      console.error('CMSProvider: Failed to parse cached data:', e);
      clearCacheUtil();
    }

    console.log('⚠️  CMSProvider: No valid cache found, will load from server');
    return defaultData;
  });
  
  // ✅ Track cache timestamp separately
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(() => {
    try {
      const cached = getCachedData();
      if (cached && cached.timestamp) {
        return cached.timestamp;
      }
    } catch (e) {
      // ignore
    }
    return null;
  });
  
  // ✅ INSTANT LOADING: Start with false to render immediately with default/cached data
  // Background data loading happens without blocking UI
  const [loading, setLoading] = useState(false);
  
  // Track if initial load has completed
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [fullDataLoaded, setFullDataLoaded] = useState(false);

  // ⚡ PROGRESSIVE LOADING STRATEGY
  // Step 1: Load lightweight homepage data first (< 1s, ~100KB)
  // Step 2: Load full data in background for search/navigation
  const loadDataProgressively = async () => {
    try {
      // STEP 1: Load lightweight homepage data first
      console.log('⚡ STEP 1: Loading lightweight homepage data...');
      const homepageStartTime = Date.now();

      // Add timeout to prevent hanging (reduced to 2s for faster fallback)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      const homepageResponse = await fetch(`${API_URL}/homepage-data`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (homepageResponse.ok) {
        const homepageData = await homepageResponse.json();
        const homepageTime = Date.now() - homepageStartTime;
        console.log(`✅ STEP 1 COMPLETE: Homepage data loaded in ${homepageTime}ms`);
        
        // Safely extract arrays with defaults (using correct field names from server)
        const featuredProducts = Array.isArray(homepageData.featured) ? homepageData.featured : [];
        const popularProducts = Array.isArray(homepageData.popular) ? homepageData.popular : [];
        const categoryTree = Array.isArray(homepageData.categoryTree) ? homepageData.categoryTree : [];
        
        console.log(`📦 Homepage data: ${featuredProducts.length} featured, ${popularProducts.length} popular, ${categoryTree.length} categories`);
        
        // Update state with homepage data immediately
        setData(prev => ({
          products: [...featuredProducts, ...popularProducts],
          categories: Array.isArray(homepageData.categories) ? homepageData.categories : [],
          categoryTree: homepageData.categoryTree || [],
          header: homepageData.header || prev.header,
          footer: homepageData.footer || prev.footer,
          homepage: homepageData.homepage || prev.homepage,
        }));
        
        setLoading(false);
        setInitialLoadComplete(true);
        
        // ⚡ Cache homepage metadata (NOT products - too large)
        try {
          const cacheData = {
            categories: Array.isArray(homepageData.categories) ? homepageData.categories : [],
            categoryTree: homepageData.categoryTree || [],
            header: homepageData.header || defaultData.header,
            footer: homepageData.footer || defaultData.footer,
            homepage: homepageData.homepage || defaultData.homepage,
            banners: homepageData.banners || [],
            sectionsConfig: homepageData.sectionsConfig || []
          };
          setCachedData(cacheData);
          setCacheTimestamp(Date.now());

          console.log(`✅ Cached homepage metadata (${homepageData.banners?.length || 0} banners, ${categoryTree.length} categories)`);
          console.log(`ℹ️  Products NOT cached (${featuredProducts.length + popularProducts.length} products - loaded from server for instant display)`);
        } catch (e) {
          console.warn('⚠️  Failed to cache homepage data:', e);
        }
        
        // STEP 2: Load full data in background (for search, mega menu, etc.)
        console.log('⚡ STEP 2: Loading full data in background...');
        setTimeout(() => loadFullDataInBackground(), 100);
      } else {
        // Fallback to full load if homepage endpoint fails
        console.warn('⚠️  Homepage endpoint failed, falling back to full load');
        await loadData();
      }
    } catch (error: any) {
      // Don't log AbortError - it's expected when timeout triggers
      if (error?.name !== 'AbortError') {
        console.error('Error in progressive load:', error);
      } else {
        console.log('Homepage data request timed out, loading default data');
      }
      // Fallback to full load - but make sure we don't hang
      try {
        await loadData();
      } catch (fallbackError: any) {
        if (fallbackError?.name !== 'AbortError') {
          console.error('Fallback load also failed:', fallbackError);
        }
        // Set loading to false so app can render with default data
        setLoading(false);
        setInitialLoadComplete(true);
      }
    }
  };

  // Background loading of full dataset
  const loadFullDataInBackground = async () => {
    try {
      console.log('📦 Background: Loading full dataset...');
      const fullStartTime = Date.now();

      // ⚡ TRY INDEXEDDB CACHE FIRST (50MB+ capacity, much faster than server)
      if (isIndexedDBSupported()) {
        const cachedProducts = await getCachedDataIDB('products', '1').catch(() => null);

        if (cachedProducts && Array.isArray(cachedProducts) && cachedProducts.length > 0) {
          const idbTime = Date.now() - fullStartTime;
          console.log(`✅ [IndexedDB CACHE HIT] Loaded ${cachedProducts.length} products from IndexedDB in ${idbTime}ms`);

          // Update products from IndexedDB cache
          setData(prev => ({
            ...prev,
            products: cachedProducts,
          }));

          setFullDataLoaded(true);
          return; // Skip server request - we have cached products
        } else {
          console.log('⚠️ [IndexedDB CACHE MISS] No products in cache, loading from server...');
        }
      } else {
        console.warn('⚠️ IndexedDB not supported in this browser');
      }

      // Load from server (cache miss or IndexedDB not supported)
      const backgroundController = new AbortController();
      const backgroundTimeoutId = setTimeout(() => backgroundController.abort(), 30000); // 30 second timeout

      const response = await fetch(`${API_URL}/cms/data`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        signal: backgroundController.signal,
      });

      clearTimeout(backgroundTimeoutId);

      if (response.ok) {
        const serverData = await response.json();
        const fullTime = Date.now() - fullStartTime;
        console.log(`✅ Background: Full data loaded in ${fullTime}ms (${serverData.products?.length || 0} products)`);

        // Update with full dataset
        setData({
          products: serverData.products || [],
          categories: serverData.categories || [],
          categoryTree: serverData.categoryTree || [],
          header: serverData.header || defaultData.header,
          footer: serverData.footer || defaultData.footer,
          homepage: serverData.homepage || defaultData.homepage,
        });

        setFullDataLoaded(true);

        // ⚡ Cache products in IndexedDB (50MB+ capacity)
        if (isIndexedDBSupported() && serverData.products && serverData.products.length > 0) {
          try {
            await setCachedDataIDB('products', serverData.products, '1');
            console.log(`✅ [IndexedDB] Cached ${serverData.products.length} products for next visit`);
          } catch (e) {
            console.warn('⚠️ Failed to cache products in IndexedDB:', e);
          }
        }

        // Cache metadata in localStorage (lightweight)
        try {
          const cacheData = {
            categories: serverData.categories,
            categoryTree: serverData.categoryTree,
            header: serverData.header,
            footer: serverData.footer,
            homepage: serverData.homepage,
            productCount: serverData.products?.length || 0
          };
          setCachedData(cacheData);
          setCacheTimestamp(Date.now());

          console.log(`✅ Background: Cached metadata in localStorage`);
        } catch (e) {
          console.warn('⚠️  Failed to cache metadata:', e);
        }
      }
    } catch (error: any) {
      // Don't log AbortError - it's expected when timeout triggers
      if (error?.name !== 'AbortError') {
        console.error('Background full data load failed:', error);
      } else {
        console.log('Background data request timed out (not critical - user has homepage data)');
      }
      // Not critical - user already has homepage data
    }
  };

  useEffect(() => {
    console.log('⚡ CMSProvider: useEffect triggered');

    // ✅ CHECK CACHE FIRST - Only make API calls if cache is invalid or missing
    const cached = getCachedData();
    if (cached && isCacheValid(cached)) {
      console.log('✅ Valid cache found - SKIPPING API calls');
      setLoading(false);
      setInitialLoadComplete(true);

      // Still try to load products from IndexedDB cache in background
      if (isIndexedDBSupported()) {
        getCachedDataIDB('products', '1')
          .then(cachedProducts => {
            if (cachedProducts && Array.isArray(cachedProducts) && cachedProducts.length > 0) {
              console.log(`✅ Loaded ${cachedProducts.length} products from IndexedDB cache`);
              setData(prev => ({ ...prev, products: cachedProducts }));
              setFullDataLoaded(true);
            }
          })
          .catch(e => console.warn('IndexedDB cache read failed:', e));
      }
      return;
    }

    console.log('⚠️ No valid cache - Starting progressive load from API');
    // Progressive loading: Load homepage data first, then full data in background
    loadDataProgressively();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const url = `${API_URL}/cms/data`;
      console.log('CMSContext: Fetching data from:', url);
      console.log('CMSContext: Using projectId:', projectId);
      
      const startTime = Date.now();
      
      // Add timeout to prevent hanging - increased to 30 seconds for large datasets
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const fetchTime = Date.now() - startTime;
      console.log(`✅ CMSContext: Response received in ${fetchTime}ms`);
      console.log('CMSContext: Response status:', response.status);
      console.log('CMSContext: Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('CMSContext: Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const serverData = await response.json();
      const parseTime = Date.now() - startTime;
      console.log(`✅ CMSContext: Data parsed in ${parseTime}ms total`);
      console.log('CMSContext: Server data received:', {
        productsCount: serverData.products?.length,
        categoriesCount: serverData.categories?.length,
        categoryTreeCount: serverData.categoryTree?.length,
        hasHeader: !!serverData.header,
        hasFooter: !!serverData.footer,
        hasHomepage: !!serverData.homepage,
        cacheStatus: response.headers.get('X-Cache') || 'unknown'
      });
      
      const newData = {
        products: serverData.products || defaultData.products,
        categories: serverData.categories || defaultData.categories,
        categoryTree: serverData.categoryTree || defaultData.categoryTree,
        header: serverData.header || defaultData.header,
        footer: serverData.footer || defaultData.footer,
        homepage: serverData.homepage || defaultData.homepage,
      };
      
      setData(newData);
      
      // 🚀 CACHE metadata only (products loaded separately via CDN)
      try {
        const cacheData = {
          categories: newData.categories,
          categoryTree: newData.categoryTree,
          header: newData.header,
          footer: newData.footer,
          homepage: newData.homepage,
          productCount: newData.products?.length || 0
        };

        setCachedData(cacheData);
        setCacheTimestamp(Date.now());

        console.log(`✅ CMSContext: Cached metadata (products loaded separately via CDN)`);
      } catch (e) {
        console.warn('⚠️  CMSContext: Failed to cache metadata:', e);
      }
      
      console.log('CMSContext: Data state updated successfully');
      setInitialLoadComplete(true);
      setLoading(false);
    } catch (error) {
      // Check if it's an abort error (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('CMSContext: Request timed out after 30 seconds');
        console.error('This usually means the database query is too slow or the server is overloaded');
      } else if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('CMSContext: Network error - Failed to fetch');
        console.error('Possible causes:');
        console.error('  1. Server not deployed or not running');
        console.error('  2. Network connectivity issue');
        console.error('  3. CORS issue (check browser console)');
        console.error('  4. Invalid API URL:', `${API_URL}/cms/data`);
      } else {
        console.error('CMSContext: Error loading CMS data:', error);
        console.error('Error details:', error instanceof Error ? error.message : String(error));
      }
      
      console.log('CMSContext: Using default data due to error');
      setData(defaultData);
      setInitialLoadComplete(true);
      setLoading(false);
    }
  };

  const initializeData = async () => {
    try {
      const response = await fetch(`${API_URL}/cms/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': publicAnonKey,
        },
        body: JSON.stringify(defaultData),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize data');
      }

      await loadData();
    } catch (error) {
      console.error('Error initializing data:', error);
      throw error;
    }
  };

  const updateProducts = async (products: Product[]) => {
    setData((prev) => ({ ...prev, products }));

    try {
      console.log('Products updated locally');
    } catch (error) {
      console.error('Error updating products:', error);
      await loadData();
      throw error;
    }
  };

  const addProduct = async (product: Product) => {
    setData((prev) => ({
      ...prev,
      products: [...prev.products, product],
    }));

    try {
      console.log('=== ADDING PRODUCT VIA BACKEND API ===');
      console.log('Product data:', product);
      console.log('API URL:', `${API_URL}/products`);
      
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(product),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to add product - Status:', response.status, 'Error:', errorText);
        throw new Error(`Failed to add product: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Product added successfully:', result);
    } catch (error) {
      console.error('Error adding product:', error);
      await loadData();
      throw error;
    }
  };

  const updateProduct = async (id: string, product: Product) => {
    setData((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === id ? product : p)),
    }));

    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(product),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update product:', errorText);
        throw new Error('Failed to update product');
      }
      
      const result = await response.json();
      console.log('✅ Product updated successfully:', result);
    } catch (error) {
      console.error('Error updating product:', error);
      await loadData();
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    setData((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));

    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      await loadData();
      throw error;
    }
  };

  const updateCategories = async (categories: string[] | CategoryNode[]) => {
    setData((prev) => ({ ...prev, categories }));

    try {
      const response = await fetch(`${API_URL}/categories`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': publicAnonKey,
        },
        body: JSON.stringify(categories),
      });

      if (!response.ok) {
        throw new Error('Failed to update categories');
      }
    } catch (error) {
      console.error('Error updating categories:', error);
      await loadData();
      throw error;
    }
  };

  const updateHeader = async (header: HeaderSettings) => {
    setData((prev) => ({ ...prev, header }));

    try {
      console.log('Updating header via API:', header);
      const response = await fetch(`${API_URL}/header`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(header),
      });

      console.log('Update header response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update header failed:', errorText);
        throw new Error(`Failed to update header: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Header updated successfully:', result);
      
      // ✅ Clear cache so new logo loads immediately on next visit
      clearCacheUtil();
      console.log('✅ Cache cleared after header update');
    } catch (error) {
      console.error('Error updating header:', error);
      await loadData();
      throw error;
    }
  };

  const updateFooter = async (footer: FooterSettings) => {
    setData((prev) => ({ ...prev, footer }));

    try {
      // Add 10-second timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      console.log('Updating footer, sending to:', `${API_URL}/footer`);
      console.log('Footer data:', footer);
      console.log('Using API Key (first 50 chars):', publicAnonKey.substring(0, 50));
      console.log('API Key length:', publicAnonKey.length);
      
      const response = await fetch(`${API_URL}/footer`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(footer),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      // Try to get response text first for debugging
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: 'Failed to parse error response', rawResponse: responseText };
        }
        throw new Error(errorData.details || errorData.error || `Failed to update footer (${response.status})`);
      }
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        // If we can't parse response but status was ok, assume success
        result = { success: true };
      }
      
      console.log('Footer update response:', result);
      
      // ✅ Clear cache so new footer data loads immediately on next visit
      clearCacheUtil();
      console.log('✅ Cache cleared after footer update');
      
      // If there's a warning, log it but don't fail
      if (result.warning) {
        console.warn('Footer update warning:', result.warning);
      }
    } catch (error) {
      console.error('Error updating footer:', error);
      
      // If it's an abort error (timeout), just warn but don't fail completely
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Footer update timed out, but data is saved locally in state');
        // Don't throw - the state is already updated
        return;
      }
      
      // For other errors, reload data and throw
      await loadData();
      throw error;
    }
  };

  const updateHomePage = async (homepage: HomePageSettings) => {
    setData((prev) => ({ ...prev, homepage }));

    try {
      const response = await fetch(`${API_URL}/homepage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': publicAnonKey,
        },
        body: JSON.stringify(homepage),
      });

      if (!response.ok) {
        throw new Error('Failed to update homepage');
      }
    } catch (error) {
      console.error('Error updating homepage:', error);
      await loadData();
      throw error;
    }
  };

  const clearCache = () => {
    clearCacheUtil();
    setCacheTimestamp(null);

    // Clear IndexedDB products cache
    if (isIndexedDBSupported()) {
      clearAllCacheIDB()
        .then(() => console.log('✅ IndexedDB cache cleared'))
        .catch(e => console.warn('⚠️ Failed to clear IndexedDB:', e));
    }

    // ✅ CLEAR HOMEPAGE CACHE: Featured/Popular/Promotional products
    try {
      localStorage.removeItem('costplus100_homepage_data');
      localStorage.removeItem('costplus100_homepage_timestamp');
      localStorage.removeItem('costplus100_homepage_cache_version');
      console.log('✅ Homepage cache cleared (featured/popular/promotional products)');
    } catch (e) {
      console.warn('⚠️ Failed to clear homepage cache:', e);
    }

    // Clear any old products cache from sessionStorage (legacy cleanup)
    try {
      sessionStorage.removeItem('cms_products_cache');
      console.log('✅ Cache cleared (localStorage + IndexedDB + Homepage)');
    } catch (e) {
      console.warn('Failed to clear sessionStorage:', e);
    }
  };

  const refreshData = async () => {
    console.log('🔄 Refresh data requested - forcing fresh fetch');
    setLoading(true);

    try {
      // Force fresh fetch by adding ?force=true parameter with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${API_URL}/cms/data?force=true`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = errorData.details || errorData.error || '';
        } catch (e) {
          // Couldn't parse error response
          errorDetails = await response.text().catch(() => '');
        }

        console.error('Server returned error:', response.status, errorDetails);
        throw new Error(`Failed to refresh data (${response.status}): ${errorDetails || 'Server error'}`);
      }

      const serverData = await response.json();
      console.log(`✅ Fresh data loaded (${serverData.products?.length || 0} products)`);

      // Update with fresh dataset
      setData({
        products: serverData.products || [],
        categories: serverData.categories || [],
        categoryTree: serverData.categoryTree || [],
        header: serverData.header || defaultData.header,
        footer: serverData.footer || defaultData.footer,
        homepage: serverData.homepage || defaultData.homepage,
      });

      setFullDataLoaded(true);

      // Update cache with fresh metadata
      try {
        const cacheData = {
          categories: serverData.categories,
          categoryTree: serverData.categoryTree,
          header: serverData.header,
          footer: serverData.footer,
          homepage: serverData.homepage,
          productCount: serverData.products?.length || 0
        };
        setCachedData(cacheData);
        setCacheTimestamp(Date.now());

        console.log(`✅ Cache updated with fresh metadata (${serverData.products?.length || 0} products from server cache)`);
      } catch (e) {
        console.warn('⚠️  Failed to update cache:', e);
      }

      setLoading(false);
      console.log('✅ Refresh complete');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      setLoading(false);

      // If it's an abort error (timeout), provide more helpful message
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out - server may be overloaded. Try again in a moment.');
      }

      throw error;
    }
  };

  return (
    <CMSContext.Provider
      value={{
        data,
        loading,
        updateProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        updateCategories,
        updateHeader,
        updateFooter,
        updateHomePage,
        initializeData,
        clearCache,
        refreshData,
        cacheTimestamp,
      }}
    >
      {children}
    </CMSContext.Provider>
  );
}

export function useCMS() {
  const context = useContext(CMSContext);
  if (!context) {
    console.error('❌ CMSContext is null - CMSProvider not wrapping components!');
    throw new Error('useCMS must be used within CMSProvider');
  }
  return context;
}