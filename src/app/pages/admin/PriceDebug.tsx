import { useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Search, RefreshCw } from 'lucide-react';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export default function PriceDebug() {
  const [productCode, setProductCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const lookupProduct = async () => {
    if (!productCode.trim()) {
      setError('Please enter a product code');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch(
        `${API_URL}/debug/product/${encodeURIComponent(productCode.trim())}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to lookup product');
      }

      setResult(data);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🔍 Price Debug Tool</h1>
        <p className="text-muted-foreground">
          Check what's actually stored in the database for any product
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Code
            </label>
            <input
              type="text"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  lookupProduct();
                }
              }}
              placeholder="Enter product code (e.g., CD085-A)"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={lookupProduct}
            disabled={loading || !productCode.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="size-4" />
                Lookup
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Results */}
      {result && result.success && (
        <div className="space-y-6">
          {/* Product Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Product Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Code</div>
                <div className="text-lg font-semibold">{result.product.code}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Name</div>
                <div className="text-lg font-semibold">{result.product.name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Brand</div>
                <div className="text-lg font-semibold">{result.product.brand || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">ID</div>
                <div className="text-lg font-semibold font-mono text-sm">{result.product.id}</div>
              </div>
            </div>
          </div>

          {/* Pricing Data */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">💰 Pricing Data (From Database)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-sm text-green-700">product.price</div>
                <div className="text-2xl font-bold text-green-900">
                  ${result.pricing.price?.toFixed(2) || 'N/A'}
                </div>
                <div className="text-xs text-green-600 mt-1">← Frontend displays this</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-700">product.sellingPrice</div>
                <div className="text-2xl font-bold text-blue-900">
                  ${result.pricing.sellingPrice?.toFixed(2) || 'N/A'}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-sm text-purple-700">product.sellPrice</div>
                <div className="text-2xl font-bold text-purple-900">
                  ${result.pricing.sellPrice?.toFixed(2) || 'N/A'}
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="text-sm text-orange-700">product.baseCost</div>
                <div className="text-2xl font-bold text-orange-900">
                  ${result.pricing.baseCost?.toFixed(2) || 'N/A'}
                </div>
                <div className="text-xs text-orange-600 mt-1">Cost Price</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="text-sm text-yellow-700">product.costPrice</div>
                <div className="text-2xl font-bold text-yellow-900">
                  ${result.pricing.costPrice?.toFixed(2) || 'N/A'}
                </div>
              </div>
              <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                <div className="text-sm text-pink-700">product.tradePrice</div>
                <div className="text-2xl font-bold text-pink-900">
                  ${result.pricing.tradePrice?.toFixed(2) || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">🕐 Update Timestamps</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">lastBulkUpdate</span>
                <span className="text-sm text-gray-600">
                  {result.timestamps.lastBulkUpdate || 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">lastPriceUpdate</span>
                <span className="text-sm text-gray-600">
                  {result.timestamps.lastPriceUpdate || 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">lastManualUpdate</span>
                <span className="text-sm text-gray-600">
                  {result.timestamps.lastManualUpdate || 'Not set'}
                </span>
              </div>
            </div>
            
            {(result.timestamps.lastBulkUpdate || result.timestamps.lastPriceUpdate) && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">
                  ✅ This product has update timestamps, so the frontend will use <strong>product.price</strong> directly from the database without recalculating.
                </p>
              </div>
            )}
          </div>

          {/* Raw JSON */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">📋 Raw Product Object</h2>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-xs max-h-96">
              {JSON.stringify(result.product, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
