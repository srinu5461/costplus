import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function DbDiagnostic() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkDatabase() {
      try {
        const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;
        
        console.log('Fetching from:', `${API_URL}/db/keys`);
        
        // Check database keys
        const keysResponse = await fetch(`${API_URL}/db/keys`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        console.log('Keys response status:', keysResponse.status);
        
        if (!keysResponse.ok) {
          const errorText = await keysResponse.text();
          console.error('Keys endpoint error:', errorText);
          throw new Error(`Keys endpoint failed: ${keysResponse.status} - ${errorText}`);
        }


        const keysData = await keysResponse.json();

        // Check CMS data endpoint
        const cmsResponse = await fetch(`${API_URL}/cms/data`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        console.log('CMS response status:', cmsResponse.status);
        
        if (!cmsResponse.ok) {
          const errorText = await cmsResponse.text();
          console.error('CMS endpoint error:', errorText);
        }
        
        const cmsData = await cmsResponse.json();
        console.log('CMS data:', cmsData);
        
        setData({
          keys: keysData,
          cms: {
            productsCount: cmsData.products?.length || 0,
            categoriesCount: cmsData.categories?.length || 0,
            categoryTreeCount: cmsData.categoryTree?.length || 0,
            firstProduct: cmsData.products?.[0],
            firstCategory: cmsData.categories?.[0],
            firstCategoryNode: cmsData.categoryTree?.[0],
            hasHeader: !!cmsData.header,
            hasFooter: !!cmsData.footer,
            hasHomepage: !!cmsData.homepage,
          }
        });
      } catch (err) {
        console.error('Diagnostic error:', err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    
    checkDatabase();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Database Diagnostic</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Database Diagnostic</h1>
        <div className="bg-red-50 border border-red-200 p-4 rounded">
          <p className="text-red-800 font-semibold">Error:</p>
          <pre className="text-sm mt-2">{error}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Database Diagnostic</h1>
      
      <div className="space-y-6">
        {/* Database Keys */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Database Keys Status</h2>
          <div className="space-y-3">
            {data?.keys?.keys && Object.entries(data.keys.keys).map(([key, value]: [string, any]) => (
              <div key={key} className="border-b pb-3">
                <div className="font-mono text-sm font-semibold text-blue-600">{key}</div>
                <div className="ml-4 text-sm space-y-1">
                  <div>Exists: <span className={value.exists ? 'text-green-600' : 'text-red-600'}>{String(value.exists)}</span></div>
                  {value.type && <div>Type: {value.type}</div>}
                  {value.count !== undefined && <div>Count: <span className="font-semibold">{value.count}</span></div>}
                  {value.sample && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-blue-600">View sample</summary>
                      <pre className="bg-gray-50 p-2 rounded mt-1 text-xs overflow-x-auto">
                        {JSON.stringify(value.sample, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CMS Data Endpoint */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">CMS Data Endpoint Response</h2>
          <div className="space-y-3">
            <div>
              <span className="font-semibold">Products Count:</span>{' '}
              <span className={data.cms.productsCount > 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
                {data.cms.productsCount}
              </span>
            </div>
            <div>
              <span className="font-semibold">Categories Count:</span>{' '}
              <span className={data.cms.categoriesCount > 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
                {data.cms.categoriesCount}
              </span>
            </div>
            <div>
              <span className="font-semibold">Category Tree Count:</span>{' '}
              <span className={data.cms.categoryTreeCount > 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
                {data.cms.categoryTreeCount}
              </span>
            </div>
            <div>
              <span className="font-semibold">Has Header:</span> {String(data.cms.hasHeader)}
            </div>
            <div>
              <span className="font-semibold">Has Footer:</span> {String(data.cms.hasFooter)}
            </div>
            <div>
              <span className="font-semibold">Has Homepage:</span> {String(data.cms.hasHomepage)}
            </div>
            
            {data.cms.firstProduct && (
              <details className="mt-4">
                <summary className="cursor-pointer text-blue-600 font-semibold">View first product</summary>
                <pre className="bg-gray-50 p-3 rounded mt-2 text-xs overflow-x-auto">
                  {JSON.stringify(data.cms.firstProduct, null, 2)}
                </pre>
              </details>
            )}
            
            {data.cms.firstCategory && (
              <details className="mt-4">
                <summary className="cursor-pointer text-blue-600 font-semibold">View first category</summary>
                <pre className="bg-gray-50 p-3 rounded mt-2 text-xs overflow-x-auto">
                  {JSON.stringify(data.cms.firstCategory, null, 2)}
                </pre>
              </details>
            )}
            
            {data.cms.firstCategoryNode && (
              <details className="mt-4">
                <summary className="cursor-pointer text-blue-600 font-semibold">View first category node</summary>
                <pre className="bg-gray-50 p-3 rounded mt-2 text-xs overflow-x-auto">
                  {JSON.stringify(data.cms.firstCategoryNode, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>

        {/* Raw Data */}
        <details className="bg-white border rounded-lg p-6">
          <summary className="cursor-pointer text-lg font-semibold text-blue-600">View Full Raw Data</summary>
          <pre className="bg-gray-50 p-4 rounded mt-4 text-xs overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}