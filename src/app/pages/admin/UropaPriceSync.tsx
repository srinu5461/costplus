/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UROPA PRICE SYNC SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📖 PRICING FLOW:
 * 
 * 1️⃣  SUPPLIER COST (Uropa):
 *     - Uropa's selling price = YOUR cost/trade price
 *     - Fetched from Uropa API: /products/{code}?lang=en&curr=AUD&fields=FULL
 *     - Stored in database as: `tradePrice` and `baseCost`
 * 
 * 2️⃣  TIERED MARKUP FORMULA:
 *     - Formula: Selling Price = Cost × (1 + Markup %)
 *     - Percentage-based markup tiers:
 *       • Under $50:       50% markup (×1.50)
 *       • $50-$99:         45% markup (×1.45)
 *       • $100-$499:       40% markup (×1.40)
 *       • $500-$999:       30% markup (×1.30)
 *       • $1000-$1999:     20% markup (×1.20)
 *       • $2000-$4999:     15% markup (×1.15)
 *       • $5000+:          12% markup (×1.12)
 *     - 15% minimum margin floor for protection
 * 
 * 3️⃣  YOUR SELLING PRICE:
 *     - Calculated using tiered formula
 *     - Stored in database as: `price`
 *     - Displayed to customers on website
 * 
 * 📊 PRICE SYNC PROCESS:
 *     ① Compare: Database `tradePrice` vs Uropa API selling price
 *     ② If different: Show comparison with impact analysis
 *     ③ Update: Save new tradePrice + recalculate your selling price
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  Eye, 
  Key,
  Package,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useCMS } from '../../context/CMSContext';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface ProductCode {
  code: string;
}

interface PriceComparison {
  productId: string;
  sku: string;
  productCode: string;
  name: string;
  brand: string;
  currentCostPrice: number;
  uropaCostPrice: number;
  priceDifference: number;
  percentageChange: number;
  currentSellingPrice: number;
  newSellingPrice: number;
  selected: boolean;
}

interface PriceAnalysis {
  total: number;
  withPrice: number;
  withoutPrice: number;
  withZeroPrice: number;
  withCostPrice: number;
  avgPrice: number;
  avgCostPrice: number;
  priceRanges: {
    under50: number;
    '50to100': number;
    '100to500': number;
    '500to1000': number;
    '1000to5000': number;
    over5000: number;
  };
}

export default function UropaPriceSync() {
  // Check for Uropa API token
  const [hasToken, setHasToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [comparisons, setComparisons] = useState<PriceComparison[]>([]);
  const [searchCodes, setSearchCodes] = useState('');
  const [stats, setStats] = useState({ total: 0, increased: 0, decreased: 0, unchanged: 0 });
  const [analysis, setAnalysis] = useState<PriceAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedComparisons, setSelectedComparisons] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<any>(null);

  useEffect(() => {
    checkTokenStatus();
  }, []);

  const checkTokenStatus = async () => {
    try {
      console.log('');
      console.log('='.repeat(80));
      console.log('🔍 CHECKING UROPA TOKEN STATUS');
      console.log('='.repeat(80));
      console.log(`📡 API URL: ${API_URL}`);
      console.log(`🔑 Using project ID: ${projectId}`);
      console.log(`🔐 Auth key exists: ${!!publicAnonKey}`);
      
      const configUrl = `${API_URL}/uropa/config`;
      console.log(`🌐 Calling: ${configUrl}`);
      
      const response = await fetch(configUrl, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      console.log(`📡 Response status: ${response.status}`);
      console.log(`📡 Response OK: ${response.ok}`);

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Config data received:', data);
        
        // Check if we have either saved config or environment variables
        const hasConfig = !!data.config && (
          (data.config.token && data.config.apiUrl) || 
          (data.config.hasEnvToken && data.config.hasEnvApiUrl)
        );
        
        console.log('✅ Has token check:', {
          hasConfig,
          hasDataConfig: !!data.config,
          token: data.config?.token ? `${data.config.token.substring(0, 10)}...` : 'none',
          apiUrl: data.config?.apiUrl,
          hasEnvToken: data.config?.hasEnvToken,
          hasEnvApiUrl: data.config?.hasEnvApiUrl
        });
        
        setHasToken(hasConfig);
      } else {
        console.error('❌ Config response not OK:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
      }
      console.log('='.repeat(80));
      console.log('');
    } catch (error) {
      console.error('');
      console.error('❌ FAILED TO CHECK TOKEN STATUS');
      console.error('Error:', error);
      console.error('');
    }
  };

  const analyzePrices = async () => {
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const response = await fetch(`${API_URL}/uropa/analyze-prices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze prices');
      }

      const data = await response.json();
      setAnalysis({ 
        type: 'success', 
        text: `Analysis complete! Found ${data.total} products in database.` 
      });
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysis({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to analyze prices' 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchCodes.trim()) {
      setAnalysis({ type: 'error', text: 'Please enter at least one product code' });
      return;
    }

    setIsLoading(true);
    setAnalysis(null);
    setComparisons([]);

    try {
      console.log('');
      console.log('='.repeat(80));
      console.log('🔍 STARTING PRICE COMPARISON');
      console.log('='.repeat(80));
      
      // Parse product codes (comma or newline separated)
      const codes = searchCodes
        .split(/[,\\n]/)
        .map(code => code.trim())
        .filter(code => code.length > 0);

      console.log(`📋 Product codes entered: ${codes.join(', ')}`);

      if (codes.length === 0) {
        throw new Error('No valid product codes entered');
      }

      console.log(`🌐 Sending request to: ${API_URL}/uropa/compare-prices`);
      console.log(`📦 Request body:`, { codes });

      const response = await fetch(`${API_URL}/uropa/compare-prices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ codes })
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Error response:', error);
        throw new Error(error.error || 'Failed to compare prices');
      }

      const data = await response.json();
      console.log('');
      console.log('✅ COMPARISON COMPLETE');
      console.log(`📊 Results:`, {
        totalProducts: data.comparisons?.length || 0,
        increased: data.stats?.increased || 0,
        decreased: data.stats?.decreased || 0,
        unchanged: data.stats?.unchanged || 0
      });
      
      if (data.comparisons && data.comparisons.length > 0) {
        console.log('');
        console.log('💰 PRICE COMPARISONS:');
        data.comparisons.forEach((comp: PriceComparison, i: number) => {
          console.log(`\n${i + 1}. ${comp.name} (${comp.sku})`);
          console.log(`   📋 Database Trade Price (Your Cost): $${comp.currentCostPrice || 0}`);
          console.log(`   🌐 Uropa Selling Price (Your Cost): $${comp.uropaCostPrice || 0}`);
          console.log(`   📊 Difference: $${(comp.priceDifference || 0).toFixed(2)} (${(comp.percentageChange || 0).toFixed(2)}%)`);
          console.log(`   💵 Current Your Selling Price: $${comp.currentSellingPrice || 0}`);
          console.log(`   💵 New Your Selling Price: $${comp.newSellingPrice || 0}`);
        });
        
        setComparisons(data.comparisons.map((c: PriceComparison) => ({ 
          ...c, 
          selected: Math.abs(c.priceDifference) > 0.01 
        })));
        setStats(data.stats);
        setAnalysis({ 
          type: 'success', 
          text: `Found ${data.comparisons.length} products. ${data.stats.increased} increased, ${data.stats.decreased} decreased.` 
        });
      } else {
        console.warn('⚠️  No comparisons returned');
        setAnalysis({ type: 'error', text: 'No matching products found in database or Uropa' });
      }
    } catch (error) {
      console.error('');
      console.error('❌ SEARCH ERROR:', error);
      setAnalysis({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to search Uropa' 
      });
    } finally {
      console.log('='.repeat(80));
      console.log('');
      setIsLoading(false);
    }
  };

  const handleUpdatePrices = async () => {
    const selectedProducts = comparisons.filter(c => c.selected && Math.abs(c.priceDifference) > 0.01);
    
    if (selectedProducts.length === 0) {
      setAnalysis({ type: 'error', text: 'Please select at least one product to update' });
      return;
    }

    setIsUpdating(true);
    setAnalysis(null);

    try {
      const response = await fetch(`${API_URL}/uropa/update-prices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          updates: selectedProducts.map(p => ({
            productId: p.productId,
            newCostPrice: p.uropaCostPrice,
            newSellingPrice: p.newSellingPrice
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update prices');
      }

      const result = await response.json();
      
      setAnalysis({ 
        type: 'success', 
        text: `Successfully updated ${result.updated} products!` 
      });
      
      // Refresh the search to show updated prices
      setTimeout(() => {
        handleSearch();
      }, 1500);
      
    } catch (error) {
      console.error('Update error:', error);
      setAnalysis({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update prices' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleSelection = (productId: string) => {
    setSelectedComparisons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedComparisons(new Set(comparisons.filter(c => Math.abs(c.priceDifference) > 0.01).map(c => c.productId)));
  };

  const deselectAll = () => {
    setSelectedComparisons(new Set());
  };

  const selectedCount = comparisons.filter(c => selectedComparisons.has(c.productId)).length;

  // Test API connection
  const testApiConnection = async () => {
    setTestingApi(true);
    setApiTestResult(null);

    try {
      console.log('Testing API connection...');
      const response = await fetch(`${API_URL}/price-sync/test-api`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      const data = await response.json();
      console.log('API Test Response:', data);
      
      setApiTestResult(data);
      
      if (data.success) {
        toast.success('✅ API connection successful!');
      } else {
        toast.error(`API test failed: ${data.error}`);
        
        // Show helpful message about token
        if (data.status === 401) {
          toast.error('⚠️ Your Uropa API token is invalid or has expired. Please update it in Token Authentication.', {
            duration: 8000,
          });
        }
      }
    } catch (error) {
      console.error('API test error:', error);
      const errorData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      setApiTestResult(errorData);
      toast.error('Failed to test API connection');
    } finally {
      setTestingApi(false);
    }
  };

  // Run full sync
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // DEBUG: Product cost comparison
  const [debugCodes, setDebugCodes] = useState('');
  const [debugResults, setDebugResults] = useState<any>(null);
  const [isDebugging, setIsDebugging] = useState(false);

  // ✅ NEW: Debug Uropa API response
  const [debugApiCode, setDebugApiCode] = useState('CD085-A');
  const [debugApiResult, setDebugApiResult] = useState<any>(null);
  const [isDebuggingApi, setIsDebuggingApi] = useState(false);

  const debugUropaApi = async () => {
    if (!debugApiCode.trim()) {
      toast.error('Please enter a product code');
      return;
    }

    setIsDebuggingApi(true);
    setDebugApiResult(null);

    try {
      const response = await fetch(`${API_URL}/price-sync/query-product`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productCode: debugApiCode }),
      });

      const data = await response.json();
      console.log('🔍 [Debug] Full query-product response:', data);
      
      // Transform the response to match our expected format
      if (data.success && data.uropa) {
        setDebugApiResult({
          success: true,
          productCode: debugApiCode,
          priceExtraction: {
            'priceB': data.uropa?.priceB,
            'extractedSellingPrice': data.uropa?.extractedSellingPrice,
            'allPriceFields.priceA': data.uropa?.allPriceFields?.priceA,
            'allPriceFields.priceB': data.uropa?.allPriceFields?.priceB,
            'priceDetail.salesPrice': data.uropa?.priceDetail?.salesPrice,
            'priceDetail.lowestPrice': data.uropa?.priceDetail?.lowestPrice,
          },
          priceStructure: data.uropa,
          comparison: {
            uropaPrice: data.uropa?.extractedSellingPrice || data.uropa?.priceB,
            dbCost: data.database?.tradePrice || data.database?.costPrice,
            difference: (data.uropa?.priceB || 0) - (data.database?.tradePrice || 0),
            percentChange: data.database?.tradePrice 
              ? (((data.uropa?.priceB || 0) - data.database.tradePrice) / data.database.tradePrice * 100)
              : 0,
          },
          database: data.database,
          topLevelKeys: data.uropa ? Object.keys(data.uropa) : [],
        });
        toast.success('API response fetched!');
      } else {
        setDebugApiResult(data);
        toast.error(data.error || 'Failed to fetch API response');
      }
    } catch (error) {
      console.error('Debug API error:', error);
      setDebugApiResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      toast.error('Failed to debug API');
    } finally {
      setIsDebuggingApi(false);
    }
  };

  // ✅ NEW: Show comparison AFTER update
  const [updateResults, setUpdateResults] = useState<any>(null);

  // Manual cost change for testing
  const [manualCode, setManualCode] = useState('');
  const [manualCost, setManualCost] = useState('');
  const [isUpdatingManual, setIsUpdatingManual] = useState(false);
  
  // ✅ NEW: Manual query to check database
  const [queryCode, setQueryCode] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  const queryProductCost = async () => {
    if (!queryCode.trim()) {
      toast.error('Please enter a product code');
      return;
    }

    setIsQuerying(true);
    setQueryResult(null);

    try {
      console.log('🔍 [Query] Fetching product:', queryCode);

      const response = await fetch(`${API_URL}/price-sync/query-product`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productCode: queryCode })
      });

      const data = await response.json();
      console.log('🔍 [Query] Response:', data);

      setQueryResult(data);

      if (data.success) {
        toast.success(`✅ Found product: ${data.summary?.productName}`);
      } else {
        toast.error(`Not found: ${data.error}`);
      }
    } catch (error) {
      console.error('🔍 [Query] Error:', error);
      toast.error('Failed to query product');
      setQueryResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsQuerying(false);
    }
  };

  // ✅ NEW: Update product from Uropa price
  const [isUpdatingFromUropa, setIsUpdatingFromUropa] = useState(false);
  
  const updateProductFromUropa = async (productCode: string, newCost: number) => {
    setIsUpdatingFromUropa(true);

    try {
      console.log('🔄 [Update from Uropa] Updating:', { productCode, newCost });

      const response = await fetch(`${API_URL}/price-sync/manual-update-cost`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productCode: productCode,
          newCost: newCost
        })
      });

      const data = await response.json();
      console.log('🔄 [Update from Uropa] Response:', data);

      if (data.success) {
        toast.success(`✅ Updated ${productCode} successfully!`, { duration: 5000 });
        
        if (data.product) {
          toast.success(
            `Cost: $${data.product.oldCost?.toFixed(2)} → $${data.product.newCost?.toFixed(2)} | Selling: $${data.product.oldSellingPrice?.toFixed(2)} → $${data.product.newSellingPrice?.toFixed(2)}`,
            { duration: 8000 }
          );
        }
        
        // Re-query to show updated data
        await queryProductCost();
      } else {
        toast.error(`Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('🔄 [Update from Uropa] Error:', error);
      toast.error('Failed to update product');
    } finally {
      setIsUpdatingFromUropa(false);
    }
  };

  // ✅ NEW: Bulk query multiple products
  const [bulkCodes, setBulkCodes] = useState('');
  const [bulkResults, setBulkResults] = useState<any>(null);
  const [isBulkQuerying, setIsBulkQuerying] = useState(false);
  const [selectedForUpdate, setSelectedForUpdate] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const queryBulkProducts = async () => {
    if (!bulkCodes.trim()) {
      toast.error('Please enter product codes');
      return;
    }

    setIsBulkQuerying(true);
    setBulkResults(null);
    setSelectedForUpdate(new Set());

    try {
      const codes = bulkCodes
        .split(/[\n,]+/)
        .map(c => c.trim())
        .filter(Boolean);
      
      // ✅ Limit to 50 products to prevent timeouts
      if (codes.length > 50) {
        toast.error(`Too many products! Maximum is 50 per query (you entered ${codes.length}). Please split into smaller batches.`, { duration: 8000 });
        setIsBulkQuerying(false);
        return;
      }

      console.log('🔍 [Bulk Query] Fetching products:', codes);

      const response = await fetch(`${API_URL}/price-sync/query-bulk-products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productCodes: codes })
      });

      const data = await response.json();
      console.log('🔍 [Bulk Query] Response:', data);

      setBulkResults(data);

      if (data.success) {
        toast.success(`✅ Found ${data.results?.length || 0} of ${codes.length} products`);
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('🔍 [Bulk Query] Error:', error);
      toast.error('Failed to query products');
      setBulkResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsBulkQuerying(false);
    }
  };

  const toggleProductSelection = (productCode: string) => {
    const newSelection = new Set(selectedForUpdate);
    if (newSelection.has(productCode)) {
      newSelection.delete(productCode);
    } else {
      newSelection.add(productCode);
    }
    setSelectedForUpdate(newSelection);
  };

  const selectAllBulkProducts = () => {
    if (!bulkResults?.results) return;
    const allCodes = bulkResults.results
      .filter((r: any) => r.priceChanged)
      .map((r: any) => r.productCode);
    setSelectedForUpdate(new Set(allCodes));
  };

  const deselectAllBulkProducts = () => {
    setSelectedForUpdate(new Set());
  };

  // ✅ State for batch progress tracking
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    processed: number;
    totalProducts: number;
  } | null>(null);

  const updateSelectedProducts = async () => {
    if (selectedForUpdate.size === 0) {
      toast.error('Please select at least one product to update');
      return;
    }

    // ⚠️ Check limit before proceeding
    if (selectedForUpdate.size > 20) {
      toast.error(`Too many products selected (${selectedForUpdate.size}). Maximum is 20 per batch to prevent timeouts. Please select fewer products.`, { duration: 8000 });
      return;
    }

    if (!confirm(`Update ${selectedForUpdate.size} product(s) to Uropa prices?`)) {
      return;
    }

    setIsBulkUpdating(true);
    setBatchProgress(null);

    try {
      const updates = bulkResults.results
        .filter((r: any) => selectedForUpdate.has(r.productCode))
        .map((r: any) => ({
          productCode: r.productCode,
          newCost: r.uropaSellingPrice,
          newDescription: r.uropaDescription  // 🔥 ADDED: Send description to backend
        }));

      console.log('🔄 [Bulk Update] Updating products (prices + descriptions) via bulk endpoint:', updates);

      // ✅ Call the new bulk update endpoint
      const response = await fetch(`${API_URL}/price-sync/bulk-update-costs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updates })
      });

      const data = await response.json();
      console.log('🔄 [Bulk Update] Response:', data);

      if (data.success) {
        const { successCount = 0, failCount = 0, batches = 0 } = data.summary || {};
        
        toast.success(`✅ Updated ${successCount} product(s) successfully!`, { duration: 5000 });
        
        if (failCount > 0) {
          toast.error(`❌ Failed to update ${failCount} product(s)`, { duration: 5000 });
        }

        // ✅ Show batch info
        if (batches > 0) {
          toast.info(`📊 Processed in ${batches} batch${batches > 1 ? 'es' : ''}`, { duration: 3000 });
        }
        
        toast.info('💡 Remember to clear cache on Dashboard!', { duration: 4000 });
        
        // ✅ CRITICAL: Reload product list to show new prices
        console.log('🔄 Reloading product list after bulk update...');
        await fetchBrowserProducts();
        
        // ✅ Clear selection after successful update
        setSelectedForUpdate(new Set());
      } else {
        toast.error(`Update failed: ${data.error || 'Unknown error'}`, { duration: 5000 });
      }

    } catch (error) {
      console.error('🔄 [Bulk Update] Error:', error);
      toast.error('Failed to update products');
    } finally {
      setIsBulkUpdating(false);
      setBatchProgress(null);
    }
  };

  // ✅ NEW: Product Browser with CLIENT-SIDE pagination (instant navigation!)
  const [browserProducts, setBrowserProducts] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]); // Store ALL products
  const [browserLoading, setBrowserLoading] = useState(false);
  const [browserSearch, setBrowserSearch] = useState('');
  const [browserBrand, setBrowserBrand] = useState('');
  const [browserBrands, setBrowserBrands] = useState<string[]>([]);
  const [selectedBrowserProducts, setSelectedBrowserProducts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const PRODUCTS_PER_PAGE = 50;

  // ✅ Load ALL products from database ONCE
  const fetchBrowserProducts = async () => {
    setBrowserLoading(true);
    try {
      console.log('📦 Loading ALL products from database (one-time load)...');
      const response = await fetch(`${API_URL}/price-sync/list-products?limit=999999`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        }
      });

      const data = await response.json();
      
      if (data.success) {
        const products = data.products || [];
        setAllProducts(products); // Store ALL products
        setBrowserBrands(data.brands || []);
        setTotalProducts(products.length);
        console.log(`✅ Loaded ${products.length} products total (all in memory - instant navigation!)`);
        toast.success(`Loaded ${products.length} products - navigation is now instant!`);
      } else {
        toast.error('Failed to load products');
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setBrowserLoading(false);
    }
  };

  // ✅ CLIENT-SIDE filtering and pagination (instant, no database calls!)
  useEffect(() => {
    if (allProducts.length === 0) {
      setBrowserProducts([]);
      setTotalPages(1);
      return;
    }
    
    let filtered = [...allProducts];
    
    // Filter by search (instant!)
    if (browserSearch.trim()) {
      const search = browserSearch.toLowerCase();
      filtered = filtered.filter(p => 
        p.code?.toLowerCase().includes(search) ||
        p.name?.toLowerCase().includes(search) ||
        p.brand?.toLowerCase().includes(search)
      );
    }
    
    // Filter by brand (instant!)
    if (browserBrand) {
      filtered = filtered.filter(p => p.brand === browserBrand);
    }
    
    // Calculate pagination
    const total = filtered.length;
    const pages = Math.ceil(total / PRODUCTS_PER_PAGE) || 1;
    setTotalPages(pages);
    
    // Reset to page 1 if current page is out of bounds
    let safePage = currentPage;
    if (currentPage > pages) {
      safePage = 1;
      setCurrentPage(1);
    }
    
    // Get current page slice
    const startIdx = (safePage - 1) * PRODUCTS_PER_PAGE;
    const endIdx = startIdx + PRODUCTS_PER_PAGE;
    const paginated = filtered.slice(startIdx, endIdx);
    
    setBrowserProducts(paginated);
    console.log(`📄 Page ${safePage}/${pages}: Showing ${paginated.length} of ${total} filtered products (instant!)`);
  }, [browserSearch, browserBrand, allProducts, currentPage]);

  // ✅ FIX: Auto-load products when component mounts
  useEffect(() => {
    // Only fetch if we have a token
    if (hasToken) {
      fetchBrowserProducts();
    }
  }, [hasToken]); // Only run when hasToken changes

  const toggleBrowserProductSelection = (productCode: string) => {
    const newSelection = new Set(selectedBrowserProducts);
    if (newSelection.has(productCode)) {
      newSelection.delete(productCode);
    } else {
      newSelection.add(productCode);
    }
    setSelectedBrowserProducts(newSelection);
  };

  const selectAllBrowserProducts = () => {
    const allCodes = browserProducts.map(p => p.code).filter(Boolean);
    setSelectedBrowserProducts(new Set([...selectedBrowserProducts, ...allCodes]));
    toast.success(`Selected ${allCodes.length} products on this page`);
  };

  const deselectAllBrowserProducts = () => {
    // Only deselect products on current page
    const currentPageCodes = browserProducts.map(p => p.code).filter(Boolean);
    const newSelection = new Set(selectedBrowserProducts);
    currentPageCodes.forEach(code => newSelection.delete(code));
    setSelectedBrowserProducts(newSelection);
    toast.success(`Deselected products on this page`);
  };
  
  const clearAllSelections = () => {
    setSelectedBrowserProducts(new Set());
    toast.success('Cleared all selections');
  };

  const addSelectedToBulkQuery = () => {
    if (selectedBrowserProducts.size === 0) {
      toast.error('Please select at least one product');
      return;
    }

    const codes = Array.from(selectedBrowserProducts).join('\n');
    setBulkCodes(prevCodes => {
      const existingCodes = prevCodes.split(/[\n,]+/).map(c => c.trim()).filter(Boolean);
      const newCodes = Array.from(selectedBrowserProducts).filter(c => !existingCodes.includes(c));
      return [...existingCodes, ...newCodes].join('\n');
    });

    toast.success(`Added ${selectedBrowserProducts.size} product(s) to bulk query`);
    setSelectedBrowserProducts(new Set());
  };

  // ✅ NEW: Query selected browser products directly without using textarea
  const querySelectedBrowserProducts = async () => {
    if (selectedBrowserProducts.size === 0) {
      toast.error('Please select at least one product');
      return;
    }

    // ✅ Check limit before querying
    if (selectedBrowserProducts.size > 50) {
      toast.error(`Too many products! Maximum is 50 per query (you selected ${selectedBrowserProducts.size}). Please reduce your selection.`, { duration: 8000 });
      return;
    }

    setIsBulkQuerying(true);
    setBulkResults(null);
    setSelectedForUpdate(new Set());

    try {
      const codes = Array.from(selectedBrowserProducts);
      
      console.log('🚀 [Direct Query] Querying selected products:', codes);

      const response = await fetch(`${API_URL}/price-sync/query-bulk-products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productCodes: codes })
      });

      const data = await response.json();
      console.log('🚀 [Direct Query] Response:', data);

      setBulkResults(data);

      if (data.success) {
        toast.success(`✅ Found ${data.results?.length || 0} of ${codes.length} products`);
        
        // ✅ Clear browser selection after successful query
        setSelectedBrowserProducts(new Set());
        
        // ✅ Scroll to results
        setTimeout(() => {
          const resultsSection = document.querySelector('[data-bulk-results]');
          if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('🚀 [Direct Query] Error:', error);
      toast.error('Failed to query products');
      setBulkResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsBulkQuerying(false);
    }
  };

  const updateManualCost = async () => {
    if (!manualCode.trim() || !manualCost.trim()) {
      toast.error('Please enter both product code and new cost');
      return;
    }

    const cost = parseFloat(manualCost);
    if (isNaN(cost) || cost < 0) {
      toast.error('Please enter a valid cost price');
      return;
    }

    setIsUpdatingManual(true);

    try {
      console.log('🔧 [Manual Update] Changing cost:', { productCode: manualCode, newCost: cost });

      const response = await fetch(`${API_URL}/price-sync/manual-update-cost`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productCode: manualCode,
          newCost: cost
        })
      });

      const data = await response.json();
      console.log('🔧 [Manual Update] Response:', data);

      if (data.success) {
        toast.success(`✅ Updated ${manualCode} cost to $${cost.toFixed(2)}`);
        toast.info('💡 Remember to clear cache on Dashboard!', { duration: 3000 });
        
        // ✅ CRITICAL: Reload product list to show new price
        console.log('🔄 Reloading product list after manual update...');
        await fetchBrowserProducts(); // Reload the product list
        
        // Show details
        if (data.product) {
          toast.success(
            `Selling price changed: $${data.product.oldSellingPrice?.toFixed(2)} → $${data.product.newSellingPrice?.toFixed(2)}`,
            { duration: 5000 }
          );
        }
      } else {
        toast.error(`Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('🔧 [Manual Update] Error:', error);
      toast.error('Failed to update cost');
    } finally {
      setIsUpdatingManual(false);
    }
  };

  const runDebugComparison = async () => {
    if (!debugCodes.trim()) {
      toast.error('Please enter product codes to debug');
      return;
    }

    setIsDebugging(true);
    setDebugResults(null);

    try {
      const codes = debugCodes
        .split(/[\n,]+/)
        .map(c => c.trim())
        .filter(Boolean);

      console.log('🐛 [DEBUG] Testing product codes:', codes);

      // ✅ FIX: Use /test endpoint (CHECK ONLY, no auto-update!)
      const response = await fetch(`${API_URL}/price-sync/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productCodes: codes })
      });

      const data = await response.json();
      console.log('🐛 [DEBUG] Response:', data);

      setDebugResults(data);

      if (data.success) {
        toast.success(`✅ Checked ${data.results?.length || 0} products`);
      } else {
        toast.error(`Debug failed: ${data.error}`);
      }
    } catch (error) {
      console.error('🐛 [DEBUG] Error:', error);
      toast.error('Failed to run debug comparison');
      setDebugResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsDebugging(false);
    }
  };

  const runFullSync = async () => {
    if (!confirm('This will check ALL products in your database against Uropa API and update changed prices. This may take several minutes. Continue?')) {
      return;
    }

    setSyncing(true);
    setSyncResult(null);
    setAnalysis(null);

    try {
      console.log('Starting full price sync...');
      const response = await fetch(`${API_URL}/price-sync/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Sync Response:', data);
      
      setSyncResult(data);
      
      if (data.success) {
        const updatedCount = data.log?.pricesUpdated || 0;
        toast.success(`✅ Sync complete! Updated ${updatedCount} of ${data.log?.productsChecked || 0} products.`);
        
        if (updatedCount > 0) {
          toast.info('💡 Prices updated! Remember to clear cache on Dashboard.', { duration: 4000 });
        }
        
        setAnalysis({
          type: 'success',
          text: `Sync complete! Checked ${data.log?.productsChecked || 0} products, updated ${updatedCount} prices in ${((data.log?.duration || 0) / 1000).toFixed(1)}s`
        });
      } else {
        toast.error(`Sync failed: ${data.error}`);
        setAnalysis({
          type: 'error',
          text: data.error || 'Failed to run sync'
        });
        
        // Show helpful message about token
        if (data.error && data.error.includes('401')) {
          toast.error('⚠️ Your Uropa API token is invalid or has expired. Please update it in Token Authentication.', {
            duration: 8000,
          });
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setSyncResult({ success: false, error: errorMsg });
      toast.error('Failed to run sync');
      setAnalysis({
        type: 'error',
        text: errorMsg
      });
    } finally {
      setSyncing(false);
    }
  };

  // If no token, show setup message
  if (!hasToken) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl mb-2">Uropa Price Sync</h1>
          <p className="text-muted-foreground">
            Compare and sync product prices with Uropa supplier
          </p>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Key className="size-8 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">
                  API Authentication Required
                </h3>
                <p className="text-amber-800 mb-4">
                  You need to configure your Uropa API token before you can use the price sync feature.
                </p>
                <Link to="/admin/uropa-token-auth">
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    <Key className="size-4 mr-2" />
                    Configure API Token
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Uropa Price Sync</h1>
        <p className="text-muted-foreground">
          Compare and sync product prices with Uropa supplier
        </p>
      </div>

      {/* Status Message */}
      {analysis && (
        <Card className={analysis.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {analysis.type === 'success' ? (
                <CheckCircle className="size-5 text-green-600" />
              ) : (
                <AlertCircle className="size-5 text-red-600" />
              )}
              <p className={analysis.type === 'success' ? 'text-green-900' : 'text-red-900'}>
                {analysis.text}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ℹ️ CACHE REMINDER */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-900 font-semibold mb-1">
          💡 After updating prices, go to the <strong>Admin Dashboard</strong> to clear cache
        </p>
        <p className="text-xs text-blue-700">
          Navigate to Dashboard → Centralized Cache Management → Click "Clear All Caches"
        </p>
      </div>

      {/* Test API & Full Sync Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle className="size-5" />
              Test API Connection
            </CardTitle>
            <CardDescription className="text-green-700">
              Verify that your Uropa API token is working correctly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={testApiConnection}
              disabled={testingApi}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {testingApi ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircle className="size-4 mr-2" />
                  🔌 Test API Connection
                </>
              )}
            </Button>
            
            {apiTestResult && (
              <div className={`p-3 rounded-lg border ${
                apiTestResult.success 
                  ? 'bg-white border-green-300' 
                  : 'bg-red-50 border-red-300'
              }`}>
                <p className={`text-sm font-medium ${
                  apiTestResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {apiTestResult.success ? '✅ Connection successful!' : `❌ ${apiTestResult.error}`}
                </p>
                {!apiTestResult.success && apiTestResult.error?.includes('401') && (
                  <Link to="/admin/uropa-token-auth" className="block mt-2">
                    <Button size="sm" variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-50">
                      <Key className="size-3 mr-1" />
                      Update Token
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Eye className="size-5" />
              Debug Uropa API Response
            </CardTitle>
            <CardDescription className="text-orange-700">
              Check what price data the Uropa API is returning for a specific product
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="debugApiCode" className="text-orange-900">Product Code</Label>
              <Input
                id="debugApiCode"
                value={debugApiCode}
                onChange={(e) => setDebugApiCode(e.target.value)}
                placeholder="e.g., CD085-A"
                className="bg-white"
              />
            </div>
            <Button
              onClick={debugUropaApi}
              disabled={isDebuggingApi}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {isDebuggingApi ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Eye className="size-4 mr-2" />
                  🔍 Debug API Response
                </>
              )}
            </Button>
            
            {debugApiResult && (
              <div className={`p-3 rounded-lg border max-h-96 overflow-y-auto ${
                debugApiResult.success 
                  ? 'bg-white border-orange-300' 
                  : 'bg-red-50 border-red-300'
              }`}>
                {debugApiResult.success ? (
                  <div className="text-sm space-y-3">
                    <p className="font-medium text-orange-800 mb-2">✅ API Response for {debugApiResult.productCode}</p>
                    
                    {debugApiResult.comparison && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-300 mb-2">
                        <p className="font-semibold text-blue-900 mb-2">💰 Price Comparison:</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-blue-700">Uropa Cost Price:</span>
                            <span className="font-bold text-blue-900">${debugApiResult.comparison.uropaPrice?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Current DB Cost:</span>
                            <span className="font-bold text-blue-900">${debugApiResult.comparison.dbCost?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-blue-300 pt-1">
                            <span className="text-blue-700">Difference:</span>
                            <span className={`font-bold ${debugApiResult.comparison.difference > 0 ? 'text-red-700' : 'text-green-700'}`}>
                              ${debugApiResult.comparison.difference?.toFixed(2)} ({debugApiResult.comparison.percentChange?.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {debugApiResult.priceExtraction && (
                      <div className="bg-orange-50 p-2 rounded">
                        <p className="font-semibold text-orange-900 mb-1">Price Extraction Attempts:</p>
                        {Object.entries(debugApiResult.priceExtraction).map(([path, value]) => (
                          <div key={path} className="text-xs py-1 flex justify-between">
                            <span className="text-orange-700 font-mono">{path}:</span>
                            <span className={`font-semibold ${value ? 'text-green-700' : 'text-gray-400'}`}>
                              {value ? `$${value}` : 'null'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {debugApiResult.priceStructure && (
                      <>
                        <div className="bg-white p-2 rounded border border-orange-200">
                          <p className="font-semibold text-orange-900 mb-1">Full Price Structure:</p>
                          <pre className="text-xs text-orange-800 whitespace-pre-wrap font-mono overflow-x-auto">
                            {JSON.stringify(debugApiResult.priceStructure, null, 2)}
                          </pre>
                        </div>

                        {/* 🆕 ATTRIBUTES SECTION */}
                        {debugApiResult.priceStructure?.attributes && (
                          <div className="space-y-2">
                            {/* COMPARISON DATA - Specifications */}
                            {debugApiResult.priceStructure.attributes.comparisonData?.length > 0 && (
                              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                <p className="font-semibold text-blue-900 mb-2">📋 Specifications (COMPARISONDATA):</p>
                                <div className="space-y-1 text-xs">
                                  {debugApiResult.priceStructure.attributes.comparisonData.map((attr: any, idx: number) => (
                                    <div key={idx} className="flex justify-between border-b border-blue-200 pb-1">
                                      <span className="text-blue-700 font-medium">{attr.fieldName}:</span>
                                      <span className="text-blue-900">{attr.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ATTRIBUTES DATA - Features/Bullet Points */}
                            {debugApiResult.priceStructure.attributes.attributesData?.length > 0 && (
                              <div className="bg-green-50 p-3 rounded border border-green-200">
                                <p className="font-semibold text-green-900 mb-2">✨ Product Features (ATTRIBUTESDATA):</p>
                                <ul className="space-y-1 text-xs list-disc list-inside">
                                  {debugApiResult.priceStructure.attributes.attributesData.map((attr: any, idx: number) => (
                                    <li key={idx} className="text-green-800">{attr.value}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* HAZARD DATA */}
                            {debugApiResult.priceStructure.attributes.hazardData?.length > 0 && (
                              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                                <p className="font-semibold text-yellow-900 mb-2">⚠️ Product Info (HAZARDDATA):</p>
                                <div className="space-y-1 text-xs">
                                  {debugApiResult.priceStructure.attributes.hazardData.map((attr: any, idx: number) => (
                                    <div key={idx} className="flex justify-between border-b border-yellow-200 pb-1">
                                      <span className="text-yellow-700 font-medium">{attr.fieldName}:</span>
                                      <span className="text-yellow-900">{attr.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-red-800">
                    ❌ {debugApiResult.error}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <RefreshCw className="size-5" />
              Run Full Sync
            </CardTitle>
            <CardDescription className="text-purple-700">
              Check all products and automatically update changed prices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={runFullSync}
              disabled={syncing}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {syncing ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4 mr-2" />
                  🚀 Run Full Price Sync
                </>
              )}
            </Button>
            
            {syncResult && (
              <div className={`p-3 rounded-lg border ${
                syncResult.success 
                  ? 'bg-white border-purple-300' 
                  : 'bg-red-50 border-red-300'
              }`}>
                {syncResult.success ? (
                  <div className="text-sm">
                    <p className="font-medium text-purple-800 mb-1">✅ Sync complete!</p>
                    <p className="text-purple-700">
                      Checked: {syncResult.log?.productsChecked || 0} products<br />
                      Updated: {syncResult.log?.pricesUpdated || 0} prices<br />
                      Duration: {((syncResult.log?.duration || 0) / 1000).toFixed(1)}s
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-red-800">
                    ❌ {syncResult.error}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Price Analysis Section */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <DollarSign className="size-5" />
            Price Analysis
          </CardTitle>
          <CardDescription className="text-blue-700">
            Analyze pricing status across all products in your database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Button
            onClick={analyzePrices}
            disabled={isAnalyzing}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="size-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Eye className="size-4 mr-2" />
                Analyze Database Prices
              </>
            )}
          </Button>

          {analysis && (
            <div className="space-y-4">
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-xs text-blue-600 font-medium mb-1">With Price</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {(analysis.withPrice || 0).toLocaleString()}
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-xs text-red-600 font-medium mb-1">No Price</div>
                  <div className="text-2xl font-bold text-red-900">
                    {(analysis.withoutPrice || 0).toLocaleString()}
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-xs text-purple-600 font-medium mb-1">Has Cost Price</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {(analysis.withCostPrice || 0).toLocaleString()}
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-xs text-green-600 font-medium mb-1">Avg Sell Price</div>
                  <div className="text-2xl font-bold text-green-900">
                    ${(analysis.avgPrice || 0).toFixed(2)}
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <div className="text-xs text-indigo-600 font-medium mb-1">Avg Cost Price</div>
                  <div className="text-2xl font-bold text-indigo-900">
                    ${(analysis.avgCostPrice || 0).toFixed(2)}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="text-xs text-amber-600 font-medium mb-1">Zero Price</div>
                  <div className="text-2xl font-bold text-amber-900">
                    {(analysis.withZeroPrice || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Price Distribution */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Price Distribution by Tier</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Under $50 (50% markup):</span>
                    <span className="font-bold text-slate-900">{(analysis.priceRanges?.under50 || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">$50 - $100 (40% markup):</span>
                    <span className="font-bold text-slate-900">{(analysis.priceRanges?.['50to100'] || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">$100 - $500 (30% markup):</span>
                    <span className="font-bold text-slate-900">{(analysis.priceRanges?.['100to500'] || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">$500 - $1000 (20% markup):</span>
                    <span className="font-bold text-slate-900">{(analysis.priceRanges?.['500to1000'] || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">$1000 - $5000 (15% markup):</span>
                    <span className="font-bold text-slate-900">{(analysis.priceRanges?.['1000to5000'] || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Over $5000 (12% markup):</span>
                    <span className="font-bold text-slate-900">{(analysis.priceRanges?.over5000 || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DEBUG: Price Comparison Tool */}
      <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            🐛 DEBUG: Cost Price Comparison
          </CardTitle>
          <CardDescription className="text-orange-700">
            Step 1: Check if products have cost prices in DB. Step 2: Compare DB cost vs Uropa API cost
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="debugCodes">Product Codes to Debug</Label>
            <textarea
              id="debugCodes"
              placeholder="Enter product codes (one per line or comma separated)&#10;e.g., AA090, DM505"
              value={debugCodes}
              onChange={(e) => setDebugCodes(e.target.value)}
              className="w-full min-h-[100px] p-3 border-2 border-orange-300 rounded-md font-mono text-sm"
            />
          </div>

          <Button
            onClick={runDebugComparison}
            disabled={isDebugging || !debugCodes.trim()}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold"
          >
            {isDebugging ? (
              <>
                <RefreshCw className="size-4 mr-2 animate-spin" />
                Debugging...
              </>
            ) : (
              <>
                🐛 Debug Price Comparison
              </>
            )}
          </Button>

          {/* Debug Results */}
          {debugResults && (
            <div className="space-y-3">
              {debugResults.success ? (
                <>
                  {/* Summary */}
                  <div className="bg-white border-2 border-orange-300 rounded-lg p-4">
                    <h4 className="font-bold text-orange-900 mb-2">📊 Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-orange-700">Total Checked:</span>
                        <span className="font-bold ml-2">{debugResults.summary?.total || 0}</span>
                      </div>
                      <div>
                        <span className="text-orange-700">Prices Changed:</span>
                        <span className="font-bold ml-2">{debugResults.summary?.pricesChanged || 0}</span>
                      </div>
                      <div>
                        <span className="text-orange-700">Updated:</span>
                        <span className="font-bold ml-2">{debugResults.summary?.pricesUpdated || 0}</span>
                      </div>
                      <div>
                        <span className="text-orange-700">Errors:</span>
                        <span className="font-bold ml-2 text-red-600">{debugResults.summary?.errors || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Individual Product Results */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-orange-900">🔍 Detailed Results:</h4>
                    {debugResults.results?.map((result: any, idx: number) => (
                      <div 
                        key={idx}
                        className={`border-2 rounded-lg p-4 ${
                          result.status === 'updated' ? 'bg-green-50 border-green-300' :
                          result.status === 'unchanged' ? 'bg-blue-50 border-blue-300' :
                          result.status === 'not_in_uropa' ? 'bg-red-50 border-red-300' :
                          result.status === 'error' ? 'bg-red-50 border-red-400' :
                          'bg-gray-50 border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold font-mono text-lg">{result.code}</span>
                          <span className={`px-3 py-1 rounded text-sm font-bold ${
                            result.status === 'updated' ? 'bg-green-200 text-green-900' :
                            result.status === 'unchanged' ? 'bg-blue-200 text-blue-900' :
                            result.status === 'not_in_uropa' ? 'bg-red-200 text-red-900' :
                            result.status === 'error' ? 'bg-red-300 text-red-900' :
                            'bg-gray-200 text-gray-900'
                          }`}>
                            {result.status === 'updated' && '✅ UPDATED'}
                            {result.status === 'unchanged' && '✓ UP TO DATE'}
                            {result.status === 'not_in_uropa' && '❌ NOT IN UROPA'}
                            {result.status === 'error' && '⚠️ ERROR'}
                          </span>
                        </div>

                        {(result.status === 'updated' || result.status === 'unchanged') && (
                          <div className="space-y-3">
                            {/* Side-by-side comparison */}
                            <div className="grid grid-cols-2 gap-4 bg-white rounded-lg p-3 border">
                              <div className="space-y-1">
                                <p className="text-xs text-gray-500 font-semibold uppercase">💾 Costplus100 Database</p>
                                <div className="space-y-1">
                                  <div>
                                    <p className="text-xs text-gray-600">Cost Price:</p>
                                    <p className="font-bold text-xl text-blue-700">
                                      ${result.oldCostPrice?.toFixed(2) || result.costPrice?.toFixed(2)}
                                    </p>
                                  </div>
                                  {result.oldSellingPrice && (
                                    <div className="pt-2 border-t">
                                      <p className="text-xs text-gray-600">Selling Price:</p>
                                      <p className="font-semibold text-sm">${result.oldSellingPrice?.toFixed(2)}</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <p className="text-xs text-gray-500 font-semibold uppercase">🌐 Uropa API</p>
                                <div className="space-y-1">
                                  <div>
                                    <p className="text-xs text-gray-600">Cost Price:</p>
                                    <p className={`font-bold text-xl ${
                                      result.status === 'updated' ? 'text-orange-600' : 'text-blue-700'
                                    }`}>
                                      ${result.newCostPrice?.toFixed(2) || result.costPrice?.toFixed(2)}
                                    </p>
                                  </div>
                                  {result.newSellingPrice && (
                                    <div className="pt-2 border-t">
                                      <p className="text-xs text-gray-600">New Selling Price:</p>
                                      <p className="font-semibold text-sm text-green-600">${result.newSellingPrice?.toFixed(2)}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Show change details if updated */}
                            {result.status === 'updated' && (
                              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                                <p className="text-xs text-amber-700 font-semibold mb-1">PRICE CHANGE:</p>
                                <div className="flex items-center gap-4">
                                  <div>
                                    <p className="text-xs text-gray-600">Cost Difference:</p>
                                    <p className={`font-bold ${result.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {result.difference > 0 ? '+' : ''}${result.difference?.toFixed(2)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Percentage:</p>
                                    <p className={`font-bold ${result.percentChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {result.percentChange > 0 ? '+' : ''}{result.percentChange?.toFixed(1)}%
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Selling Price Change:</p>
                                    <p className="font-bold text-blue-700">
                                      ${(result.newSellingPrice - result.oldSellingPrice)?.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Show "no change" message if unchanged */}
                            {result.status === 'unchanged' && (
                              <div className="bg-blue-50 border border-blue-300 rounded-lg p-2">
                                <p className="text-sm text-blue-800 font-medium text-center">
                                  ✓ Prices are identical - No update needed
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {result.status === 'not_in_uropa' && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-red-700 font-medium">❌ {result.error}</p>
                            <p className="text-red-600 text-xs mt-1">
                              This product code was not found in the Uropa API response
                            </p>
                          </div>
                        )}

                        {result.status === 'error' && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-red-800 font-medium">⚠️ Error: {result.error}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <p className="font-bold text-red-800">❌ Debug Failed</p>
                  <p className="text-red-700 text-sm mt-1">{debugResults.error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🧪 TEST WORKFLOW - Complete End-to-End Test */}
      <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            🧪 Complete Price Formula Test
          </CardTitle>
          <CardDescription className="text-purple-700">
            Test the complete system: Query product → Update cost → Query again → Verify formula
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-4">
            <h3 className="font-bold text-purple-900 mb-2">📋 Test Steps:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-purple-800">
              <li>Enter product code and click "Query Current Prices"</li>
              <li>Note the current cost and selling price</li>
              <li>Scroll to "Manual Cost Update" below</li>
              <li>Change the cost price</li>
              <li>Come back here and query again</li>
              <li>Compare: selling price should be recalculated using formula</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Label htmlFor="testQueryCode" className="text-purple-900 font-semibold">Product Code to Test</Label>
            <Input
              id="testQueryCode"
              placeholder="e.g., FZ433"
              value={queryCode}
              onChange={(e) => setQueryCode(e.target.value)}
              className="w-full p-3 border-2 border-purple-300 rounded-md font-mono text-lg bg-white"
            />
          </div>

          <Button
            onClick={queryProductCost}
            disabled={isQuerying || !queryCode.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3"
          >
            {isQuerying ? (
              <>
                <RefreshCw className="size-4 mr-2 animate-spin" />
                Querying...
              </>
            ) : (
              <>
                <Search className="size-4 mr-2" />
                Query Product Prices
              </>
            )}
          </Button>

          {queryResult && queryResult.success && (
            <div className="space-y-4">
              <div className="bg-white border-2 border-purple-300 rounded-lg p-4">
                <h4 className="font-bold text-purple-900 mb-3">📦 Current Database Values</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Product:</p>
                    <p className="font-mono font-bold text-purple-700">{queryResult.product?.code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Cost Price:</p>
                    <p className="font-mono text-xl font-bold text-blue-700">
                      ${queryResult.comparison?.dbTradePrice?.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Selling Price:</p>
                    <p className="font-mono text-xl font-bold text-green-700">
                      ${queryResult.comparison?.currentYourSellingPrice?.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Markup:</p>
                    <p className="font-mono font-bold text-purple-700">
                      {(typeof queryResult.currentPricing?.markupPercent === 'number' ? queryResult.currentPricing.markupPercent : parseFloat(queryResult.currentPricing?.markupPercent) || 0).toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500">{queryResult.currentPricing?.tierLabel}</p>
                  </div>
                </div>

                <div className="mt-3 bg-purple-50 border border-purple-200 rounded p-2">
                  <p className="text-xs text-purple-700 font-mono">
                    Formula: ${queryResult.comparison?.dbTradePrice?.toFixed(2)} × {(1 + queryResult.currentPricing?.markup)?.toFixed(2)} 
                    = ${queryResult.comparison?.currentYourSellingPrice?.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                <h4 className="font-bold text-orange-900 mb-3">🌐 Uropa API Comparison</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Uropa Cost:</p>
                    <p className="font-mono text-xl font-bold text-orange-700">
                      ${queryResult.comparison?.uropaSellingPrice?.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Difference:</p>
                    <p className={`font-mono text-xl font-bold ${
                      queryResult.comparison?.difference > 0 ? 'text-red-600' : 
                      queryResult.comparison?.difference < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {queryResult.comparison?.difference > 0 ? '+' : ''}${queryResult.comparison?.difference?.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">If Updated:</p>
                    <p className="font-mono text-xl font-bold text-green-700">
                      ${queryResult.newPricing?.sellingPrice?.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                <p className="font-bold text-blue-900">🎯 Next: Use "Manual Cost Update" below to change cost, then query again!</p>
                <p className="text-sm text-blue-800 mt-1">
                  <Link to={`/products/${queryResult.product?.id}`} className="text-blue-600 underline font-bold">
                    Or view product page →
                  </Link>
                </p>
              </div>
            </div>
          )}

          {queryResult && !queryResult.success && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
              <p className="font-bold text-red-900">❌ {queryResult.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Cost Update Section */}
      <Card className="border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Key className="size-5" />
            Manual Cost Update
          </CardTitle>
          <CardDescription className="text-gray-700">
            Update the cost price of a product manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manualCode">Product Code</Label>
            <Input
              id="manualCode"
              placeholder="Enter product code"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manualCost">New Cost Price</Label>
            <Input
              id="manualCost"
              placeholder="Enter new cost price"
              value={manualCost}
              onChange={(e) => setManualCost(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          <Button
            onClick={updateManualCost}
            disabled={isUpdatingManual || !manualCode.trim() || !manualCost.trim()}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold"
          >
            {isUpdatingManual ? (
              <>
                <RefreshCw className="size-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                🔧 Update Cost
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ✅ NEW: Manual Query Section */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Search className="size-5" />
            🔍 Query Single Product
          </CardTitle>
          <CardDescription className="text-gray-700">
            Compare database prices with live Uropa API prices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* How it works explanation */}
          <div className="p-3 bg-white rounded border border-purple-200 text-xs">
            <p className="font-bold text-purple-900 mb-1">📖 How it works:</p>
            <ul className="space-y-1 text-gray-700 list-none">
              <li>1️�� <span className="font-semibold">Uropa's Selling Price</span> → Saved as YOUR <span className="font-mono bg-green-100 px-1">tradePrice</span> (cost)</li>
              <li>2️⃣ <span className="font-semibold">Apply Tiered Formula:</span> <span className="font-mono bg-blue-100 px-1">Your Selling = tradePrice + Dollar Markup</span></li>
              <li>3️⃣ <span className="font-semibold">Your Selling Price</span> → Saved as <span className="font-mono bg-purple-100 px-1">price</span> field</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="queryCode">Product Code</Label>
            <Input
              id="queryCode"
              placeholder="Enter product code"
              value={queryCode}
              onChange={(e) => setQueryCode(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          <Button
            onClick={queryProductCost}
            disabled={isQuerying || !queryCode.trim()}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold"
          >
            {isQuerying ? (
              <>
                <RefreshCw className="size-4 mr-2 animate-spin" />
                Querying...
              </>
            ) : (
              <>
                🔎 Query Product
              </>
            )}
          </Button>

          {/* Query Results */}
          {queryResult && (
            <div className="space-y-3">
              {queryResult.success && queryResult.diagnostic ? (
                <>
                  {/* Summary - NEW DIAGNOSTIC FORMAT */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-purple-300 rounded-lg p-5">
                    <h4 className="font-bold text-purple-900 mb-3 text-lg flex items-center gap-2">
                      <Search className="size-5" />
                      📊 Price Comparison Summary
                    </h4>
                    
                    {/* Product Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div className="bg-white p-3 rounded border-2 border-gray-300">
                        <span className="text-gray-600 block mb-1">Product:</span>
                        <span className="font-bold">{queryResult.summary?.productCode}</span>
                      </div>
                      <div className="bg-white p-3 rounded border-2 border-gray-300">
                        <span className="text-gray-600 block mb-1">Name:</span>
                        <span className="font-bold">{queryResult.summary?.productName || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Price Comparison */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* YOUR DATABASE */}
                      <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3">
                        <p className="font-bold text-green-900 mb-2 text-sm">📋 YOUR DATABASE</p>
                        <div className="space-y-1">
                          <div>
                            <p className="text-xs text-green-700">Trade Price (Cost):</p>
                            <p className="text-xl font-bold text-green-900">
                              ${(queryResult.summary?.dbTradePrice || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-green-700">Your Selling:</p>
                            <p className="text-lg font-bold text-green-700">
                              ${(queryResult.summary?.dbYourSellingPrice || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* UROPA API */}
                      <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-3">
                        <p className="font-bold text-blue-900 mb-2 text-sm">🌐 UROPA API</p>
                        <div>
                          <p className="text-xs text-blue-700">Their Selling (Your Cost):</p>
                          <p className="text-xl font-bold text-blue-900">
                            ${(queryResult.summary?.uropaSellingPrice || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* DIFFERENCE */}
                      <div className={`border-2 rounded-lg p-3 ${
                        queryResult.summary?.priceChanged 
                          ? 'bg-amber-50 border-amber-400' 
                          : 'bg-gray-50 border-gray-400'
                      }`}>
                        <p className="font-bold mb-2 text-sm">📊 DIFFERENCE</p>
                        <div className="space-y-1">
                          <div>
                            <p className="text-xs text-gray-700">Amount:</p>
                            <p className={`text-xl font-bold ${
                              (queryResult.summary?.difference || 0) > 0 ? 'text-red-600' : 
                              (queryResult.summary?.difference || 0) < 0 ? 'text-green-600' : 
                              'text-gray-600'
                            }`}>
                              {(queryResult.summary?.difference || 0) > 0 ? '+' : ''}
                              ${(queryResult.summary?.difference || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-700">Percent:</p>
                            <p className={`text-lg font-bold ${
                              (queryResult.summary?.percentChange || 0) > 0 ? 'text-red-600' : 
                              (queryResult.summary?.percentChange || 0) < 0 ? 'text-green-600' : 
                              'text-gray-600'
                            }`}>
                              {(queryResult.summary?.percentChange || 0) > 0 ? '+' : ''}
                              {(queryResult.summary?.percentChange || 0).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Message */}
                    {!queryResult.summary?.priceChanged && (
                      <div className="mt-3 bg-gray-100 border border-gray-400 rounded p-2 text-center">
                        <p className="text-gray-700 font-medium text-sm">
                          ✓ Prices match - No update needed
                        </p>
                      </div>
                    )}

                    {/* CURRENT PRICING DETAILS */}
                    {queryResult.summary?.currentTierLabel && (
                      <div className="mt-4 bg-white border-2 border-gray-300 rounded-lg p-4">
                        <h5 className="font-bold text-gray-900 mb-3">💰 Current Pricing Breakdown</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="bg-green-50 p-2 rounded border border-green-300">
                            <p className="text-xs text-green-700">Tier:</p>
                            <p className="font-bold text-green-900">{queryResult.summary.currentTierLabel}</p>
                          </div>
                          <div className="bg-blue-50 p-2 rounded border border-blue-300">
                            <p className="text-xs text-blue-700">Markup $:</p>
                            <p className="font-bold text-blue-900">${(queryResult.summary.currentMarkup || 0).toFixed(2)}</p>
                          </div>
                          <div className="bg-purple-50 p-2 rounded border border-purple-300">
                            <p className="text-xs text-purple-700">Markup %:</p>
                            <p className="font-bold text-purple-900">{(queryResult.summary.currentMarkupPercent || 0).toFixed(1)}%</p>
                          </div>
                          <div className="bg-amber-50 p-2 rounded border border-amber-300">
                            <p className="text-xs text-amber-700">Margin %:</p>
                            <p className="font-bold text-amber-900">{(queryResult.summary.currentMarginPercent || 0).toFixed(1)}%</p>
                          </div>
                        </div>
                        
                        {/* Current Formula Display */}
                        <div className="mt-3 bg-green-50 border border-green-300 rounded p-2 text-xs font-mono">
                          <p className="font-bold text-green-900 mb-1">📐 Current Formula:</p>
                          <p className="text-gray-800">
                            ${(queryResult.summary.dbYourSellingPrice || 0).toFixed(2)} = 
                            ${(queryResult.summary.dbTradePrice || 0).toFixed(2)} × (1 + {(queryResult.summary.currentMarkupPercent || 0).toFixed(0)}%)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* IF YOU UPDATE SECTION */}
                    {queryResult.summary?.priceChanged && queryResult.summary?.newYourSellingPrice && (
                      <div className="mt-4 bg-gradient-to-r from-amber-50 to-red-50 border-2 border-red-400 rounded-lg p-4">
                        <h5 className="font-bold text-red-900 mb-3 text-lg">⚠️ IF YOU UPDATE TO UROPA'S CURRENT PRICE:</h5>
                        
                        {/* Impact Summary */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="bg-white p-3 rounded border-2 border-gray-300">
                            <p className="text-xs text-gray-700">New Trade Price:</p>
                            <p className="text-xl font-bold text-gray-900">
                              ${(queryResult.summary.uropaSellingPrice || 0).toFixed(2)}
                            </p>
                            <p className={`text-xs font-bold mt-1 ${
                              (queryResult.summary.difference || 0) > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              ({(queryResult.summary.difference || 0) > 0 ? '+' : ''}${(queryResult.summary.difference || 0).toFixed(2)})
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded border-2 border-gray-300">
                            <p className="text-xs text-gray-700">New Your Selling:</p>
                            <p className="text-xl font-bold text-blue-900">
                              ${(queryResult.summary.newYourSellingPrice || 0).toFixed(2)}
                            </p>
                            <p className={`text-xs font-bold mt-1 ${
                              (queryResult.summary.sellingPriceChange || 0) > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              ({(queryResult.summary.sellingPriceChange || 0) > 0 ? '+' : ''}${(queryResult.summary.sellingPriceChange || 0).toFixed(2)})
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded border-2 border-gray-300">
                            <p className="text-xs text-gray-700">New Tier:</p>
                            <p className="text-sm font-bold text-purple-900">
                              {queryResult.summary.newTierLabel || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* New Pricing Details */}
                        <div className="bg-white rounded-lg p-3 border-2 border-red-300">
                          <p className="font-bold text-red-900 mb-2 text-sm">New Pricing Details:</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-gray-600">Dollar Markup:</span>
                              <span className="font-bold ml-2 text-blue-700">
                                ${(queryResult.summary.newMarkup || 0).toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Markup %:</span>
                              <span className="font-bold ml-2 text-purple-700">
                                {(queryResult.summary.newMarkupPercent || 0).toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Margin %:</span>
                              <span className="font-bold ml-2 text-amber-700">
                                {(queryResult.summary.newMarginPercent || 0).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Formula Display */}
                        <div className="mt-3 bg-blue-50 border border-blue-300 rounded p-2 text-xs font-mono">
                          <p className="font-bold text-blue-900 mb-1">💰 Formula Applied:</p>
                          <p className="text-gray-800">
                            Selling Price = Cost × (1 + Markup %)
                          </p>
                          <p className="text-gray-700 mt-1">
                            ${(queryResult.summary.newYourSellingPrice || 0).toFixed(2)} = 
                            ${(queryResult.summary.uropaSellingPrice || 0).toFixed(2)} × (1 + {(queryResult.summary.newMarkupPercent || 0).toFixed(0)}%)
                          </p>
                          <p className="text-gray-600 text-xs mt-1">
                            Tier: {queryResult.summary.newTierLabel || 'N/A'}
                          </p>
                        </div>
                        
                        {/* Update Button */}
                        <div className="mt-4 flex justify-center">
                          <Button
                            onClick={() => updateProductFromUropa(
                              queryResult.summary.productCode, 
                              queryResult.summary.uropaSellingPrice
                            )}
                            disabled={isUpdatingFromUropa}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 text-lg font-bold"
                          >
                            {isUpdatingFromUropa ? (
                              <>
                                <RefreshCw className="size-5 mr-2 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <Save className="size-5 mr-2" />
                                Update Database to Uropa's Price
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Debug sections remain the same... */}
                  {queryResult.database?.allFields && (
                    <details className="bg-green-50 border-2 border-green-400 rounded p-3">
                      <summary className="cursor-pointer font-bold text-green-900">
                        🔬 Database Fields
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto max-h-64">
                        {JSON.stringify(queryResult.database.allFields, null, 2)}
                      </pre>
                    </details>
                  )}

                  {queryResult.uropa && (
                    <details className="bg-blue-50 border-2 border-blue-400 rounded p-3">
                      <summary className="cursor-pointer font-bold text-blue-900">
                        🌐 Uropa API Response
                      </summary>
                      <div className="mt-2 space-y-2 text-xs">
                        <div className="bg-yellow-100 p-2 rounded">
                          <p className="font-bold">Extracted: ${(queryResult.uropa?.extractedSellingPrice || 0).toFixed(2)}</p>
                        </div>
                        <pre className="overflow-auto max-h-64 bg-white p-2 rounded">
                          {JSON.stringify(queryResult.uropa.allPriceFields, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </>
              ) : queryResult.success ? (
                <>
                  {/* Summary */}
                  <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-2">🔍 Product Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-700">Product Code:</span>
                        <span className="font-bold ml-2">{queryResult.product?.code}</span>
                      </div>
                      <div>
                        <span className="text-gray-700">Product Name:</span>
                        <span className="font-bold ml-2">{queryResult.product?.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-700">Brand:</span>
                        <span className="font-bold ml-2">{queryResult.product?.brand}</span>
                      </div>
                      <div>
                        <span className="text-gray-700">Current Cost Price:</span>
                        <span className="font-bold ml-2 text-green-700">${queryResult.product?.currentCostPrice?.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-700">Current Selling Price:</span>
                        <span className="font-bold ml-2 text-blue-700">${queryResult.product?.currentSellingPrice?.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {/* ✅ FIXED: Show ALL fields from product object */}
                    {queryResult.product?.allFields && (
                      <details className="mt-4 p-3 bg-yellow-50 border-2 border-yellow-400 rounded" open>
                        <summary className="cursor-pointer font-bold text-yellow-900 text-lg">
                          🔬 View ALL FIELDS (Complete Product Debug)
                        </summary>
                        <div className="mt-3 space-y-1 text-xs max-h-96 overflow-y-auto">
                          {Object.entries(queryResult.product.allFields)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([key, value]: [string, any]) => {
                              // Determine if this is a price-related field
                              const isPriceField = key.toLowerCase().includes('price') || 
                                                 key.toLowerCase().includes('cost') ||
                                                 key.toLowerCase().includes('sale');
                              
                              // Format the value
                              let displayValue = '';
                              let valueClass = 'text-gray-500 font-mono';
                              
                              if (value === null || value === undefined) {
                                displayValue = 'null';
                                valueClass = 'text-gray-400 italic';
                              } else if (typeof value === 'number' && isPriceField) {
                                displayValue = `$${value.toFixed(2)}`;
                                valueClass = 'text-green-700 font-mono font-bold';
                              } else if (typeof value === 'number') {
                                displayValue = value.toString();
                                valueClass = 'text-blue-600 font-mono';
                              } else if (typeof value === 'string') {
                                displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
                                valueClass = 'text-gray-700';
                              } else if (typeof value === 'object') {
                                displayValue = JSON.stringify(value).substring(0, 50) + '...';
                                valueClass = 'text-purple-600 text-xs';
                              } else {
                                displayValue = String(value);
                              }
                              
                              return (
                                <div 
                                  key={key} 
                                  className={`flex justify-between p-2 rounded border ${
                                    isPriceField ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'
                                  } hover:bg-gray-50`}
                                >
                                  <span className="font-bold text-gray-700">{key}:</span>
                                  <span className={valueClass}>{displayValue}</span>
                                </div>
                              );
                            })}
                        </div>
                      </details>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <p className="font-bold text-red-800">❌ Query Failed</p>
                  <p className="text-red-700 text-sm mt-1">{queryResult.error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ NEW: Bulk Query Multiple Products */}
      <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <Search className="size-5" />
            📦 Query Multiple Products (Bulk)
          </CardTitle>
          <CardDescription className="text-gray-700">
            Compare multiple products at once and update them in bulk. Enter multiple product codes (comma or newline separated), view all products in a comparison table, select which products to update, then bulk update all selected products at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ✅ NEW: Tip Banner */}
          <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded border-2 border-green-300">
            <p className="font-bold text-green-900 mb-2 text-sm">💡 Pro Tip - Two Ways to Query:</p>
            <div className="grid md:grid-cols-2 gap-2 text-xs text-gray-700">
              <div className="bg-white p-2 rounded border border-green-200">
                <p className="font-bold text-green-800">🚀 Quick Method (Browser):</p>
                <p className="text-gray-600 mt-1">Use Product Browser below → Select products → Click "Query Selected" button</p>
              </div>
              <div className="bg-white p-2 rounded border border-orange-200">
                <p className="font-bold text-orange-800">📝 Manual Method (Textarea):</p>
                <p className="text-gray-600 mt-1">Type or paste product codes here → Click "Query All Products"</p>
              </div>
            </div>
          </div>
          
          {/* How it Works Box - Moved to CardContent */}
          <div className="p-3 bg-orange-50 rounded border-2 border-orange-200">
            <p className="font-bold text-orange-900 mb-2 text-sm">📖 How it works:</p>
            <ul className="space-y-1 ml-4 list-disc text-gray-700 text-xs">
              <li>Enter multiple product codes (comma or newline separated)</li>
              <li>View all products in a comparison table</li>
              <li>Select which products to update</li>
              <li>Bulk update all selected products at once</li>
            </ul>
          </div>

          {/* Input Area */}
          <div className="space-y-2">
            <Label htmlFor="bulkCodes">Product Codes (one per line or comma-separated)</Label>
            <textarea
              id="bulkCodes"
              placeholder="CD085-A&#10;CD010&#10;CD012-A"
              value={bulkCodes}
              onChange={(e) => setBulkCodes(e.target.value)}
              className="w-full p-3 border-2 border-orange-300 rounded-md font-mono text-sm min-h-[100px]"
            />
          </div>
          
          <Button
            onClick={queryBulkProducts}
            disabled={isBulkQuerying || !bulkCodes.trim()}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3"
          >
            {isBulkQuerying ? (
              <>
                <RefreshCw className="size-4 mr-2 animate-spin" />
                Querying Products...
              </>
            ) : (
              <>
                <Search className="size-4 mr-2" />
                Query All Products
              </>
            )}
          </Button>

          {/* Results Table */}
          {bulkResults && (
            <div className="mt-6 space-y-4" data-bulk-results>
              {bulkResults.success && bulkResults.results ? (
                <>
                  {/* Summary Stats */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-purple-300 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div>
                        <p className="text-xs text-gray-600">Total Queried</p>
                        <p className="text-2xl font-bold text-blue-900">{bulkResults.results.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Price Changed</p>
                        <p className="text-2xl font-bold text-orange-900">
                          {bulkResults.results.filter((r: any) => r.priceChanged).length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Up to Date</p>
                        <p className="text-2xl font-bold text-green-900">
                          {bulkResults.results.filter((r: any) => !r.priceChanged).length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Selected</p>
                        <p className="text-2xl font-bold text-purple-900">{selectedForUpdate.size}</p>
                      </div>
                    </div>
                  </div>

                  {/* Selection Controls */}
                  <div className="space-y-3">
                    {/* Warning about limit */}
                    {selectedForUpdate.size > 20 && (
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                        <p className="text-sm font-bold text-red-800">⚠️ Too many products selected!</p>
                        <p className="text-xs text-red-700 mt-1">
                          Maximum is 20 products per batch (you have {selectedForUpdate.size} selected). 
                          Please deselect some products to avoid timeouts.
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={selectAllBulkProducts}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        Select All Changed
                      </Button>
                      <Button
                        onClick={deselectAllBulkProducts}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        Deselect All
                      </Button>
                      <Button
                        onClick={updateSelectedProducts}
                        disabled={isBulkUpdating || selectedForUpdate.size === 0 || selectedForUpdate.size > 20}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50"
                      >
                        {isBulkUpdating ? (
                          <>
                            <RefreshCw className="size-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="size-4 mr-2" />
                            Update {selectedForUpdate.size} Product(s)
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* ✅ Batch Progress Indicator */}
                  {isBulkUpdating && (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <RefreshCw className="size-5 text-blue-600 animate-spin" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-blue-900">
                            Updating products in batches...
                          </p>
                          <p className="text-xs text-blue-700">
                            Processing {selectedForUpdate.size} product(s) in batches of 10
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-3 transition-all duration-500 ease-out"
                          style={{ width: '100%' }}
                        >
                          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-blue-700 animate-pulse" />
                        </div>
                      </div>
                      
                      <p className="text-xs text-blue-600 mt-2 text-center font-medium">
                        Please wait while we update your products...
                      </p>
                    </div>
                  )}

                  {/* Products Table */}
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-700 text-white">
                          <tr>
                            <th className="p-2 text-left w-12">Select</th>
                            <th className="p-2 text-left">Code</th>
                            <th className="p-2 text-left">Name</th>
                            <th className="p-2 text-right">DB Cost</th>
                            <th className="p-2 text-right">Uropa Cost</th>
                            <th className="p-2 text-right">Difference</th>
                            <th className="p-2 text-right">Old Selling</th>
                            <th className="p-2 text-right">New Selling</th>
                            <th className="p-2 text-center">Tier</th>
                            <th className="p-2 text-center">Desc</th>
                            <th className="p-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkResults.results.map((result: any, idx: number) => (
                            <tr 
                              key={result.productCode || idx} 
                              className={`border-t ${result.priceChanged ? 'bg-amber-50' : 'bg-white'} hover:bg-blue-50`}
                            >
                              <td className="p-2 text-center">
                                {result.priceChanged && (
                                  <input
                                    type="checkbox"
                                    checked={selectedForUpdate.has(result.productCode)}
                                    onChange={() => toggleProductSelection(result.productCode)}
                                    className="size-4"
                                  />
                                )}
                              </td>
                              <td className="p-2 font-mono text-xs">{result.productCode}</td>
                              <td className="p-2 text-xs">{result.productName || 'N/A'}</td>
                              <td className="p-2 text-right font-bold text-green-700">
                                ${result.dbTradePrice?.toFixed(2) || '0.00'}
                              </td>
                              <td className="p-2 text-right font-bold text-blue-700">
                                ${result.uropaSellingPrice?.toFixed(2) || '0.00'}
                              </td>
                              <td className={`p-2 text-right font-bold ${
                                result.difference > 0 ? 'text-red-600' : 
                                result.difference < 0 ? 'text-green-600' : 
                                'text-gray-600'
                              }`}>
                                {result.difference > 0 ? '+' : ''}${result.difference?.toFixed(2) || '0.00'}
                              </td>
                              <td className="p-2 text-right text-gray-700">
                                ${result.dbYourSellingPrice?.toFixed(2) || '0.00'}
                              </td>
                              <td className="p-2 text-right font-bold text-purple-700">
                                ${result.newYourSellingPrice?.toFixed(2) || '0.00'}
                              </td>
                              <td className="p-2 text-center text-xs">
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                  {(typeof result.newMarkupPercent === 'number' ? result.newMarkupPercent : parseFloat(result.newMarkupPercent) || 0).toFixed(0)}%
                                </span>
                              </td>
                              <td className="p-2 text-center">
                                {result.descriptionChanged ? (
                                  <span className="text-xs bg-blue-200 text-blue-900 px-2 py-1 rounded font-bold" title="Description will be updated">
                                    📝 YES
                                  </span>
                                ) : (
                                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded" title="Description unchanged">
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {result.priceChanged ? (
                                  <span className="text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded font-bold">
                                    CHANGED
                                  </span>
                                ) : (
                                  <span className="text-xs bg-green-200 text-green-900 px-2 py-1 rounded">
                                    OK
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Formula Reference */}
                  <div className="bg-blue-50 border border-blue-300 rounded p-3 text-xs">
                    <p className="font-bold text-blue-900 mb-1">💰 Formula Used:</p>
                    <p className="text-gray-800 font-mono">
                      Selling Price = Uropa Cost × (1 + Markup %)
                    </p>
                    <p className="text-gray-600 mt-1">
                      Markup % based on pricing tiers (50%, 45%, 40%, 30%, 20%, 15%, 12%)
                    </p>
                  </div>
                </>
              ) : (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <p className="font-bold text-red-800">❌ Query Failed</p>
                  <p className="text-red-700 text-sm mt-1">{bulkResults.error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ NEW: Product Browser - Easy Selection */}
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <Package className="size-5" />
            📦 Browse & Select Products
          </CardTitle>
          <CardDescription className="text-gray-700">
            Browse all products with instant search and filter. Select products and click "🚀 Query Selected" for direct querying, or "Add to Textarea" for manual editing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ✅ Selection Status Banner */}
          {selectedBrowserProducts.size > 0 ? (
            <div className="p-3 bg-gradient-to-r from-purple-100 to-orange-100 border-2 border-purple-400 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-5 text-purple-700" />
                  <span className="font-bold text-purple-900">
                    {selectedBrowserProducts.size} product{selectedBrowserProducts.size !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={querySelectedBrowserProducts}
                    disabled={isBulkQuerying || selectedBrowserProducts.size > 50}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {isBulkQuerying ? (
                      <>
                        <RefreshCw className="size-3 mr-1 animate-spin" />
                        Querying...
                      </>
                    ) : (
                      <>
                        <Search className="size-3 mr-1" />
                        🚀 Query Now
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={clearAllSelections}
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              {selectedBrowserProducts.size > 50 ? (
                <p className="text-xs text-red-700 font-bold mt-2">
                  ⚠️ Too many products selected! Maximum is 50. Please reduce your selection.
                </p>
              ) : null}
            </div>
          ) : null}
          
          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label htmlFor="browserSearch">Search by Name or Code (Instant)</Label>
              <Input
                id="browserSearch"
                placeholder="Type to search instantly..."
                value={browserSearch}
                onChange={(e) => {
                  setBrowserSearch(e.target.value);
                  setCurrentPage(1); // Reset to page 1 on search
                }}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="browserBrand">Filter by Brand (Instant)</Label>
              <select
                id="browserBrand"
                value={browserBrand}
                onChange={(e) => {
                  setBrowserBrand(e.target.value);
                  setCurrentPage(1); // Reset to page 1 on filter
                }}
                className="w-full p-2 border-2 border-gray-300 rounded-md text-sm"
              >
                <option value="">All Brands</option>
                {browserBrands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
          </div>

          {allProducts.length === 0 ? (
            <Button
              onClick={fetchBrowserProducts}
              disabled={browserLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {browserLoading ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Loading All Products...
                </>
              ) : (
                <>
                  <Package className="size-4 mr-2" />
                  Load All Products
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2 bg-green-100 border border-green-300 rounded p-2">
              <CheckCircle className="size-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                ✅ {allProducts.length} products loaded - Navigation & Filtering is INSTANT!
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            {browserProducts.length > 0 && (
              <>
                <Button
                  onClick={selectAllBrowserProducts}
                  variant="outline"
                  size="sm"
                >
                  Select All on Page ({browserProducts.length})
                </Button>
                <Button
                  onClick={deselectAllBrowserProducts}
                  variant="outline"
                  size="sm"
                >
                  Deselect Page
                </Button>
                <Button
                  onClick={clearAllSelections}
                  variant="outline"
                  size="sm"
                >
                  Clear All ({selectedBrowserProducts.size})
                </Button>
                
                {/* ✅ NEW: Direct Query Button - Bypass textarea! */}
                <Button
                  onClick={querySelectedBrowserProducts}
                  disabled={selectedBrowserProducts.size === 0 || isBulkQuerying}
                  className="bg-orange-600 hover:bg-orange-700 text-white ml-auto"
                >
                  {isBulkQuerying ? (
                    <>
                      <RefreshCw className="size-4 mr-2 animate-spin" />
                      Querying...
                    </>
                  ) : (
                    <>
                      <Search className="size-4 mr-2" />
                      🚀 Query Selected ({selectedBrowserProducts.size})
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={addSelectedToBulkQuery}
                  disabled={selectedBrowserProducts.size === 0}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="size-4 mr-2" />
                  Add to Textarea
                </Button>
              </>
            )}
          </div>

          {/* Pagination Info */}
          {allProducts.length > 0 && (
            <div className="flex items-center justify-between bg-gray-100 border border-gray-300 rounded-lg p-3">
              <div className="text-sm text-gray-700">
                Showing <span className="font-bold">{browserProducts.length}</span> of{' '}
                <span className="font-bold">{allProducts.length}</span> products
                {(browserSearch || browserBrand) && (
                  <span className="ml-2 text-blue-700 font-medium">
                    (filtered)
                  </span>
                )}
                {selectedBrowserProducts.size > 0 && (
                  <span className="ml-2 text-purple-700 font-bold">
                    • {selectedBrowserProducts.size} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <span className="text-sm font-medium px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Products Table */}
          {browserProducts.length > 0 && (
            <div className="space-y-3">
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-green-700 text-white sticky top-0">
                      <tr>
                        <th className="p-2 text-left w-12">
                          <input
                            type="checkbox"
                            checked={selectedBrowserProducts.size === browserProducts.length && browserProducts.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                selectAllBrowserProducts();
                              } else {
                                deselectAllBrowserProducts();
                              }
                            }}
                            className="size-4"
                          />
                        </th>
                        <th className="p-2 text-left">Code</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Brand</th>
                        <th className="p-2 text-right">Cost</th>
                        <th className="p-2 text-right">Selling Price</th>
                        <th className="p-2 text-center">Markup %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {browserProducts.map((product, idx) => (
                        <tr 
                          key={product.code || idx}
                          className={`border-t ${selectedBrowserProducts.has(product.code) ? 'bg-green-100' : 'bg-white'} hover:bg-blue-50 cursor-pointer`}
                          onClick={() => toggleBrowserProductSelection(product.code)}
                        >
                          <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedBrowserProducts.has(product.code)}
                              onChange={() => toggleBrowserProductSelection(product.code)}
                              className="size-4"
                            />
                          </td>
                          <td className="p-2 font-mono text-xs">{product.code}</td>
                          <td className="p-2 text-xs">{product.name || 'N/A'}</td>
                          <td className="p-2 text-xs">{product.brand || 'N/A'}</td>
                          <td className="p-2 text-right font-bold text-green-700">
                            ${product.cost?.toFixed(2) || '0.00'}
                          </td>
                          <td className="p-2 text-right font-bold text-blue-700">
                            ${product.sellingPrice?.toFixed(2) || '0.00'}
                          </td>
                          <td className="p-2 text-center">
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                              {(typeof product.markupPercent === 'number' ? product.markupPercent : parseFloat(product.markupPercent) || 0).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-300 rounded p-3 text-xs">
                <p className="font-bold text-blue-900 mb-1">💡 How to use:</p>
                <ul className="space-y-1 ml-4 list-disc text-gray-700">
                  <li>Click checkboxes or rows to select products</li>
                  <li>Use search and brand filter to find specific products</li>
                  <li>Click "Add X to Bulk Query" to add selected products</li>
                  <li>Scroll down to "Bulk Query" section to query and update prices</li>
                </ul>
              </div>
            </div>
          )}

          {browserLoading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="size-8 animate-spin text-green-600" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {comparisons.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Search className="size-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Price Increased</p>
                  <p className="text-2xl font-bold text-red-600">{stats.increased}</p>
                </div>
                <TrendingUp className="size-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Price Decreased</p>
                  <p className="text-2xl font-bold text-green-600">{stats.decreased}</p>
                </div>
                <TrendingDown className="size-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">No Change</p>
                  <p className="text-2xl font-bold text-slate-600">{stats.unchanged}</p>
                </div>
                <Minus className="size-8 text-slate-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparison Results */}
      {comparisons.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Price Comparison Results</CardTitle>
                <CardDescription>
                  {selectedCount} of {comparisons.length} products selected for update
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All Changed
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
                <Button 
                  onClick={handleUpdatePrices} 
                  disabled={isUpdating || selectedCount === 0}
                  className="bg-[#E31837] hover:bg-[#E31837]/90"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="size-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="size-4 mr-2" />
                      Update {selectedCount} Products
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-semibold">
                      <input 
                        type="checkbox" 
                        checked={selectedCount === comparisons.filter(c => Math.abs(c.priceDifference) > 0.01).length && comparisons.some(c => Math.abs(c.priceDifference) > 0.01)}
                        onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                        className="size-4"
                      />
                    </th>
                    <th className="text-left p-3 text-sm font-semibold">SKU</th>
                    <th className="text-left p-3 text-sm font-semibold">Code</th>
                    <th className="text-left p-3 text-sm font-semibold">Product Name</th>
                    <th className="text-right p-3 text-sm font-semibold" title="Your current trade price (cost) stored in database">
                      DB Trade Price 💰
                    </th>
                    <th className="text-right p-3 text-sm font-semibold" title="Uropa's current selling price (your cost from supplier)">
                      Uropa Selling 🌐
                    </th>
                    <th className="text-right p-3 text-sm font-semibold" title="Difference between Uropa and your database">
                      Cost Change 📊
                    </th>
                    <th className="text-right p-3 text-sm font-semibold" title="Your current selling price to customers">
                      Your Selling (Current) 💵
                    </th>
                    <th className="text-right p-3 text-sm font-semibold" title="Your new selling price if you update the cost">
                      Your Selling (New) 🆕
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((comparison) => {
                    const hasChange = Math.abs(comparison.priceDifference) > 0.01;
                    const isIncrease = comparison.priceDifference > 0;
                    
                    return (
                      <tr 
                        key={comparison.productId} 
                        className={`border-b hover:bg-slate-50 ${hasChange ? 'bg-yellow-50/50' : ''}`}
                      >
                        <td className="p-3">
                          <input 
                            type="checkbox" 
                            checked={selectedComparisons.has(comparison.productId)}
                            onChange={() => toggleSelection(comparison.productId)}
                            disabled={!hasChange}
                            className="size-4"
                          />
                        </td>
                        <td className="p-3 text-sm font-mono">{comparison.sku}</td>
                        <td className="p-3 text-sm font-mono text-blue-600">{comparison.productCode}</td>
                        <td className="p-3 text-sm max-w-xs truncate">{comparison.name}</td>
                        <td className="p-3 text-sm text-right font-medium">
                          ${comparison.currentCostPrice.toFixed(2)}
                        </td>
                        <td className="p-3 text-sm text-right font-medium">
                          ${comparison.uropaCostPrice.toFixed(2)}
                        </td>
                        <td className="p-3 text-sm text-right">
                          {hasChange ? (
                            <div className="flex items-center justify-end gap-1">
                              {isIncrease ? (
                                <TrendingUp className="size-4 text-red-600" />
                              ) : (
                                <TrendingDown className="size-4 text-green-600" />
                              )}
                              <span className={isIncrease ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                                ${Math.abs(comparison.priceDifference).toFixed(2)}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                ({comparison.percentageChange > 0 ? '+' : ''}{comparison.percentageChange.toFixed(1)}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">No change</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-right font-medium text-slate-600">
                          ${comparison.currentSellingPrice.toFixed(2)}
                        </td>
                        <td className="p-3 text-sm text-right">
                          <span className={hasChange ? 'font-bold text-[#E31837]' : 'text-slate-600'}>
                            ${comparison.newSellingPrice.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}