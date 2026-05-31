import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useCMS } from '../../context/CMSContext';
import { Product } from '../../types/product';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { CategorySelector } from '../../components/admin/CategorySelector';
import { buildCategoryTree } from '../../utils/categoryTree';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  RefreshCw
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notifications';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function ProductsManager() {
  logger.debug('ProductsManager component mounted');
  console.log('🎯 ProductsManager: Component rendering');
  console.log('🔑 ProductsManager: API_URL =', API_URL);
  console.log('🔑 ProductsManager: publicAnonKey =', publicAnonKey ? `${publicAnonKey.substring(0, 20)}...` : 'MISSING');

  const navigate = useNavigate();
  const cms = useCMS();
  const { refreshData } = cms;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Equipment');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 50; // Show 50 products per page
  const batchSize = 200; // Load 200 products per batch

  // Fetch products in batches
  const fetchProducts = async (offset: number = 0, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      console.log(`🔍 ProductsManager: Fetching batch at offset ${offset}, limit ${batchSize}`);

      const response = await fetch(`${API_URL}/products?limit=${batchSize}&offset=${offset}&_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });

      console.log('📡 ProductsManager: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ProductsManager: Response not OK:', errorText);
        const errorMsg = `Failed to fetch products: ${response.status} - ${errorText}`;
        setLastError(errorMsg);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log('✅ ProductsManager: Data received:', {
        hasProducts: !!data.products,
        productCount: data.products?.length || 0,
        hasPagination: !!data.pagination,
        total: data.pagination?.total,
        offset: offset,
        firstProductSample: data.products?.[0] ? {
          id: data.products[0].id,
          code: data.products[0].code,
          name: data.products[0].name?.substring(0, 30)
        } : null
      });

      const newProducts = (data.products || []).filter((p: any) => p && typeof p === 'object');
      const total = data.pagination?.total || newProducts.length;

      setTotalProducts(total);

      if (append) {
        setProducts(prev => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }

      // Check if there are more products to load
      setHasMore((offset + newProducts.length) < total);

      setLastError(null); // Clear error on success
      logger.debug('Fetched products:', newProducts.length, 'Total:', total);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ ProductsManager: Error fetching products:', error);
      setLastError(errorMsg);
      notify.error('Failed to load products: ' + errorMsg);
      if (!append) {
        setProducts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      console.log('🏁 ProductsManager: Fetch complete');
    }
  };

  // Load more products
  const loadMoreProducts = () => {
    const currentOffset = products.length;
    fetchProducts(currentOffset, true);
  };

  // Load all remaining products
  const loadAllProducts = async () => {
    let offset = products.length;
    const maxBatches = 50; // Safety limit: 50 batches * 200 = 10,000 products max
    let batchCount = 0;

    setLoadingMore(true);

    try {
      while (hasMore && batchCount < maxBatches) {
        console.log(`Loading batch ${batchCount + 1}, offset: ${offset}`);

        const response = await fetch(`${API_URL}/products?limit=${batchSize}&offset=${offset}&_t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch batch: ${response.status}`);
        }

        const data = await response.json();
        const newProducts = (data.products || []).filter((p: any) => p && typeof p === 'object');
        const total = data.pagination?.total || newProducts.length;

        if (newProducts.length === 0) {
          break;
        }

        setProducts(prev => [...prev, ...newProducts]);
        setTotalProducts(total);

        offset += newProducts.length;
        batchCount++;

        // Check if we've loaded everything
        if (offset >= total) {
          setHasMore(false);
          break;
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      notify.success(`Loaded all ${offset} products`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      notify.error('Failed to load all products: ' + errorMsg);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchProducts(0, false);
  }, []);

  const filteredProducts = products.filter(p => p && typeof p === 'object').filter(p =>
    (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  ).filter(p =>
    selectedCategory === 'All Equipment' || p.category === selectedCategory
  );

  const handleCreateProduct = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      code: '',
      sku: '',
      name: 'New Product',
      description: '',
      specifications: '',
      price: 0,
      category: cms.data.categories[1] || 'General',
      // Initialize category hierarchy - empty for new products
      categoryLevel1: '',
      categoryLevel2: '',
      categoryLevel3: '',
      categoryLevel4: '',
      categoryLevel1Id: '',
      categoryLevel2Id: '',
      categoryLevel3Id: '',
      categoryLevel4Id: '',
      categoryId: '',
      wholePath: '',
      image: '',
      allImages: [],
      galleryImages: [],
      brand: '',
      brandLogo: '',
      rating: 4.5,
      inStock: true,
      status: true,
      features: [],
      multiBuyOptions: []
    };
    // Don't add to database yet - only when user clicks Save
    setEditingProduct(newProduct);
    setIsAddDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    try {
      // Check if this is a new product
      const isNewProduct = isAddDialogOpen && !products.find(p => p.id === editingProduct.id);

      if (isNewProduct) {
        // Validate required fields
        if (!editingProduct.name || !editingProduct.name.trim()) {
          notify.error('Product name is required');
          return;
        }
        if (!editingProduct.code || !editingProduct.code.trim()) {
          notify.error('Product code is required');
          return;
        }

        // Use the product code as the ID for new products
        const productToSave = {
          ...editingProduct,
          id: editingProduct.code.trim(), // Use code as ID
          code: editingProduct.code.trim(),
        };

        // Add new product
        const response = await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(productToSave),
        });

        if (!response.ok) {
          throw new Error(`Failed to add product: ${response.status}`);
        }

        // Update the editing product with the correct ID
        setEditingProduct(productToSave);

        notify.success('Product added successfully');
      } else {
        // Update existing product
        console.log('🔄 Updating product:', {
          id: editingProduct.id,
          code: editingProduct.code,
          name: editingProduct.name,
          url: `${API_URL}/products/${editingProduct.id}`
        });

        const response = await fetch(`${API_URL}/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(editingProduct),
        });

        const responseData = await response.json();
        console.log('📥 Update response:', responseData);

        if (!response.ok) {
          console.error('❌ Update failed:', response.status, responseData);
          throw new Error(`Failed to update product: ${response.status} - ${JSON.stringify(responseData)}`);
        }

        notify.success('Product updated successfully');
      }

      if (isNewProduct) {
        // For new products, refresh the list to get the new product
        setProducts([]);
        setCurrentPage(1);
        await fetchProducts(0, false);

        // Refresh global CMS data to make product available site-wide
        if (refreshData) {
          console.log('🔄 Refreshing global CMS data after new product creation...');
          await refreshData();
          console.log('✅ CMS data refreshed');
        }
      } else {
        // For updates, just update the product in the local state
        setProducts(prevProducts =>
          prevProducts.map(p =>
            p.id === editingProduct.id ? editingProduct : p
          )
        );

        // Refresh global CMS data for updates too
        if (refreshData) {
          console.log('🔄 Refreshing global CMS data after product update...');
          await refreshData();
          console.log('✅ CMS data refreshed');
        }
      }

      if (isAddDialogOpen) {
        setIsAddDialogOpen(false);
      }
      setEditingProduct(null);
    } catch (error) {
      notify.error('Failed to save product: ' + (error instanceof Error ? error.message : 'Unknown error'));
      console.error('Save error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      console.log('🗑️ Deleting product:', id);

      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });

      const responseData = await response.json();
      console.log('📥 Delete response:', responseData);

      if (!response.ok) {
        console.error('❌ Delete failed:', response.status, responseData);
        throw new Error(`Failed to delete product: ${response.status} - ${responseData.error || 'Unknown error'}`);
      }

      notify.success('Product deleted successfully');

      // Remove the product from the local state
      setProducts(prevProducts => prevProducts.filter(p => p.id !== id));
      setTotalProducts(prev => prev - 1);

      if (editingProduct?.id === id) {
        setEditingProduct(null);
      }
    } catch (error) {
      notify.error('Failed to delete product: ' + (error instanceof Error ? error.message : 'Unknown error'));
      console.error('Delete error:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setProducts([]);
    setTotalProducts(0);
    setHasMore(true);
    setCurrentPage(1);
    setEditingProduct(null);
    await fetchProducts(0, false);
    setIsRefreshing(false);
    notify.success('Products refreshed');
  };

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl mb-2">Products Manager</h1>
          <p className="text-muted-foreground">
            {products.length} of {totalProducts > 0 ? totalProducts.toLocaleString() : '?'} products loaded
            {loading && <span className="ml-2 text-blue-600">(Loading...)</span>}
            {loadingMore && <span className="ml-2 text-blue-600">(Loading more...)</span>}
          </p>
          {hasMore && !loading && (
            <p className="text-xs text-amber-600 mt-1">
              {totalProducts - products.length} more products available
            </p>
          )}
          <p className="text-xs text-gray-500 font-mono mt-1">
            State: loaded={products.length}, filtered={filteredProducts.length}, loading={loading.toString()}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {hasMore && !loading && (
            <>
              <Button
                onClick={loadMoreProducts}
                variant="outline"
                size="lg"
                disabled={loadingMore}
              >
                <RefreshCw className={`size-5 mr-2 ${loadingMore ? 'animate-spin' : ''}`} />
                Load More ({batchSize})
              </Button>
              <Button
                onClick={loadAllProducts}
                variant="outline"
                size="lg"
                disabled={loadingMore}
              >
                <RefreshCw className={`size-5 mr-2 ${loadingMore ? 'animate-spin' : ''}`} />
                Load All ({totalProducts - products.length} more)
              </Button>
            </>
          )}
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="lg"
            disabled={isRefreshing || loading}
          >
            <RefreshCw className={`size-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => navigate('/admin/import-products')} variant="outline" size="lg">
            <Upload className="size-5 mr-2" />
            Import CSV
          </Button>
          <Button onClick={handleCreateProduct} size="lg">
            <Plus className="size-5 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">All Products ({filteredProducts.length})</h2>
            {!loading && !loadingMore && hasMore && (
              <Badge variant="outline" className="text-xs bg-amber-50 border-amber-300">
                {totalProducts - products.length} more available - click "Load More"
              </Badge>
            )}
          </div>

          {/* Show error message if there's an error */}
          {lastError && (
            <Card className="bg-red-50 border-red-300 mb-4">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 text-red-900 flex items-center gap-2">
                  <X className="size-5" />
                  Error Loading Products
                </h3>
                <p className="text-sm text-red-800 mb-4 font-mono bg-red-100 p-3 rounded">
                  {lastError}
                </p>
                <div className="text-xs text-red-700 mb-4">
                  <div>API Endpoint: {API_URL}/products</div>
                  <div>Auth Key: {publicAnonKey ? `${publicAnonKey.substring(0, 30)}...` : '✗ Missing'}</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleRefresh} size="lg" variant="outline">
                    <RefreshCw className="size-5 mr-2" />
                    Retry
                  </Button>
                  <Button
                    onClick={() => {
                      setLastError(null);
                      window.location.reload();
                    }}
                    size="lg"
                    variant="destructive"
                  >
                    Force Reload Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show message if no products */}
          {!loading && !lastError && products.length === 0 && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 text-yellow-900">No Products Loaded</h3>
                <p className="text-sm text-yellow-800 mb-4">
                  No products are currently loaded. Check the browser console (F12) for errors.
                </p>
                <div className="text-xs text-yellow-700 bg-yellow-100 p-3 rounded mb-4 font-mono">
                  <div>API Endpoint: {API_URL}/products</div>
                  <div>Auth: {publicAnonKey ? '✓ Key present' : '✗ Key missing'}</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleRefresh} size="lg" variant="outline">
                    <RefreshCw className="size-5 mr-2" />
                    Retry
                  </Button>
                  <Button onClick={() => navigate('/admin/import-products')} size="lg">
                    <Upload className="size-5 mr-2" />
                    Import Products
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="p-6 text-center">
                <RefreshCw className="size-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading products...</p>
              </CardContent>
            </Card>
          )}

          {currentProducts.map((product) => (
            <Card 
              key={product.id} 
              className={`cursor-pointer hover:shadow-lg transition-all ${
                editingProduct?.id === product.id ? 'border-slate-900 shadow-lg' : ''
              }`}
              onClick={() => setEditingProduct(product)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <img
                    src={product.image || 'https://via.placeholder.com/80'}
                    alt={product.name || 'Product'}
                    className="size-20 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="mb-1 line-clamp-1">{product.name || 'Unnamed Product'}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{product.category || 'Uncategorized'}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={(product.inStock ?? true) ? 'default' : 'secondary'}>
                        {(product.inStock ?? true) ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                      <Badge variant={(product.status ?? true) ? 'default' : 'secondary'}>
                        {(product.status ?? true) ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <span className="text-sm">${(product.price ?? 0).toLocaleString()}</span>
                      {product.multiBuyOptions && product.multiBuyOptions.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {product.multiBuyOptions.length} MultiBuy
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProduct(product);
                      }}
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(product.id);
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Load More Section */}
          {hasMore && !loading && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-blue-900 mb-4">
                  <strong>{totalProducts - products.length} more products</strong> available to load
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={loadMoreProducts}
                    variant="outline"
                    size="lg"
                    disabled={loadingMore}
                  >
                    <RefreshCw className={`size-5 mr-2 ${loadingMore ? 'animate-spin' : ''}`} />
                    Load Next {batchSize}
                  </Button>
                  <Button
                    onClick={loadAllProducts}
                    size="lg"
                    disabled={loadingMore}
                  >
                    <RefreshCw className={`size-5 mr-2 ${loadingMore ? 'animate-spin' : ''}`} />
                    Load All Remaining
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagination for viewing loaded products */}
          {!loading && products.length > 0 && (
            <div className="flex justify-center mt-4 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="mx-2 text-sm">
                Page {currentPage} of {totalPages} <span className="text-muted-foreground">({products.length} loaded)</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Edit Form */}
        <div className="lg:sticky lg:top-24 h-fit">
          {editingProduct ? (
            <Card>
              <CardContent className="p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl">Edit Product</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingProduct(null);
                      setIsAddDialogOpen(false);
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm mb-2 block font-semibold">Product Name *</label>
                    <Input
                      value={editingProduct.name || ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, name: e.target.value })
                      }
                      placeholder="Enter product name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm mb-2 block font-semibold">Product Code *</label>
                      <Input
                        value={editingProduct.code || ''}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, code: e.target.value })
                        }
                        placeholder="e.g., Y749"
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">Used as product ID in URLs</p>
                    </div>
                    <div>
                      <label className="text-sm mb-2 block">SKU</label>
                      <Input
                        value={editingProduct.sku || ''}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, sku: e.target.value })
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm mb-2 block font-semibold">Description (HTML Supported)</label>
                    <textarea
                      value={editingProduct.description || ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, description: e.target.value })
                      }
                      className="w-full min-h-[150px] p-3 border rounded-md font-mono text-sm"
                      placeholder="Enter product description. You can use HTML tags like &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;li&gt;, etc."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      HTML tags are supported. Use &lt;p&gt;, &lt;br&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;li&gt; for formatting
                    </p>
                  </div>

                  <div>
                    <label className="text-sm mb-2 block font-semibold">Specifications (HTML Supported)</label>
                    <textarea
                      value={
                        typeof editingProduct.specifications === 'string' 
                          ? editingProduct.specifications 
                          : Array.isArray(editingProduct.specifications)
                          ? JSON.stringify(editingProduct.specifications, null, 2)
                          : ''
                      }
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, specifications: e.target.value })
                      }
                      className="w-full min-h-[200px] p-3 border rounded-md font-mono text-sm"
                      placeholder="Enter technical specifications. You can use HTML like: &lt;ul&gt;&lt;li&gt;&lt;strong&gt;Capacity:&lt;/strong&gt; 365Ltr&lt;/li&gt;&lt;/ul&gt;"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 <strong>Tip:</strong> Use HTML for better formatting. Example: &lt;ul&gt;&lt;li&gt;&lt;strong&gt;Power:&lt;/strong&gt; 240V&lt;/li&gt;&lt;/ul&gt;
                    </p>
                    <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded mt-2">
                      ⚠️ <strong>Note:</strong> This field is synced from Uropa API. Manual edits will be overwritten if you run Description Sync again.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm mb-2 block">Price ($)</label>
                      <Input
                        type="number"
                        value={editingProduct.price ?? 0}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm mb-2 block">Rating</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={editingProduct.rating ?? 0}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, rating: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 p-3 border rounded-md">
                      <input
                        type="checkbox"
                        id="inStock"
                        checked={editingProduct.inStock ?? true}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, inStock: e.target.checked })
                        }
                        className="w-4 h-4"
                      />
                      <label htmlFor="inStock" className="text-sm cursor-pointer">
                        In Stock
                      </label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border rounded-md">
                      <input
                        type="checkbox"
                        id="status"
                        checked={editingProduct.status ?? true}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, status: e.target.checked })
                        }
                        className="w-4 h-4"
                      />
                      <label htmlFor="status" className="text-sm cursor-pointer">
                        Enabled (Show on site)
                      </label>
                    </div>
                  </div>

                  {/* Category Selector with Auto-IDs */}
                  <Separator className="my-4" />
                  <CategorySelector
                    key={editingProduct.id} // Force re-mount when switching products
                    categoryTree={buildCategoryTree(cms.data.categoryTree)}
                    value={editingProduct}
                    onChange={(categoryData) => {
                      setEditingProduct({ ...editingProduct, ...categoryData });
                    }}
                  />
                  <Separator className="my-4" />

                  <div>
                    <label className="text-sm mb-2 block">Brand</label>
                    <Input
                      value={editingProduct.brand || ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, brand: e.target.value })
                      }
                      placeholder="e.g., Vogue"
                    />
                  </div>

                  <div>
                    <label className="text-sm mb-2 block">Brand Logo URL</label>
                    <Input
                      value={editingProduct.brandLogo || editingProduct.brandLogoUrl || ''}
                      onChange={(e) =>
                        setEditingProduct({ 
                          ...editingProduct, 
                          brandLogo: e.target.value,
                          brandLogoUrl: e.target.value // Set both for compatibility
                        })
                      }
                      placeholder="https://example.com/brand-logo.png"
                    />
                    {(editingProduct.brandLogo || editingProduct.brandLogoUrl) && (
                      <div className="mt-2 p-2 border rounded bg-slate-50">
                        <img 
                          src={editingProduct.brandLogo || editingProduct.brandLogoUrl} 
                          alt="Brand Logo Preview" 
                          className="h-12 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Images Section */}
                  <Separator className="my-4" />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <ImageIcon className="size-4" />
                      Product Images
                    </h3>
                    
                    <div>
                      <label className="text-sm mb-2 block">Main Image URL</label>
                      <Input
                        value={editingProduct.image || ''}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, image: e.target.value })
                        }
                        placeholder="https://example.com/product-main.jpg"
                      />
                      {editingProduct.image && (
                        <div className="mt-2 p-2 border rounded bg-slate-50">
                          <img 
                            src={editingProduct.image} 
                            alt="Main Image Preview" 
                            className="h-32 object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm mb-2 block">Gallery Images (one URL per line)</label>
                      <textarea
                        value={(editingProduct.allImages || editingProduct.galleryImages || []).join('\n')}
                        onChange={(e) => {
                          const images = e.target.value.split('\n').filter(url => url.trim());
                          setEditingProduct({
                            ...editingProduct,
                            allImages: images,
                            galleryImages: images
                          });
                        }}
                        className="w-full min-h-[120px] p-2 border rounded-md font-mono text-xs"
                        placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg&#10;https://example.com/image3.jpg"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter one image URL per line for product gallery
                      </p>
                      {(editingProduct.allImages || editingProduct.galleryImages || []).length > 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {(editingProduct.allImages || editingProduct.galleryImages || []).slice(0, 6).map((url, idx) => (
                            <div key={idx} className="p-2 border rounded bg-slate-50">
                              <img 
                                src={url} 
                                alt={`Gallery ${idx + 1}`} 
                                className="w-full h-20 object-cover rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Separator className="my-4" />

                  {/* MultiBuy Options */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold">MultiBuy Options (Bulk Pricing)</label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newOption = { quantity: 5, price: editingProduct.price * 0.9 };
                          setEditingProduct({
                            ...editingProduct,
                            multiBuyOptions: [...(editingProduct.multiBuyOptions || []), newOption]
                          });
                        }}
                      >
                        <Plus className="size-3 mr-1" />
                        Add Tier
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set discounted prices for bulk purchases (e.g., Buy 5 for $450, Buy 10 for $800)
                    </p>
                    
                    {(editingProduct.multiBuyOptions || []).map((option, index) => (
                      <div key={index} className="grid grid-cols-3 gap-2 items-center bg-slate-50 p-2 rounded">
                        <div>
                          <label className="text-xs text-muted-foreground">Quantity</label>
                          <Input
                            type="number"
                            min="2"
                            value={option.quantity}
                            onChange={(e) => {
                              const updated = [...(editingProduct.multiBuyOptions || [])];
                              updated[index].quantity = parseInt(e.target.value) || 2;
                              setEditingProduct({ ...editingProduct, multiBuyOptions: updated });
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Price ($)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={option.price}
                            onChange={(e) => {
                              const updated = [...(editingProduct.multiBuyOptions || [])];
                              updated[index].price = parseFloat(e.target.value) || 0;
                              setEditingProduct({ ...editingProduct, multiBuyOptions: updated });
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const updated = (editingProduct.multiBuyOptions || []).filter((_, i) => i !== index);
                              setEditingProduct({ ...editingProduct, multiBuyOptions: updated });
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-sm mb-2 block">Features (one per line)</label>
                    <textarea
                      value={(editingProduct.features || []).join('\n')}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          features: e.target.value.split('\n').filter(f => f.trim())
                        })
                      }
                      className="w-full min-h-[100px] p-2 border rounded-md"
                    />
                  </div>

                  {/* Size Variants Section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold">Size Variants (for clothing, aprons, footwear)</label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const variants = editingProduct.sizeVariants || [];
                          setEditingProduct({
                            ...editingProduct,
                            sizeVariants: [
                              ...variants,
                              { size: '', price: editingProduct.price || 0, inStock: true }
                            ]
                          });
                        }}
                      >
                        <Plus className="size-4 mr-1" />
                        Add Size
                      </Button>
                    </div>

                    {editingProduct.sizeVariants && editingProduct.sizeVariants.length > 0 ? (
                      <div className="space-y-3">
                        {editingProduct.sizeVariants.map((variant: any, index: number) => (
                          <div key={index} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                            <div className="flex items-start gap-2 mb-3">
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-slate-600 mb-1 block">Size *</label>
                                  <Input
                                    placeholder="S, M, L, XL"
                                    value={variant.size || ''}
                                    onChange={(e) => {
                                      const variants = [...(editingProduct.sizeVariants || [])];
                                      variants[index] = { ...variant, size: e.target.value };
                                      setEditingProduct({ ...editingProduct, sizeVariants: variants });
                                    }}
                                    className="h-9"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-600 mb-1 block">Price ($) *</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={variant.price || ''}
                                    onChange={(e) => {
                                      const variants = [...(editingProduct.sizeVariants || [])];
                                      variants[index] = { ...variant, price: parseFloat(e.target.value) || 0 };
                                      setEditingProduct({ ...editingProduct, sizeVariants: variants });
                                    }}
                                    className="h-9"
                                  />
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const variants = (editingProduct.sizeVariants || []).filter((_: any, i: number) => i !== index);
                                  setEditingProduct({ ...editingProduct, sizeVariants: variants });
                                }}
                                className="mt-5"
                              >
                                <X className="size-4 text-red-600" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                <label className="text-xs text-slate-600 mb-1 block">Inches</label>
                                <Input
                                  placeholder="e.g., 38-40"
                                  value={variant.inches || ''}
                                  onChange={(e) => {
                                    const variants = [...(editingProduct.sizeVariants || [])];
                                    variants[index] = { ...variant, inches: e.target.value };
                                    setEditingProduct({ ...editingProduct, sizeVariants: variants });
                                  }}
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-600 mb-1 block">CM</label>
                                <Input
                                  placeholder="e.g., 96-102"
                                  value={variant.cm || ''}
                                  onChange={(e) => {
                                    const variants = [...(editingProduct.sizeVariants || [])];
                                    variants[index] = { ...variant, cm: e.target.value };
                                    setEditingProduct({ ...editingProduct, sizeVariants: variants });
                                  }}
                                  className="h-9"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                <label className="text-xs text-slate-600 mb-1 block">Waist</label>
                                <Input
                                  placeholder="e.g., 32-34"
                                  value={variant.waist || ''}
                                  onChange={(e) => {
                                    const variants = [...(editingProduct.sizeVariants || [])];
                                    variants[index] = { ...variant, waist: e.target.value };
                                    setEditingProduct({ ...editingProduct, sizeVariants: variants });
                                  }}
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-600 mb-1 block">Chest</label>
                                <Input
                                  placeholder="e.g., 36-38"
                                  value={variant.chest || ''}
                                  onChange={(e) => {
                                    const variants = [...(editingProduct.sizeVariants || [])];
                                    variants[index] = { ...variant, chest: e.target.value };
                                    setEditingProduct({ ...editingProduct, sizeVariants: variants });
                                  }}
                                  className="h-9"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={variant.inStock !== false}
                                onChange={(e) => {
                                  const variants = [...(editingProduct.sizeVariants || [])];
                                  variants[index] = { ...variant, inStock: e.target.checked };
                                  setEditingProduct({ ...editingProduct, sizeVariants: variants });
                                }}
                                className="size-4"
                                id={`stock-${index}`}
                              />
                              <label htmlFor={`stock-${index}`} className="text-xs text-slate-600">In Stock</label>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No size variants. Click "Add Size" to create variants for this product.</p>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleSave}
                  >
                    <Save className="size-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
                  Select a product to edit or create a new one
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}