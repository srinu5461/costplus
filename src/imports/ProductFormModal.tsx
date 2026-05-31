import { useState, useEffect } from "react";
import { X, Plus, Trash2, FileText, Star, Package } from 'lucide-react';
import { toast } from 'sonner';
import { TieredPricingManager, PriceTier } from './TieredPricingManager';

interface ProductFormModalProps {
  product: any | null;
  categories: any[];
  onClose: () => void;
  onSuccess: () => void;
  apiUrl: string;
  accessToken: string;
}

export function ProductFormModal({ product, categories, onClose, onSuccess, apiUrl, accessToken }: ProductFormModalProps) {
  const [activeSection, setActiveSection] = useState('basic');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '', // Auto-generated internal SKU
    code: '', // UROPA PRODUCT CODE (Manual Entry - CRITICAL FOR ORDERS!)
    price: '',
    originalPrice: '',
    category: '', // Level 1 Category ID
    subcategory: '', // Level 2 Category ID
    subSubcategory: '', // Level 3 Category ID
    // Full category path (for easy frontend filtering/display)
    categoryLevel1: '',
    categoryLevel2: '',
    categoryLevel3: '',
    image: '',
    inStock: true,
    stockQuantity: '0',
    pricingTiers: [] as PriceTier[],
    documents: [] as any[],
    features: [] as string[],
    warranty: '',
    specifications: {} as any,
    showMultibuyTag: false // 🔥 NEW: Manual control for multibuy tag display
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedLevel2Category, setSelectedLevel2Category] = useState<any>(null);
  const [level2Categories, setLevel2Categories] = useState<any[]>([]);
  const [level3Categories, setLevel3Categories] = useState<any[]>([]);

  // New document form
  const [newDocument, setNewDocument] = useState({ name: '', url: '', type: 'PDF' });
  
  // New feature
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    if (product) {
      console.log('🔍 [ProductFormModal] Received product:', product);
      console.log('🔍 [ProductFormModal] Product keys:', Object.keys(product));
      console.log('🔍 [ProductFormModal] fullDescription:', product.fullDescription);
      console.log('🔍 [ProductFormModal] description:', product.description);
      console.log('🔍 [ProductFormModal] category:', product.category);
      console.log('🔍 [ProductFormModal] categoryId:', product.categoryId);
      console.log('🔍 [ProductFormModal] categoryLevel1:', product.categoryLevel1);
      console.log('🔍 [ProductFormModal] categoryLevel2:', product.categoryLevel2);
      console.log('🔍 [ProductFormModal] categoryLevel3:', product.categoryLevel3);
      console.log('🔍 [ProductFormModal] subcategory:', product.subcategory);
      console.log('🔍 [ProductFormModal] subSubcategory:', product.subSubcategory);
      console.log('🔍 [ProductFormModal] Total categories available:', categories.length);
      console.log('🔍 [ProductFormModal] First 3 categories:', categories.slice(0, 3));
      
      const descriptionValue = product.fullDescription || product.description || '';
      console.log('🔍 [ProductFormModal] Using description:', descriptionValue);
      
      // Use categoryId as primary source, fallback to category
      const level1Id = product.categoryLevel1 || product.category || product.categoryId || '';
      const level2Id = product.categoryLevel2 || product.subcategory || '';
      const level3Id = product.categoryLevel3 || product.subSubcategory || '';
      
      console.log('🔍 [ProductFormModal] Calculated level1Id:', level1Id);
      console.log('🔍 [ProductFormModal] Calculated level2Id:', level2Id);
      console.log('🔍 [ProductFormModal] Calculated level3Id:', level3Id);
      
      setFormData({
        name: product.name,
        description: descriptionValue,
        sku: product.sku,
        code: product.code || '',
        price: product.price.toString(),
        originalPrice: product.originalPrice?.toString() || '',
        category: level1Id,
        subcategory: level2Id,
        subSubcategory: level3Id,
        categoryLevel1: level1Id,
        categoryLevel2: level2Id,
        categoryLevel3: level3Id,
        image: product.image,
        inStock: product.inStock,
        stockQuantity: product.stockQuantity.toString(),
        pricingTiers: product.pricingTiers || [],
        documents: product.documents || [],
        features: product.features || [],
        warranty: product.warranty || '',
        specifications: product.specifications || {},
        showMultibuyTag: product.showMultibuyTag || false // 🔥 FIX: Load from product data
      });

      console.log('🔍 [ProductFormModal] Set formData.description to:', descriptionValue);
      console.log('🔍 [ProductFormModal] Set formData.category to:', level1Id);

      // Find category by ID or by name (legacy fallback)
      const cat = categories.find(c => c.id === level1Id) || 
                  categories.find(c => c.name === level1Id);
      console.log('🔍 [ProductFormModal] Found Level 1 category:', cat);
      setSelectedCategory(cat);
      
      // ✅ FIX: Populate Level 2 categories immediately when editing
      if (level1Id) {
        const level2 = categories.filter(c => c.level === 2 && c.parentId === level1Id);
        console.log('🔍 [ProductFormModal] Populated Level 2 categories:', level2.length);
        setLevel2Categories(level2);
      }
      
      // Find subcategory by ID or name
      if (level2Id) {
        const subcat = categories.find(c => c.id === level2Id) || 
                       categories.find(c => c.name === level2Id);
        console.log('🔍 [ProductFormModal] Found Level 2 category:', subcat);
        setSelectedLevel2Category(subcat);
        
        // ✅ FIX: Populate Level 3 categories immediately when editing
        const level3 = categories.filter(c => c.level === 3 && c.parentId === level2Id);
        console.log('🔍 [ProductFormModal] Populated Level 3 categories:', level3.length);
        setLevel3Categories(level3);
      }
    }
  }, [product, categories]);

  useEffect(() => {
    if (formData.category) {
      const cat = categories.find(c => c.id === formData.category && c.level === 1);
      setSelectedCategory(cat);
      
      // Find Level 2 categories that have this category as parent
      const level2 = categories.filter(c => c.level === 2 && c.parentId === formData.category);
      setLevel2Categories(level2);
    } else {
      setLevel2Categories([]);
    }
  }, [formData.category, categories]);

  useEffect(() => {
    if (formData.subcategory && selectedLevel2Category) {
      // Find Level 3 categories that have the selected Level 2 as parent
      const level3 = categories.filter(c => c.level === 3 && c.parentId === formData.subcategory);
      setLevel3Categories(level3);
    } else {
      setLevel3Categories([]);
    }
  }, [formData.subcategory, selectedLevel2Category, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.name.trim()) {
        toast.error('Product name is required');
        setIsSubmitting(false);
        return;
      }

      if (!formData.price || parseFloat(formData.price) <= 0) {
        toast.error('Valid price is required');
        setIsSubmitting(false);
        return;
      }

      if (!formData.category) {
        toast.error('Please select a category');
        setIsSubmitting(false);
        return;
      }

      // Calculate categoryId as the DEEPEST assigned category
      // Priority: Level 4 > Level 3 > Level 2 > Level 1
      let categoryId = '';
      if (formData.subSubcategory) {
        // If Level 3 field is set, check if there's a Level 4 category selected
        const level3Cat = categories.find(c => c.id === formData.subSubcategory);
        if (level3Cat && level3Cat.level === 4) {
          categoryId = formData.subSubcategory; // This is actually Level 4
        } else if (level3Cat && level3Cat.level === 3) {
          categoryId = formData.subSubcategory; // This is Level 3
        }
      } else if (formData.subcategory) {
        categoryId = formData.subcategory; // Level 2
      } else if (formData.category) {
        categoryId = formData.category; // Level 1
      }

      console.log('📋 Calculated categoryId:', categoryId, 'from form data:', {
        category: formData.category,
        subcategory: formData.subcategory,
        subSubcategory: formData.subSubcategory
      });

      const payload = {
        ...formData,
        categoryId, // Add the calculated categoryId for new unified system
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        stockQuantity: parseInt(formData.stockQuantity) || 0
      };

      try {
        // Try backend first
        const url = product
          ? `${apiUrl}/products/${product.code || product.id}`
          : `${apiUrl}/products`;

        console.log('📤 Sending product request to:', url);
        console.log('📦 Payload:', payload);

        // ✅ FIXED: Use X-API-Key header without Bearer prefix (line 227)
        const response = await fetch(url, {
          method: product ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': accessToken
          },
          body: JSON.stringify(payload)
        });

        console.log('📥 Response status:', response.status);

        let responseData;
        try {
          responseData = await response.json();
          console.log('📥 Response data:', responseData);
        } catch (jsonError) {
          console.error('❌ Failed to parse response JSON:', jsonError);
          toast.error(`Server error: ${response.status}`);
          setIsSubmitting(false);
          return;
        }

        if (response.ok) {
          toast.success(product ? '✅ Product updated!' : '✅ Product created!');
          onSuccess();
          onClose();
        } else {
          console.error('❌ Server error response:', responseData);
          const errorMsg = responseData?.error || responseData?.message || 'Unknown error';
          toast.error('Failed: ' + errorMsg);
        }
      } catch (backendError) {
        // Fallback to localStorage
        console.log('Backend not available, saving to localStorage');
        const localProducts = JSON.parse(localStorage.getItem('costplus100_products') || '[]');
        
        if (product) {
          // Update existing product
          const index = localProducts.findIndex((p: any) => p.id === product.id);
          if (index >= 0) {
            localProducts[index] = { ...product, ...payload };
          }
        } else {
          // Create new
          const newProduct = {
            ...payload,
            id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sku: payload.sku || `SKU-${Date.now()}`
          };
          localProducts.push(newProduct);
        }
        
        localStorage.setItem('costplus100_products', JSON.stringify(localProducts));
        toast.success(product ? '✅ Product updated!' : '✅ Product created!');
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error('❌ Product submit error:', error);
      toast.error('Error: ' + (error.message || 'Could not save product'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addDocument = () => {
    if (!newDocument.name || !newDocument.url) {
      toast.error('Document name and URL are required');
      return;
    }

    setFormData({
      ...formData,
      documents: [...formData.documents, { ...newDocument }]
    });
    setNewDocument({ name: '', url: '', type: 'PDF' });
    toast.success('Document added!');
  };

  const removeDocument = (index: number) => {
    const updated = formData.documents.filter((_, i) => i !== index);
    setFormData({ ...formData, documents: updated });
  };

  const addFeature = () => {
    if (!newFeature.trim()) {
      toast.error('Feature description is required');
      return;
    }

    setFormData({
      ...formData,
      features: [...formData.features, newFeature.trim()]
    });
    setNewFeature('');
    toast.success('Feature added!');
  };

  const removeFeature = (index: number) => {
    const updated = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: updated });
  };

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: Package },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'features', label: 'Features', icon: Star }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full my-8 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 sticky top-0 z-10 rounded-t-xl">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-white">
              {product ? 'Edit Product' : 'Add New Product'}
            </h3>
            {product && formData.pricingTiers.length > 0 && (
              <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg animate-pulse">
                🎯 {formData.pricingTiers.length} Multibuy Tier{formData.pricingTiers.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b bg-gray-50 sticky top-[73px] z-10">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all ${
                activeSection === section.id
                  ? 'border-b-3 border-blue-600 text-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto" id="product-form">
          {/* BASIC INFO SECTION */}
          {activeSection === 'basic' && (
            <div className="space-y-6">
              {/* Multibuy Quick Jump Banner */}
              {product && formData.pricingTiers.length > 0 && (
                <div className="bg-green-100 border-2 border-green-400 rounded-xl p-4 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl">
                      🎯
                    </div>
                    <div>
                      <p className="font-bold text-green-900">This product has {formData.pricingTiers.length} multibuy discount tier{formData.pricingTiers.length > 1 ? 's' : ''}</p>
                      <p className="text-sm text-green-800">Volume pricing is configured below</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById('multibuy-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Jump to Multibuy ↓
                  </button>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Product Name*</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                  placeholder="e.g., Commercial Stainless Steel Oven"
                />
              </div>

              {/* UROPA PRODUCT CODE - CRITICAL FOR ORDERING! */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border-3 border-orange-400 rounded-xl p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
                    🔥 CRITICAL
                  </div>
                  <label className="text-lg font-bold text-orange-900">
                    Uropa Product Code* (For Orders)
                  </label>
                </div>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 border-3 border-orange-400 rounded-lg focus:outline-none focus:ring-3 focus:ring-orange-500 focus:border-transparent transition-all font-mono font-bold text-lg text-orange-900"
                  required
                  placeholder="e.g., DU707, SKOPE-001, FR-12345"
                />
                <p className="text-sm text-orange-900 mt-2 font-medium">
                  ⚠️ This is the official Uropa code used when placing orders. MUST match Uropa's system exactly!
                </p>
                <div className="bg-white/50 border border-orange-300 rounded-lg p-3 mt-3">
                  <p className="text-xs text-orange-900">
                    <strong>📝 Note:</strong> When you place an order with Uropa, you'll send them this code + quantity.
                    Make sure it matches their product code exactly (case-sensitive).
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Full Product Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
                  rows={12}
                  placeholder="Enter detailed product description here... (supports multi-line text)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 This is the full product description that appears on the product detail page
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="AUTO-GENERATED"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Level 1 Category (Main Category)*
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const selectedCat = categories.find(c => c.id === e.target.value && c.level === 1);
                    setFormData({ 
                      ...formData, 
                      category: e.target.value, 
                      subcategory: '',
                      subSubcategory: '',
                      categoryLevel1: selectedCat?.id || '',
                      categoryLevel2: '',
                      categoryLevel3: ''
                    });
                    setSelectedCategory(selectedCat);
                    setSelectedLevel2Category(null);
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="">Select Level 1 category</option>
                  {categories
                    .filter(cat => cat.level === 1)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>

              {/* Level 2 Category Selector */}
              {formData.category && level2Categories.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Level 2 Category (Subcategory)
                  </label>
                  <select
                    value={formData.subcategory}
                    onChange={(e) => {
                      const selectedL2 = level2Categories.find(c => c.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        subcategory: e.target.value,
                        subSubcategory: '',
                        categoryLevel2: selectedL2?.id || '',
                        categoryLevel3: ''
                      });
                      setSelectedLevel2Category(selectedL2);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">None (assign to Level 1)</option>
                    {level2Categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Level 3 Category Selector */}
              {formData.subcategory && level3Categories.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Level 3 Category (Sub-subcategory)
                  </label>
                  <select
                    value={formData.subSubcategory}
                    onChange={(e) => {
                      const selectedL3 = level3Categories.find(c => c.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        subSubcategory: e.target.value,
                        categoryLevel3: selectedL3?.id || ''
                      });
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">None (assign to Level 2)</option>
                    {level3Categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Price (ex GST)*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Original Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Product Image URL</label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Multibuy/Tiered Pricing Section */}
              <div id="multibuy-section" className="border-t-2 border-gray-200 pt-6">
                <TieredPricingManager
                  pricingTiers={formData.pricingTiers}
                  onChange={(tiers) => setFormData({ ...formData, pricingTiers: tiers })}
                />
              </div>
            </div>
          )}

          {/* DOCUMENTS SECTION */}
          {activeSection === 'documents' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Product Documents</h3>
                
                {/* Existing Documents */}
                {formData.documents.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.documents.map((doc, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <div className="flex-1">
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-gray-500">{doc.url}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Document */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <p className="font-semibold mb-3">Add Document</p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Document name"
                      value={newDocument.name}
                      onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="url"
                      placeholder="Document URL"
                      value={newDocument.url}
                      onChange={(e) => setNewDocument({ ...newDocument, url: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={addDocument}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Document
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FEATURES SECTION */}
          {activeSection === 'features' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Product Features</h3>
                
                {/* Existing Features */}
                {formData.features.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <p className="flex-1">{feature}</p>
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Feature */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <p className="font-semibold mb-3">Add Feature</p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Feature description"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addFeature();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addFeature}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Warranty Information</label>
                <textarea
                  value={formData.warranty}
                  onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  rows={4}
                  placeholder="Enter warranty details..."
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer with Actions */}
        <div className="border-t p-6 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="product-form"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
