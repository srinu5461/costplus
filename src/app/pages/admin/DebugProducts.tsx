// ⚠️ EMERGENCY DEBUG TOOL - Check if products exist in database
// Access this at: /admin/debug-products

import { useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export function DebugProducts() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkDatabase = async () => {
    setLoading(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    try {
      // Test 1: Check /cms/data endpoint
      console.log('🔍 Test 1: Checking /cms/data endpoint...');
      const cmsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/cms/data`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      
      const cmsData = await cmsResponse.json();
      results.tests.push({
        name: 'CMS Data Endpoint',
        status: cmsResponse.ok ? '✅ OK' : '❌ FAILED',
        statusCode: cmsResponse.status,
        productsCount: cmsData.products?.length || 0,
        categoriesCount: cmsData.categories?.length || 0,
        cacheStatus: cmsResponse.headers.get('X-Cache'),
        data: cmsData
      });

      // Test 2: Check /homepage-data endpoint
      console.log('🔍 Test 2: Checking /homepage-data endpoint...');
      const homepageResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/homepage-data`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      
      const homepageData = await homepageResponse.json();
      results.tests.push({
        name: 'Homepage Data Endpoint',
        status: homepageResponse.ok ? '✅ OK' : '❌ FAILED',
        statusCode: homepageResponse.status,
        featuredCount: homepageData.featured?.length || 0,
        popularCount: homepageData.popular?.length || 0,
        promotionCount: homepageData.promotion?.length || 0,
        cacheStatus: homepageResponse.headers.get('X-Cache'),
        data: homepageData
      });

      // Test 3: Check featured sections
      console.log('🔍 Test 3: Checking /featured-sections endpoint...');
      const featuredResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/featured-sections`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      
      const featuredData = await featuredResponse.json();
      results.tests.push({
        name: 'Featured Sections Endpoint',
        status: featuredResponse.ok ? '✅ OK' : '❌ FAILED',
        statusCode: featuredResponse.status,
        featuredIds: featuredData.featured?.length || 0,
        popularIds: featuredData.popular?.length || 0,
        promotionIds: featuredData.promotion?.length || 0,
        data: featuredData
      });

      setStatus(results);
    } catch (error) {
      results.error = error instanceof Error ? error.message : String(error);
      setStatus(results);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Database Debug Tool</CardTitle>
          <p className="text-sm text-muted-foreground">
            Check if products and data are loading correctly from the database
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={checkDatabase} 
            disabled={loading}
            size="lg"
          >
            {loading ? 'Running Tests...' : 'Run Database Tests'}
          </Button>

          {status && (
            <div className="space-y-4 mt-6">
              <div className="bg-gray-100 p-4 rounded">
                <h3 className="font-bold mb-2">Test Results</h3>
                <p className="text-sm text-gray-600">Run at: {status.timestamp}</p>
              </div>

              {status.tests.map((test: any, idx: number) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {test.status} {test.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p><strong>Status Code:</strong> {test.statusCode}</p>
                      {test.productsCount !== undefined && (
                        <p><strong>Products:</strong> {test.productsCount}</p>
                      )}
                      {test.categoriesCount !== undefined && (
                        <p><strong>Categories:</strong> {test.categoriesCount}</p>
                      )}
                      {test.featuredCount !== undefined && (
                        <p><strong>Featured Products:</strong> {test.featuredCount}</p>
                      )}
                      {test.popularCount !== undefined && (
                        <p><strong>Popular Products:</strong> {test.popularCount}</p>
                      )}
                      {test.promotionCount !== undefined && (
                        <p><strong>Promotional Products:</strong> {test.promotionCount}</p>
                      )}
                      {test.featuredIds !== undefined && (
                        <p><strong>Featured IDs:</strong> {test.featuredIds}</p>
                      )}
                      {test.cacheStatus && (
                        <p><strong>Cache Status:</strong> {test.cacheStatus}</p>
                      )}
                      
                      <details className="mt-4">
                        <summary className="cursor-pointer font-semibold">Show Raw Data</summary>
                        <pre className="mt-2 bg-gray-900 text-green-400 p-4 rounded overflow-auto text-xs">
                          {JSON.stringify(test.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {status.error && (
                <Card className="border-red-500">
                  <CardHeader>
                    <CardTitle className="text-red-600">❌ Error</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm text-red-600">{status.error}</pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
