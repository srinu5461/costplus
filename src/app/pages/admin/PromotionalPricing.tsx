import { useState, useEffect } from 'react';
import { Save, Loader2, Search, Percent, DollarSign, Tag, AlertCircle, CheckCircle, X, Plus, Trash2, Edit } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Product } from '../../types/product';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

interface Promotion {
  id: string;
  productId: string;
  productCode?: string;
  productName?: string;
  promotionalPrice: number;
  active: boolean;
}

interface PendingChange {
  productId: string;
  dbPrice?: number;
  promoPrice?: number;
  dbPriceInput?: string; // Raw input value for editing
  promoPriceInput?: string; // Raw input value for editing
}

export function PromotionalPricing() {
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'promo' | 'noPromo' | 'changed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const productsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/products?limit=999999`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );

      if (productsResponse.ok) {
        const data = await productsResponse.json();
        const productsArray = Array.isArray(data) ? data : (data.products || []);
        setProducts(productsArray);
        console.log(`✅ Loaded ${productsArray.length} products`);
      }

      const promotionsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/promotions`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );

      if (promotionsResponse.ok) {
        const promotionsData = await promotionsResponse.json();
        setPromotions(Array.isArray(promotionsData) ? promotionsData : []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDbPriceChange = (productId: string, value: string) => {
    const newChanges = new Map(pendingChanges);
    const existing = newChanges.get(productId) || { productId };

    // Always store raw input value for display (allows typing intermediate values)
    existing.dbPriceInput = value;

    // Parse and store number value if valid (empty is ok, will be handled on save)
    if (value === '') {
      delete existing.dbPrice;
    } else {
      const price = parseFloat(value);
      if (!isNaN(price) && price >= 0) {
        existing.dbPrice = price;
      }
    }

    newChanges.set(productId, existing);
    setPendingChanges(newChanges);
  };

  const handlePromoPriceChange = (productId: string, value: string) => {
    const newChanges = new Map(pendingChanges);
    const existing = newChanges.get(productId) || { productId };

    // Always store raw input value for display (allows typing intermediate values)
    existing.promoPriceInput = value;

    // Parse and store number value if valid (empty is ok, allows clearing the field)
    if (value === '') {
      delete existing.promoPrice;
    } else {
      const price = parseFloat(value);
      if (!isNaN(price) && price >= 0) {
        existing.promoPrice = price;
      }
    }

    newChanges.set(productId, existing);
    setPendingChanges(newChanges);
  };

  const removePendingChange = (productId: string) => {
    const newChanges = new Map(pendingChanges);
    newChanges.delete(productId);
    setPendingChanges(newChanges);
  };

  const saveAllChanges = async () => {
    if (pendingChanges.size === 0) {
      alert('No changes to save');
      return;
    }

    // Validate all changes
    const errors: string[] = [];
    const productUpdates: any[] = [];
    const promotionUpdates: any[] = [];

    pendingChanges.forEach((change, productId) => {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const currentDbPrice = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
      const newDbPrice = change.dbPrice !== undefined ? change.dbPrice : currentDbPrice;
      const promoPrice = change.promoPrice;

      // Validate promo price is lower than DB price
      if (promoPrice !== undefined && promoPrice >= newDbPrice) {
        errors.push(`${product.name}: Promo price ($${promoPrice}) must be lower than DB price ($${newDbPrice})`);
      }

      // Prepare product price update if changed
      if (change.dbPrice !== undefined && change.dbPrice !== currentDbPrice) {
        productUpdates.push({
          id: product.id,
          price: change.dbPrice,
        });
      }

      // Prepare promotion update if changed
      if (promoPrice !== undefined) {
        promotionUpdates.push({
          productId: product.id,
          productCode: product.code || product.sku,
          productName: product.name,
          promotionalPrice: promoPrice,
        });
      }
    });

    if (errors.length > 0) {
      alert(`Please fix these errors:\n\n${errors.join('\n')}`);
      return;
    }

    setSaving(true);
    try {
      let dbPricesUpdated = 0;
      let dbPricesFailed = 0;

      // Update product prices first (one by one since bulk endpoint may not be available)
      if (productUpdates.length > 0) {
        console.log(`Updating ${productUpdates.length} product DB prices...`);

        // Try bulk update first
        try {
          const productsResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/products/bulk-update`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify({ updates: productUpdates }),
            }
          );

          if (productsResponse.ok) {
            dbPricesUpdated = productUpdates.length;
            console.log(`✅ Bulk updated ${dbPricesUpdated} product prices`);
          } else {
            throw new Error('Bulk update not available');
          }
        } catch (bulkError) {
          console.warn('⚠️ Bulk update failed, will skip DB price updates:', bulkError);
          console.log('💡 Note: Promotional prices will still be updated. To update DB prices, contact your administrator.');
          dbPricesFailed = productUpdates.length;
        }
      }

      // Update promotions
      if (promotionUpdates.length > 0) {
        console.log(`Updating ${promotionUpdates.length} promotions...`);
        const promotionsResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/promotions/bulk`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ promotions: promotionUpdates }),
          }
        );

        if (!promotionsResponse.ok) {
          throw new Error('Failed to update promotions');
        }
      }

      // Show success message
      const messages = [];
      if (dbPricesUpdated > 0) {
        messages.push(`${dbPricesUpdated} product DB prices updated`);
      }
      if (dbPricesFailed > 0) {
        messages.push(`${dbPricesFailed} DB price updates skipped (feature not available)`);
      }
      if (promotionUpdates.length > 0) {
        messages.push(`${promotionUpdates.length} promotional prices updated`);
      }

      alert(`✅ Successfully saved changes!\n\n${messages.join('\n')}`);

      // Clear pending changes and reload
      setPendingChanges(new Map());
      await loadData();
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('❌ Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const clearAllChanges = () => {
    if (confirm('Discard all unsaved changes?')) {
      setPendingChanges(new Map());
    }
  };

  const removePromotion = async (productId: string, productName: string) => {
    if (!confirm(`Remove promotional pricing for "${productName}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/promotions/${productId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      if (response.ok) {
        alert('Promotional pricing removed successfully!');
        loadData(); // Reload data to refresh
      } else {
        alert('Failed to remove promotional pricing');
      }
    } catch (error) {
      console.error('Error removing promotion:', error);
      alert('Failed to remove promotional pricing');
    }
  };

  const clearAllPromotions = async () => {
    if (!confirm('⚠️ WARNING: This will remove ALL promotional pricing for ALL products. Are you sure?')) {
      return;
    }

    if (!confirm('This action cannot be undone. Continue?')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/promotions`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      if (response.ok) {
        alert('All promotional pricing cleared successfully!');
        loadData(); // Reload data to refresh
      } else {
        alert('Failed to clear promotional pricing');
      }
    } catch (error) {
      console.error('Error clearing promotions:', error);
      alert('Failed to clear promotional pricing');
    }
  };

  const toggleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === currentPageProducts.length) {
      setSelectedProducts(new Set());
    } else {
      const allIds = new Set(currentPageProducts.map(p => p.id));
      setSelectedProducts(allIds);
    }
  };

  const applyBulkDbPrice = (price: string) => {
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      alert('Please enter a valid price');
      return;
    }

    const newChanges = new Map(pendingChanges);
    selectedProducts.forEach(productId => {
      const existing = newChanges.get(productId) || { productId };
      existing.dbPrice = parsedPrice;
      existing.dbPriceInput = price;
      newChanges.set(productId, existing);
    });
    setPendingChanges(newChanges);
    setSelectedProducts(new Set());
  };

  const applyBulkPromoPrice = (price: string) => {
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      alert('Please enter a valid price');
      return;
    }

    const newChanges = new Map(pendingChanges);
    selectedProducts.forEach(productId => {
      const existing = newChanges.get(productId) || { productId };
      existing.promoPrice = parsedPrice;
      existing.promoPriceInput = price;
      newChanges.set(productId, existing);
    });
    setPendingChanges(newChanges);
    setSelectedProducts(new Set());
  };

  const getPromotionForProduct = (productId: string): Promotion | undefined => {
    return promotions.find(p => p.productId === productId);
  };

  const getCurrentDbPrice = (product: Product): number => {
    const change = pendingChanges.get(product.id);
    if (change?.dbPrice !== undefined) return change.dbPrice;
    return typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  };

  const getCurrentPromoPrice = (product: Product): number | undefined => {
    const change = pendingChanges.get(product.id);
    if (change?.promoPrice !== undefined) return change.promoPrice;
    const promo = getPromotionForProduct(product.id);
    return promo?.promotionalPrice;
  };

  const calculateStats = (product: Product) => {
    const dbPrice = getCurrentDbPrice(product);
    const promoPrice = getCurrentPromoPrice(product);

    if (!promoPrice) return null;

    const savings = dbPrice - promoPrice;
    const discountPercent = ((savings / dbPrice) * 100);
    const isValid = promoPrice < dbPrice;

    return {
      dbPrice,
      promoPrice,
      savings,
      discountPercent: Math.round(discountPercent),
      isValid,
    };
  };

  const filteredProducts = products
    .filter(product => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        product.name.toLowerCase().includes(searchLower) ||
        product.code?.toLowerCase().includes(searchLower) ||
        product.brand?.toLowerCase().includes(searchLower);

      const hasPromo = getCurrentPromoPrice(product) !== undefined;
      const hasChanges = pendingChanges.has(product.id);

      const matchesFilter = filterMode === 'all' ||
        (filterMode === 'promo' && hasPromo) ||
        (filterMode === 'noPromo' && !hasPromo) ||
        (filterMode === 'changed' && hasChanges);

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const aHasChanges = pendingChanges.has(a.id);
      const bHasChanges = pendingChanges.has(b.id);
      if (aHasChanges && !bHasChanges) return -1;
      if (!aHasChanges && bHasChanges) return 1;
      return 0;
    });

  const promoCount = products.filter(p => getCurrentPromoPrice(p) !== undefined).length;
  const currentPageProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E31837]"></div>
          <p className="ml-3 text-slate-600">Loading all products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#2D3748] mb-2">Promotional Pricing Manager</h1>
        <p className="text-slate-600">
          Edit prices and promotions. Click "Save All Changes" when done.
        </p>
      </div>

      {/* Save Changes Bar */}
      {pendingChanges.size > 0 && (
        <div className="mb-6 bg-orange-50 border-2 border-orange-300 rounded-lg p-4 sticky top-4 z-10 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="size-6 text-orange-600" />
              <div>
                <h3 className="font-bold text-orange-900">
                  {pendingChanges.size} Unsaved Change(s)
                </h3>
                <p className="text-sm text-orange-700">
                  Click "Save All Changes" to apply your edits to the database
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={clearAllChanges}
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                Discard All
              </Button>
              <Button
                onClick={saveAllChanges}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-8"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-5 mr-2" />
                    Save All Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-600 text-white p-3 rounded-lg">
              <Tag className="size-6" />
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">Total Products</p>
              <p className="text-2xl font-bold text-slate-900">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-3 rounded-lg">
              <Tag className="size-6" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Active Promotions</p>
              <p className="text-2xl font-bold text-blue-900">{promoCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-600 text-white p-3 rounded-lg">
              <Edit className="size-6" />
            </div>
            <div>
              <p className="text-sm text-orange-600 font-medium">Pending Changes</p>
              <p className="text-2xl font-bold text-orange-900">{pendingChanges.size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clear All Promotions */}
      {promoCount > 0 && (
        <div className="mb-6">
          <Button
            onClick={clearAllPromotions}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50 font-semibold"
          >
            <Trash2 className="size-4 mr-2" />
            Clear All Promotional Pricing ({promoCount} products)
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterMode === 'all' ? 'bg-[#2D3748] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode('promo')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterMode === 'promo' ? 'bg-[#E31837] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            With Promo ({promoCount})
          </button>
          <button
            onClick={() => setFilterMode('noPromo')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterMode === 'noPromo' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            No Promo
          </button>
          <button
            onClick={() => setFilterMode('changed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterMode === 'changed' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Changed ({pendingChanges.size})
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.size > 0 && (
        <div className="mb-6 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="size-6 text-blue-600" />
              <div>
                <h3 className="font-bold text-blue-900">
                  {selectedProducts.size} Product(s) Selected
                </h3>
                <p className="text-sm text-blue-700">
                  Set prices for all selected products at once
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-blue-900">DB Price:</label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    id="bulkDbPrice"
                    placeholder="0.00"
                    className="w-32 pl-7 pr-2 py-1 border border-blue-300 rounded text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const input = document.getElementById('bulkDbPrice') as HTMLInputElement;
                    if (input.value) {
                      applyBulkDbPrice(input.value);
                      input.value = '';
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Apply
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-blue-900">Promo Price:</label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    id="bulkPromoPrice"
                    placeholder="0.00"
                    className="w-32 pl-7 pr-2 py-1 border border-blue-300 rounded text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const input = document.getElementById('bulkPromoPrice') as HTMLInputElement;
                    if (input.value) {
                      applyBulkPromoPrice(input.value);
                      input.value = '';
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Apply
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedProducts(new Set())}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={currentPageProducts.length > 0 && selectedProducts.size === currentPageProducts.length}
                    onChange={toggleSelectAll}
                    className="size-4 rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Product</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">DB Price</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Promo Price</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Discount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Savings</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentPageProducts.map((product) => {
                const stats = calculateStats(product);
                const hasChanges = pendingChanges.has(product.id);
                const change = pendingChanges.get(product.id);
                const dbPrice = getCurrentDbPrice(product);
                const promoPrice = getCurrentPromoPrice(product);

                // Use raw input value if being edited, otherwise use formatted number
                const dbPriceDisplay = change?.dbPriceInput !== undefined
                  ? change.dbPriceInput
                  : dbPrice.toFixed(2);

                const promoPriceDisplay = change?.promoPriceInput !== undefined
                  ? change.promoPriceInput
                  : (promoPrice?.toFixed(2) || '');

                return (
                  <tr
                    key={product.id}
                    className={`hover:bg-slate-50 ${hasChanges ? 'bg-orange-50' : selectedProducts.has(product.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => toggleSelectProduct(product.id)}
                        className="size-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.mainImageUrl || product.image || 'https://via.placeholder.com/60'}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900 max-w-xs truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {product.code || product.sku || 'No code'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <input
                          type="number"
                          step="0.01"
                          value={dbPriceDisplay}
                          onChange={(e) => handleDbPriceChange(product.id, e.target.value)}
                          className="w-32 pl-7 pr-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <input
                          type="number"
                          step="0.01"
                          value={promoPriceDisplay}
                          onChange={(e) => handlePromoPriceChange(product.id, e.target.value)}
                          placeholder="0.00"
                          className="w-32 pl-7 pr-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {stats ? (
                        stats.isValid ? (
                          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                            {stats.discountPercent}% OFF
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                            <AlertCircle className="size-3 mr-1" />
                            Invalid
                          </Badge>
                        )
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {stats && stats.isValid ? (
                        <span className="text-sm font-bold text-green-600">
                          ${stats.savings.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasChanges ? (
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                          <Edit className="size-3 mr-1" />
                          Changed
                        </Badge>
                      ) : promoPrice ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <Tag className="size-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No Promo</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {hasChanges && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removePendingChange(product.id)}
                            className="text-slate-600 hover:bg-slate-100"
                          >
                            <X className="size-4 mr-1" />
                            Undo
                          </Button>
                        )}
                        {!hasChanges && promoPrice && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removePromotion(product.id, product.name)}
                            className="border-red-300 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="size-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="mb-2">No products found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Showing {filteredProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm text-slate-600">
            Page {currentPage} of {Math.ceil(filteredProducts.length / itemsPerPage)}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage * itemsPerPage >= filteredProducts.length}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
