import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, ToggleLeft, ToggleRight, Calendar, Tag } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import type { Special, SpecialType, BOGODiscountType, SpecialApplyTo } from '../../../types/specials';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function SpecialsManager() {
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<Special | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Special>>({
    name: '',
    type: 'bogo',
    active: true,
    applyTo: 'brand',
    targetIds: [],
    priority: 1,
    stackWithMultibuy: false,
    stackWithCustomerDiscount: true,
    badge: 'SPECIAL',
    badgeColor: '#E31837',
    showOnProductCard: true,
    bogoConfig: {
      buyQuantity: 1,
      getQuantity: 1,
      discountType: 'percentage',
      discountValue: 50,
      applyToLowest: true,
      allowSameItem: true,
      allowMixMatch: true
    }
  });

  const [targetInput, setTargetInput] = useState('');

  useEffect(() => {
    fetchSpecials();
  }, []);

  const fetchSpecials = async () => {
    try {
      const response = await fetch(`${API_URL}/specials`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await response.json();
      if (data.success) {
        setSpecials(data.specials);
      }
    } catch (error) {
      console.error('Error fetching specials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingSpecial
        ? `${API_URL}/specials/${editingSpecial.id}`
        : `${API_URL}/specials`;

      const response = await fetch(url, {
        method: editingSpecial ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        alert(editingSpecial ? 'Special updated successfully!' : 'Special created successfully!');
        setShowForm(false);
        setEditingSpecial(null);
        resetForm();
        fetchSpecials();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving special:', error);
      alert('Failed to save special');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this special?')) return;

    try {
      const response = await fetch(`${API_URL}/specials/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      const data = await response.json();
      if (data.success) {
        alert('Special deleted successfully!');
        fetchSpecials();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting special:', error);
      alert('Failed to delete special');
    }
  };

  const searchPolarProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/specials/search/polar`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await response.json();

      if (data.success) {
        console.log('=== POLAR PRODUCT SEARCH ===');
        console.log(`Found ${data.count} products containing "polar"`);
        console.log('\nFirst product with "polar":');
        console.log(data.sampleMatch);
        console.log('\nAll fields in this product:', data.sampleMatch?.allFields);
        console.log('\nFirst 10 matches:');
        data.matches.forEach((product: any, i: number) => {
          console.log(`${i + 1}. ${product.name}`);
          console.log(`   Code: ${product.code}`);
          console.log(`   Brand: ${product.brand}`);
          console.log(`   Manufacturer: ${product.manufacturer}`);
        });
        console.log('========================');

        alert(`Found ${data.count} Polar products! Check console to see which field contains "Polar".`);
      }
    } catch (error) {
      console.error('Error searching:', error);
      alert('Failed to search products');
    }
  };

  const showAllBrands = async () => {
    try {
      const response = await fetch(`${API_URL}/specials/brands`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await response.json();

      if (data.success) {
        // Log raw database structure
        console.log('=== RAW DATABASE ITEM ===');
        console.log('Raw item from DB:', data.rawSampleItem);
        console.log('\n=== SAMPLE PRODUCT STRUCTURE ===');
        console.log('Sample product:', data.sampleProduct);
        console.log('\n=== SAMPLE POLAR PRODUCT ===');
        console.log('Polar product:', data.samplePolarProduct);

        if (data.sampleProduct) {
          console.log('\nSample product fields:', Object.keys(data.sampleProduct));
        }
        if (data.samplePolarProduct) {
          console.log('\nPolar product fields:', Object.keys(data.samplePolarProduct));
        }

        // Also log to console in chunks to avoid truncation
        console.log('\n=== ALL BRANDS IN DATABASE ===');
        console.log(`Total: ${data.count} unique brands`);
        for (let i = 0; i < data.brands.length; i++) {
          console.log(`${i + 1}. ${data.brands[i]}`);
        }
        console.log('==============================');

        if (data.samplePolarProduct) {
          alert(`Found Polar product! Check console to see the product structure and which field contains "Polar"`);
        } else {
          alert(`No Polar products found by name. Brands found: ${data.count}. Check console.`);
        }
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
      alert('Failed to fetch brands');
    }
  };

  const handlePreview = async () => {
    try {
      console.log('Fetching preview for:', {
        applyTo: formData.applyTo,
        targetIds: formData.targetIds
      });

      const response = await fetch(`${API_URL}/specials/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          applyTo: formData.applyTo,
          targetIds: formData.targetIds
        })
      });

      const data = await response.json();
      console.log('Preview response:', data);

      if (data.success) {
        // Log debug info to console
        if (data.debug) {
          console.log('=== BRAND DEBUG INFO ===');
          console.log('Total products in DB:', data.debug.totalProducts);
          console.log('Target brands:', data.debug.targetBrands);
          console.log('\n🏷️ ALL ' + data.debug.uniqueBrands.length + ' UNIQUE BRANDS (FULL LIST):');
          data.debug.uniqueBrands.forEach((brand: string, i: number) => {
            console.log(`  ${i + 1}. ${brand}`);
          });
          console.log('\n🔍 Products with "polar" in BRAND field:', data.debug.polarInBrand);
          console.log('🔍 Products with "polar" in MANUFACTURER field:', data.debug.polarInManufacturer);
          console.log('========================');
        }

        setPreviewData(data);
        setShowPreview(true);
      } else {
        alert(`Preview failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error previewing:', error);
      alert(`Failed to load preview: ${error}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'bogo',
      active: true,
      applyTo: 'brand',
      targetIds: [],
      priority: 1,
      stackWithMultibuy: false,
      stackWithCustomerDiscount: true,
      badge: 'SPECIAL',
      badgeColor: '#E31837',
      showOnProductCard: true,
      bogoConfig: {
        buyQuantity: 1,
        getQuantity: 1,
        discountType: 'percentage',
        discountValue: 50,
        applyToLowest: true,
        allowSameItem: true,
        allowMixMatch: true
      }
    });
    setTargetInput('');
  };

  const addTarget = () => {
    if (targetInput.trim() && !formData.targetIds?.includes(targetInput.trim())) {
      setFormData({
        ...formData,
        targetIds: [...(formData.targetIds || []), targetInput.trim()]
      });
      setTargetInput('');
    }
  };

  const removeTarget = (target: string) => {
    setFormData({
      ...formData,
      targetIds: formData.targetIds?.filter(t => t !== target) || []
    });
  };

  const editSpecial = (special: Special) => {
    setEditingSpecial(special);
    setFormData(special);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Specials & BOGO Promotions</h1>
            <p className="text-gray-600 mt-1">Manage discounts, sales, and buy-one-get-one deals</p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingSpecial(null);
              resetForm();
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="size-5" />
            Create Special
          </button>
        </div>

        {/* Specials List */}
        {!showForm && (
          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading specials...</div>
            ) : specials.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Tag className="size-16 mx-auto text-gray-300 mb-4" />
                <p className="text-xl font-semibold mb-2">No Specials Yet</p>
                <p>Create your first special or BOGO promotion to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apply To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {specials.map((special) => (
                      <tr key={special.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{special.name}</div>
                            <div className="text-sm text-gray-500">
                              <span
                                className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                                style={{ backgroundColor: special.badgeColor, color: 'white' }}
                              >
                                {special.badge}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {special.type === 'bogo' && (
                            <span className="text-purple-600 font-medium">
                              BOGO: {special.bogoConfig?.buyQuantity}+{special.bogoConfig?.getQuantity}
                              ({special.bogoConfig?.discountValue}{special.bogoConfig?.discountType === 'percentage' ? '%' : '$'} off)
                            </span>
                          )}
                          {special.type === 'percentage' && <span className="text-green-600 font-medium">{special.discountValue}% off</span>}
                          {special.type === 'fixed_amount' && <span className="text-blue-600 font-medium">${special.discountValue} off</span>}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div>
                            <div className="font-medium capitalize">{special.applyTo}</div>
                            <div className="text-xs text-gray-500">{special.targetIds.length} item(s)</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="text-gray-600">
                            <div>{new Date(special.startDate).toLocaleDateString()}</div>
                            <div className="text-xs">to {new Date(special.endDate).toLocaleDateString()}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {special.active ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Active</span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">Inactive</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => editSpecial(special)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="size-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(special.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {editingSpecial ? 'Edit Special' : 'Create New Special'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingSpecial(null);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Special Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., Thor Brand BOGO - Buy 1 Get 2nd Half Price"
                />
              </div>

              {/* Special Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Type *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="type"
                      value="bogo"
                      checked={formData.type === 'bogo'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as SpecialType })}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">BOGO Deal</div>
                      <div className="text-xs text-gray-500">Buy X Get Y</div>
                    </div>
                  </label>
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="type"
                      value="percentage"
                      checked={formData.type === 'percentage'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as SpecialType })}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">Percentage Off</div>
                      <div className="text-xs text-gray-500">X% discount</div>
                    </div>
                  </label>
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="type"
                      value="fixed_amount"
                      checked={formData.type === 'fixed_amount'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as SpecialType })}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">Fixed Amount Off</div>
                      <div className="text-xs text-gray-500">$X discount</div>
                    </div>
                  </label>
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="type"
                      value="fixed_price"
                      checked={formData.type === 'fixed_price'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as SpecialType })}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">Fixed Price</div>
                      <div className="text-xs text-gray-500">Clearance price</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* BOGO Configuration */}
              {formData.type === 'bogo' && (
                <div className="border rounded-lg p-6 bg-purple-50">
                  <h3 className="font-semibold text-lg mb-4 text-purple-900">BOGO Configuration</h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Buy Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.bogoConfig?.buyQuantity || 1}
                        onChange={(e) => setFormData({
                          ...formData,
                          bogoConfig: { ...formData.bogoConfig!, buyQuantity: parseInt(e.target.value) }
                        })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Get Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.bogoConfig?.getQuantity || 1}
                        onChange={(e) => setFormData({
                          ...formData,
                          bogoConfig: { ...formData.bogoConfig!, getQuantity: parseInt(e.target.value) }
                        })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discount Type
                      </label>
                      <select
                        value={formData.bogoConfig?.discountType || 'percentage'}
                        onChange={(e) => setFormData({
                          ...formData,
                          bogoConfig: { ...formData.bogoConfig!, discountType: e.target.value as BOGODiscountType }
                        })}
                        className="w-full px-4 py-2 border rounded-lg"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed_amount">Fixed Amount ($)</option>
                        <option value="free">Free (100% off)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discount Value
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={formData.bogoConfig?.discountType === 'percentage' ? 100 : undefined}
                        value={formData.bogoConfig?.discountValue || 50}
                        onChange={(e) => setFormData({
                          ...formData,
                          bogoConfig: { ...formData.bogoConfig!, discountValue: parseFloat(e.target.value) }
                        })}
                        className="w-full px-4 py-2 border rounded-lg"
                        disabled={formData.bogoConfig?.discountType === 'free'}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.bogoConfig?.applyToLowest ?? true}
                        onChange={(e) => setFormData({
                          ...formData,
                          bogoConfig: { ...formData.bogoConfig!, applyToLowest: e.target.checked }
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">Apply discount to lowest priced item</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.bogoConfig?.allowSameItem ?? true}
                        onChange={(e) => setFormData({
                          ...formData,
                          bogoConfig: { ...formData.bogoConfig!, allowSameItem: e.target.checked }
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">Allow same item (e.g., buy 2 of same product)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.bogoConfig?.allowMixMatch ?? true}
                        onChange={(e) => setFormData({
                          ...formData,
                          bogoConfig: { ...formData.bogoConfig!, allowMixMatch: e.target.checked }
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">Allow mix & match (any items from target qualify)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Simple Discount Value */}
              {(formData.type === 'percentage' || formData.type === 'fixed_amount' || formData.type === 'fixed_price') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.type === 'percentage' && 'Discount Percentage'}
                    {formData.type === 'fixed_amount' && 'Discount Amount ($)'}
                    {formData.type === 'fixed_price' && 'New Price ($)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.type === 'fixed_price' ? (formData.fixedPrice || '') : (formData.discountValue || '')}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (formData.type === 'fixed_price') {
                        setFormData({ ...formData, fixedPrice: value });
                      } else {
                        setFormData({ ...formData, discountValue: value });
                      }
                    }}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              )}

              {/* Apply To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apply To *
                </label>
                <div className="grid grid-cols-4 gap-4">
                  {(['brand', 'category', 'product', 'sitewide'] as SpecialApplyTo[]).map((type) => (
                    <label key={type} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="applyTo"
                        value={type}
                        checked={formData.applyTo === type}
                        onChange={(e) => setFormData({ ...formData, applyTo: e.target.value as SpecialApplyTo, targetIds: [] })}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Target IDs */}
              {formData.applyTo !== 'sitewide' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.applyTo === 'brand' && 'Brand Names'}
                    {formData.applyTo === 'category' && 'Category IDs'}
                    {formData.applyTo === 'product' && 'Product Codes'}
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTarget())}
                      className="flex-1 px-4 py-2 border rounded-lg"
                      placeholder={
                        formData.applyTo === 'brand' ? 'e.g., Thor' :
                        formData.applyTo === 'category' ? 'e.g., cat-123' :
                        'e.g., ABC123'
                      }
                    />
                    <button
                      type="button"
                      onClick={addTarget}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.targetIds?.map((target) => (
                      <span
                        key={target}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                      >
                        {target}
                        <button
                          type="button"
                          onClick={() => removeTarget(target)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate?.split('T')[0] || ''}
                    onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value).toISOString() })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate?.split('T')[0] || ''}
                    onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value).toISOString() })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Badge */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="SALE, BOGO, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Badge Color
                  </label>
                  <input
                    type="color"
                    value={formData.badgeColor}
                    onChange={(e) => setFormData({ ...formData, badgeColor: e.target.value })}
                    className="w-full h-10 px-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.active ?? true}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.showOnProductCard ?? true}
                    onChange={(e) => setFormData({ ...formData, showOnProductCard: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Show badge on product cards</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.stackWithCustomerDiscount ?? true}
                    onChange={(e) => setFormData({ ...formData, stackWithCustomerDiscount: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Stack with customer-level discounts</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.stackWithMultibuy ?? false}
                    onChange={(e) => setFormData({ ...formData, stackWithMultibuy: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Stack with multibuy discounts</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={searchPolarProducts}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  🔍 Search Polar
                </button>
                <button
                  type="button"
                  onClick={showAllBrands}
                  className="px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 text-sm"
                >
                  Show All Brands
                </button>
                <button
                  type="button"
                  onClick={handlePreview}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Preview Affected Products
                </button>
                <div className="flex-1"></div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingSpecial(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  {editingSpecial ? 'Update Special' : 'Create Special'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && previewData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-bold">Preview: {previewData.count} Products Affected</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-4">
                  {previewData.products?.map((product: any) => (
                    <div key={product.code} className="border rounded-lg p-4">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-600">{product.code}</div>
                      <div className="text-sm font-semibold text-green-600">${product.price}</div>
                      {product.brand && <div className="text-xs text-gray-500">Brand: {product.brand}</div>}
                    </div>
                  ))}
                </div>
                {previewData.count > 50 && (
                  <p className="text-center text-gray-500 mt-4">
                    Showing first 50 of {previewData.count} products
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
