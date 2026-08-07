import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface PricingTier {
  min: number;
  max: number;
  markup: number;
  label: string;
}

interface PricingConfig {
  tiers: PricingTier[];
  minimumMargin: number;
  gstRate: number;
}

export default function PricingTiers() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updateStats, setUpdateStats] = useState<any>(null);
  
  // Test single product feature
  const [testProductCode, setTestProductCode] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Load pricing config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    console.log('🔍 [PricingTiers] loadConfig() started');

    try {
      setLoading(true);
      setMessage(null);

      console.log('📡 [PricingTiers] Fetching pricing config...');
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/pricing/config`;
      console.log('📡 [PricingTiers] URL:', url);
      console.log('📡 [PricingTiers] projectId:', projectId);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ [PricingTiers] Request timeout - aborting');
        controller.abort();
      }, 5000); // 5 second timeout

      console.log('📡 [PricingTiers] Starting fetch...');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('📡 [PricingTiers] Fetch complete, status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📡 [PricingTiers] Error response:', errorText);
        throw new Error(`Failed to load pricing config: ${response.status} ${errorText}`);
      }

      console.log('📡 [PricingTiers] Parsing JSON...');
      const data = await response.json();
      console.log('📡 [PricingTiers] Config loaded:', data);

      if (!data.config) {
        throw new Error('No config in response');
      }

      setConfig(data.config);
      console.log('✅ [PricingTiers] Config set successfully');
    } catch (error: any) {
      console.error('❌ [PricingTiers] Error loading config:', error);
      console.error('❌ [PricingTiers] Error name:', error.name);
      console.error('❌ [PricingTiers] Error message:', error.message);
      console.error('❌ [PricingTiers] Error stack:', error.stack);

      if (error.name === 'AbortError') {
        setMessage({ type: 'error', text: 'Request timeout - API took too long to respond' });
      } else {
        setMessage({ type: 'error', text: error.message || 'Failed to load pricing config' });
      }

      // Set a default config so the page can at least render
      setConfig({
        tiers: [
          { min: 5000, max: Infinity, markup: 0.12, label: '$5000+' },
          { min: 2000, max: 4999.99, markup: 0.15, label: '$2000-$4999' },
          { min: 1000, max: 1999.99, markup: 0.20, label: '$1000-$1999' },
          { min: 500, max: 999.99, markup: 0.30, label: '$500-$999' },
          { min: 100, max: 499.99, markup: 0.40, label: '$100-$499' },
          { min: 50, max: 99.99, markup: 0.45, label: '$50-$99' },
          { min: 0, max: 49.99, markup: 0.50, label: 'Under $50' }
        ],
        minimumMargin: 0.15,
        gstRate: 0.10
      });
    } finally {
      console.log('🏁 [PricingTiers] loadConfig() completed, setting loading=false');
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/pricing/config`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save pricing config');
      }

      setMessage({ type: 'success', text: 'Pricing configuration saved successfully!' });
    } catch (error: any) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const updateAllPrices = async () => {
    if (!confirm('⚠️ This will recalculate prices for ALL products based on the current pricing tiers. Cost prices will NOT be changed. Continue?')) {
      return;
    }

    try {
      setUpdating(true);
      setMessage(null);
      setUpdateStats(null);

      // Save the current config first
      console.log('💾 [Bulk Update] Saving current pricing config first...');
      const saveResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/pricing/config`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        }
      );

      if (!saveResponse.ok) {
        throw new Error('Failed to save pricing config before bulk update');
      }

      console.log('✅ [Bulk Update] Config saved, starting chunked update...');

      let offset = 0;
      let totalProducts = 0;
      let totalUpdated = 0;
      let totalUnchanged = 0;
      let totalErrors = 0;
      const startTime = Date.now();
      let consecutiveFailures = 0;
      const MAX_RETRIES = 3;

      // Process batches until complete
      while (true) {
        console.log(`🔄 [Bulk Update] Processing batch at offset ${offset}`);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout per batch

          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/pricing/bulk-update`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ offset, batchSize: 100 }),
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const data = await response.json();

          // Reset failure counter on success
          consecutiveFailures = 0;

          // Update totals
          totalProducts = data.total;
          totalUpdated += data.updated || 0;
          totalUnchanged += data.unchanged || 0;
          totalErrors += data.errors || 0;

          // Update UI
          setUpdateStats({
            total: data.total,
            processed: data.processed,
            updated: totalUpdated,
            unchanged: totalUnchanged,
            errors: totalErrors,
            progress: data.progress,
            currentBatch: data.batchNumber,
            totalBatches: data.totalBatches,
            message: data.message,
          });

          console.log(`📊 [Bulk Update] Batch ${data.batchNumber}/${data.totalBatches} complete: ${data.processed}/${data.total} (${data.progress}%)`);

          // Check if complete
          if (data.completed) {
            const duration = Date.now() - startTime;
            setUpdating(false);
            setMessage({
              type: 'success',
              text: `✅ Complete! Updated ${totalUpdated.toLocaleString()} of ${totalProducts.toLocaleString()} products in ${(duration / 1000).toFixed(1)}s!`
            });
            console.log('✅ [Bulk Update] All batches complete!');
            break;
          }

          // Move to next batch
          offset = data.nextOffset;

          // Small delay to avoid hammering the server
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (batchError: any) {
          consecutiveFailures++;
          console.error(`❌ [Bulk Update] Batch error (attempt ${consecutiveFailures}/${MAX_RETRIES}):`, batchError);

          if (consecutiveFailures >= MAX_RETRIES) {
            throw new Error(`Failed after ${MAX_RETRIES} consecutive attempts: ${batchError.message}`);
          }

          // Wait before retry (exponential backoff)
          const retryDelay = Math.min(1000 * Math.pow(2, consecutiveFailures), 5000);
          console.log(`⏳ [Bulk Update] Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));

          // Don't increment offset - retry the same batch
        }
      }

    } catch (error: any) {
      console.error('❌ [Bulk Update] Fatal error:', error);
      setMessage({
        type: 'error',
        text: `Bulk update failed: ${error.message}. Some products may have been updated before the error occurred.`
      });
      setUpdating(false);
    }
  };

  const testSingleProduct = async () => {
    if (!testProductCode.trim()) {
      setMessage({ type: 'error', text: 'Please enter a product code' });
      return;
    }

    try {
      setTestLoading(true);
      setTestResult(null);
      setMessage(null);

      // First save the current config to ensure we're testing with latest settings
      console.log('💾 [Test Product] Saving current config first...');
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/pricing/config`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        }
      );

      console.log('🧪 [Test Product] Testing product:', testProductCode.trim());
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/pricing/test-single`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productCode: testProductCode.trim() }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to test product');
      }

      const data = await response.json();
      console.log('✅ [Test Product] Result:', data);
      setTestResult(data);
      setMessage({ type: 'success', text: 'Test completed successfully!' });
    } catch (error: any) {
      console.error('Error testing product:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  const updateTier = (index: number, field: keyof PricingTier, value: any) => {
    if (!config) return;
    
    const newTiers = [...config.tiers];
    newTiers[index] = {
      ...newTiers[index],
      [field]: field === 'markup' ? parseFloat(value) : (field === 'label' ? value : parseFloat(value))
    };
    
    setConfig({ ...config, tiers: newTiers });
  };

  const calculateExample = (cost: number) => {
    if (!config) return { selling: 0, markup: 0, margin: 0, tier: '' };

    // Find applicable tier
    let markupPercent = 0.12;
    let tierLabel = '';
    
    for (const tier of config.tiers) {
      if (cost >= tier.min && cost < tier.max) {
        markupPercent = tier.markup;
        tierLabel = tier.label;
        break;
      }
    }

    // Calculate selling price
    const sellingPrice = cost * (1 + markupPercent);
    const minPrice = cost * (1 + config.minimumMargin);
    const finalPrice = Math.max(sellingPrice, minPrice);
    
    const dollarMarkup = finalPrice - cost;
    const marginPercent = (dollarMarkup / finalPrice) * 100;

    return {
      selling: finalPrice.toFixed(2),
      markup: (markupPercent * 100).toFixed(0),
      margin: marginPercent.toFixed(2),
      tier: tierLabel
    };
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            <p className="mt-4 text-gray-600">Loading pricing configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">Failed to load pricing configuration</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pricing Tiers Management</h1>
          <p className="mt-2 text-gray-600">
            Manage markup percentages for different cost ranges. All products use these tiers to calculate selling prices.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Formula Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">💰 Pricing Formula</h2>
          <div className="font-mono text-blue-800">
            <div className="text-xl mb-2">Selling Price = Cost × (1 + Markup%)</div>
          </div>
        </div>

        {/* Minimum Margin Setting */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-yellow-900 mb-4">⚠️ Minimum Margin Floor (Safety Net)</h2>
          <p className="text-sm text-yellow-800 mb-4">
            This enforces a minimum profit margin on all products, even if the tier markup is lower.
            Set to 0 to disable this safety feature.
          </p>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-yellow-900">
              Minimum Margin:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={config.minimumMargin}
                onChange={(e) => setConfig({ ...config, minimumMargin: parseFloat(e.target.value) || 0 })}
                className="w-24 px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                step="0.01"
                min="0"
                max="1"
              />
              <span className="text-sm text-yellow-700">
                ({(config.minimumMargin * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="text-xs text-yellow-700 ml-4">
              Example: If minimum margin is 15% (0.15), a product with cost $100 will have minimum selling price of $115,
              even if tier markup is only 10%.
            </div>
          </div>
          {config.minimumMargin === 0 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              ⚠️ Warning: Minimum margin is disabled. Products may have very low or negative profit margins if tier markups are too low.
            </div>
          )}
        </div>

        {/* Pricing Tiers Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Pricing Tiers</h2>
            <p className="mt-1 text-sm text-gray-600">
              Lower cost ranges have higher markups; higher cost ranges have lower markups
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min ($)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Max ($)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Markup (%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Example
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {config.tiers.map((tier, index) => {
                  const exampleCost = tier.min + (tier.max === Infinity ? 500 : (tier.max - tier.min) / 2);
                  const example = calculateExample(exampleCost);
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={tier.label}
                          onChange={(e) => updateTier(index, 'label', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={tier.min}
                          onChange={(e) => updateTier(index, 'min', e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          step="0.01"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {tier.max === Infinity ? (
                          <span className="text-gray-500">∞</span>
                        ) : (
                          <input
                            type="number"
                            value={tier.max || ''}
                            onChange={(e) => updateTier(index, 'max', e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            step="0.01"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={tier.markup}
                            onChange={(e) => updateTier(index, 'markup', e.target.value)}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            step="0.01"
                            min="0"
                            max="1"
                          />
                          <span className="text-sm text-gray-600">
                            ({(tier.markup * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="text-gray-900">
                          ${exampleCost.toFixed(2)} → ${example.selling}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {example.markup}% markup, {example.margin}% margin
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Test Single Product */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">🧪 Test Price Calculation (Single Product)</h2>
            <p className="mt-1 text-sm text-gray-600">
              Test the price calculation for one product before updating all products
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Code
                </label>
                <input
                  type="text"
                  value={testProductCode}
                  onChange={(e) => setTestProductCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      testSingleProduct();
                    }
                  }}
                  placeholder="Enter product code (e.g., CD085-A)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={testSingleProduct}
                disabled={testLoading || !testProductCode.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {testLoading ? 'Testing...' : 'Test Product'}
              </button>
            </div>

            {testResult && (
              <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">
                  {testResult.success ? '✅ Test Results' : '❌ Test Failed'}
                </h3>
                
                {testResult.success ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-purple-200">
                        <div className="text-sm text-gray-600 mb-1">Product Code</div>
                        <div className="text-lg font-semibold text-gray-900">{testResult.product.code}</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-purple-200">
                        <div className="text-sm text-gray-600 mb-1">Product Name</div>
                        <div className="text-lg font-semibold text-gray-900">{testResult.product.name || 'N/A'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-purple-200">
                        <div className="text-sm text-gray-600 mb-1">Cost Price</div>
                        <div className="text-2xl font-bold text-gray-900">${testResult.before.costPrice}</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-purple-200">
                        <div className="text-sm text-gray-600 mb-1">Current Selling Price</div>
                        <div className="text-2xl font-bold text-blue-900">${testResult.before.sellingPrice}</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-purple-200">
                        <div className="text-sm text-gray-600 mb-1">NEW Selling Price</div>
                        <div className="text-2xl font-bold text-green-900">${testResult.after.sellingPrice}</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-purple-200">
                        <div className="text-sm text-gray-600 mb-1">Difference</div>
                        <div className={`text-2xl font-bold ${testResult.difference >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                          {testResult.difference >= 0 ? '+' : ''}${testResult.difference}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-purple-200">
                      <div className="text-sm text-gray-600 mb-2">Tier Used</div>
                      <div className="text-lg font-semibold text-purple-900">{testResult.after.tierLabel}</div>
                      <div className="text-sm text-gray-600 mt-2">
                        Markup: {testResult.after.markupPercent}% • Margin: {testResult.after.marginPercent}%
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        ℹ️ <strong>This is a preview only.</strong> Click "Recalculate All Product Prices" below to actually update this and all other products in the database.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-800">
                    {testResult.error || 'Failed to test product'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Saving...' : '💾 Save Configuration'}
          </button>

          <button
            onClick={updateAllPrices}
            disabled={updating}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {updating ? '⏳ Recalculating...' : '🔄 Recalculate All Product Prices'}
          </button>
        </div>
        
        {/* Workflow Helper */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> When you click "Recalculate All Product Prices", the system will automatically save your current configuration first, then apply it to all {updateStats?.total || '730'} products.
          </p>
        </div>

        {/* Update Stats */}
        {updateStats && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">
              {updating ? '⏳ Processing in Background...' : '✅ Bulk Update Complete'}
            </h3>
            
            {/* Batch Progress */}
            {updating && updateStats?.currentBatch && updateStats?.totalBatches && (
              <div className="mb-4 bg-white p-4 rounded-lg border border-green-300">
                <div className="text-sm font-medium text-green-900 mb-2">
                  Batch {updateStats.currentBatch} of {updateStats.totalBatches}
                </div>
                <div className="text-xs text-green-700">{updateStats.message || ''}</div>
              </div>
            )}
            
            <div className="grid grid-cols-5 gap-4">
              <div>
                <div className="text-2xl font-bold text-green-900">{(updateStats.total || 0).toLocaleString()}</div>
                <div className="text-sm text-green-700">Total Products</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900">{(updateStats.processed || 0).toLocaleString()}</div>
                <div className="text-sm text-blue-700">Processed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-900">{(updateStats.updated || 0).toLocaleString()}</div>
                <div className="text-sm text-green-700">Prices Updated</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{(updateStats.unchanged || 0).toLocaleString()}</div>
                <div className="text-sm text-gray-700">Unchanged</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-900">{(updateStats.errors || 0).toLocaleString()}</div>
                <div className="text-sm text-red-700">Errors</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            {updating && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300 flex items-center justify-center text-xs text-white font-medium"
                    style={{ width: `${updateStats.progress || 0}%` }}
                  >
                    {updateStats.progress || 0}%
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Processing {(updateStats.processed || 0).toLocaleString()} of {(updateStats.total || 0).toLocaleString()} products ({updateStats.progress || 0}%)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ⏱️ This may take 2-5 minutes for 13,000 products. You can safely close this page - the job will continue in the background.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Examples Section */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Pricing Examples</h3>
          <div className="grid grid-cols-2 gap-6">
            {[35, 150, 750, 3200].map((cost) => {
              const result = calculateExample(cost);
              return (
                <div key={cost} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-2">Cost: ${cost.toFixed(2)}</div>
                  <div className="text-sm text-gray-600 mb-2">Tier: {result.tier}</div>
                  <div className="text-lg font-semibold text-gray-900">
                    Selling: ${result.selling}
                  </div>
                  <div className="text-sm text-gray-600">
                    {result.markup}% markup • {result.margin}% margin
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Documentation */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ Important Notes</h3>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li>• <strong>Cost prices are NEVER changed</strong> - Only selling prices are recalculated</li>
            <li>• <strong>Minimum margin floor</strong> overrides tier markup if it's too low (configurable above)</li>
            <li>• Higher cost items have lower markup percentages (standard retail practice)</li>
            <li>• Changes to tiers take effect immediately for new price calculations</li>
            <li>• Use "Recalculate All Product Prices" to apply changes to existing products</li>
          </ul>
        </div>
      </div>
    </div>
  );
}