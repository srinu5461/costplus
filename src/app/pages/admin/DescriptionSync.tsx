import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { RefreshCw, FileText, CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight, Bug, X } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface Product {
  id: string;
  code: string;
  name: string;
  brand: string;
  hasDescription: boolean;
  hasSpecifications: boolean;
  ageRestricted: boolean;
  descriptionLength: number;
  specificationsCount: number;
  lastDescriptionSync: string | null;
}

export default function DescriptionSync() {
  // State management for description sync
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  
  // Debug modal state
  const [debugModalOpen, setDebugModalOpen] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  
  // Filters
  const [selectedBrand, setSelectedBrand] = useState('');
  const [skipWithDescription, setSkipWithDescription] = useState(true);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  
  // Client-side pagination (instant!)
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 50;

  // Fetch all available brands on mount
  const fetchBrands = async () => {
    setBrandsLoading(true);
    try {
      console.log('🔄 Fetching all brands...');
      
      const response = await fetch(`${API_URL}/description-sync/brands`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        // Check if it's a server error (502, 503, 504)
        if (response.status >= 502 && response.status <= 504) {
          throw new Error(`Server temporarily unavailable (${response.status}). Please wait a few minutes and try again.`);
        }
        throw new Error(`Failed to fetch brands: ${response.status}`);
      }

      const result = await response.json();

      setAvailableBrands(result.brands);
      console.log(`✅ Loaded ${result.brands.length} brands`);

    } catch (error) {
      console.error('❌ Error fetching brands:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a server availability issue
      if (errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('504') || errorMessage.includes('temporarily unavailable')) {
        alert('⚠️ Server Temporarily Unavailable\n\nThe database backend is down (502 Bad Gateway).\n\nPlease wait 2-5 minutes and refresh the page.\n\nIf the issue persists, the Supabase service may be experiencing an outage.');
      } else {
        alert(`Error loading brands: ${errorMessage}`);
      }
    } finally {
      setBrandsLoading(false);
    }
  };

  // Fetch products for selected brand
  const fetchProductsForBrand = async (brand: string) => {
    if (!brand) {
      setAllProducts([]);
      return;
    }

    setLoading(true);
    try {
      console.log(`🔄 Fetching products for brand: ${brand}...`);
      
      let allFetchedProducts: Product[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      const pageLimit = 1000; // Fetch 1000 at a time
      
      // Fetch products in chunks to avoid timeout
      while (hasMorePages) {
        console.log(`📥 Fetching page ${currentPage} for ${brand} (limit: ${pageLimit})...`);
        
        const response = await fetch(
          `${API_URL}/description-sync/products?brand=${encodeURIComponent(brand)}&page=${currentPage}&limit=${pageLimit}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (!response.ok) {
          // Check if it's a server error (502, 503, 504)
          if (response.status >= 502 && response.status <= 504) {
            throw new Error(`Server temporarily unavailable (${response.status}). The database backend is down. Please wait a few minutes and try again.`);
          }
          throw new Error(`Failed to fetch products page ${currentPage}: ${response.status}`);
        }

        const result = await response.json();
        
        // Add products to our collection
        allFetchedProducts = [...allFetchedProducts, ...result.products];
        
        console.log(`✅ Fetched page ${currentPage}: ${result.products.length} products (Total so far: ${allFetchedProducts.length})`);
        
        // Check if there are more pages
        hasMorePages = result.pagination.hasNextPage;
        currentPage++;
        
        // Safety limit to prevent infinite loops
        if (currentPage > 20) {
          console.warn('⚠️ Reached safety limit of 20 pages');
          break;
        }
      }
      
      setAllProducts(allFetchedProducts);
      console.log(`✅ Loaded ${allFetchedProducts.length} products for brand: ${brand}`);
      
    } catch (error) {
      console.error('❌ Error fetching products:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a server availability issue
      if (errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('504') || errorMessage.includes('temporarily unavailable')) {
        alert('⚠️ Server Temporarily Unavailable\n\nThe database backend is experiencing issues (502 Bad Gateway).\n\nThis is usually temporary. Please:\n1. Wait 2-5 minutes\n2. Try again\n3. If it persists, check Supabase status page');
      } else {
        alert(`Error loading products: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load brands on mount (ONCE!)
  useEffect(() => {
    fetchBrands();
  }, []);

  // Load products when brand changes
  useEffect(() => {
    if (selectedBrand) {
      fetchProductsForBrand(selectedBrand);
    } else {
      setAllProducts([]);
    }
  }, [selectedBrand]);

  // Apply filters client-side (instant!)
  useEffect(() => {
    let filtered = [...allProducts];
    
    // Filter by brand
    if (selectedBrand) {
      filtered = filtered.filter(p => p.brand === selectedBrand);
    }
    
    // Skip products with description
    if (skipWithDescription) {
      filtered = filtered.filter(p => !p.hasDescription);
    }
    
    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset to page 1 when filters change
    setSelectedProducts(new Set()); // Clear selection
    
    console.log(`🔍 Filtered to ${filtered.length} products (Brand: ${selectedBrand || 'All'}, Skip: ${skipWithDescription})`);
  }, [allProducts, selectedBrand, skipWithDescription]);

  // Get current page products (instant client-side pagination!)
  const totalPages = Math.ceil(filteredProducts.length / limit);
  const startIndex = (currentPage - 1) * limit;
  const endIndex = startIndex + limit;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Toggle product selection
  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  // Select all on current page
  const selectAll = () => {
    const newSelected = new Set(selectedProducts);
    currentProducts.forEach(p => newSelected.add(p.id));
    setSelectedProducts(newSelected);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  // Pagination controls (instant!)
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Run batch sync
  const runBatchSync = async () => {
    if (selectedProducts.size === 0) {
      alert('Please select at least one product');
      return;
    }

    if (!confirm(`Sync descriptions and specifications for ${selectedProducts.size} selected product(s)?`)) {
      return;
    }

    setSyncing(true);
    setSyncResults(null);

    try {
      // 🔥 Convert product IDs to product codes
      const productCodes = Array.from(selectedProducts).map(id => {
        const product = allProducts.find(p => p.id === id);
        return product?.code;
      }).filter(Boolean) as string[];
      
      console.log(`🔄 Starting batch sync for ${productCodes.length} products...`);
      
      const response = await fetch(`${API_URL}/description-sync/batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productCodes, // 🔥 Send codes instead of IDs
          skipWithDescription: false, // Already filtered on UI
          forceUpdate: true, // 🔥 ALWAYS update, ignore existing data
        }),
      });

      if (!response.ok) {
        throw new Error(`Batch sync failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Batch sync complete:', result);
      setSyncResults(result);

      if (result.success) {
        alert(`✅ Batch sync complete!

Descriptions: ${result.summary.descriptionsUpdated}
Specifications: ${result.summary.specificationsUpdated}
Age Restricted: ${result.summary.ageRestrictedUpdated}
Thumbnail Gallery: ${result.summary.imagesUpdated || 0}
Skipped: ${result.summary.skipped}
Errors: ${result.summary.errors}
Duration: ${(result.summary.duration / 1000).toFixed(1)}s

🔄 Reloading products from database...

ℹ️ Thumbnails are clickable in product detail pages to view in main image area.
⚠️ IMPORTANT: If you have any Product Detail pages open, please refresh them to see updates.`);
        
        // Clear selection
        setSelectedProducts(new Set());
        
        // 🔥 CRITICAL: Clear frontend localStorage cache so ProductDetail pages show fresh data
        if (result.cacheInvalidated) {
          localStorage.removeItem('cms_data_cache');
          localStorage.removeItem('cms_cache_timestamp');
        }

        // ✅ No need to reload products - they're already loaded!
        // Just clear selection and we're done
      } else {
        alert(`❌ Sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Batch sync error:', error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSyncing(false);
    }
  };

  // Debug modal actions
  const openDebugModal = () => {
    setDebugModalOpen(true);
  };

  const closeDebugModal = () => {
    setDebugModalOpen(false);
    setDebugData(null);
  };

  const fetchDebugData = async (type: 'token' | 'database' | 'compare' | 'uropa', code?: string) => {
    setDebugLoading(true);
    setDebugData(null);

    try {
      let url: string;
      let method: 'GET' | 'POST' = 'GET';
      let body: any = null;

      switch (type) {
        case 'token':
          url = `${API_URL}/description-sync/test-token`;
          break;
        case 'database':
          if (!code) throw new Error('Product code is required');
          const product = allProducts.find(p => p.code === code);
          if (!product) throw new Error('Product not found');
          url = `${API_URL}/description-sync/debug/${product.id}`;
          break;
        case 'compare':
          if (!code) throw new Error('Product code is required');
          url = `${API_URL}/description-sync/compare/${code}`;
          break;
        case 'uropa':
          if (!code) throw new Error('Product code is required');
          url = `${API_URL}/description-sync/test-uropa/${code}`;
          break;
        default:
          throw new Error('Invalid debug type');
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      if (!response.ok) {
        throw new Error(`Debug failed: ${response.status}`);
      }

      const result = await response.json();
      setDebugData(result);
      console.log('✅ Debug data:', result);
    } catch (error) {
      console.error('❌ Debug error:', error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDebugLoading(false);
    }
  };

  // 🔥 NEW: Debug sync single product
  const debugSyncSingleProduct = async (productCode: string) => {
    setDebugLoading(true);
    openDebugModal();

    try {
      console.log(`🐛 [DEBUG SYNC] Starting sync for ${productCode}...`);
      
      const response = await fetch(`${API_URL}/description-sync/single/${productCode}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sync failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ [DEBUG SYNC] Response:', result);
      
      setDebugData(result);
      
      // Reload product list
      if (selectedBrand) {
        await fetchProductsForBrand(selectedBrand);
      }
    } catch (error) {
      console.error('❌ Debug sync error:', error);
      setDebugData({
        error: true,
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setDebugLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Description & Features Sync</h1>
        <p className="text-gray-600">
          Sync product descriptions, specifications, age restrictions, and thumbnail gallery from Uropa API
        </p>
        <p className="text-sm text-blue-600 mt-1">
          ℹ️ Thumbnails are clickable in product detail pages to view in main image area
        </p>
      </div>

      {/* 🔥 DEBUG TOOLS */}
      <Card className="border-2 border-blue-500 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">🔍 Debug Tools</CardTitle>
          <CardDescription>
            Clear cache and debug image structure from Uropa API
          </CardDescription>
          <p className="text-xs text-orange-700 mt-2 font-medium">
            ⚠️ Getting "InvalidBearerTokenError"? Go to Admin &gt; Uropa API Token to update your token.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Button
              key="clear-cache"
              onClick={async () => {
                try {
                  // Clear browser cache
                  localStorage.clear();
                  sessionStorage.clear();
                  
                  // Clear server cache
                  await fetch(`${API_URL}/cms/data?force=true`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${publicAnonKey}` },
                  });
                  
                  alert('✅ Cache cleared! Reloading page...');
                  window.location.reload();
                } catch (error) {
                  alert(`Error: ${error}`);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Clear All Cache
            </Button>
            
            <Button
              key="check-database"
              onClick={async () => {
                const code = prompt('Enter product code to check (e.g., CB734):');
                if (!code) return;
                
                try {
                  // Find product ID
                  const product = allProducts.find(p => p.code === code);
                  if (!product) {
                    alert(`Product ${code} not found in list`);
                    return;
                  }
                  
                  // Fetch raw data from server
                  const response = await fetch(`${API_URL}/description-sync/debug/${product.id}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${publicAnonKey}` },
                  });
                  
                  if (!response.ok) {
                    throw new Error(`Failed: ${response.status}`);
                  }
                  
                  const result = await response.json();


                  // Show in alert
                  alert(`📊 Product: ${result.productName}\n\n` +
                    `Description: ${result.data.descriptionLength} chars\n` +
                    `Specifications: ${result.data.specificationsCount} items\n` +
                    `Age Restricted: ${result.data.ageRestricted}\n` +
                    `Last Sync: ${result.data.lastDescriptionSync || 'Never'}\n\n` +
                    `✅ Check console for full data`);
                } catch (error) {
                  alert(`Error: ${error}`);
                }
              }}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-100"
            >
              Check Database
            </Button>
            
            <Button
              key="compare-db-uropa"
              onClick={async () => {
                const code = prompt('Enter product code to compare (e.g., AE157):');
                if (!code) return;
                
                try {
                  // Fetch comparison using product code directly (not database ID)
                  const response = await fetch(`${API_URL}/description-sync/compare/${code}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${publicAnonKey}` },
                  });
                  
                  if (!response.ok) {
                    throw new Error(`Failed: ${response.status}`);
                  }
                  
                  const result = await response.json();


                  // Show comparison
                  alert(`📊 ${code} - Uropa API Data\n\n` +
                    `UROPA API:\n` +
                    `- Description: ${result.uropa.descriptionLength} chars\n` +
                    `- Attributes: ${result.uropa.attributesCount} total\n` +
                    `- Specifications: ${result.uropa.specificationsCount} items\n` +
                    `- Age Restricted: ${result.uropa.ageRestricted}\n\n` +
                    `UPDATES:\n` +
                    `${result.wouldUpdate.join('\n')}\n\n` +
                    `✅ Check console for full Uropa response`);
                } catch (error) {
                  alert(`Error: ${error}`);
                }
              }}
              variant="outline"
              className="border-yellow-600 text-yellow-600 hover:bg-yellow-100"
            >
              📊 Compare DB vs Uropa
            </Button>
            
            <Button
              key="test-uropa-api"
              onClick={async () => {
                const code = prompt('Enter product code to test Uropa API (e.g., AE157):');
                if (!code) return;
                
                try {
                  // Call test endpoint
                  const response = await fetch(`${API_URL}/description-sync/test-uropa/${code}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${publicAnonKey}` },
                  });
                  
                  if (!response.ok) {
                    throw new Error(`Failed: ${response.status}`);
                  }
                  
                  const result = await response.json();

                  // Log full result to console
                  console.log('🌐 [Test Uropa API] Full Response:', result);
                  console.log('🖼️ [Test Uropa API] Image Fields:', result.imageFields);
                  console.log('🖼️ [Test Uropa API] Image Keys Found:', result.imageKeysFound);

                  // Show API data including image info
                  const imageKeysStr = result.imageKeysFound?.join(', ') || 'None';
                  alert(`🌐 Uropa API Test for ${code}\n\n` +
                    `Description: ${result.description?.length || 0} chars\n` +
                    `Attributes: ${result.attributesCount} total\n` +
                    `COMPARISONDATA: ${result.comparisonDataCount} items\n` +
                    `Age Restricted: ${result.ageRestricted}\n\n` +
                    `🖼️ IMAGE FIELDS FOUND:\n${imageKeysStr}\n\n` +
                    `✅ Check console for FULL details and image field analysis`);
                } catch (error) {
                  alert(`Error: ${error}`);
                }
              }}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-100"
            >
              Test Uropa API
            </Button>

            <Button
              key="debug-images"
              onClick={async () => {
                const code = prompt('Enter product code (e.g., CD085-A):');
                if (!code) return;

                try {
                  const response = await fetch(`${API_URL}/description-sync/debug-images/${code}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${publicAnonKey}` },
                  });

                  const result = await response.json();

                  if (!response.ok || !result.success) {
                    alert(`❌ Error: ${result.error || 'Unknown error'}`);
                    return;
                  }

                  console.log('🌐 [UROPA RAW]:', result.uropaRaw);
                  console.log('💾 [DB RAW]:', result.dbRaw);

                  // Open window with raw JSON comparison
                  const w = window.open('', '_blank', 'width=1200,height=900');
                  if (w) {
                    w.document.write(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>RAW JSON - ${code}</title>
                        <style>
                          body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                          h2 { color: #4ec9b0; margin-top: 30px; }
                          pre { background: #252526; padding: 15px; border-radius: 5px; overflow: auto; max-height: 500px; border: 1px solid #333; }
                          .section { margin: 20px 0; }
                        </style>
                      </head>
                      <body>
                        <h2>🔍 RAW JSON COMPARISON - ${code}</h2>

                        <div class="section">
                          <h3 style="color: #ce9178;">🌐 UROPA API RAW:</h3>
                          <pre>${JSON.stringify(result.uropaRaw, null, 2)}</pre>
                        </div>

                        <div class="section">
                          <h3 style="color: #569cd6;">💾 DATABASE RAW:</h3>
                          <pre>${JSON.stringify(result.dbRaw, null, 2)}</pre>
                        </div>
                      </body>
                      </html>
                    `);
                    w.document.close();
                  }

                  alert(`✅ Raw JSON opened in new window!\nCheck console for full data.`);
                } catch (error) {
                  alert(`❌ Error: ${error}`);
                }
              }}
              variant="outline"
              className="border-orange-600 text-orange-600 hover:bg-orange-100"
            >
              🖼️ Debug Images
            </Button>
          </div>
          <p className="text-xs text-blue-700 mt-3">
            💡 If products display old data after sync, use "Clear All Cache" and reload the page
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📝 Description & Specifications Sync</CardTitle>
          <CardDescription>
            Sync product descriptions, specifications, age restrictions, and thumbnail gallery from Uropa API.
            <br />
            <strong>Updates ONLY:</strong> description, specifications, ageRestricted, images (thumbnail gallery).
            <br />
            <span className="text-xs text-gray-500">Note: Does NOT update mainImage or image fields - those are managed separately.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="brand-filter">Select Brand</Label>
              <select
                id="brand-filter"
                className="w-full mt-1 p-2 border rounded"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                disabled={brandsLoading}
              >
                <option value="">-- Select a brand to load products --</option>
                {availableBrands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
              {selectedBrand && (
                <p className="text-xs text-gray-500 mt-1">
                  {allProducts.length} products loaded
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="skip-description">Skip Products With Description</Label>
              <div className="flex items-center mt-3">
                <input
                  type="checkbox"
                  id="skip-description"
                  checked={skipWithDescription}
                  onChange={(e) => setSkipWithDescription(e.target.checked)}
                  className="w-4 h-4 mr-2"
                />
                <span className="text-sm">Only show products needing description</span>
              </div>
            </div>
            
            <div className="flex items-end">
              <Button
                onClick={() => selectedBrand && fetchProductsForBrand(selectedBrand)}
                disabled={loading || !selectedBrand}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh from DB
              </Button>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm">
              <strong>{selectedProducts.size}</strong> products selected
              {selectedProducts.size > 0 && (
                <span className="ml-2 text-gray-600">
                  (max 50 per batch)
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                key="select-page"
                onClick={selectAll}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                Select Page ({currentProducts.length})
              </Button>
              
              <Button
                key="deselect-all"
                onClick={deselectAll}
                variant="outline"
                size="sm"
                disabled={selectedProducts.size === 0}
              >
                Deselect All
              </Button>
              
              <Button
                key="sync-selected"
                onClick={runBatchSync}
                disabled={syncing || selectedProducts.size === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Sync Selected ({Math.min(selectedProducts.size, 50)})
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Products Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading products...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No products found matching filters.</p>
              <p className="text-sm mt-2">Try adjusting your filters or unchecking "Skip Products With Description".</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left w-12">
                        <input
                          type="checkbox"
                          checked={currentProducts.length > 0 && currentProducts.every(p => selectedProducts.has(p.id))}
                          onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="p-3 text-left">Code</th>
                      <th className="p-3 text-left">Product Name</th>
                      <th className="p-3 text-left">Brand</th>
                      <th className="p-3 text-center">Description</th>
                      <th className="p-3 text-center">Specs</th>
                      <th className="p-3 text-center">Age Restricted</th>
                      <th className="p-3 text-left">Last Sync</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentProducts.map((product) => (
                      <tr
                        key={product.id}
                        className={`border-t hover:bg-gray-50 ${selectedProducts.has(product.id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => toggleProduct(product.id)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="p-3 font-mono text-sm">{product.code}</td>
                        <td className="p-3 text-sm">{product.name}</td>
                        <td className="p-3 text-sm">{product.brand}</td>
                        <td className="p-3 text-center">
                          {product.hasDescription ? (
                            <div className="flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span className="text-xs text-gray-500">({product.descriptionLength} chars)</span>
                            </div>
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {product.hasSpecifications ? (
                            <div className="flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span className="text-xs text-gray-500">({product.specificationsCount})</span>
                            </div>
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {product.ageRestricted ? (
                            <AlertCircle className="w-4 h-4 text-orange-600 mx-auto" />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-gray-500">
                          {product.lastDescriptionSync 
                            ? new Date(product.lastDescriptionSync).toLocaleString()
                            : 'Never'
                          }
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            key="debug-sync"
                            onClick={() => debugSyncSingleProduct(product.code)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Bug className="w-4 h-4" />
                            Debug Sync
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * limit) + 1} - {Math.min(currentPage * limit, filteredProducts.length)} of {filteredProducts.length} products
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <div className="flex items-center px-4">
                  Page {currentPage} of {totalPages}
                </div>
                
                <Button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  variant="outline"
                  size="sm"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Sync Results */}
          {syncResults && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">✅ Last Sync Results</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Descriptions</div>
                  <div className="text-lg font-bold text-green-700">{syncResults.summary.descriptionsUpdated}</div>
                </div>
                <div>
                  <div className="text-gray-600">Specifications</div>
                  <div className="text-lg font-bold text-green-700">{syncResults.summary.specificationsUpdated}</div>
                </div>
                <div>
                  <div className="text-gray-600">Thumbnails</div>
                  <div className="text-lg font-bold text-green-700">{syncResults.summary.imagesUpdated || 0}</div>
                </div>
                <div>
                  <div className="text-gray-600">Skipped</div>
                  <div className="text-lg font-bold text-gray-700">{syncResults.summary.skipped}</div>
                </div>
                <div>
                  <div className="text-gray-600">Errors</div>
                  <div className="text-lg font-bold text-red-700">{syncResults.summary.errors}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-600">
                Duration: {(syncResults.summary.duration / 1000).toFixed(2)}s
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🔥 DEBUG MODAL */}
      {debugModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-blue-600 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Bug className="w-6 h-6" />
                Debug Sync Results
              </h2>
              <button
                onClick={closeDebugModal}
                className="p-2 hover:bg-blue-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {debugLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-lg">Syncing and fetching data...</span>
                </div>
              ) : debugData?.error ? (
                <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-red-800 mb-2">❌ Error</h3>
                  <p className="text-red-700">{debugData.message}</p>
                </div>
              ) : debugData ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-green-800 mb-3">✅ Sync Complete</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Product Code:</span>
                        <span className="ml-2 font-mono font-bold">{debugData.productCode}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2 font-bold text-green-600">{debugData.success ? 'SUCCESS' : 'FAILED'}</span>
                      </div>
                    </div>
                  </div>

                  {/* BEFORE - What's in your database */}
                  <div className="border-2 border-orange-500 rounded-lg">
                    <div className="bg-orange-500 text-white p-3">
                      <h3 className="font-bold text-lg">📦 BEFORE (Your Database)</h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <span className="font-semibold">Description:</span>
                        <span className="ml-2">{debugData.before?.descriptionLength || 0} chars</span>
                        {debugData.before?.description && (
                          <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                            {debugData.before.description.substring(0, 300)}
                            {debugData.before.description.length > 300 ? '...' : ''}
                          </pre>
                        )}
                      </div>
                      <div>
                        <span className="font-semibold">Specifications:</span>
                        <span className="ml-2">{debugData.before?.specificationsCount || 0} items</span>
                        {debugData.before?.specifications && debugData.before.specifications.length > 0 && (
                          <ul className="mt-2 space-y-1 bg-gray-50 p-3 rounded text-sm">
                            {debugData.before.specifications.map((spec: any, idx: number) => (
                              <li key={idx} className="flex">
                                <span className="font-semibold min-w-[150px]">{spec.label}:</span>
                                <span>{spec.value}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <span className="font-semibold">Age Restricted:</span>
                        <span className="ml-2">{debugData.before?.ageRestricted ? '🔞 YES' : '✅ NO'}</span>
                      </div>
                    </div>
                  </div>

                  {/* UROPA - What Uropa API returned */}
                  <div className="border-2 border-purple-500 rounded-lg">
                    <div className="bg-purple-500 text-white p-3">
                      <h3 className="font-bold text-lg">🌐 UROPA API DATA</h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <span className="font-semibold">Total Attributes:</span>
                        <span className="ml-2">{debugData.uropa?.attributesCount || 0}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Description:</span>
                        <span className="ml-2">{debugData.uropa?.descriptionLength || 0} chars</span>
                        {debugData.uropa?.descriptionSample && (
                          <pre className="mt-2 p-3 bg-purple-50 rounded text-xs overflow-x-auto">
                            {debugData.uropa.descriptionSample}
                          </pre>
                        )}
                      </div>
                      <div>
                        <span className="font-semibold">Processed Specifications:</span>
                        <span className="ml-2">{debugData.uropa?.specificationsCount || 0} items</span>
                        {debugData.uropa?.specificationsSample && debugData.uropa.specificationsSample.length > 0 && (
                          <ul className="mt-2 space-y-1 bg-purple-50 p-3 rounded text-sm max-h-96 overflow-y-auto">
                            {debugData.uropa.specificationsSample.map((spec: any, idx: number) => (
                              <li key={idx} className="flex">
                                <span className="font-semibold min-w-[150px]">{spec.label}:</span>
                                <span>{spec.value}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <span className="font-semibold">Age Restricted:</span>
                        <span className="ml-2">{debugData.uropa?.ageRestricted ? '🔞 YES' : '✅ NO'}</span>
                      </div>
                    </div>
                  </div>

                  {/* AFTER - What was saved */}
                  <div className="border-2 border-green-500 rounded-lg">
                    <div className="bg-green-500 text-white p-3">
                      <h3 className="font-bold text-lg">💾 AFTER (Saved to Database)</h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <span className="font-semibold">Description:</span>
                        <span className="ml-2">{debugData.after?.descriptionLength || 0} chars</span>
                        {debugData.after?.description && (
                          <pre className="mt-2 p-3 bg-green-50 rounded text-xs overflow-x-auto">
                            {debugData.after.description.substring(0, 300)}
                            {debugData.after.description.length > 300 ? '...' : ''}
                          </pre>
                        )}
                      </div>
                      <div>
                        <span className="font-semibold">Specifications:</span>
                        <span className="ml-2">{debugData.after?.specificationsCount || 0} items</span>
                        {debugData.after?.specifications && debugData.after.specifications.length > 0 && (
                          <ul className="mt-2 space-y-1 bg-green-50 p-3 rounded text-sm max-h-96 overflow-y-auto">
                            {debugData.after.specifications.map((spec: any, idx: number) => (
                              <li key={idx} className="flex">
                                <span className="font-semibold min-w-[150px]">{spec.label}:</span>
                                <span>{spec.value}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <span className="font-semibold">Age Restricted:</span>
                        <span className="ml-2">{debugData.after?.ageRestricted ? '🔞 YES' : '✅ NO'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No debug data available</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <Button onClick={closeDebugModal} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}