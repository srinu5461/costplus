import { Link } from 'react-router';
import { useAdmin } from '../../context/AdminContext';
import { useCMS } from '../../context/CMSContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Package,
  Layout,
  Settings,
  FileText,
  Home,
  LayoutGrid,
  Percent,
  Search,
  Trash2,
  RefreshCw,
  Database,
  Clock,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { useState, useEffect, startTransition } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import { getCachedDataIDB, isIndexedDBSupported } from '../../utils/indexedDB';

export function AdminDashboard() {
  const { isAuthenticated } = useAdmin();
  const [queryResult, setQueryResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [buildCacheLoading, setBuildCacheLoading] = useState(false);
  const [lastCacheCleared, setLastCacheCleared] = useState<string | null>(null);
  const [lastCacheBuilt, setLastCacheBuilt] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  const [checkingCache, setCheckingCache] = useState(false);
  const [productCount, setProductCount] = useState<number>(0);
  const [categoryCount, setCategoryCount] = useState<number>(0);
  
  // ✅ Safe access to CMS context with fallback
  let data, clearCache, refreshData, cacheTimestamp, cmsLoading;
  try {
    const cms = useCMS();
    data = cms.data;
    clearCache = cms.clearCache;
    refreshData = cms.refreshData;
    cacheTimestamp = cms.cacheTimestamp;
    cmsLoading = cms.loading;
  } catch (e) {
    console.error('AdminDashboard: CMSProvider not available, using empty data');
    data = {
      products: [],
      categories: [],
      categoryTree: [],
      header: { logo: '', phone: '', workingHours: '', navigation: [] },
      footer: { about: '', email: '', phone: '', address: '', socialMedia: {} },
      homepage: { hero: { title: '', subtitle: '', image: '' }, features: [] },
    };
    clearCache = () => {};
    refreshData = async () => {};
    cacheTimestamp = null;
    cmsLoading = false;
  }

  if (!isAuthenticated) {
    return null;
  }

  // Fetch actual product and category counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/products-count`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
        const result = await response.json();
        console.log('📊 Products count API response:', result);
        setProductCount(result.totalCount || 0);

        // Categories from CMS data
        setCategoryCount(data.categories?.length || 0);
      } catch (error) {
        console.error('Failed to fetch counts:', error);
      }
    };
    fetchCounts();
  }, [data.categories]);

  console.log('📊 AdminDashboard Stats:', {
    productCount,
    categoryCount,
    cmsLoading
  });

  const stats = [
    { label: 'Total Products', value: productCount || '...', icon: Package },
    { label: 'Categories', value: categoryCount || data.categories.length, icon: LayoutGrid },
    { label: 'In Stock', value: '...', icon: Package },
    { label: 'Out of Stock', value: '...', icon: Package },
  ];

  const quickLinks = [
    { 
      title: 'Manage Products', 
      description: 'Add, edit, or delete products',
      icon: Package,
      path: '/admin/products',
      color: 'bg-blue-500'
    },
    { 
      title: 'Edit Header', 
      description: 'Customize header and navigation',
      icon: Layout,
      path: '/admin/header',
      color: 'bg-green-500'
    },
    { 
      title: 'Edit Footer', 
      description: 'Update footer content',
      icon: FileText,
      path: '/admin/footer',
      color: 'bg-purple-500'
    },
    { 
      title: 'Homepage Settings', 
      description: 'Customize homepage sections',
      icon: Home,
      path: '/admin/homepage',
      color: 'bg-orange-500'
    },
    { 
      title: 'Categories', 
      description: 'Manage product categories',
      icon: LayoutGrid,
      path: '/admin/categories',
      color: 'bg-pink-500'
    },
    {
      title: 'Profit Margins',
      description: 'Configure tiered pricing margins',
      icon: Percent,
      path: '/admin/profit-margin-settings',
      color: 'bg-emerald-500'
    },
    {
      title: 'Specials & BOGO',
      description: 'Manage promotions and special offers',
      icon: Tag,
      path: '/admin/specials',
      color: 'bg-red-500'
    },
    {
      title: 'Settings',
      description: 'General CMS settings',
      icon: Settings,
      path: '/admin/settings',
      color: 'bg-slate-500'
    },
  ];

  const queryProduct = async (code: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/products/query/${code}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const result = await response.json();
      setQueryResult(result);
    } catch (error) {
      console.error('Query error:', error);
      setQueryResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleProductsDiagnostic = async () => {
    try {
      toast.info('Running diagnostic...');

      // Fetch featured sections IDs (the most important data)
      const sectionsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/featured-sections`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      console.log('📡 Response status:', sectionsResponse.status);

      if (!sectionsResponse.ok) {
        const errorText = await sectionsResponse.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`Server returned ${sectionsResponse.status}: ${errorText.substring(0, 100)}`);
      }

      const sectionsData = await sectionsResponse.json();
      console.log('📦 Full sections data:', JSON.stringify(sectionsData, null, 2));

      // Check if IDs are numeric (wrong) or alphanumeric codes (correct)
      const featured = sectionsData.featured || [];
      const popular = sectionsData.popular || [];
      const promotion = sectionsData.promotion || [];

      const featuredSample = featured.slice(0, 5);
      const isNumeric = featuredSample.length > 0 && featuredSample.every((id: any) =>
        typeof id === 'number' || (typeof id === 'string' && !isNaN(Number(id)) && /^\d+$/.test(id))
      );

      const message = `🔍 DIAGNOSTIC RESULTS:

Featured: ${featured.length} items
Sample IDs: ${featuredSample.length > 0 ? featuredSample.join(', ') : 'None'}

Popular: ${popular.length} items
Sample IDs: ${popular.slice(0, 3).join(', ') || 'None'}

Promotional: ${promotion.length} items
Sample IDs: ${promotion.slice(0, 3).join(', ') || 'None'}

${isNumeric ?
'❌ PROBLEM: IDs are NUMERIC (1, 2, 3...)\n\n→ Go to Featured Products page\n→ Click "Save Changes"\n→ Then use Force Rebuild Cache' :
featuredSample.length === 0 ?
'⚠️ NO FEATURED PRODUCTS CONFIGURED\n\n→ Go to Featured Products page\n→ Add products\n→ Save' :
'✅ GOOD: IDs are PRODUCT CODES\n\n→ Use "Force Rebuild Cache" button\n→ Check if products appear'}

(Full data in console)`;

      console.log('✅ Diagnostic complete');
      alert(message);
      toast.success('Diagnostic complete');
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`⚠️ DIAGNOSTIC FAILED\n\nError: ${errorMsg}\n\nTry:\n1. Check if backend is deployed\n2. Check browser console for details\n3. Try Force Rebuild Cache button instead`);
      toast.error('Diagnostic failed - see alert');
    }
  };

  const handleForceRebuildCache = async () => {
    setCacheClearing(true);
    try {
      toast.info('Rebuilding section caches...');

      // Step 1: REBUILD section caches (this is the important part!)
      const rebuildResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/rebuild-section-cache`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      if (!rebuildResponse.ok) {
        throw new Error('Rebuild failed');
      }

      const rebuildData = await rebuildResponse.json();
      console.log('✅ Rebuild result:', rebuildData);
      toast.success(`✅ Rebuilt: ${rebuildData.counts?.featured || 0} featured, ${rebuildData.counts?.popular || 0} popular, ${rebuildData.counts?.promotion || 0} promo`, { duration: 3000 });

      // Step 2: Clear localStorage
      localStorage.removeItem('costplus100_homepage_data');
      localStorage.removeItem('costplus100_homepage_timestamp');
      localStorage.removeItem('costplus100_homepage_cache_version');

      // Clear CMS cache too
      clearCache();

      // Step 3: Wait for cache to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      const verifyResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/homepage-data?v=${Date.now()}&force=true`,
        {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();

        const featuredCount = verifyData.featured?.length || 0;
        const popularCount = verifyData.popular?.length || 0;
        const promoCount = verifyData.promotion?.length || 0;

        console.log('✅ Fresh data fetched:', { featuredCount, popularCount, promoCount });
        console.log('Sample featured IDs:', verifyData.featured?.slice(0, 3).map((p: any) => p.code));

        if (featuredCount > 0 || popularCount > 0 || promoCount > 0) {
          toast.success(`✅ SUCCESS! Featured: ${featuredCount}, Popular: ${popularCount}, Promo: ${promoCount}. Refresh homepage now!`, { duration: 10000 });
        } else {
          toast.warning('⚠️ Still showing 0 products. Make sure Featured Products page has product codes saved, not numeric IDs.', { duration: 10000 });
        }
      } else {
        const errorText = await verifyResponse.text();
        console.error('Verify failed:', errorText);
        toast.error('Cache cleared but could not verify. Try refreshing homepage.', { duration: 5000 });
      }

      setLastCacheCleared(new Date().toLocaleString());
    } catch (error) {
      console.error('Force rebuild error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setCacheClearing(false);
    }
  };

  const handleClearCache = async () => {
    setCacheClearing(true);
    try {
      // Clear CMS cache (session storage)
      clearCache();

      // Rebuild section caches for homepage
      try {
        const rebuildResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/rebuild-section-cache`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (rebuildResponse.ok) {
          const result = await rebuildResponse.json();
          console.log('✅ Section caches rebuilt:', result);
          toast.info(`Rebuilt: ${result.counts?.featured || 0} featured, ${result.counts?.popular || 0} popular, ${result.counts?.promotion || 0} promo`);
        } else {
          const error = await rebuildResponse.json();
          console.error('❌ Rebuild failed:', error);
          toast.error(`Rebuild failed: ${error.error || 'Unknown error'}`);
        }
      } catch (rebuildError) {
        console.warn('Failed to rebuild section cache:', rebuildError);
        toast.error('Failed to rebuild section cache');
      }

      setLastCacheCleared(new Date().toLocaleString());
      toast.success('✅ All caches cleared and rebuilt! Fresh data will load on next visit.', { duration: 4000 });
    } catch (error) {
      console.error('Cache clearing error:', error);
      toast.error('Failed to clear cache. Please try again.');
    } finally {
      setCacheClearing(false);
    }
  };

  const handleClearAndRefresh = async () => {
    setCacheClearing(true);
    try {
      // Clear CMS cache
      clearCache();
      
      // Rebuild section caches for homepage
      try {
        const rebuildResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/rebuild-section-cache`,
          {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );
        
        if (rebuildResponse.ok) {
          const result = await rebuildResponse.json();
          console.log('✅ Section caches rebuilt:', result);
        }
      } catch (rebuildError) {
        console.warn('Failed to rebuild section cache:', rebuildError);
      }
      
      toast.info('Clearing cache and refreshing data...');
      
      // Refresh data
      await refreshData();
      
      setLastCacheCleared(new Date().toLocaleString());
      toast.success('✅ Cache cleared and data refreshed!', { duration: 4000 });
    } catch (error) {
      console.error('Cache clearing error:', error);
      toast.error('Failed to clear and refresh. Please try again.');
    } finally {
      setCacheClearing(false);
    }
  };

  const handleBuildCache = async () => {
    setBuildCacheLoading(true);
    try {
      toast.info('🔨 Building consolidated cache in database...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/cms/build-cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setLastCacheBuilt(new Date().toLocaleString());
        toast.success(
          `✅ Cache built successfully! ${result.stats.categories} categories, ${result.stats.categoryTree} category tree nodes. Build time: ${result.stats.buildTime}ms`,
          { duration: 5000 }
        );

        // Auto-refresh cache status
        handleCheckCacheStatus();
      } else {
        const error = await response.json();
        toast.error(`Failed to build cache: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Build cache error:', error);
      toast.error('Failed to build cache. Please try again.');
    } finally {
      setBuildCacheLoading(false);
    }
  };

  const handleCheckCacheStatus = async () => {
    setCheckingCache(true);
    try {
      // Check server-side caches
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/cms/cache-status`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      let result: any = {};
      if (response.ok) {
        result = await response.json();
      } else {
        toast.error('Failed to check cache status');
      }

      // Check IndexedDB cache (client-side)
      let indexedDBStatus = {
        supported: false,
        products: 0,
      };

      if (isIndexedDBSupported()) {
        try {
          const cachedProducts = await getCachedDataIDB('products', '1');
          indexedDBStatus = {
            supported: true,
            products: Array.isArray(cachedProducts) ? cachedProducts.length : 0,
          };
        } catch (e) {
          console.warn('Failed to check IndexedDB:', e);
          indexedDBStatus = { supported: true, products: 0 };
        }
      }

      setCacheStatus({
        ...result,
        indexedDB: indexedDBStatus,
      });
    } catch (error) {
      console.error('Check cache status error:', error);
      toast.error('Failed to check cache status');
    } finally {
      setCheckingCache(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the CMS admin panel</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl">{stat.value}</p>
                </div>
                <stat.icon className="size-10 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Product Query */}
      <Card className="mb-8 bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-5" />
            Quick Product Query
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Button 
              onClick={() => queryProduct('FZ433')}
              disabled={loading}
              className="bg-[#E31837] hover:bg-[#c41530]"
            >
              {loading ? 'Querying...' : 'Query FZ433'}
            </Button>
            <Button 
              onClick={() => setQueryResult(null)}
              variant="outline"
            >
              Clear
            </Button>
          </div>
          
          {queryResult && (
            <div className="bg-white border rounded p-4 max-h-[400px] overflow-auto">
              <pre className="text-xs">
                {JSON.stringify(queryResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Diagnostics - CRITICAL */}
      <Card className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Database className="size-6" />
            Database Diagnostics
          </CardTitle>
          <CardDescription className="text-slate-700">
            {data.products.length === 0 ? (
              <span className="text-red-600 font-semibold">⚠️ No products found! Database might be empty.</span>
            ) : (
              `${data.products.length} products loaded`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.products.length === 0 ? (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
                <p className="font-semibold text-yellow-800">No products in database!</p>
                <p className="text-sm text-yellow-700 mt-2">
                  You need to import products. Click "Import Products" or run database diagnostics to check what's in your database.
                </p>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  startTransition(() => {
                    window.location.href = '/admin/database-diagnostics';
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Database className="size-4 mr-2" />
                Check Database Keys
              </Button>
              <Button 
                onClick={() => {
                  startTransition(() => {
                    window.location.href = '/admin/import-products';
                  });
                }}
                variant="outline"
              >
                <Package className="size-4 mr-2" />
                Import Products
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health Check */}
      <Card className="mb-8 bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="size-6" />
            System Health Check
          </CardTitle>
          <CardDescription className="text-slate-700">
            Run comprehensive diagnostics to verify all system components are working correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Check edge functions, database connections, CMS endpoints, and more in one place.
            </p>
            <Button 
              onClick={() => {
                startTransition(() => {
                  window.location.href = '/admin/system-health-check';
                });
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="size-4 mr-2" />
              Run System Health Check
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cache Management - PROMINENT SECTION */}
      <Card className="mb-8 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-[#E31837]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#E31837]">
            <Database className="size-6" />
            🗄️ Centralized Cache Management
          </CardTitle>
          <CardDescription className="text-slate-700">
            Clear all application caches from one place. Use this after making any changes in admin (products, prices, categories, homepage sections, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info Box */}
          <div className="bg-white border-2 border-blue-300 rounded-lg p-4 mb-3">
            <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Database className="size-4" />
              🔨 When to Build Cache?
            </p>
            <ul className="text-xs text-blue-800 space-y-1 ml-5 list-disc">
              <li><strong>After importing products</strong> - Consolidates 13,781+ keys into fast cache</li>
              <li><strong>After updating categories</strong> - Rebuilds category hierarchy</li>
              <li><strong>First time setup</strong> - Creates optimized database cache</li>
              <li><strong>When server is slow</strong> - Eliminates loading thousands of individual keys</li>
              <li>💡 <strong>Benefit:</strong> Customers load data from 1 query instead of 13,781!</li>
            </ul>
          </div>

          <div className="bg-white border-2 border-orange-300 rounded-lg p-4">
            <p className="text-sm font-semibold text-orange-900 mb-2 flex items-center gap-2">
              <Clock className="size-4" />
              ⚠️ When to Clear Cache?
            </p>
            <ul className="text-xs text-orange-800 space-y-1 ml-5 list-disc">
              <li>After bulk price updates (Uropa sync, manual updates)</li>
              <li>After adding/editing/deleting products</li>
              <li>After changing homepage featured sections</li>
              <li>After updating categories or navigation</li>
              <li>When customers report seeing old/stale data</li>
              <li><strong>Important:</strong> Customer browsers cache data until you clear it here!</li>
            </ul>
          </div>

          {/* Cache Version Status */}
          <div className="bg-blue-50 border border-blue-300 rounded p-3">
            <p className="text-xs text-blue-900">
              <strong>Cache System:</strong> Version-based (no time expiration)
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Current version: {localStorage.getItem('cms_cache_version') || '1'}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              💡 Customers see cached data instantly. Clear cache here to force fresh data for all users.
            </p>
          </div>

          {/* Cache Age (for reference only) */}
          {cacheTimestamp && (
            <div className="bg-slate-50 border border-slate-300 rounded p-3">
              <p className="text-xs text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                <strong>Admin Cache Age:</strong> {' '}
                {Math.floor((Date.now() - cacheTimestamp) / 60000)} minutes old
              </p>
              <p className="text-xs text-slate-500 mt-1">
                (This is your local cache age - customer cache is independent)
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleBuildCache}
              disabled={buildCacheLoading || cacheClearing}
              size="lg"
              className="bg-green-600 hover:bg-green-700 flex-1 min-w-[200px]"
            >
              <Database className="size-4 mr-2" />
              {buildCacheLoading ? 'Building Cache...' : '🔨 Build Cache'}
            </Button>
            <Button
              onClick={handleClearCache}
              disabled={cacheClearing || buildCacheLoading}
              size="lg"
              className="bg-[#E31837] hover:bg-[#c41530] flex-1 min-w-[200px]"
            >
              <Trash2 className="size-4 mr-2" />
              {cacheClearing ? 'Clearing All Caches...' : 'Clear All Caches'}
            </Button>
            <Button
              onClick={handleClearAndRefresh}
              disabled={cacheClearing || buildCacheLoading}
              size="lg"
              variant="outline"
              className="border-2 border-[#E31837] text-[#E31837] hover:bg-[#E31837] hover:text-white flex-1 min-w-[200px]"
            >
              <RefreshCw className="size-4 mr-2" />
              {cacheClearing ? 'Working...' : 'Clear & Reload Data'}
            </Button>
          </div>

          {/* Diagnostic & Force Rebuild Buttons */}
          <div className="border-t pt-3 mt-3 space-y-2">
            <Button
              onClick={handleForceRebuildCache}
              disabled={cacheClearing}
              size="sm"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              ⚡ Force Rebuild Cache
            </Button>
            <Button
              onClick={() => {
                // Clear homepage localStorage
                localStorage.removeItem('costplus100_homepage_data');
                localStorage.removeItem('costplus100_homepage_timestamp');
                localStorage.removeItem('costplus100_homepage_cache_version');
                toast.success('Homepage cache cleared! Redirecting...', { duration: 2000 });
                setTimeout(() => {
                  window.location.href = '/';
                }, 1000);
              }}
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              🔄 Clear Homepage & Refresh
            </Button>
            <Button
              onClick={handleProductsDiagnostic}
              size="sm"
              variant="outline"
              className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              🔍 Diagnose Cache Issue
            </Button>
            <div className="bg-red-50 border border-red-300 rounded p-3">
              <p className="text-xs font-semibold text-red-900 mb-2">⚠️ PROBLEM FOUND</p>
              <p className="text-xs text-red-800 mb-3">
                Featured sections have old numeric IDs (1, 2, 3...) instead of product codes (AB-SA14...). This is why cache shows 0 products.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-900">OPTION 1 (Quick Fix):</p>
                <p className="text-xs text-red-700 mb-2">Go to <strong>Featured Products</strong> page → Click "Save Changes" button (even without making changes). This will overwrite old IDs with product codes.</p>

                <p className="text-xs font-semibold text-red-900">OPTION 2 (Manual):</p>
                <p className="text-xs text-red-700">Go to <strong>Featured Products</strong> → Remove all → Re-add products → Save.</p>
              </div>
            </div>
            <Button
              onClick={handleCheckCacheStatus}
              disabled={checkingCache}
              size="sm"
              variant="outline"
              className="w-full"
            >
              <Search className="size-4 mr-2" />
              {checkingCache ? 'Checking...' : '🔍 Check Cache Status'}
            </Button>
          </div>

          {/* Cache Status Display */}
          {cacheStatus && (
            <div className="bg-slate-50 border-2 border-slate-300 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Database className="size-4" />
                Cache Status Report
              </h4>

              {/* Memory Cache */}
              <div className="bg-white rounded p-3 border">
                <p className="text-xs font-semibold text-slate-700 mb-2">🧠 In-Memory Cache (Server)</p>
                <div className="text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>CMS Data Cache:</span>
                    <span className={cacheStatus.memory.cmsData ? 'text-green-600 font-semibold' : 'text-red-600'}>
                      {cacheStatus.memory.cmsData ? '✅ Active' : '❌ Empty'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Homepage Cache:</span>
                    <span className={cacheStatus.memory.homepageData ? 'text-green-600 font-semibold' : 'text-red-600'}>
                      {cacheStatus.memory.homepageData ? '✅ Active' : '❌ Empty'}
                    </span>
                  </div>
                  {cacheStatus.memory.cmsDataProducts > 0 && (
                    <div className="flex justify-between">
                      <span>Cached Products:</span>
                      <span className="font-semibold">{cacheStatus.memory.cmsDataProducts}</span>
                    </div>
                  )}
                  {cacheStatus.memory.homepageDataCategories > 0 && (
                    <div className="flex justify-between">
                      <span>Cached Categories:</span>
                      <span className="font-semibold">{cacheStatus.memory.homepageDataCategories}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Database Cache */}
              <div className="bg-white rounded p-3 border">
                <p className="text-xs font-semibold text-slate-700 mb-2">💾 Database Cache (Persistent)</p>
                <div className="text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>cache:homepage key:</span>
                    <span className={cacheStatus.database.exists ? 'text-green-600 font-semibold' : 'text-red-600'}>
                      {cacheStatus.database.exists ? '✅ Exists' : '❌ Missing'}
                    </span>
                  </div>
                  {cacheStatus.database.exists && (
                    <>
                      <div className="flex justify-between">
                        <span>Categories:</span>
                        <span className="font-semibold">{cacheStatus.database.categories}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Category Tree:</span>
                        <span className="font-semibold">{cacheStatus.database.categoryTree}</span>
                      </div>
                      {cacheStatus.database.timestamp && (
                        <div className="flex justify-between">
                          <span>Built:</span>
                          <span className="font-semibold">{new Date(cacheStatus.database.timestamp).toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* IndexedDB Cache (Client-Side) */}
              {cacheStatus.indexedDB && (
                <div className="bg-white rounded p-3 border">
                  <p className="text-xs font-semibold text-slate-700 mb-2">🌐 IndexedDB Cache (Browser)</p>
                  <div className="text-xs space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>Browser Support:</span>
                      <span className={cacheStatus.indexedDB.supported ? 'text-green-600 font-semibold' : 'text-red-600'}>
                        {cacheStatus.indexedDB.supported ? '✅ Supported' : '❌ Not Supported'}
                      </span>
                    </div>
                    {cacheStatus.indexedDB.supported && (
                      <div className="flex justify-between">
                        <span>Cached Products:</span>
                        <span className={cacheStatus.indexedDB.products > 0 ? 'text-green-600 font-semibold' : 'text-orange-600'}>
                          {cacheStatus.indexedDB.products > 0 ? `✅ ${cacheStatus.indexedDB.products}` : '⚠️ 0'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className={`rounded p-3 text-xs ${
                cacheStatus.database.exists
                  ? 'bg-green-50 border border-green-300 text-green-900'
                  : 'bg-orange-50 border border-orange-300 text-orange-900'
              }`}>
                <strong>{cacheStatus.database.exists ? '✅' : '⚠️'}</strong> {cacheStatus.recommendation}
              </div>
            </div>
          )}

          {/* Last Cache Built Status */}
          {lastCacheBuilt && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded p-3">
              <p className="text-sm text-blue-900 flex items-center gap-2">
                <Database className="size-5 text-blue-600" />
                <strong>Cache Built!</strong> Database cache created at {lastCacheBuilt}
              </p>
              <p className="text-xs text-blue-700 mt-1 ml-7">
                ✅ Categories & navigation cached in database (cache:homepage key)<br />
                ✅ Server loads from 1 query instead of individual keys<br />
                ✅ Cache persists across Edge Function restarts (no cold start delays!)<br />
                📦 Products cached in customer browsers (IndexedDB - 50MB+ capacity)
              </p>
              <p className="text-xs text-blue-600 mt-2 ml-7 font-semibold">
                🚀 Two-tier caching: DB cache for navigation, IndexedDB for products!
              </p>
            </div>
          )}

          {/* Last Cleared Status */}
          {lastCacheCleared && (
            <div className="bg-green-50 border-2 border-green-300 rounded p-3">
              <p className="text-sm text-green-900 flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-600" />
                <strong>Success!</strong> All caches cleared at {lastCacheCleared}
              </p>
              <p className="text-xs text-green-700 mt-1 ml-7">
                ✅ Server cache cleared (memory + database cache)<br />
                ✅ Client localStorage cache version incremented<br />
                ✅ IndexedDB cache cleared (browser products cache)<br />
                ✅ All customer browsers will load fresh data on next visit
              </p>
              <p className="text-xs text-green-600 mt-2 ml-7 font-semibold">
                🎯 Fresh data is now cached (server-side + client-side) and will stay until you clear again!
              </p>
            </div>
          )}

          {/* Technical Details */}
          <details className="bg-slate-100 border border-slate-300 rounded p-3">
            <summary className="text-xs cursor-pointer hover:underline text-slate-700 font-semibold">
              🔧 Technical Details (How Cache System Works)
            </summary>
            <div className="text-xs text-slate-600 mt-2 space-y-1">
              <p>• <strong>Client Cache (localStorage):</strong> Metadata only (categories, header, footer, homepage, banners)</p>
              <p>• <strong>Server Cache:</strong> ALL products (~13,000+ items), homepage sections, featured products</p>
              <p>• <strong>Cache Strategy:</strong> Version-based (no time expiration!)</p>
              <p>• <strong>Why server-side products?</strong> Too many products to fit in browser storage (quota limits)</p>
              <p>• <strong>Cache Lifecycle:</strong></p>
              <p className="ml-4">1. Customer visits → Loads metadata from client + products from server (fast!)</p>
              <p className="ml-4">2. Customer refreshes → Same instant loading from cache</p>
              <p className="ml-4">3. Admin clears cache → Version increments + server cache cleared</p>
              <p className="ml-4">4. Next customer visit → Detects version mismatch → Loads fresh data</p>
              <p className="ml-4">5. Fresh data cached (client + server) → Stays until admin clears again</p>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div>
        <h2 className="text-2xl mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickLinks.map((link) => (
            <Link key={link.path} to={link.path}>
              <Card className="hover:shadow-lg transition-all hover:border-slate-900 group h-full">
                <CardHeader>
                  <div className={`${link.color} size-12 rounded-lg flex items-center justify-center mb-3`}>
                    <link.icon className="size-6 text-white" />
                  </div>
                  <CardTitle className="group-hover:text-slate-900">{link.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}