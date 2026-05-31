import { useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function ProductQuery() {
  const [productCode, setProductCode] = useState('FZ433');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const queryProduct = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/products/query/${productCode}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to query product');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Product Query Tool</h1>
      
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          value={productCode}
          onChange={(e) => setProductCode(e.target.value)}
          placeholder="Enter product code (e.g., FZ433)"
          className="flex-1 px-4 py-2 border rounded"
        />
        <button
          onClick={queryProduct}
          disabled={loading || !productCode}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Querying...' : 'Query Product'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
          <p className="text-red-800 font-semibold">Error:</p>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-gray-50 border border-gray-200 rounded p-6">
          <h2 className="text-xl font-semibold mb-4">Product Data for: {productCode}</h2>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Storage Key: <code className="bg-gray-200 px-2 py-1 rounded">{result.key}</code>
            </p>
            <p className="text-sm text-gray-600">
              Fields: {result.allFields?.length || 0}
            </p>
          </div>

          <div className="bg-white border border-gray-300 rounded p-4 overflow-auto max-h-[600px]">
            <pre className="text-xs">
              {JSON.stringify(result.product, null, 2)}
            </pre>
          </div>

          {/* Quick view of important fields */}
          {result.product && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-xs text-gray-600">Code</p>
                <p className="font-semibold">{result.product.code || result.product.productCode || 'N/A'}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-xs text-gray-600">Name</p>
                <p className="font-semibold">{result.product.name || 'N/A'}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-xs text-gray-600">Price (Display)</p>
                <p className="font-semibold">${result.product.price || 0}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-xs text-gray-600">Trade Price</p>
                <p className="font-semibold">${result.product.tradePrice || 0}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <p className="text-xs text-gray-600">Selling Price</p>
                <p className="font-semibold">${result.product.sellingPrice || 0}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <p className="text-xs text-gray-600">Base Cost</p>
                <p className="font-semibold">${result.product.baseCost || 0}</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <p className="text-xs text-gray-600">Category</p>
                <p className="font-semibold">{result.product.category || 'N/A'}</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <p className="text-xs text-gray-600">Brand</p>
                <p className="font-semibold">{result.product.brand || 'N/A'}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
