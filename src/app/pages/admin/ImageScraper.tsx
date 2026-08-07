import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { RefreshCw, Image, CheckCircle2, XCircle, Download } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface Product {
  code: string;
  name: string;
  price: number;
  brand: string;
  currentImages: string[];
  mainImage?: string;
}

export default function ImageScraper() {
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingUropa, setExportingUropa] = useState(false);
  const [uropaProgress, setUropaProgress] = useState<{
    progress: number;
    processed: number;
    total: number;
    success: number;
    errors: number;
  } | null>(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await fetch(`${API_URL}/image-scraper/brands`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await response.json();
      if (data.success) {
        setBrands(data.brands);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
      alert('Failed to load brands');
    }
  };

  const fetchProducts = async () => {
    if (!selectedBrand) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/image-scraper/products?brand=${encodeURIComponent(selectedBrand)}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.code)));
    }
  };

  const toggleProduct = (code: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedProducts(newSelected);
  };

  const handleScrape = async () => {
    if (selectedProducts.size === 0) {
      alert('Please select at least one product');
      return;
    }

    setScraping(true);
    setResults(null);

    try {
      const response = await fetch(`${API_URL}/image-scraper/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          productCodes: Array.from(selectedProducts)
        })
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.results);
        alert(`✅ Scraping complete!\nSuccess: ${data.results.success}\nFailed: ${data.results.failed}`);
        // Refresh product list
        fetchProducts();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error scraping images:', error);
      alert(`Failed to scrape images: ${error}`);
    } finally {
      setScraping(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${API_URL}/image-scraper/export`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      const result = await response.json();
      if (!result.success) {
        alert(`Error: ${result.error}`);
        return;
      }

      // Convert to CSV
      const headers = ['Code', 'Name', 'Brand', 'Brand Logo', 'Trade Price', 'Main Image', 'Image Count', 'All Images', 'Description'];
      const csvRows = [
        headers.join(','),
        ...result.data.map((row: any) => [
          row.code,
          `"${row.name}"`,
          row.brand ? `"${row.brand}"` : '',
          row.brandLogo || '',
          row.tradePrice,
          row.mainImage,
          row.imageCount,
          `"${row.images}"`,
          `"${row.description}"`
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      alert(`✅ Exported ${result.count} products to CSV!`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert(`Failed to export CSV: ${error}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportUropaCSV = async () => {
    if (!confirm('This will fetch current prices from Uropa API for all products. This may take several minutes. Continue?')) {
      return;
    }

    setExportingUropa(true);
    setUropaProgress({ progress: 0, processed: 0, total: 0, success: 0, errors: 0 });

    try {
      console.log('🔄 Starting Uropa export (chunked)...');

      let jobId = '';
      let chunkIndex = 0;
      let isComplete = false;

      // Process chunks until complete
      while (!isComplete) {
        console.log(`🔄 Processing chunk ${chunkIndex + 1}...`);

        const response = await fetch(`${API_URL}/image-scraper/export-uropa`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jobId: jobId || undefined,
            chunkIndex
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `Request failed: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Export failed');
        }

        // Update jobId from first response
        if (!jobId) {
          jobId = result.jobId;
        }

        // Update progress
        setUropaProgress({
          progress: result.progress,
          processed: result.processed,
          total: result.total,
          success: 0, // Not tracked per chunk
          errors: 0  // Not tracked per chunk
        });

        console.log(`✅ Chunk ${chunkIndex + 1} complete. Progress: ${result.progress}%`);

        isComplete = result.isComplete;
        chunkIndex++;
      }

      // Fetch final job data
      console.log('✅ All chunks processed, fetching final data...');

      const finalResponse = await fetch(
        `${API_URL}/image-scraper/export-uropa/${jobId}`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      const finalData = await finalResponse.json();

      if (!finalData.success || !finalData.job) {
        throw new Error('Failed to fetch final data');
      }

      const job = finalData.job;

      console.log('✅ Export complete, generating CSV...');

      // Sort data by code
      const sortedData = job.data.sort((a: any, b: any) => a.code.localeCompare(b.code));

      // Convert to CSV
      const headers = ['Code', 'Brand', 'Brand Logo', 'Trade Price', 'In Stock', 'Back Order Available', 'Promised Date', 'Error'];
      const csvRows = [
        headers.join(','),
        ...sortedData.map((row: any) => [
          row.code,
          row.brand ? `"${row.brand}"` : '',
          row.brandLogo || '',
          row.tradePrice || 0,
          row.inStock !== undefined ? row.inStock : '',
          row.backOrderAvailable !== undefined ? row.backOrderAvailable : '',
          row.uropaPromisedDate || '',
          row.error ? `"${row.error}"` : ''
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `uropa-prices-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      alert(`✅ Uropa Export Complete!\n\nTotal: ${job.total}\nSuccess: ${job.success}\nErrors: ${job.errors}\n\nFile downloaded!`);

      setUropaProgress(null);
      setExportingUropa(false);

    } catch (error) {
      console.error('Error exporting from Uropa:', error);
      alert(`Failed to export from Uropa: ${error instanceof Error ? error.message : String(error)}`);
      setExportingUropa(false);
      setUropaProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Image Scraper</h1>
            <p className="text-gray-600 mt-1">
              Scrape thumbnail images from Uropa carousel API (images array)
              <br />
              <span className="text-sm text-blue-600">
                ℹ️ Uses Uropa token from backend KV storage
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                const code = prompt('Enter product code to check pricing fields (e.g., CD085-A):');
                if (!code) return;

                try {
                  const response = await fetch(`${API_URL}/image-scraper/check-pricing/${code}`, {
                    headers: { 'Authorization': `Bearer ${publicAnonKey}` }
                  });
                  const result = await response.json();

                  console.log('💰 [Pricing Check] Full Result:', result);
                  console.log('💰 [Pricing Check] Raw Response:', result.rawResponse);
                  console.log('💰 [Pricing Check] Actual Product:', result.actualProduct);
                  console.log('💰 [Pricing Check] Price Fields:', result.priceFields);

                  if (result.success) {
                    const priceInfo = `
Product Code: ${result.code}
Product Name: ${result.name}

🔍 PRICE FIELDS FOUND:
${Object.entries(result.priceFields || {})
  .filter(([_, value]) => value !== undefined && value !== null)
  .map(([key, value]) => `  - ${key}: ${JSON.stringify(value)}`)
  .join('\n') || '  (none found)'}

📋 All Keys with 'price': ${result.allPriceKeys?.join(', ') || 'none'}

📦 Top-level keys: ${result.topLevelKeys?.slice(0, 10).join(', ')}...

✅ Check browser console for FULL response data!
                    `.trim();

                    alert(priceInfo);
                  } else {
                    alert(`Error: ${result.error}\n\nCheck console for details.`);
                  }
                } catch (error) {
                  alert(`Error: ${error}`);
                }
              }}
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              Check Pricing Fields
            </Button>
            <Button
              onClick={async () => {
                const code = prompt('Enter product code to test (e.g., CD085-A):');
                if (!code) return;

                try {
                  const response = await fetch(`${API_URL}/image-scraper/test/${code}`, {
                    headers: { 'Authorization': `Bearer ${publicAnonKey}` }
                  });
                  const result = await response.json();

                  console.log('🖼️ [Image Test] Full Result:', result);
                  console.log('🖼️ [Image Test] Images Raw:', result.imagesRaw);
                  console.log('🖼️ [Image Test] First Image:', result.firstImage);

                  alert(`✅ Check browser console!\n\nImages Array Length: ${result.imagesLength}\nCheck console for full structure`);
                } catch (error) {
                  alert(`Error: ${error}`);
                }
              }}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              Test Images
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={exporting}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              {exporting ? (
                <>
                  <RefreshCw className="animate-spin size-4 mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="size-4 mr-2" />
                  Export All to CSV
                </>
              )}
            </Button>
            <Button
              onClick={handleExportUropaCSV}
              disabled={exportingUropa}
              variant="outline"
              className="border-orange-600 text-orange-600 hover:bg-orange-50"
            >
              {exportingUropa ? (
                <>
                  <RefreshCw className="animate-spin size-4 mr-2" />
                  Fetching from Uropa...
                </>
              ) : (
                <>
                  <Download className="size-4 mr-2" />
                  Export Uropa Prices
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Uropa Export Progress */}
        {uropaProgress && (
          <Card className="mb-6 border-2 border-orange-500">
            <CardHeader>
              <CardTitle className="text-orange-700">
                Fetching Prices from Uropa API
              </CardTitle>
              <CardDescription>
                Processing {uropaProgress.processed} of {uropaProgress.total} products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-orange-500 h-full transition-all duration-300 flex items-center justify-center text-white text-sm font-medium"
                    style={{ width: `${uropaProgress.progress}%` }}
                  >
                    {uropaProgress.progress}%
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-700">{uropaProgress.processed}</div>
                    <div className="text-xs text-gray-500">Processed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{uropaProgress.success}</div>
                    <div className="text-xs text-gray-500">Success</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{uropaProgress.errors}</div>
                    <div className="text-xs text-gray-500">Errors</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-700">{uropaProgress.total}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 text-center">
                  Please wait... This may take several minutes depending on the number of products.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Token Input */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Uropa API Token</CardTitle>
            <CardDescription>Token is saved in backend KV storage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter Uropa API token"
                className="flex-1"
              />
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch(`${API_URL}/image-scraper/check-token`, {
                      headers: { 'Authorization': `Bearer ${publicAnonKey}` }
                    });
                    const result = await response.json();
                    console.log('Token check:', result);
                    alert(`Token Status:\n\nEnvironment Token: ${result.hasEnvToken ? '✅ Found' : '❌ Not found'}\nKV Token: ${result.hasKvToken ? '✅ Found' : '❌ Not found'}\n\nCheck console for details`);
                  } catch (error) {
                    alert(`Error: ${error}`);
                  }
                }}
                variant="outline"
                className="border-blue-600 text-blue-600"
              >
                Check Token
              </Button>
              <Button
                onClick={async () => {
                  if (!token) {
                    alert('Please enter a token');
                    return;
                  }
                  try {
                    const response = await fetch(`${API_URL}/image-scraper/save-token`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${publicAnonKey}`
                      },
                      body: JSON.stringify({ token })
                    });
                    const result = await response.json();
                    if (result.success) {
                      alert('✅ Token saved to backend!');
                    } else {
                      alert(`Error: ${result.error}`);
                    }
                  } catch (error) {
                    alert(`Failed to save token: ${error}`);
                  }
                }}
                variant="outline"
              >
                Save Token
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Brand Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Brand</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                <option value="">-- Select Brand --</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
              <Button
                onClick={fetchProducts}
                disabled={!selectedBrand || loading}
              >
                {loading ? <RefreshCw className="animate-spin size-5" /> : 'Load Products'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Product List */}
        {products.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Products ({products.length})</CardTitle>
                  <CardDescription>
                    {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSelectAll} variant="outline">
                    {selectedProducts.size === products.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    onClick={handleScrape}
                    disabled={selectedProducts.size === 0 || scraping}
                  >
                    {scraping ? (
                      <>
                        <RefreshCw className="animate-spin size-4 mr-2" />
                        Scraping...
                      </>
                    ) : (
                      <>
                        <Download className="size-4 mr-2" />
                        Scrape Images
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedProducts.size === products.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trade Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Images</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map((product) => (
                      <tr key={product.code} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.code)}
                            onChange={() => toggleProduct(product.code)}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{product.code}</td>
                        <td className="px-4 py-3 text-sm">{product.name}</td>
                        <td className="px-4 py-3 text-sm">${product.price}</td>
                        <td className="px-4 py-3 text-sm">
                          {product.currentImages.length > 0 ? (
                            <span className="text-green-600">{product.currentImages.length} images</span>
                          ) : (
                            <span className="text-gray-400">No images</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Scraping Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 font-semibold">
                      <CheckCircle2 className="size-5" />
                      Success: {results.success}
                    </div>
                  </div>
                  <div className="flex-1 bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 font-semibold">
                      <XCircle className="size-5" />
                      Failed: {results.failed}
                    </div>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {results.details.map((detail: any, index: number) => (
                    <div
                      key={index}
                      className={`p-3 mb-2 rounded-lg ${
                        detail.success ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{detail.code}</div>
                          {detail.success ? (
                            <div className="text-sm text-green-700">
                              ✅ {detail.imagesFound} images scraped
                            </div>
                          ) : (
                            <div className="text-sm text-red-700">
                              ❌ {detail.error}
                            </div>
                          )}
                        </div>
                        {detail.success && detail.images && (
                          <div className="flex gap-2">
                            {detail.images.slice(0, 3).map((img: string, i: number) => (
                              <img
                                key={i}
                                src={img}
                                alt={`Product ${detail.code}`}
                                className="size-12 object-cover rounded border"
                              />
                            ))}
                            {detail.images.length > 3 && (
                              <div className="size-12 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-600">
                                +{detail.images.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
