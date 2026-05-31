import { useState } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Eye, Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';

interface PriceCheckerProps {
  apiUrl: string;
  authToken: string;
  onComplete?: () => void;
}

export function PriceChecker({ apiUrl, authToken, onComplete }: PriceCheckerProps) {
  const [loading, setLoading] = useState(false);
  const [priceData, setPriceData] = useState<any>(null);
  const [applyingPricing, setApplyingPricing] = useState(false);
  const [pricingResult, setPricingResult] = useState<any>(null);

  const checkPrices = async () => {
    setLoading(true);
    try {
      console.log('💰 Checking prices...');
      
      const response = await fetch(`${apiUrl}/bulk-operations/check-prices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Server error ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      console.log('✅ Price data:', data);
      setPriceData(data);
      toast.success('Price analysis complete!');
    } catch (error: any) {
      console.error('Error checking prices:', error);
      toast.error(`Failed to check prices: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const applyPricing = async (dryRun: boolean = false) => {
    setApplyingPricing(true);
    try {
      console.log(`💰 ${dryRun ? 'DRY RUN' : 'LIVE'} - Applying CostPlus pricing...`);
      
      const response = await fetch(`${apiUrl}/bulk-operations/apply-costplus-pricing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dryRun })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Server error ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      console.log('✅ Pricing result:', data);
      setPricingResult(data);
      
      if (dryRun) {
        toast.success(`Dry run complete! Would price ${data.updated} products`);
      } else {
        toast.success(`Successfully priced ${data.updated} products!`);
        if (onComplete) onComplete();
      }
    } catch (error: any) {
      console.error('Error applying pricing:', error);
      toast.error(`Failed to apply pricing: ${error.message || error}`);
    } finally {
      setApplyingPricing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Price Analysis Card */}
      <Card className="border-2 border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
          <CardTitle className="flex items-center gap-2 text-green-900">
            <DollarSign className="w-5 h-5" />
            Price Analysis
          </CardTitle>
          <CardDescription className="text-green-700">
            Check pricing status across all products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Button
            onClick={checkPrices}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Analyze Prices'}
          </Button>

          {priceData && (
            <div className="space-y-4">
              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-xs text-blue-600 font-medium mb-1">With Price</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {priceData.pricing.withPrice.toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-600">
                    {priceData.pricing.percentageWithPrice}%
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-xs text-red-600 font-medium mb-1">No Price</div>
                  <div className="text-2xl font-bold text-red-900">
                    {priceData.pricing.withoutPrice.toLocaleString()}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="text-xs text-amber-600 font-medium mb-1">Zero Price</div>
                  <div className="text-2xl font-bold text-amber-900">
                    {priceData.pricing.withZeroPrice.toLocaleString()}
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-xs text-purple-600 font-medium mb-1">Has Cost Price</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {priceData.pricing.withCostPrice.toLocaleString()}
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-xs text-green-600 font-medium mb-1">Avg Sell Price</div>
                  <div className="text-2xl font-bold text-green-900">
                    ${priceData.statistics.avgPrice}
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <div className="text-xs text-indigo-600 font-medium mb-1">Avg Cost Price</div>
                  <div className="text-2xl font-bold text-indigo-900">
                    ${priceData.statistics.avgCostPrice}
                  </div>
                </div>
              </div>

              {/* Price Range Distribution */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Price Distribution</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Under $50 (50% markup):</span>
                    <span className="font-bold text-slate-900">{priceData.priceRanges.under50.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">$50 - $100 (40% markup):</span>
                    <span className="font-bold text-slate-900">{priceData.priceRanges['50to100'].toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">$100 - $500 (30% markup):</span>
                    <span className="font-bold text-slate-900">{priceData.priceRanges['100to500'].toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">$500 - $1000 (20% markup):</span>
                    <span className="font-bold text-slate-900">{priceData.priceRanges['500to1000'].toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">$1000 - $5000 (15% markup):</span>
                    <span className="font-bold text-slate-900">{priceData.priceRanges['1000to5000'].toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Over $5000 (12% markup):</span>
                    <span className="font-bold text-slate-900">{priceData.priceRanges.over5000.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Sample Products */}
              {priceData.sampleProducts && priceData.sampleProducts.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Sample Products</h4>
                  <div className="space-y-2 text-xs">
                    {priceData.sampleProducts.map((product: any, idx: number) => (
                      <div 
                        key={idx} 
                        className={`p-2 rounded ${product.hasPrice ? 'bg-green-50' : 'bg-red-50'}`}
                      >
                        <div className="font-medium truncate">{product.name}</div>
                        <div className="text-slate-600">
                          Price: ${product.price} | Cost: ${product.costPrice}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Min/Max */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs text-blue-600 font-medium">Min Price</div>
                  <div className="text-xl font-bold text-blue-900">${priceData.statistics.minPrice}</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="text-xs text-purple-600 font-medium">Max Price</div>
                  <div className="text-xl font-bold text-purple-900">${priceData.statistics.maxPrice}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply CostPlus Pricing Card */}
      <Card className="border-2 border-orange-200">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <TrendingUp className="w-5 h-5" />
            Apply CostPlus100 Pricing
          </CardTitle>
          <CardDescription className="text-orange-700">
            Apply intelligent tiered markup formula to all products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* Markup Formula Info */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              CostPlus100 Markup Formula
            </h4>
            <div className="space-y-1 text-sm text-orange-800">
              <p>• Under $50 → <strong>50% markup</strong></p>
              <p>• $50-$100 → <strong>40% markup</strong></p>
              <p>• $100-$500 → <strong>30% markup</strong></p>
              <p>• $500-$,000 → <strong>20% markup</strong></p>
              <p>• $1,000-$5,000 → <strong>15% markup</strong></p>
              <p>• Over $5,000 → <strong>12% markup</strong></p>
              <p className="mt-2 font-semibold">Plus 15% minimum margin floor on all products</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 mb-1">Requirements</h4>
                <p className="text-sm text-amber-800">
                  This will calculate sell prices based on cost prices. Products without a cost price will be skipped.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => applyPricing(true)}
              disabled={applyingPricing}
              variant="outline"
              className="flex-1 border-2 border-orange-300"
            >
              <Eye className="w-4 h-4 mr-2" />
              {applyingPricing ? 'Running...' : 'Dry Run (Preview)'}
            </Button>

            <Button
              onClick={() => applyPricing(false)}
              disabled={applyingPricing}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              {applyingPricing ? 'Pricing...' : 'Apply Pricing'}
            </Button>
          </div>

          {/* Pricing Result */}
          {pricingResult && (
            <div className={`${pricingResult.dryRun ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
              <h4 className={`font-semibold ${pricingResult.dryRun ? 'text-blue-900' : 'text-green-900'} mb-2 flex items-center gap-2`}>
                {pricingResult.dryRun ? <Eye className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                {pricingResult.dryRun ? 'Dry Run Preview' : 'Pricing Complete!'}
              </h4>
              <div className={`space-y-1 text-sm ${pricingResult.dryRun ? 'text-blue-800' : 'text-green-800'}`}>
                <p>✅ {pricingResult.dryRun ? 'Would price' : 'Priced'}: <strong>{pricingResult.updated}</strong> products</p>
                <p>⏭️ Skipped: <strong>{pricingResult.skipped}</strong> products</p>
                {pricingResult.noCostPrice > 0 && (
                  <p className="text-amber-600">⚠️ No cost price: <strong>{pricingResult.noCostPrice}</strong> products</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}