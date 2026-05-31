import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Play, Settings, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ArrowLeft, Key } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { useNavigate } from 'react-router';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface SyncLog {
  timestamp: string;
  totalProducts: number;
  productsChecked: number;
  pricesChanged: number;
  pricesUpdated: number;
  errors: number;
  duration: number;
  status: 'success' | 'partial' | 'error';
  errorDetails?: string[];
  changes?: Array<{
    productId: string;
    productName: string;
    productCode: string;
    oldCost: number;
    newCost: number;
    oldPrice: number;
    newPrice: number;
    priceChange: number;
    priceChangePercent: number;
  }>;
}

interface SyncStatus {
  lastRun: {
    timestamp: string;
    status: string;
    pricesChanged: number;
    errors: number;
  } | null;
  config: {
    enabled: boolean;
    schedule: string;
    time: string;
  };
}

export default function PriceSyncManager() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [testCodes, setTestCodes] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'test'>('overview');
  const [debugInfo, setDebugInfo] = useState<any>(null); // ✅ NEW: Debug info
  const [tokenStatus, setTokenStatus] = useState<'checking' | 'valid' | 'invalid' | 'missing'>('checking');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [brandFilter, setBrandFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [uniqueBrands, setUniqueBrands] = useState<string[]>([]);

  // Fetch sync status
  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/price-sync/status`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await response.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  // Fetch sync logs
  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/price-sync/logs?limit=10`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();
    checkTokenStatus(); // ✅ Check token on load
  }, []);

  // ✅ NEW: Check Uropa API token status
  const checkTokenStatus = async () => {
    try {
      // Just try to fetch status - if token is invalid, backend will tell us
      const response = await fetch(`${API_URL}/price-sync/status`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      const data = await response.json();
      
      if (data.error && data.error.includes('token')) {
        setTokenStatus('missing');
      } else {
        setTokenStatus('valid');
      }
    } catch (error) {
      setTokenStatus('invalid');
    }
  };

  // ✅ NEW: Test Uropa API connection
  const testApiConnection = async () => {
    setIsRunning(true);
    toast.info('Testing Uropa API connection...');
    
    try {
      const response = await fetch(`${API_URL}/price-sync/test-api`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`✅ API connection successful! Test product: ${data.testProductCode}`);
        console.log('API Test Result:', data);
      } else {
        toast.error(`❌ API connection failed: ${data.error}`);
        console.error('API Test Error:', data);
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // ✅ NEW: Clear saved headers/token from KV storage (forces use of environment variable)
  const clearSavedCredentials = async () => {
    if (!confirm('This will clear saved headers and token from the database. The system will use the environment variable token instead. Continue?')) {
      return;
    }
    
    setIsRunning(true);
    toast.info('Clearing saved credentials...');
    
    try {
      const response = await fetch(`${API_URL}/price-sync/clear-credentials`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('✅ Saved credentials cleared! System will now use environment variable.');
        await checkTokenStatus();
      } else {
        toast.error(`❌ Failed: ${data.error}`);
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // ✅ NEW: Debug token sources
  const debugTokens = async () => {
    setIsRunning(true);
    toast.info('Checking token sources...');
    
    try {
      const response = await fetch(`${API_URL}/price-sync/debug-tokens`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      const data = await response.json();

      if (data.success) {
        toast.success('✅ Token info retrieved');
        alert(JSON.stringify(data.tokens, null, 2));
      } else {
        toast.error(`❌ Failed: ${data.error}`);
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // ✅ NEW: Debug product structure
  const debugProducts = async () => {
    setIsRunning(true);
    toast.info('Checking product structure in database...');
    
    try {
      const response = await fetch(`${API_URL}/price-sync/debug`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      const data = await response.json();

      if (data.success) {
        toast.success(`✅ Found ${data.totalProducts} products!`);
        
        // Show in alert for easy viewing
        const summary = data.sampleProducts.map((p: any) => 
          `Code: ${p.code}\nName: ${p.name}\nPrice: ${p.price}\nBase Cost: ${p.baseCost}\nCost Price: ${p.costPrice}\n---`
        ).join('\n');
        
        alert(`📦 Sample Products (first 5):\n\n${summary}\n\nTotal products: ${data.totalProducts}\n\nFull details in console (F12)`);
      } else {
        toast.error(`❌ Failed: ${data.error}`);
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Run price sync
  const handleRunSync = async () => {
    setIsRunning(true);
    toast.info('Starting price synchronization...');
    
    try {
      const response = await fetch(`${API_URL}/price-sync/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Price sync complete! Updated ${data.log.pricesUpdated} products in ${(data.log.duration / 1000).toFixed(1)}s`);
        fetchStatus();
        fetchLogs();
      } else {
        toast.error(`Price sync failed: ${data.error}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Test sync with sample products - NOW AUTO-UPDATES!
  const handleTestSync = async () => {
    const codes = testCodes.split(',').map(c => c.trim()).filter(Boolean);
    
    if (codes.length === 0) {
      toast.error('Please enter at least one product code');
      return;
    }

    setIsRunning(true);
    setTestResults(null); // Clear previous results
    toast.info(`Checking ${codes.length} products and auto-updating changes...`);
    
    try {
      // 🔥 NEW: Call test-and-update endpoint (checks Uropa + auto-updates)
      const response = await fetch(`${API_URL}/price-sync/test-and-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productCodes: codes })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTestResults(data);
        
        if (data.summary.pricesUpdated > 0) {
          toast.success(`✅ Updated ${data.summary.pricesUpdated} of ${data.summary.total} products!`);
        } else {
          toast.success(`✅ All ${data.summary.total} products are up to date!`);
        }
      } else {
        toast.error(`Failed: ${data.error}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ✅ NEW: Manual cost update for testing
  const handleManualCostUpdate = async (productCode: string, newCost: number) => {
    if (!confirm(`Change cost for ${productCode} to $${newCost.toFixed(2)}?`)) {
      return;
    }

    try {
      console.log(`📝 [Manual Update] Calling API for ${productCode} with cost $${newCost}`);
      
      const response = await fetch(`${API_URL}/price-sync/manual-update-cost`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productCode, newCost })
      });
      
      console.log(`📝 [Manual Update] Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`📝 [Manual Update] Error response:`, errorText);
        toast.error(`❌ Failed: HTTP ${response.status} - ${errorText.substring(0, 100)}`);
        return;
      }
      
      const data = await response.json();
      console.log(`📝 [Manual Update] Response data:`, data);
      
      if (data.success) {
        toast.success(`✅ ${productCode} cost updated: $${data.product.oldCost.toFixed(2)} → $${data.product.newCost.toFixed(2)}`);
        
        // Show updated field details in console
        console.log('📝 Updated fields:', data.product.updatedFields);
        
        // Refresh test to show new values
        if (testCodes.includes(productCode)) {
          handleTestSync();
        }
      } else {
        toast.error(`❌ Failed: ${data.error}`);
      }
    } catch (error: any) {
      console.error('📝 [Manual Update] Exception:', error);
      toast.error(`❌ Error: ${error.message}`);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // ✅ NEW: Fetch all products
  const fetchAllProducts = async () => {
    setLoadingProducts(true);
    toast.info('Fetching products...');
    
    try {
      // Fetch with a high limit to get all products
      const response = await fetch(`${API_URL}/price-sync/list-products?limit=999999`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAllProducts(data.products);
        setTotalProducts(data.pagination?.total || data.products.length);
        setUniqueBrands(data.brands || Array.from(new Set(data.products.map(p => p.brand))));
        toast.success(`✅ Loaded ${data.pagination?.total || data.products.length} products`);
      } else {
        toast.error(`Failed to fetch products: ${data.error}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoadingProducts(false);
    }
  };

  // ✅ NEW: Add selected products to test
  const addSelectedToTest = () => {
    const codes = Array.from(selectedProducts);
    setTestCodes(codes.join(', '));
    setSelectedProducts(new Set());
  };

  // ✅ NEW: Toggle product selection
  const toggleProduct = (code: string) => {
    const newSet = new Set(selectedProducts);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    setSelectedProducts(newSet);
  };

  // ✅ NEW: Filter products
  const filteredProducts = allProducts
    .filter(p => p.code.toLowerCase().includes(searchQuery.toLowerCase()) || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(p => brandFilter ? p.brand === brandFilter : true);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <RefreshCw className="w-7 h-7" />
                  Price Synchronization
                </h1>
                <p className="text-slate-300 text-sm mt-1">
                  Automatically sync prices from Uropa API and recalculate with tier pricing
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/uropa-token-auth')}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all shadow-lg"
              >
                <Key className="w-5 h-5" />
                Update Token
              </button>
              
              <button
                onClick={handleRunSync}
                disabled={isRunning}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-all shadow-lg"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Run Sync Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'history'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Sync History
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'test'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Daily Price Check
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Last Sync */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-6 h-6 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Last Sync</h3>
                </div>
                {status?.lastRun ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{formatDate(status.lastRun.timestamp)}</p>
                    <div className={`inline-flex items-center gap-1 text-sm font-medium ${
                      status.lastRun.status === 'success' ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {status.lastRun.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {status.lastRun.status}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No sync runs yet</p>
                )}
              </div>

              {/* Prices Changed */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <RefreshCw className="w-6 h-6 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Last Changes</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {status?.lastRun?.pricesChanged || 0}
                </p>
                <p className="text-sm text-gray-600">products updated</p>
              </div>

              {/* Errors */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <h3 className="font-semibold text-gray-900">Errors</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {status?.lastRun?.errors || 0}
                </p>
                <p className="text-sm text-gray-600">in last sync</p>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Settings className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">How Price Sync Works</h3>
                  <ol className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 mt-0.5">1.</span>
                      <span>Fetches all products from your database</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 mt-0.5">2.</span>
                      <span>Compares each product's cost price with the current Uropa API price</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 mt-0.5">3.</span>
                      <span>If price changed, recalculates selling price using your tier pricing formulas (50% for items under $50 down to 12% for items over $5,000)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 mt-0.5">4.</span>
                      <span>Updates the database with new cost and calculated selling prices</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600 mt-0.5">5.</span>
                      <span>Applies 15% minimum margin floor to all products</span>
                    </li>
                  </ol>
                  <div className="mt-4 p-3 bg-white rounded border border-blue-200">
                    <p className="text-sm text-gray-700">
                      <strong>💡 Daily Workflow:</strong> Go to "Daily Price Check" tab → Enter product codes → Click "Check & Update Prices" → Done! Prices auto-update instantly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Recent Sync Runs</h3>
              </div>
              
              {logs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No sync history yet. Run your first sync to see results here.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {logs.map((log, index) => {
                    const logId = `log-${index}`;
                    const isExpanded = expandedLogId === logId;
                    
                    return (
                      <div key={logId} className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${
                              log.status === 'success' ? 'bg-green-100' :
                              log.status === 'partial' ? 'bg-orange-100' : 'bg-red-100'
                            }`}>
                              {log.status === 'success' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-orange-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{formatDate(log.timestamp)}</p>
                              <p className="text-sm text-gray-600">
                                {log.pricesUpdated} of {log.productsChecked} products updated • {formatDuration(log.duration)}
                              </p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : logId)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-3">
                          <div className="text-sm">
                            <span className="text-gray-600">Checked:</span>
                            <span className="ml-2 font-semibold text-gray-900">{log.productsChecked}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Changed:</span>
                            <span className="ml-2 font-semibold text-green-600">{log.pricesChanged}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Errors:</span>
                            <span className="ml-2 font-semibold text-red-600">{log.errors}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Duration:</span>
                            <span className="ml-2 font-semibold text-gray-900">{formatDuration(log.duration)}</span>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && log.changes && log.changes.length > 0 && (
                          <div className="mt-4 border-t border-gray-200 pt-4">
                            <h4 className="font-semibold text-gray-900 mb-3">Price Changes ({log.changes.length})</h4>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {log.changes.map((change, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="font-medium text-gray-900">{change.productName}</p>
                                      <p className="text-gray-600">Code: {change.productCode}</p>
                                    </div>
                                    <div className={`flex items-center gap-1 font-semibold ${
                                      change.priceChange > 0 ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                      {change.priceChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                      {change.priceChangePercent > 0 ? '+' : ''}{change.priceChangePercent.toFixed(1)}%
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div>
                                      <span className="text-gray-600">Cost: </span>
                                      <span className="line-through text-gray-500">${change.oldCost.toFixed(2)}</span>
                                      <span className="ml-2 font-medium text-gray-900">${change.newCost.toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Sell: </span>
                                      <span className="line-through text-gray-500">${change.oldPrice.toFixed(2)}</span>
                                      <span className="ml-2 font-medium text-red-600">${change.newPrice.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Errors */}
                        {isExpanded && log.errorDetails && log.errorDetails.length > 0 && (
                          <div className="mt-4 border-t border-gray-200 pt-4">
                            <h4 className="font-semibold text-red-600 mb-2">Errors ({log.errorDetails.length})</h4>
                            <div className="bg-red-50 rounded-lg p-3">
                              <ul className="space-y-1 text-sm text-red-700">
                                {log.errorDetails.slice(0, 10).map((error, idx) => (
                                  <li key={idx}>• {error}</li>
                                ))}
                                {log.errorDetails.length > 10 && (
                                  <li className="text-red-600 font-medium">+ {log.errorDetails.length - 10} more errors</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Test Tab */}
        {activeTab === 'test' && (
          <div className="space-y-6">
            {/* Product Browser */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Product Browser</h3>
                  <p className="text-sm text-gray-600">
                    Browse all products and select ones to test
                  </p>
                </div>
                {!loadingProducts && allProducts.length === 0 && (
                  <button
                    onClick={fetchAllProducts}
                    disabled={loadingProducts}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Load Products
                  </button>
                )}
              </div>

              {loadingProducts && (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-gray-600">Loading products...</p>
                </div>
              )}

              {allProducts.length > 0 && (
                <>
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        placeholder="Search by code or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Brands ({allProducts.length})</option>
                      {uniqueBrands.map(brand => (
                        <option key={brand} value={brand}>
                          {brand} ({allProducts.filter(p => p.brand === brand).length})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Action Bar */}
                  {selectedProducts.size > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-700">
                          <strong>{selectedProducts.size}</strong> products selected
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={addSelectedToTest}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-sm"
                          >
                            Add to Test
                          </button>
                          <button
                            onClick={() => setSelectedProducts(new Set())}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors text-sm"
                          >
                            Clear Selection
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Product Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                              <input
                                type="checkbox"
                                checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.has(p.code))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedProducts(new Set([...selectedProducts, ...filteredProducts.map(p => p.code)]));
                                  } else {
                                    const newSet = new Set(selectedProducts);
                                    filteredProducts.forEach(p => newSet.delete(p.code));
                                    setSelectedProducts(newSet);
                                  }
                                }}
                                className="rounded"
                              />
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Code</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Brand</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase">Cost</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase">Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredProducts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                No products found matching your filters
                              </td>
                            </tr>
                          ) : (
                            filteredProducts.slice(0, 100).map((product) => (
                              <tr
                                key={product.code}
                                className={`hover:bg-gray-50 cursor-pointer ${
                                  selectedProducts.has(product.code) ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => toggleProduct(product.code)}
                              >
                                <td className="px-4 py-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedProducts.has(product.code)}
                                    onChange={() => {}}
                                    className="rounded"
                                  />
                                </td>
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{product.code}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{product.name}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{product.brand}</td>
                                <td className="px-4 py-2 text-sm text-right text-gray-900">${product.cost.toFixed(2)}</td>
                                <td className="px-4 py-2 text-sm text-right text-red-600 font-medium">${product.price.toFixed(2)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                      {filteredProducts.length > 100 && (
                        <div className="p-4 bg-gray-50 text-center text-sm text-gray-600">
                          Showing first 100 of {filteredProducts.length} products. Use filters to narrow down results.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Manual Test Input */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Check & Update Prices</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Enter product codes (comma-separated). System will check Uropa API and automatically update any price changes.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={testApiConnection}
                    disabled={isRunning}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors text-sm"
                  >
                    🔌 Test API
                  </button>
                  <button
                    onClick={debugProducts}
                    disabled={isRunning}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors text-sm"
                  >
                    🔍 Debug Products
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Codes
                </label>
                <textarea
                  value={testCodes}
                  onChange={(e) => setTestCodes(e.target.value)}
                  placeholder="e.g., DL925, DP269, CB536"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <button
                onClick={handleTestSync}
                disabled={isRunning || !testCodes.trim()}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                {isRunning ? 'Checking & Updating...' : '⚡ Check & Update Prices'}
              </button>
            </div>

            {/* Test Results */}
            {testResults && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Results</h3>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Checked</p>
                    <p className="text-2xl font-bold text-gray-900">{testResults.summary.total}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Auto-Updated</p>
                    <p className="text-2xl font-bold text-green-600">{testResults.summary.pricesUpdated || testResults.summary.pricesChanged || 0}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Errors</p>
                    <p className="text-2xl font-bold text-red-600">{testResults.summary.errors}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {testResults.results.map((result: any, idx: number) => (
                    <div key={idx} className={`rounded-lg border-2 p-5 ${
                      result.status === 'success' ? (result.priceChanged ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200') :
                      result.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-lg text-gray-900">{result.code}</p>
                          {result.status === 'success' && (
                            <p className="text-sm text-gray-600 mt-1">
                              Markup: {result.database.markup}% → {result.uropa.markup}%
                            </p>
                          )}
                        </div>
                        {result.priceChanged && (
                          <span className="px-3 py-1.5 bg-green-500 text-white text-sm font-bold rounded-lg shadow-sm">
                            ✅ UPDATED
                          </span>
                        )}
                        {!result.priceChanged && result.status === 'success' && (
                          <span className="px-3 py-1.5 bg-gray-500 text-white text-sm font-bold rounded-lg shadow-sm">
                            ➖ NO CHANGE
                          </span>
                        )}
                      </div>

                      {result.status === 'success' && (
                        <div className="space-y-3">
                          {/* Comparison Table */}
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Source</th>
                                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Cost Price</th>
                                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Selling Price</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-3 font-medium text-gray-900">💾 Database (Current)</td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="font-mono font-bold text-blue-600">
                                      ${result.database.cost.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="font-mono font-bold text-red-600">
                                      ${result.database.sellingPrice.toFixed(2)}
                                    </span>
                                  </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-4 py-3 font-medium text-gray-900">🌐 Uropa API (Live)</td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="font-mono font-bold text-blue-600">
                                      ${result.uropa.cost.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="font-mono font-bold text-red-600">
                                      ${result.uropa.sellingPrice.toFixed(2)}
                                    </span>
                                  </td>
                                </tr>
                                {result.priceChanged && (
                                  <tr className="bg-green-50 font-bold">
                                    <td className="px-4 py-3 text-gray-900">📊 Difference</td>
                                    <td className="px-4 py-3 text-right">
                                      <span className={`font-mono ${result.difference.cost > 0 ? 'text-red-600' : result.difference.cost < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                        {result.difference.cost > 0 ? '+' : ''}{result.difference.cost.toFixed(2)}
                                        {' '}
                                        ({result.difference.cost > 0 ? '+' : ''}{result.difference.costPercent.toFixed(1)}%)
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <span className={`font-mono ${result.difference.sellingPrice > 0 ? 'text-red-600' : result.difference.sellingPrice < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                        {result.difference.sellingPrice > 0 ? '+' : ''}${result.difference.sellingPrice.toFixed(2)}
                                      </span>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* What Happened */}
                          {result.priceChanged ? (
                            <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                              <p className="font-semibold text-green-900 text-sm mb-1">✅ Auto-Updated:</p>
                              <p className="text-sm text-green-800">
                                Supplier cost changed from <strong>${result.database.cost.toFixed(2)}</strong> to <strong>${result.uropa.cost.toFixed(2)}</strong>.
                                {' '}Selling price automatically updated from <strong>${result.database.sellingPrice.toFixed(2)}</strong> to <strong>${result.uropa.sellingPrice.toFixed(2)}</strong>
                                {' '}(change of <strong>{result.difference.sellingPrice > 0 ? '+' : ''}${result.difference.sellingPrice.toFixed(2)}</strong>).
                              </p>
                            </div>
                          ) : (
                            <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
                              <p className="font-semibold text-gray-900 text-sm mb-1">➖ Already Up-to-Date:</p>
                              <p className="text-sm text-gray-800">
                                Supplier cost is still <strong>${result.database.cost.toFixed(2)}</strong>. No update needed.
                              </p>
                            </div>
                          )}

                          {/* ✅ NEW: Manual Cost Update for Testing */}
                          <div className="bg-purple-50 border border-purple-300 rounded-lg p-3 mt-3">
                            <p className="font-semibold text-purple-900 text-sm mb-2">🧪 Test Price Change:</p>
                            <p className="text-xs text-purple-700 mb-2">
                              Manually update the database cost for <strong>{result.code}</strong> to test the sync system:
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const newCost = prompt(`Enter new cost for ${result.code}:`, result.database.cost.toFixed(2));
                                  if (newCost && !isNaN(parseFloat(newCost))) {
                                    handleManualCostUpdate(result.code, parseFloat(newCost));
                                  }
                                }}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded font-semibold transition-colors"
                              >
                                Set Custom Cost
                              </button>
                              <button
                                onClick={() => handleManualCostUpdate(result.code, result.database.cost * 1.10)}
                                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded font-semibold transition-colors"
                              >
                                +10% (${ (result.database.cost * 1.10).toFixed(2)})
                              </button>
                              <button
                                onClick={() => handleManualCostUpdate(result.code, result.database.cost * 0.90)}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-semibold transition-colors"
                              >
                                -10% (${(result.database.cost * 0.90).toFixed(2)})
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {result.status !== 'success' && (
                        <div className="bg-red-100 border border-red-200 rounded-lg p-3">
                          <p className="font-semibold text-red-900 text-sm">❌ Error:</p>
                          <p className="text-sm text-red-700">{result.error}</p>
                          {result.debug && (
                            <div className="mt-2 p-2 bg-white rounded text-xs">
                              <p className="font-semibold text-gray-700 mb-1">🔍 Debug Info:</p>
                              <p className="text-gray-600">Response has these keys: <span className="font-mono">{result.debug.responseKeys.join(', ')}</span></p>
                              
                              {/* Show priceDetail and priceRange if they exist */}
                              {result.debug.priceDetail && (
                                <div className="mt-2 p-2 bg-blue-50 rounded">
                                  <p className="font-semibold text-blue-900">priceDetail object:</p>
                                  <pre className="text-xs text-blue-800 mt-1">{JSON.stringify(result.debug.priceDetail, null, 2)}</pre>
                                </div>
                              )}
                              {result.debug.priceRange && (
                                <div className="mt-2 p-2 bg-purple-50 rounded">
                                  <p className="font-semibold text-purple-900">priceRange object:</p>
                                  <pre className="text-xs text-purple-800 mt-1">{JSON.stringify(result.debug.priceRange, null, 2)}</pre>
                                </div>
                              )}
                              
                              <details className="mt-1">
                                <summary className="cursor-pointer text-blue-600 hover:underline">View raw response</summary>
                                <pre className="mt-1 p-2 bg-gray-50 rounded overflow-x-auto text-xs">{result.debug.sampleData}</pre>
                              </details>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}