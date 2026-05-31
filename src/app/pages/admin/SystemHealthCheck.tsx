import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface HealthCheckResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export function SystemHealthCheck() {
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runHealthCheck = async () => {
    setLoading(true);
    const checks: HealthCheckResult[] = [];

    try {
      // 1. Check Supabase Configuration
      checks.push({
        name: 'Supabase Configuration',
        status: projectId && publicAnonKey ? 'success' : 'error',
        message: projectId && publicAnonKey 
          ? `Project ID: ${projectId.substring(0, 8)}...` 
          : 'Missing configuration',
        details: { projectId: !!projectId, publicAnonKey: !!publicAnonKey }
      });

      // 2. Check Edge Function - Health Endpoint
      try {
        const healthResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/health`,
          {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
          }
        );
        const healthData = await healthResponse.json();
        checks.push({
          name: 'Edge Function - Health Check',
          status: healthResponse.ok ? 'success' : 'error',
          message: healthResponse.ok ? 'Edge function is running' : `Failed: ${healthResponse.status}`,
          details: healthData
        });
      } catch (error) {
        checks.push({
          name: 'Edge Function - Health Check',
          status: 'error',
          message: `Connection failed: ${error}`,
        });
      }

      // 3. Check Database Connection
      try {
        const dbResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/db/test`,
          {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
          }
        );
        const dbData = await dbResponse.json();
        checks.push({
          name: 'Database Connection',
          status: dbResponse.ok && dbData.kvStoreWorking ? 'success' : 'error',
          message: dbResponse.ok ? 'Database is accessible' : `Failed: ${dbResponse.status}`,
          details: dbData
        });
      } catch (error) {
        checks.push({
          name: 'Database Connection',
          status: 'error',
          message: `Connection failed: ${error}`,
        });
      }

      // 4. Check CMS Data Endpoint
      try {
        const cmsResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/cms/data`,
          {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
          }
        );
        const cmsData = await cmsResponse.json();
        const productCount = cmsData.products?.length || 0;
        const categoryCount = cmsData.categories?.length || 0;
        
        checks.push({
          name: 'CMS Data Endpoint',
          status: cmsResponse.ok ? 'success' : 'error',
          message: cmsResponse.ok 
            ? `Loaded ${productCount} products, ${categoryCount} categories` 
            : `Failed: ${cmsResponse.status}`,
          details: {
            products: productCount,
            categories: categoryCount,
            categoryTree: cmsData.categoryTree?.length || 0,
            cacheStatus: cmsResponse.headers.get('X-Cache') || 'unknown'
          }
        });

        // Warning if no products
        if (cmsResponse.ok && productCount === 0) {
          checks.push({
            name: 'Product Data',
            status: 'warning',
            message: 'No products found in database. You may need to import products.',
          });
        }
      } catch (error) {
        checks.push({
          name: 'CMS Data Endpoint',
          status: 'error',
          message: `Connection failed: ${error}`,
        });
      }

      // 5. Check Products Storage Format
      try {
        const checkResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/cms/check-products`,
          {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
          }
        );
        const checkData = await checkResponse.json();
        checks.push({
          name: 'Product Storage Format',
          status: checkResponse.ok ? 'success' : 'error',
          message: checkResponse.ok ? checkData.recommendation || 'Products accessible' : `Failed: ${checkResponse.status}`,
          details: checkData
        });
      } catch (error) {
        checks.push({
          name: 'Product Storage Format',
          status: 'warning',
          message: `Could not check storage format: ${error}`,
        });
      }

      // 6. Check Banners Endpoint
      try {
        const bannersResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/banners`,
          {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
          }
        );
        const bannersData = await bannersResponse.json();
        checks.push({
          name: 'Banners Endpoint',
          status: bannersResponse.ok ? 'success' : 'warning',
          message: bannersResponse.ok 
            ? `${Array.isArray(bannersData) ? bannersData.length : 0} banners configured` 
            : `Failed: ${bannersResponse.status}`,
          details: bannersData
        });
      } catch (error) {
        checks.push({
          name: 'Banners Endpoint',
          status: 'warning',
          message: `Could not load banners: ${error}`,
        });
      }

      // 7. Check Frontend Cache
      try {
        const cacheData = sessionStorage.getItem('cms_cache');
        if (cacheData) {
          const parsed = JSON.parse(cacheData);
          checks.push({
            name: 'Frontend Cache',
            status: 'success',
            message: `Cache active (age: ${Math.round((Date.now() - parsed.timestamp) / 1000)}s)`,
            details: {
              timestamp: new Date(parsed.timestamp).toLocaleString(),
              hasProducts: !!parsed.products,
              hasCategories: !!parsed.categories,
              hasCategoryTree: !!parsed.categoryTree
            }
          });
        } else {
          checks.push({
            name: 'Frontend Cache',
            status: 'warning',
            message: 'No cache found - first load',
          });
        }
      } catch (error) {
        checks.push({
          name: 'Frontend Cache',
          status: 'warning',
          message: `Cache check failed: ${error}`,
        });
      }

    } catch (error) {
      checks.push({
        name: 'System Health Check',
        status: 'error',
        message: `Unexpected error: ${error}`,
      });
    }

    setResults(checks);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="size-5 text-green-600" />;
      case 'error':
        return <XCircle className="size-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="size-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-600">OK</Badge>;
      case 'error':
        return <Badge className="bg-red-600">ERROR</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-600">WARNING</Badge>;
      default:
        return null;
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">System Health Check</h1>
        <p className="text-muted-foreground">
          Verify that all system components are functioning correctly
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Run Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runHealthCheck} 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 size-4 animate-spin" />
                Running Health Checks...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 size-4" />
                Run Health Check
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <>
          {/* Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{successCount}</div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{errorCount}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <div className="space-y-4">
            {results.map((result, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(result.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{result.name}</h3>
                        {getStatusBadge(result.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {result.message}
                      </p>
                      {result.details && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-blue-600 hover:underline">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-slate-100 rounded overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Help Section */}
      {errorCount > 0 && (
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Issues Detected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-red-900 space-y-2">
              <p className="font-semibold">Common Solutions:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>If edge function fails: Check that Supabase edge functions are deployed</li>
                <li>If database fails: Verify that the kv_store_577b3f26 table exists</li>
                <li>If no products: Import products via Admin → Import Data</li>
                <li>If configuration missing: Ensure /utils/supabase/info.tsx exists</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
