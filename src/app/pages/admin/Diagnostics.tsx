import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export default function Diagnostics() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [homepageData, setHomepageData] = useState<any>(null);
  const [featuredSections, setFeaturedSections] = useState<any>(null);
  const [refreshingCache, setRefreshingCache] = useState(false);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching diagnostics...');
      
      // Fetch CMS data (includes category tree)
      console.log('Fetching CMS data from:', `${API_URL}/cms/data`);
      const cmsResponse = await fetch(`${API_URL}/cms/data`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!cmsResponse.ok) {
        throw new Error(`CMS fetch failed: ${cmsResponse.status} ${cmsResponse.statusText}`);
      }
      
      const cms = await cmsResponse.json();
      console.log('✅ CMS data received:', {
        categoryTreeLength: cms.categoryTree?.length || 0,
        productsLength: cms.products?.length || 0,
      });

      // Fetch featured sections data
      console.log('Fetching featured sections...');
      const featuredResponse = await fetch(`${API_URL}/featured-sections`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const featuredData = await featuredResponse.json();
      setFeaturedSections(featuredData);
      console.log('✅ Featured sections:', featuredData);

      // Fetch homepage data (cached)
      console.log('Fetching homepage data...');
      const homepageResponse = await fetch(`${API_URL}/homepage-data`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const homepage = await homepageResponse.json();
      const cacheStatus = homepageResponse.headers.get('X-Cache');
      const cacheAge = homepageResponse.headers.get('X-Cache-Age');
      setHomepageData({
        ...homepage,
        cacheStatus,
        cacheAge: cacheAge ? parseInt(cacheAge) : null,
      });
      console.log('✅ Homepage data:', { cacheStatus, cacheAge, featured: homepage.featured?.length });

      // Use products from CMS data instead of separate fetch
      const products = cms.products || [];
      
      // Extract category tree from CMS data
      const tree = cms.categoryTree || [];

      // Analyze the tree structure
      const levels = {
        1: tree.filter((n: any) => n.level === 1).length,
        2: tree.filter((n: any) => n.level === 2).length,
        3: tree.filter((n: any) => n.level === 3).length,
        4: tree.filter((n: any) => n.level === 4).length,
      };

      const samples = {
        level1: tree.filter((n: any) => n.level === 1).slice(0, 3),
        level2: tree.filter((n: any) => n.level === 2).slice(0, 3),
        level3: tree.filter((n: any) => n.level === 3).slice(0, 3),
        level4: tree.filter((n: any) => n.level === 4).slice(0, 3),
      };

      console.log('📊 Diagnostics Data:', {
        totalCategories: tree.length,
        totalProducts: products.length,
        levels,
      });

      setData({
        tree,
        products,
        cms,
        levels,
        samples,
        totalCategories: tree.length,
        totalProducts: products.length,
      });
    } catch (error) {
      console.error('❌ Diagnostics error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Error fetching diagnostics: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const refreshCache = async () => {
    setRefreshingCache(true);
    try {
      console.log('🔄 Refreshing homepage cache...');
      const response = await fetch(`${API_URL}/homepage-data/refresh`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-API-Key': publicAnonKey,
        },
      });
      if (!response.ok) {
        throw new Error(`Cache refresh failed: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      console.log('✅ Cache refreshed:', result);
      alert('Homepage cache refreshed successfully! The homepage will now show updated products.');
      // Wait a moment then refresh diagnostics
      setTimeout(() => fetchDiagnostics(), 1000);
    } catch (error) {
      console.error('❌ Cache refresh error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Error refreshing cache: ' + errorMessage);
    } finally {
      setRefreshingCache(false);
    }
  };

  const clearCMSCache = async () => {
    setRefreshingCache(true);
    try {
      console.log('🗑️ Clearing CMS cache...');
      const response = await fetch(`${API_URL}/cms/clear-cache`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Cache clear failed: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      console.log('✅ CMS cache cleared:', result);
      
      // Force fetch fresh data from database with ?force=true
      console.log('🔄 Force fetching fresh data...');
      const freshResponse = await fetch(`${API_URL}/cms/data?force=true`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      if (!freshResponse.ok) {
        throw new Error(`Fresh data fetch failed: ${freshResponse.status}`);
      }
      const freshData = await freshResponse.json();
      console.log('✅ Fresh data loaded:', {
        products: freshData.products?.length || 0,
        categories: freshData.categories?.length || 0,
      });
      
      alert(`CMS cache cleared and fresh data loaded!\n\nProducts: ${freshData.products?.length || 0}\nCategories: ${freshData.categories?.length || 0}`);
      
      // Wait a moment then refresh diagnostics to show the new data
      setTimeout(() => fetchDiagnostics(), 500);
    } catch (error) {
      console.error('❌ Cache clear error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Error clearing cache: ' + errorMessage);
    } finally {
      setRefreshingCache(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Database Diagnostics</h1>
          <p className="text-muted-foreground mt-1">
            Check what's stored in the database
          </p>
        </div>
        <Button onClick={fetchDiagnostics} disabled={loading}>
          <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {data && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Categories</div>
                  <div className="text-3xl font-bold">{data.totalCategories}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Products</div>
                  <div className="text-3xl font-bold">{data.totalProducts}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Levels */}
          <Card>
            <CardHeader>
              <CardTitle>Category Level Distribution</CardTitle>
              <CardDescription>How many categories exist at each level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Level 1</div>
                  <div className="text-2xl font-bold text-blue-600">{data.levels[1]}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Level 2</div>
                  <div className="text-2xl font-bold text-green-600">{data.levels[2]}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Level 3</div>
                  <div className="text-2xl font-bold text-orange-600">{data.levels[3]}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Level 4</div>
                  <div className="text-2xl font-bold text-red-600">{data.levels[4]}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Samples from each level */}
          {[1, 2, 3, 4].map((level) => (
            <Card key={level}>
              <CardHeader>
                <CardTitle>Level {level} Samples</CardTitle>
                <CardDescription>First 3 categories from level {level}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.samples[`level${level}`].length > 0 ? (
                  <div className="space-y-4">
                    {data.samples[`level${level}`].map((cat: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4 bg-slate-50">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-semibold">Name:</span> {cat.name}
                          </div>
                          <div>
                            <span className="font-semibold">Code:</span> {cat.code}
                          </div>
                          <div>
                            <span className="font-semibold">Path:</span> {cat.path}
                          </div>
                          <div>
                            <span className="font-semibold">Parent:</span> {cat.parent || 'N/A'}
                          </div>
                          <div className="col-span-2">
                            <span className="font-semibold">Full Path:</span> {cat.fullPath}
                          </div>
                          <div>
                            <span className="font-semibold">Product Count:</span> {cat.productCount}
                          </div>
                          <div>
                            <span className="font-semibold">Has Children:</span>{' '}
                            {cat.hasChildren ? 'Yes' : 'No'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No categories at this level</p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Raw Data */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Category Tree (First 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(data.tree.slice(0, 10), null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Product Samples */}
          <Card>
            <CardHeader>
              <CardTitle>Product Samples (First 5)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.products.slice(0, 5).map((product: any, idx: number) => (
                  <div key={idx} className="border rounded p-3 bg-slate-50 text-sm">
                    <div><span className="font-semibold">Name:</span> {product.name}</div>
                    <div><span className="font-semibold">Category:</span> {product.category}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Homepage Data */}
          <Card>
            <CardHeader>
              <CardTitle>Homepage Cache Status</CardTitle>
              <CardDescription>Featured sections and cached homepage data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Cache Info */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <div className="text-sm text-muted-foreground">Cache Status</div>
                    <div
                      className={`text-2xl font-bold ${
                        homepageData?.cacheStatus === 'HIT'
                          ? 'text-green-600'
                          : 'text-orange-600'
                      }`}
                    >
                      {homepageData?.cacheStatus || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Cache Age (seconds)</div>
                    <div className="text-2xl font-bold">{homepageData?.cacheAge ?? 'N/A'}</div>
                  </div>
                </div>

                {/* Featured Section IDs */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Selected Product IDs</h3>
                  <div className="grid gap-3">
                    <div className="border rounded-lg p-3 bg-blue-50">
                      <div className="text-sm font-medium text-blue-900 mb-1">Featured Products</div>
                      <div className="text-sm text-blue-700">
                        {featuredSections?.featured?.length || 0} products selected
                      </div>
                      {featuredSections?.featured && featuredSections.featured.length > 0 && (
                        <div className="mt-2 text-xs text-blue-600 font-mono max-h-20 overflow-y-auto">
                          {featuredSections.featured.slice(0, 5).join(', ')}
                          {featuredSections.featured.length > 5 &&
                            ` ... and ${featuredSections.featured.length - 5} more`}
                        </div>
                      )}
                    </div>

                    <div className="border rounded-lg p-3 bg-green-50">
                      <div className="text-sm font-medium text-green-900 mb-1">Popular Products</div>
                      <div className="text-sm text-green-700">
                        {featuredSections?.popular?.length || 0} products selected
                      </div>
                      {featuredSections?.popular && featuredSections.popular.length > 0 && (
                        <div className="mt-2 text-xs text-green-600 font-mono max-h-20 overflow-y-auto">
                          {featuredSections.popular.slice(0, 5).join(', ')}
                          {featuredSections.popular.length > 5 &&
                            ` ... and ${featuredSections.popular.length - 5} more`}
                        </div>
                      )}
                    </div>

                    <div className="border rounded-lg p-3 bg-red-50">
                      <div className="text-sm font-medium text-red-900 mb-1">Promotional Products</div>
                      <div className="text-sm text-red-700">
                        {featuredSections?.promotion?.length || 0} products selected
                      </div>
                      {featuredSections?.promotion && featuredSections.promotion.length > 0 && (
                        <div className="mt-2 text-xs text-red-600 font-mono max-h-20 overflow-y-auto">
                          {featuredSections.promotion.slice(0, 5).join(', ')}
                          {featuredSections.promotion.length > 5 &&
                            ` ... and ${featuredSections.promotion.length - 5} more`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cached Products Count */}
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-semibold text-lg">Cached Product Data</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="border rounded-lg p-3 bg-slate-50">
                      <div className="text-sm text-muted-foreground">Featured</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {homepageData?.featured?.length || 0}
                      </div>
                    </div>
                    <div className="border rounded-lg p-3 bg-slate-50">
                      <div className="text-sm text-muted-foreground">Popular</div>
                      <div className="text-2xl font-bold text-green-600">
                        {homepageData?.popular?.length || 0}
                      </div>
                    </div>
                    <div className="border rounded-lg p-3 bg-slate-50">
                      <div className="text-sm text-muted-foreground">Promotion</div>
                      <div className="text-2xl font-bold text-red-600">
                        {homepageData?.promotion?.length || 0}
                      </div>
                    </div>
                  </div>

                  {homepageData?.cachedAt && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Last cached: {new Date(homepageData.cachedAt).toLocaleString()}
                    </div>
                  )}
                </div>

                <Button
                  onClick={refreshCache}
                  disabled={refreshingCache}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className={`size-4 mr-2 ${refreshingCache ? 'animate-spin' : ''}`} />
                  {refreshingCache ? 'Refreshing Cache...' : 'Refresh Homepage Cache'}
                </Button>

                <Button
                  onClick={clearCMSCache}
                  disabled={refreshingCache}
                  className="w-full mt-2"
                  variant="default"
                >
                  <RefreshCw className={`size-4 mr-2 ${refreshingCache ? 'animate-spin' : ''}`} />
                  {refreshingCache ? 'Clearing Cache...' : 'Clear CMS Cache'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}